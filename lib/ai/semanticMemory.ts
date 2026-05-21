export interface SemanticMemory {
  topics: string[];
  preferences: string[];
}

export function extractSemanticMemory(messages: any[]): SemanticMemory {
  // A lightweight heuristic to extract user context without a DB or extra LLM call
  // We look for patterns in the recent messages
  const topics = new Set<string>();
  const preferences = new Set<string>();

  for (const m of messages) {
    if (m.role === "user") {
      const text = m.content.toLowerCase();
      if (text.includes("toán") || text.includes("phương trình") || text.includes("tích phân")) topics.add("Toán học");
      if (text.includes("lý") || text.includes("động lực học") || text.includes("vật lý")) topics.add("Vật lý");
      if (text.includes("hóa") || text.includes("phản ứng") || text.includes("axit")) topics.add("Hóa học");
      if (text.includes("code") || text.includes("react") || text.includes("python") || text.includes("javascript") || text.includes("lập trình")) topics.add("Lập trình");
      if (text.includes("tiếng anh") || text.includes("ielts") || text.includes("dịch")) topics.add("Tiếng Anh");

      if (text.includes("ngắn gọn") || text.includes("tóm tắt")) preferences.add("Ngắn gọn");
      if (text.includes("chi tiết") || text.includes("cụ thể")) preferences.add("Chi tiết");
      if (text.includes("tiếng việt")) preferences.add("Tiếng Việt");
      if (text.includes("tiếng anh")) preferences.add("Tiếng Anh");
    }
  }

  return {
    topics: Array.from(topics).slice(-3), // Top 3 recent topics
    preferences: Array.from(preferences).slice(-3)
  };
}
