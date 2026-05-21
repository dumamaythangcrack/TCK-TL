import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getBalancedGenAiClient, putKeyOnCooldown, markKeySuccess } from "@/lib/gemini/loadBalancer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Helper ───────────────────────────────────────────────────────────────────

function jsonError(message: string, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}

function friendlyError(err: any): string {
  const msg = err?.message || "";
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("overloaded") || msg.includes("demand")) {
    return "Hệ thống AI đang quá tải. Vui lòng thử lại sau vài giây.";
  }
  if (msg.includes("429") || msg.includes("RATE_LIMIT") || msg.includes("quota")) {
    return "Đã vượt giới hạn sử dụng tạm thời. Hệ thống đang chuyển sang API dự phòng.";
  }
  if (msg.includes("400") || msg.includes("INVALID")) {
    return "Nội dung câu hỏi không hợp lệ. Vui lòng thử lại.";
  }
  return "Không thể kết nối AI lúc này. Vui lòng thử lại sau.";
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

    // ── Build conversation history ──────────────────────────────────────────
    const contents: any[] = [];

    if (!isGuest && supabase) {
      const { data: history } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(40); // cap at 40 messages to avoid token overflow

      if (history?.length) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    // ── Build current user turn ─────────────────────────────────────────────
    let promptBody = prompt || "";
    if (subject) promptBody = `[Môn học: ${subject}] ${promptBody}`;
    if (fileContext) {
      promptBody = `[Tài liệu đính kèm]:\n"""\n${fileContext}\n"""\n\n[Yêu cầu]: ${promptBody}`;
    }

    const currentParts: any[] = [{ text: promptBody }];
    if (imagesBase64?.length) {
      for (const b64 of imagesBase64) {
        const data = b64.includes(",") ? b64.split(",")[1] : b64;
        const mimeType =
          b64.includes("jpeg") || b64.includes("jpg") ? "image/jpeg" : "image/png";
        currentParts.push({ inlineData: { data, mimeType } });
      }
    }
    contents.push({ role: "user", parts: currentParts });

    // ── System instruction ──────────────────────────────────────────────────
    let systemInstruction = `Bạn là Gia Sư Học Tập Cao Cấp của nền tảng TCK Tài Liệu.
Mục tiêu: đồng hành, giải thích và hỗ trợ học sinh Việt Nam học tốt nhất các môn học từ Lớp 1 đến Lớp 12 & Đại Học.

Quy tắc:
1. **Rõ ràng & Có cấu trúc**: Dùng Markdown có tiêu đề và gạch đầu dòng.
2. **Giải thích từng bước**: Không bao giờ chỉ đưa đáp án. Phân tích đề, chỉ phương pháp, giải chi tiết.
3. **Thân thiện & Truyền cảm hứng**: Khuyến khích học sinh.
4. **Toán/Lý/Hóa/Sinh**: Dùng LaTeX cho công thức. Giải thích hiện tượng cặn kẽ.
5. **Văn học**: Phân tích sâu luận điểm, viết đoạn văn mẫu mạch lạc.
6. **Tiếng Anh**: Dịch rõ ràng, phân tích ngữ pháp, kèm ví dụ.
7. **Tài liệu đính kèm**: Phân tích trung thực dựa trên ngữ cảnh tài liệu.`;

    if (mode === "summarize") {
      systemInstruction += "\n\n[Chế độ: Tóm tắt] Tập trung tóm tắt luận điểm chính, cấu trúc, thuật ngữ và kết luận ngắn gọn.";
    } else if (mode === "quiz") {
      systemInstruction += "\n\n[Chế độ: Trắc nghiệm] Tạo 5–10 câu trắc nghiệm 4 lựa chọn (A/B/C/D) kèm đáp án giải thích.";
    } else if (mode === "notes") {
      systemInstruction += "\n\n[Chế độ: Ghi chú] Biến tài liệu thành cheat sheet học tập khoa học, dễ ghi nhớ.";
    }

    // Personalise from profile
    if (!isGuest && user && supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .single();

      if (profile) {
        systemInstruction += `\n\n[Học sinh]: ${profile.full_name || "Bạn"} — ${profile.bio || "Học sinh TCK"}. Xưng hô thân mật và cá nhân hóa phong cách giảng dạy.`;
      }
    }

    // ── Gemini call with retry & failover ───────────────────────────────────
    let responseStream: any = null;
    let chosenKey = "";
    const maxAttempts = Math.min(3, 10); // try up to 3 different keys

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let clientInfo: any;
      try {
        clientInfo = getBalancedGenAiClient();
        chosenKey = clientInfo.rawKey;
      } catch (err: any) {
        return jsonError(err.message || "Không có API key khả dụng.", 503);
      }

      const t0 = Date.now();
      try {
        console.log(`[AI Route] Attempt ${attempt}/${maxAttempts} → key#${clientInfo.keyIndex}`);
        responseStream = await clientInfo.client.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config: { systemInstruction },
        });
        markKeySuccess(clientInfo.rawKey, Date.now() - t0);
        chosenKey = clientInfo.rawKey;
        break; // success
      } catch (err: any) {
        console.error(`[AI Route] key#${clientInfo.keyIndex} error:`, err?.message);
        putKeyOnCooldown(clientInfo.rawKey);
        if (attempt === maxAttempts) {
          return jsonError(friendlyError(err), 503);
        }
        // try next key
      }
    }

    if (!responseStream) {
      return jsonError("Không thể kết nối AI lúc này. Vui lòng thử lại.", 503);
    }

    // ── Stream response to client ───────────────────────────────────────────
    const encoder = new TextEncoder();
    let aiText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text: string = chunk.text || "";
            if (text) {
              aiText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error("[AI Route] Stream error:", err?.message);
          putKeyOnCooldown(chosenKey);
          // Send a graceful error message in the stream instead of crashing
          const errorMsg = "\n\n⚠️ *AI đang bận, vui lòng thử lại sau vài giây.*";
          controller.enqueue(encoder.encode(errorMsg));
          controller.close();
          return;
        }

        // ── Persist to database in background ────────────────────────────
        if (!isGuest && user) {
          try {
            const adminSupabase = await createAdminClient();
            await Promise.all([
              adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "user", content: prompt }),
              adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "model", content: aiText }),
              adminSupabase.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId),
              adminSupabase.from("ai_logs").insert({ user_id: user.id, prompt: promptBody, response: aiText }),
            ]);
          } catch (dbErr) {
            console.error("[AI Route] DB persist error:", dbErr);
            // Non-fatal — don't crash the response
          }
        }
      },
      cancel() {
        console.log("[AI Route] Stream cancelled by client.");
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
    console.error("[AI Route] Unhandled error:", error);
    return jsonError(error.message || "Lỗi máy chủ nội bộ.", 500);
  }
}
