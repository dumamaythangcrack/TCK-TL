import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getBalancedGenAiClient, putKeyOnCooldown } from "@/lib/gemini/loadBalancer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { chatId, prompt, imagesBase64, fileContext, subject, mode } = await req.json();

    if (!prompt && (!imagesBase64 || imagesBase64.length === 0)) {
      return Response.json({ success: false, error: "Nội dung câu hỏi trống." }, { status: 400 });
    }

    const isGuest = chatId === "guest-session";
    let user: any = null;
    let supabase: any = null;

    if (!isGuest) {
      supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return Response.json({ success: false, error: "Unauthorized. Vui lòng đăng nhập." }, { status: 401 });
      }
      user = authUser;
    }

    // 1. Fetch historical messages
    let history: any[] = [];
    if (!isGuest && supabase) {
      const { data: fetchedHistory, error: historyError } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (historyError) {
        console.error("[Streaming API] History fetch error:", historyError);
      } else {
        history = fetchedHistory || [];
      }
    }

    // 2. Build conversational contents for Gemini API
    const contents: any[] = [];

    // Add chat history
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Prepare current user prompt parts
    let promptBody = prompt;

    if (subject) {
      promptBody = `[Môn học: ${subject}] ${promptBody}`;
    }

    if (fileContext) {
      promptBody = `[Tài liệu đính kèm]:\n"""\n${fileContext}\n"""\n\n[Yêu cầu]: ${promptBody}`;
    }

    const currentParts: any[] = [{ text: promptBody }];

    // Append base64 images if present
    if (imagesBase64 && imagesBase64.length > 0) {
      for (const base64 of imagesBase64) {
        const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
        const mimeType = base64.includes("jpeg") || base64.includes("jpg") ? "image/jpeg" : "image/png";
        currentParts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
      }
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    // 3. System Instruction
    let systemInstruction = `Bạn là một Giáo Viên Học Tập Cao Cấp của nền tảng TCK Tài Liệu.
Mục tiêu của bạn là đồng hành, giải thích và hỗ trợ học sinh Việt Nam học tốt nhất các môn học Toán, Lý, Hóa, Sinh, Văn, Anh từ Lớp 1 đến Lớp 12 & Đại Học.

Quy tắc giảng dạy:
1. **Rõ ràng & Có cấu trúc**: Luôn trình bày câu trả lời bằng Markdown có tiêu đề, gạch đầu dòng rõ ràng.
2. **Giải thích từng bước (Step-by-step)**: Không bao giờ chỉ đưa ra đáp án cuối cùng. Phân tích đề bài, chỉ ra phương pháp giải, giải chi tiết từng bước, thay số vào công thức (nếu có), và rút ra bài học.
3. **Thân thiện & Tận tâm**: Sử dụng tông giọng truyền cảm hứng, khuyến khích học sinh.
4. **Môn học chuyên biệt**:
   - **Toán/Lý/Hóa/Sinh**: Ghi rõ các định lý, công thức sử dụng bằng ký hiệu LaTeX đẹp. Giải thích cặn kẽ hiện tượng.
   - **Văn học**: Phân tích sâu sắc luận điểm luận cứ, viết đoạn văn/bài văn mẫu mạch lạc, chuẩn mực.
   - **Tiếng Anh**: Dịch nghĩa rõ ràng, phân tích cấu trúc ngữ pháp và từ vựng mới kèm ví dụ.
5. **Đọc tài liệu**: Nếu có tài liệu đính kèm, hãy phân tích dựa trên ngữ cảnh tài liệu đó một cách trung thực nhất.`;

    if (mode === "summarize") {
      systemInstruction += "\n\n[Chế độ: Tóm tắt tài liệu]: Tập trung tóm tắt các luận điểm chính, cấu trúc tài liệu, thuật ngữ quan trọng và rút ra kết luận ngắn gọn, súc tích nhất.";
    } else if (mode === "quiz") {
      systemInstruction += "\n\n[Chế độ: Tạo câu hỏi trắc nghiệm]: Hãy tạo từ 5 đến 10 câu hỏi trắc nghiệm kèm 4 lựa chọn (A, B, C, D) dựa trên nội dung được cung cấp hoặc chủ đề yêu cầu. Có đáp án giải thích chi tiết ở cuối.";
    } else if (mode === "notes") {
      systemInstruction += "\n\n[Chế độ: Tạo ghi chú]: Hãy biến tài liệu học tập hoặc chủ đề này thành một trang ghi chú học tập (Cheat sheet / Study Guide) cực kỳ khoa học, dễ ghi nhớ.";
    }

    // 4. Fetch user profile for Memory System
    if (!isGuest && user && supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .single();

      if (profile) {
        systemInstruction += `\n\n[Thông tin học sinh]:
- Họ và tên: ${profile.full_name || "Chưa cung cấp"}
- Lớp học/Giới thiệu: ${profile.bio || "Chưa cung cấp"}
Hãy nhớ thông tin này để xưng hô thân mật với người dùng và cá nhân hóa phong cách giảng dạy phù hợp với thông tin lớp học/mục tiêu của họ.`;
      }
    }

    // 5. Get balanced Gemini client with retry
    let clientInfo: any = null;
    let responseStream: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        clientInfo = getBalancedGenAiClient();
      } catch (err: any) {
        return Response.json({ success: false, error: err.message || "Không có API key khả dụng." }, { status: 500 });
      }

      try {
        console.log(`[Stream API] Attempt ${attempts}/${maxAttempts} using: ${clientInfo.keyName}`);
        responseStream = await clientInfo.client.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction,
          },
        });
        break; // Success!
      } catch (err: any) {
        console.error(`[Stream API] Error on key ${clientInfo.keyName}:`, err);
        lastError = err;
        putKeyOnCooldown(clientInfo.rawKey);

        if (attempts < maxAttempts) {
          console.log(`[Stream API] Retrying with another key...`);
          continue;
        }
      }
    }

    if (!responseStream) {
      const isOverloaded = lastError?.message?.includes("503") || lastError?.message?.includes("demand") || lastError?.status === "UNAVAILABLE";
      const errorMsg = isOverloaded
        ? "Mô hình AI hiện đang quá tải do nhu cầu sử dụng cao. Vui lòng thử lại sau ít phút!"
        : "Không thể kết nối với dịch vụ Gemini AI lúc này. Vui lòng thử lại.";
      return Response.json({ success: false, error: errorMsg }, { status: 503 });
    }

    // 6. Create ReadableStream to send text chunks to frontend
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          let aiText = "";
          for await (const chunk of responseStream) {
            const text = chunk.text || "";
            aiText += text;
            controller.enqueue(encoder.encode(text));
          }
          controller.close();

          // 7. Save conversation to Database in background
          if (!isGuest && user) {
            const adminSupabase = await createAdminClient();

            // Save User message
            await adminSupabase.from("ai_messages").insert({
              chat_id: chatId,
              role: "user",
              content: prompt,
            });

            // Save AI response message
            await adminSupabase.from("ai_messages").insert({
              chat_id: chatId,
              role: "model",
              content: aiText,
            });

            // Update chat thread timestamp
            await adminSupabase
              .from("ai_chats")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", chatId);

            // Log general usage for analytics
            await adminSupabase.from("ai_logs").insert({
              user_id: user.id,
              prompt: promptBody,
              response: aiText,
            });
          }
        } catch (err) {
          console.error("[Stream API] Error during chunk rendering:", err);
          if (clientInfo && clientInfo.rawKey) {
            putKeyOnCooldown(clientInfo.rawKey);
          }
          controller.error(err);
        }
      },
      cancel(reason) {
        console.log("[Stream API] Connection aborted/canceled by user:", reason);
      }
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("[Stream API POST Error]:", error);
    return Response.json({ success: false, error: error.message || "Internal server error." }, { status: 500 });
  }
}
