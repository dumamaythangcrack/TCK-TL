import { getModelFallbackChain } from "./router";

export type TaskType = 
  | "CHAT" 
  | "MATH" 
  | "CODE" 
  | "TRANSLATION" 
  | "FILE_QA" 
  | "REASONING" 
  | "SUMMARIZE" 
  | "TUTORING" 
  | "EXAM" 
  | "OCR";

export function getFallbackChain(taskType: TaskType, hasLongContext: boolean = false): string[] {
  return getModelFallbackChain(taskType, hasLongContext);
}

