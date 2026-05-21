import { getBasePrompt } from "./systemPrompts";
import { compressContext } from "./contextCompression";
import { extractSemanticMemory } from "./semanticMemory";
import { OpenRouterMessage } from "@/lib/openrouter/client";
import { limitFileContext } from "./contextLimiter";

export interface ContextParams {
  messages: any[];
  subject: string;
  mode: string;
  profileName?: string;
  profileBio?: string;
  preferences?: { length: string; tone: string };
  fileContext?: string;
  prompt: string;
}

export function buildContext(params: ContextParams): OpenRouterMessage[] {
  const { messages, subject, mode, profileName, profileBio, preferences, fileContext, prompt } = params;

  // 1. Build System Prompt
  let systemText = getBasePrompt(subject);
  
  if (profileName) {
    systemText += `\\nBạn đang hỗ trợ học sinh tên là ${profileName}.`;
  }
  if (profileBio) {
    systemText += `\\nThông tin học sinh: ${profileBio}.`;
  }
  
  if (preferences) {
    systemText += `\\nSở thích học tập: Trả lời ${preferences.length === "concise" ? "ngắn gọn" : "chi tiết"}, giọng văn ${preferences.tone === "friendly" ? "thân thiện" : "học thuật"}.`;
  }

  if (mode === "summarize") {
    systemText += `\\nYêu cầu: Tóm tắt nội dung học sinh đưa ra một cách súc tích, đầy đủ ý chính.`;
  } else if (mode === "quiz") {
    systemText += `\\nYêu cầu: Tạo ra các câu hỏi trắc nghiệm hoặc tự luận từ nội dung để kiểm tra kiến thức.`;
  }

  // 2. Inject Semantic Memory
  const memory = extractSemanticMemory(messages);
  if (memory.topics.length > 0) {
    systemText += `\\nChủ đề gần đây: ${memory.topics.join(", ")}.`;
  }
  if (memory.preferences.length > 0) {
    systemText += `\\nLưu ý phong cách: ${memory.preferences.join(", ")}.`;
  }

  const systemMessage: OpenRouterMessage = {
    role: "system",
    content: systemText
  };

  // 3. Compress conversation history
  const history = compressContext(messages, 6000);

  // 4. Inject File Context if present
  if (fileContext) {
    const limitedContext = limitFileContext(fileContext, prompt, 8000);
    history.push({
      role: "system",
      content: `[TÀI LIỆU THAM KHẢO]\\n${limitedContext}\\n[KẾT THÚC TÀI LIỆU]`
    });
  }

  // 5. Add current prompt
  const currentMessage: OpenRouterMessage = {
    role: "user",
    content: prompt
  };

  return [systemMessage, ...history, currentMessage];
}
