import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getBalancedGenAiClient, putKeyOnCooldown, markKeySuccess } from "@/lib/gemini/loadBalancer";
import { aiQueue } from "@/lib/gemini/queue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Model fallback chain ─────────────────────────────────────────────────────
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash-lite"] as const;

// ─── Simple in-memory response cache (TTL: 5 min) ────────────────────────────
interface CacheEntry {
  text: string;
  ts: number;
}
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return entry.text;
}

function setCache(key: string, text: string) {
  // Don't cache very long responses (saves memory)
  if (text.length > 8000) return;
  responseCache.set(key, { text, ts: Date.now() });
  // Evict if cache grows too large
  if (responseCache.size > 200) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonError(message: string, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}

function friendlyError(err: any): string {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded") || msg.includes("demand")) {
    return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
  }
  if (msg.includes("429") || msg.includes("rate_limit") || msg.includes("quota") || msg.includes("resource_exhausted")) {
    return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
  }
  if (msg.includes("400") || msg.includes("invalid_argument")) {
    return "Nội dung câu hỏi không hợp lệ. Vui lòng thử lại.";
  }
  if (msg.includes("deadline") || msg.includes("timeout") || msg.includes("aborted")) {
    return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
  }
  return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Core Gemini call with model fallback + retry + backoff ───────────────────

async function callGeminiWithFallback(
  contents: any[],
  systemInstruction: string,
  requestSignal?: AbortSignal
): Promise<{ stream: AsyncIterable<any>; rawKey: string }> {
  const MAX_KEY_ATTEMPTS = 3;
  const BACKOFF_BASE_MS = 1000;

  for (let keyAttempt = 1; keyAttempt <= MAX_KEY_ATTEMPTS; keyAttempt++) {
    let clientInfo: { client: any; rawKey: string; keyIndex: number };
    try {
      clientInfo = getBalancedGenAiClient();
    } catch (err: any) {
      throw new Error(err.message || "Không có API key khả dụng.");
    }

    // Try each model in the fallback chain
    for (const model of MODEL_CHAIN) {
      if (requestSignal?.aborted) throw new DOMException("Aborted", "AbortError");

      // Apply per-request timeout (25 s)
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 25_000);

      const t0 = Date.now();
      try {
        console.log(`[AI] key#${clientInfo.keyIndex} model=${model} attempt=${keyAttempt}`);
        const responseStream = await clientInfo.client.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction },
        });
        clearTimeout(timeoutId);
        markKeySuccess(clientInfo.rawKey, Date.now() - t0);
        return { stream: responseStream, rawKey: clientInfo.rawKey };
      } catch (err: any) {
        clearTimeout(timeoutId);
        const msg = (err?.message || "").toLowerCase();
        const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted");
        const isOverload = msg.includes("503") || msg.includes("overloaded") || msg.includes("unavailable");

        console.warn(`[AI] key#${clientInfo.keyIndex} model=${model} failed: ${err?.message}`);

        if (isQuota || isOverload) {
          // Mark key on cooldown and move to next key
          putKeyOnCooldown(clientInfo.rawKey);
          break; // break model loop → try next key
        }
        // For other errors on Flash, try Flash Lite before giving up on this key
        if (model === MODEL_CHAIN[0]) {
          console.log(`[AI] Falling back to ${MODEL_CHAIN[1]}...`);
          continue;
        }
        // Both models failed on this key
        putKeyOnCooldown(clientInfo.rawKey, 60_000); // shorter cooldown for non-quota errors
        break;
      }
    }

    // Exponential backoff before next key attempt
    if (keyAttempt < MAX_KEY_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, keyAttempt - 1);
      console.log(`[AI] Backing off ${delay}ms before key attempt ${keyAttempt + 1}...`);
      await sleep(delay);
    }
  }

  throw new Error("Tất cả API keys đều không khả dụng. Vui lòng thử lại sau.");
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, prompt, imagesBase64, fileContext, subject, mode } = body;

    if (!prompt && (!imagesBase64 || imagesBase64.length === 0)) {
      return jsonError("Nội dung câu hỏi trống.", 400);
    }

    // ── Auth ────────────────────────────────────────────────────────────────
    const isGuest = chatId === "guest-session";
    let user: any = null;
    let supabase: any = null;

    if (!isGuest) {
      supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return jsonError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", 401);
      }
      user = authUser;
    }

    // ── History (last 6 messages only to reduce tokens) ─────────────────────
    const contents: any[] = [];
    if (!isGuest && supabase) {
      const { data: history } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(6); // only 6 most recent

      if (history?.length) {
        // reverse to chronological order
        for (const msg of history.reverse()) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: (msg.content as string).slice(0, 3000) }], // truncate per message
          });
        }
      }
    }

    // ── Current user turn ───────────────────────────────────────────────────
    let promptBody = (prompt || "").slice(0, 4000); // hard cap
    if (subject) promptBody = `[Môn học: ${subject}] ${promptBody}`;
    if (fileContext) {
      const truncatedCtx = fileContext.slice(0, 8000); // limit uploaded text
      promptBody = `[Tài liệu đính kèm]:\n"""\n${truncatedCtx}\n"""\n\n[Yêu cầu]: ${promptBody}`;
    }

    const currentParts: any[] = [{ text: promptBody }];
    if (imagesBase64?.length) {
      for (const b64 of imagesBase64.slice(0, 3)) { // max 3 images
        const data = b64.includes(",") ? b64.split(",")[1] : b64;
        const mimeType = b64.includes("jpeg") || b64.includes("jpg") ? "image/jpeg" : "image/png";
        currentParts.push({ inlineData: { data, mimeType } });
      }
    }
    contents.push({ role: "user", parts: currentParts });

    // ── Cache check (only for simple text, no images, no file context) ───────
    const cacheKey = `${chatId}::${promptBody}::${subject}::${mode}`;
    const cachedResponse = !imagesBase64?.length && !fileContext ? getCached(cacheKey) : null;

    if (cachedResponse) {
      console.log("[AI] Cache hit — returning cached response.");
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(cachedResponse));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Cache": "HIT" } }
      );
    }

    // ── System instruction ──────────────────────────────────────────────────
    let systemInstruction = `Bạn là Gia Sư Học Tập Cao Cấp của nền tảng TCK Tài Liệu.
Hỗ trợ học sinh Việt Nam học tốt các môn học từ Lớp 1 đến Đại Học.

Quy tắc:
1. Dùng Markdown có tiêu đề và gạch đầu dòng.
2. Giải thích từng bước, không chỉ đưa đáp án.
3. Thân thiện, truyền cảm hứng.
4. Toán/Lý/Hóa: dùng LaTeX cho công thức.
5. Văn học: phân tích sâu, viết đoạn văn mẫu.
6. Tiếng Anh: dịch rõ, phân tích ngữ pháp, kèm ví dụ.`;

    if (mode === "summarize") systemInstruction += "\n\n[Chế độ: Tóm tắt] Tóm tắt ngắn gọn, súc tích.";
    else if (mode === "quiz") systemInstruction += "\n\n[Chế độ: Trắc nghiệm] Tạo 5–10 câu trắc nghiệm 4 lựa chọn kèm đáp án.";
    else if (mode === "notes") systemInstruction += "\n\n[Chế độ: Ghi chú] Tạo cheat sheet học tập khoa học.";

    if (!isGuest && user && supabase) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name, bio").eq("id", user.id).single();
      if (profile?.full_name) {
        systemInstruction += `\n\nHọc sinh: ${profile.full_name}. Xưng hô thân mật.`;
      }
    }

    // ── Queue + Gemini call ─────────────────────────────────────────────────
    let streamResult: { stream: AsyncIterable<any>; rawKey: string };
    try {
      streamResult = await aiQueue.schedule(() =>
        callGeminiWithFallback(contents, systemInstruction, req.signal)
      );
    } catch (err: any) {
      if (err.name === "AbortError") return jsonError("Yêu cầu đã bị hủy.", 499);
      console.error("[AI] All retries failed:", err.message);
      return jsonError(friendlyError(err), 503);
    }

    // ── Stream response ─────────────────────────────────────────────────────
    const encoder = new TextEncoder();
    let aiText = "";
    const { stream, rawKey } = streamResult;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (req.signal?.aborted) break;
            const text: string = chunk.text || "";
            if (text) {
              aiText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error("[AI] Stream error:", err?.message);
          putKeyOnCooldown(rawKey);
          const fallback = "\n\n⚠️ *Hệ thống AI đang tối ưu kết nối, vui lòng thử lại sau vài giây.*";
          controller.enqueue(encoder.encode(fallback));
          controller.close();
          return;
        }

        // Cache the response
        if (aiText && !imagesBase64?.length && !fileContext) {
          setCache(cacheKey, aiText);
        }

        // Persist to DB (non-fatal)
        if (!isGuest && user && aiText) {
          try {
            const adminSupabase = await createAdminClient();
            await Promise.all([
              adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "user", content: prompt }),
              adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "model", content: aiText }),
              adminSupabase.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId),
              adminSupabase.from("ai_logs").insert({ user_id: user.id, prompt: promptBody, response: aiText }).catch(() => {}),
            ]);
          } catch (dbErr) {
            console.error("[AI] DB persist error (non-fatal):", dbErr);
          }
        }
      },
      cancel() {
        console.log("[AI] Stream cancelled by client.");
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[AI] Unhandled error:", error);
    return jsonError("Hệ thống AI đang tối ưu kết nối, vui lòng thử lại sau vài giây.", 500);
  }
}
