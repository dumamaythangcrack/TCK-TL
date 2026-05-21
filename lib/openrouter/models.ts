export type TaskCapability = 
  | "chat" 
  | "reasoning" 
  | "coding" 
  | "fileAnalysis" 
  | "longContext" 
  | "vietnamese" 
  | "math" 
  | "translation";

export type RoutingTag = 
  | "fast" 
  | "reasoning" 
  | "code" 
  | "file" 
  | "translation" 
  | "tutoring";

export interface ModelDefinition {
  id: string;
  displayName: string;
  priority: number; // 0-100, higher is better
  maxContext: number;
  capabilities: TaskCapability[];
  reasoningSupport: boolean;
  tags: RoutingTag[];
}

export const OPENROUTER_MODELS: Record<string, ModelDefinition> = {
  "deepseek/deepseek-v4-flash:free": {
    id: "deepseek/deepseek-v4-flash:free",
    displayName: "DeepSeek v4 Flash",
    priority: 100,
    maxContext: 64000,
    capabilities: ["chat", "coding", "math", "vietnamese", "translation", "reasoning", "fileAnalysis"],
    reasoningSupport: true,
    tags: ["fast", "tutoring"],
  },
  "deepseek/deepseek-r1:free": {
    id: "deepseek/deepseek-r1:free",
    displayName: "DeepSeek R1",
    priority: 95,
    maxContext: 163840,
    capabilities: ["reasoning", "math", "coding", "vietnamese", "translation"],
    reasoningSupport: true,
    tags: ["reasoning"],
  },
  "qwen/qwen-2.5-coder-32b-instruct:free": {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    displayName: "Qwen 2.5 Coder 32B",
    priority: 92,
    maxContext: 32000,
    capabilities: ["coding", "chat", "vietnamese"],
    reasoningSupport: false,
    tags: ["code"],
  },
  "arcee-ai/trinity-large-thinking:free": {
    id: "arcee-ai/trinity-large-thinking:free",
    displayName: "Trinity Large Thinking",
    priority: 90,
    maxContext: 32000,
    capabilities: ["reasoning", "math", "coding"],
    reasoningSupport: true,
    tags: ["reasoning"],
  },
  "nousresearch/hermes-3-llama-3.1-405b:free": {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    displayName: "Hermes 3 (405B)",
    priority: 85,
    maxContext: 128000,
    capabilities: ["longContext", "coding", "fileAnalysis", "chat", "vietnamese", "translation"],
    reasoningSupport: false,
    tags: ["file", "code", "translation", "tutoring"],
  },
  "deepseek/deepseek-chat-v3-0324:free": {
    id: "deepseek/deepseek-chat-v3-0324:free",
    displayName: "DeepSeek V3",
    priority: 80,
    maxContext: 64000,
    capabilities: ["chat", "coding", "vietnamese"],
    reasoningSupport: false,
    tags: ["fast"],
  },
  "qwen/qwen3-32b:free": {
    id: "qwen/qwen3-32b:free",
    displayName: "Qwen3 32B",
    priority: 75,
    maxContext: 32000,
    capabilities: ["chat", "coding", "vietnamese", "math"],
    reasoningSupport: false,
    tags: ["fast"],
  },
  "mistralai/mistral-small-3.1-24b-instruct:free": {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    displayName: "Mistral Small 3.1",
    priority: 70,
    maxContext: 32000,
    capabilities: ["chat", "translation", "coding"],
    reasoningSupport: false,
    tags: ["translation"],
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    displayName: "Llama 3.3 70B",
    priority: 65,
    maxContext: 128000,
    capabilities: ["chat", "longContext", "translation"],
    reasoningSupport: false,
    tags: ["fast"],
  }
};
