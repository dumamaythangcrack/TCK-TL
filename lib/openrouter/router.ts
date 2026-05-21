import { TaskType } from "./fallback";

export function routeModel(taskType: TaskType, hasLongContext: boolean = false): string {
  if (hasLongContext) {
    // long context -> large-context model
    return "nousresearch/hermes-3-llama-3.1-405b:free"; 
  }

  switch (taskType) {
    case "REASONING":
    case "MATH":
    case "EXAM":
      // reasoning -> DeepSeek R1
      return "deepseek/deepseek-r1:free"; 
    
    case "CODE":
      // coding -> Qwen Coder
      return "qwen/qwen-2.5-coder-32b-instruct:free"; 
    
    case "CHAT":
    case "TUTORING":
      // fast chat -> Hermes
      return "nousresearch/hermes-3-llama-3.1-405b:free"; 
    
    case "TRANSLATION":
      // translation -> DeepSeek Chat
      return "deepseek/deepseek-chat-v3-0324:free"; 
    
    case "SUMMARIZE":
      // summarize -> lightweight model
      return "qwen/qwen3-32b:free"; 
    
    default:
      // Default fallback
      return "deepseek/deepseek-v4-flash:free";
  }
}

export function getModelFallbackChain(taskType: TaskType, hasLongContext: boolean = false): string[] {
  const primary = routeModel(taskType, hasLongContext);
  
  // Robust backup list prioritizing flash-based free models
  const backupRegistry = [
    "deepseek/deepseek-v4-flash:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "qwen/qwen3-32b:free",
    "arcee-ai/trinity-large-thinking:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];
  
  return Array.from(new Set([primary, ...backupRegistry]));
}
