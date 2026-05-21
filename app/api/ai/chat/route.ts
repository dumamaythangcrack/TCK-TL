import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiQueue } from "@/lib/gemini/queue";
import {
  friendlyError,
  getSystemInstruction,
  getConversationContext,
  callGeminiWithRetry,
  createGeminiStreamResponse,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Simple in-memory response cache (TTL: 3 min, only for identical simple prompts) ─
interface CacheEntry { text: string; ts: number; }
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000;

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
  if (text.length > 6000) return; // don't cache long responses
  responseCache.set(key, { text, ts: Date.now() });
  if (responseCache.size > 200) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
}

function jsonError(message: string, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, prompt, imagesBase64, fileContext, subject, mode, generateTitle } = body;

    if (!prompt && (!imagesBase64 || imagesBase64.length === 0)) {
      return jsonError("Nội dung câu hỏi trống.", 400);
    }

    // 1. Auth check
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

    // 2. Fetch context memory and profile info
    const {
      contents,
      profileName,
      profileBio,
      summaryPrompt,
    } = await getConversationContext(chatId, isGuest);

    const isFirstMessage = contents.length === 0;

    // 3. Append current user message turn to history contents
    let promptBody = (prompt || "").slice(0, 6000);
    if (subject) promptBody = `[Môn học: ${subject}] ${promptBody}`;
    if (fileContext) {
      const ctx = fileContext.slice(0, 10000);
      promptBody = `[Tài liệu đính kèm]:\n"""\n${ctx}\n"""\n\n[Yêu cầu]: ${promptBody}`;
    }

    const currentParts: any[] = [{ text: promptBody }];
    if (imagesBase64?.length) {
      for (const b64 of imagesBase64.slice(0, 3)) {
        const data = b64.includes(",") ? b64.split(",")[1] : b64;
        const mimeType = b64.includes("jpeg") || b64.includes("jpg") ? "image/jpeg" : "image/png";
        currentParts.push({ inlineData: { data, mimeType } });
      }
    }
    contents.push({ role: "user", parts: currentParts });

    // 4. Cache check (simple text-only requests with no prior history context)
    const isSimpleRequest = !imagesBase64?.length && !fileContext && contents.length <= 1;
    const cacheKey = `${mode}::${subject}::${promptBody}`;
    const cachedResponse = isSimpleRequest ? getCached(cacheKey) : null;

    if (cachedResponse) {
      console.log("[AI Route] Cache HIT");
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(cachedResponse));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Cache": "HIT",
          },
        }
      );
    }

    // 5. System instructions (Prompts V2)
    let systemInstruction = getSystemInstruction(mode, subject, profileName, profileBio);
    if (summaryPrompt) {
      systemInstruction += `\n\n${summaryPrompt}`;
    }

    // 6. Schedule calling Gemini with load-balancing and retry logic
    let streamResult;
    try {
      streamResult = await aiQueue.schedule(() =>
        callGeminiWithRetry({ contents, systemInstruction })
      );
    } catch (err: any) {
      console.error("[AI Route] Call execution failed:", err.message);
      return jsonError(friendlyError(err), 503);
    }

    // 7. Return ReadableStream response
    return createGeminiStreamResponse({
      stream: streamResult.stream,
      rawKey: streamResult.rawKey,
      chatId,
      prompt,
      promptBody,
      user,
      isGuest,
      isFirstMessage,
      generateTitle,
    });
  } catch (error: any) {
    console.error("[AI Route] Unhandled exception:", error);
    return jsonError("Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây.", 500);
  }
}
