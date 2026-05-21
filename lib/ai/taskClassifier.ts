import { TaskType } from "@/lib/openrouter/fallback";

export function classifyTask(prompt: string, subject: string, mode: string, hasFiles: boolean): TaskType {
  const text = prompt.toLowerCase();

  if (hasFiles) return "FILE_QA";
  
  if (mode === "summarize") return "SUMMARIZE";
  if (mode === "quiz" || mode === "notes") return "TUTORING";
  
  if (subject === "math" || subject === "physics" || subject === "chemistry") {
    if (text.includes("giải") || text.includes("tính") || text.includes("chứng minh")) {
      return "MATH";
    }
    return "TUTORING";
  }
  
  if (subject === "it") {
    if (text.includes("code") || text.includes("viết") || text.includes("fix") || text.includes("lỗi") || text.includes("bug")) {
      return "CODE";
    }
  }

  if (subject === "english" || text.includes("dịch") || text.includes("translate")) {
    return "TRANSLATION";
  }

  // Detect reasoning requirements
  if (
    text.includes("tại sao") || 
    text.includes("phân tích") || 
    text.includes("logic") ||
    text.includes("suy luận") ||
    text.includes("giải thích chi tiết")
  ) {
    return "REASONING";
  }

  return "CHAT";
}
