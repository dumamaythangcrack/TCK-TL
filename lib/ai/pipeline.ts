import { classifyTask } from "./taskClassifier";
import { TaskType } from "@/lib/openrouter/fallback";
import { optimizePrompt } from "./promptOptimizer";
import { getSystemInstruction } from "./prompts";
import { processMemory, deduplicateHistory } from "./memoryEngine";
import { optimizeContext } from "./contextOptimizer";
import { executeWithRetry } from "@/lib/openrouter/retry";
import { OpenRouterChatRequest, OpenRouterMessage } from "@/lib/openrouter/client";
import { limitFileContext } from "./contextLimiter";

export interface PipelineParams {
  chatId: string;
  prompt: string;
  subject: string;
  mode: string;
  profileName?: string;
  profileBio?: string;
  preferences?: { length: string; tone: string };
  fileContext?: string;
  messages: any[];
}

export async function runAIPipeline(
  params: PipelineParams,
  signal?: AbortSignal
): Promise<{ response: Response; modelUsed: string }> {
  // 1. Sanitize user input
  const sanitizedPrompt = params.prompt.trim().replace(/[\r\n]{3,}/g, "\n\n");

  // 2. Classify task type
  const taskType = classifyTask(sanitizedPrompt, params.subject, params.mode, !!params.fileContext);

  // 3. Extract memory & Deduplicate history
  const cleanHistory = deduplicateHistory(params.messages);
  const memory = processMemory(cleanHistory, params.profileName, params.profileBio, params.preferences);

  // 4. Optimize system instructions (Prompt optimization)
  const baseSystemPrompt = getSystemInstruction(
    params.mode,
    params.subject,
    params.profileName,
    params.profileBio,
    params.preferences
  );

  // Append semantic memory topics and preferences dynamically to the system instruction
  let finalSystemText = baseSystemPrompt;
  if (memory.semanticMemory.topics.length > 0) {
    finalSystemText += `\n\n## Kiến thức & chủ đề bạn đang thảo luận gần đây:\n- ${memory.semanticMemory.topics.join("\n- ")}`;
  }
  if (memory.semanticMemory.preferences.length > 0) {
    finalSystemText += `\n\n## Lưu ý phong cách giao tiếp:\n- ${memory.semanticMemory.preferences.join("\n- ")}`;
  }

  // 5. Compile message context
  const requestMessages: OpenRouterMessage[] = [
    { role: "system", content: finalSystemText }
  ];

  // Append history
  for (const msg of memory.shortTermHistory) {
    requestMessages.push({
      role: msg.role === "model" ? "assistant" : msg.role === "system" ? "system" : "user",
      content: msg.content
    });
  }

  // Append file context if present
  if (params.fileContext) {
    const limitedFileContext = limitFileContext(params.fileContext, sanitizedPrompt, 8000);
    requestMessages.push({
      role: "system",
      content: `[NỘI DUNG TÀI LIỆU ĐƯỢC TẢI LÊN]\n${limitedFileContext}\n[KẾT THÚC TÀI LIỆU]\nHãy dùng tài liệu này để giải quyết các câu hỏi tiếp theo.`
    });
  }

  // Optimize prompt based on task type
  const finalPrompt = optimizePrompt(sanitizedPrompt, taskType);

  // Append current user message
  requestMessages.push({
    role: "user",
    content: finalPrompt
  });

  // 6. Compress context to fit token limit
  const compressedMessages = optimizeContext(requestMessages, 10000); // 10k token limit

  // 7. Assemble request
  const request: OpenRouterChatRequest = {
    model: "deepseek/deepseek-v4-flash:free", // Will be routed dynamically in retry.ts
    messages: compressedMessages,
    stream: true,
    temperature: taskType === "REASONING" || taskType === "MATH" ? 0.2 : 0.7,
    max_tokens: 4096
  };

  // 8. Stream via executeWithRetry (circuit breaker + fallback routing)
  const result = await executeWithRetry(request, taskType, signal);

  return result;
}
