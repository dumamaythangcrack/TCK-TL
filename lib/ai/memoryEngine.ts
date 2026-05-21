export interface MemoryModel {
  shortTermHistory: any[];
  semanticMemory: {
    topics: string[];
    preferences: string[];
    userBio?: string;
    studentName?: string;
  };
}

export function processMemory(
  messages: any[],
  profileName?: string,
  profileBio?: string,
  preferences?: { length: string; tone: string }
): MemoryModel {
  const topics = new Set<string>();
  const prefSet = new Set<string>();

  // Extract from profile preferences
  if (preferences) {
    if (preferences.length) {
      prefSet.add(preferences.length === "concise" ? "Thích câu trả lời ngắn gọn" : "Thích giải thích chi tiết");
    }
    if (preferences.tone) {
      prefSet.add(preferences.tone === "friendly" ? "Giọng điệu thân thiện, ấm áp" : "Giọng điệu học thuật, trang trọng");
    }
  }

  // Scan recent history to dynamically extract learning interests/needs (semantic memory)
  for (const msg of messages) {
    if (msg.role === "user") {
      const text = msg.content.toLowerCase();
      
      // Classify subjects/topics
      if (text.includes("toán") || text.includes("phương trình") || text.includes("tích phân") || text.includes("latex")) {
        topics.add("Toán học");
      }
      if (text.includes("lý") || text.includes("vật lý") || text.includes("động lực") || text.includes("vận tốc")) {
        topics.add("Vật lý");
      }
      if (text.includes("hóa") || text.includes("phản ứng") || text.includes("hữu cơ") || text.includes("axit")) {
        topics.add("Hóa học");
      }
      if (text.includes("code") || text.includes("react") || text.includes("javascript") || text.includes("lập trình") || text.includes("hàm")) {
        topics.add("Lập trình");
      }
      if (text.includes("tiếng anh") || text.includes("ielts") || text.includes("grammar") || text.includes("vocabulary")) {
        topics.add("Tiếng Anh");
      }
      if (text.includes("văn") || text.includes("tác phẩm") || text.includes("phân tích bài thơ") || text.includes("ngữ văn")) {
        topics.add("Ngữ văn");
      }

      // Check tone preferences
      if (text.includes("ngắn gọn thôi") || text.includes("tóm tắt")) {
        prefSet.add("Ưu tiên câu trả lời ngắn gọn, súc tích");
      }
      if (text.includes("giải thích kỹ") || text.includes("chi tiết")) {
        prefSet.add("Ưu tiên giải thích chi tiết từng bước");
      }
    }
  }

  return {
    shortTermHistory: messages.slice(-25), // Keep last 25 messages for immediate context
    semanticMemory: {
      topics: Array.from(topics).slice(-3), // Keep top 3 topics
      preferences: Array.from(prefSet).slice(-3),
      userBio: profileBio,
      studentName: profileName
    }
  };
}

export function deduplicateHistory(messages: any[]): any[] {
  const seen = new Set<string>();
  return messages.filter((msg) => {
    // Generate a unique fingerprint for each message to avoid double inserts
    const fingerprint = `${msg.role}:${msg.content.trim().slice(0, 100)}`;
    if (seen.has(fingerprint)) {
      return false;
    }
    seen.add(fingerprint);
    return true;
  });
}
