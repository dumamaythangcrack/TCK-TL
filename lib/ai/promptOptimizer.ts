import { TaskType } from "@/lib/openrouter/fallback";

export function optimizePrompt(prompt: string, taskType: TaskType): string {
  let optimized = prompt.trim();

  // Basic cleanup
  optimized = optimized.replace(/\\n{3,}/g, '\\n\\n');

  // We could inject specific instructions here based on task type,
  // but since we already build the system prompt thoroughly in orchestrator/context,
  // we just do lightweight user-prompt optimization here.
  
  if (taskType === "CODE" && !optimized.includes("clean code")) {
    // Optionally append small behavioral hints to user prompt if needed
    // But usually better to keep user prompt pristine and rely on system prompt.
  }

  return optimized;
}
