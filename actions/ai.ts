"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ai } from "@/lib/ai/gemini";
import { revalidatePath } from "next/cache";

interface ChatMessageRequest {
  chatId: string;
  prompt: string;
  imagesBase64?: string[]; // OCR image inputs
  fileContext?: string;    // Text content extracted from PDF/Word/Excel
  subject?: string;        // Math, Literature, Physics, Chemistry, Biology, English
  mode?: "chat" | "summarize" | "quiz" | "notes";
}

/**
 * Creates a new AI chat thread.
 */
export async function createAiChat(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized. Please log in to start an AI chat.");
  }

  const { data, error } = await supabase
    .from("ai_chats")
    .insert({
      user_id: user.id,
      title: title || "Cuộc hội thoại mới",
    })
    .select()
    .single();

  if (error) {
    console.error("Create AI Chat Error:", error);
    throw new Error("Failed to create chat thread.");
  }

  return data;
}

/**
 * Lists all chat threads for the current user.
 */
export async function getAiChats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Get AI Chats Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Deletes a chat thread.
 */
export async function deleteAiChat(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized.");

  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete AI Chat Error:", error);
    throw new Error("Failed to delete chat thread.");
  }

  return { success: true };
}

/**
 * Gets messages in a chat thread.
 */
export async function getAiMessages(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get AI Messages Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Sends a message in a chat thread and returns the AI response.
 * Implements extreme Vietnamese teacher logic for Math, Literature, English, Physics, Chemistry, Biology.
 */
export async function sendAiChatMessage(data: ChatMessageRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      success: false,
      error: "Hệ thống chưa cấu hình khóa API Gemini (GEMINI_API_KEY). Vui lòng thêm biến môi trường này trong trang quản trị Vercel.",
    };
  }

  const isGuest = data.chatId === "guest-session";
  let user: any = null;

  if (!isGuest) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: false, error: "Unauthorized. Vui lòng đăng nhập." };
    }
    user = authUser;
  }

  let history: any[] = [];
  if (!isGuest) {
    // Pre-fetch previous message history to maintain conversational context
    const supabase = await createClient();
    const { data: fetchedHistory, error: historyError } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
    } else {
      history = fetchedHistory || [];
    }
  }

  // Build the contents block for Gemini
  const contents: any[] = [];

  // Append history
  if (history && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  // Prepare current user message body
  let promptBody = data.prompt;

  if (data.subject) {
    promptBody = `[Môn học: ${data.subject}] ${promptBody}`;
  }

  if (data.fileContext) {
    promptBody = `[Tài liệu đính kèm]:\n"""\n${data.fileContext}\n"""\n\n[Yêu cầu]: ${promptBody}`;
  }

  const currentParts: any[] = [{ text: promptBody }];

  // Append images if present
  if (data.imagesBase64 && data.imagesBase64.length > 0) {
    for (const base64 of data.imagesBase64) {
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

  // Determine system instruction based on learning mode
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

  if (data.mode === "summarize") {
    systemInstruction += "\n\n[Chế độ: Tóm tắt tài liệu]: Tập trung tóm tắt các luận điểm chính, cấu trúc tài liệu, thuật ngữ quan trọng và rút ra kết luận ngắn gọn, súc tích nhất.";
  } else if (data.mode === "quiz") {
    systemInstruction += "\n\n[Chế độ: Tạo câu hỏi trắc nghiệm]: Hãy tạo từ 5 đến 10 câu hỏi trắc nghiệm kèm 4 lựa chọn (A, B, C, D) dựa trên nội dung được cung cấp hoặc chủ đề yêu cầu. Có đáp án giải thích chi tiết ở cuối.";
  } else if (data.mode === "notes") {
    systemInstruction += "\n\n[Chế độ: Tạo ghi chú]: Hãy biến tài liệu học tập hoặc chủ đề này thành một trang ghi chú học tập (Cheat sheet / Study Guide) cực kỳ khoa học, dễ ghi nhớ.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    const aiResponseText = response.text || "AI không thể đưa ra câu trả lời vào lúc này.";

    if (isGuest) {
      return {
        success: true,
        message: { role: "model", content: aiResponseText },
      };
    }

    // Insert user message and AI message into DB
    const adminSupabase = await createAdminClient();
    
    // User message log
    await adminSupabase.from("ai_messages").insert({
      chat_id: data.chatId,
      role: "user",
      content: data.prompt,
    });

    // Model message log
    const { data: insertedMsg } = await adminSupabase.from("ai_messages").insert({
      chat_id: data.chatId,
      role: "model",
      content: aiResponseText,
    }).select().single();

    // Update Chat thread timestamp
    await adminSupabase
      .from("ai_chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.chatId);

    // Track in general AI logs for statistics
    await adminSupabase.from("ai_logs").insert({
      user_id: user.id,
      prompt: promptBody,
      response: aiResponseText,
    });

    return {
      success: true,
      message: insertedMsg || { role: "model", content: aiResponseText },
    };
  } catch (error: any) {
    console.error("Gemini Chat Action Error:", error);
    return {
      success: false,
      error: error.message || "Gặp lỗi khi kết nối với mô hình AI Gemini.",
    };
  }
}

/**
 * Fetches standard historical AI interaction logs for stats display.
 */
export async function getAiHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch AI History Error:", error);
    return [];
  }

  return data || [];
}

