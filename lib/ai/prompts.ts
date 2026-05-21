import { GENERAL_PROMPT } from "./prompts/general";
import { MATH_PROMPT } from "./prompts/math";
import { ENGLISH_PROMPT } from "./prompts/english";
import { PHYSICS_PROMPT } from "./prompts/physics";
import { CHEMISTRY_PROMPT } from "./prompts/chemistry";
import { BIOLOGY_PROMPT } from "./prompts/biology";
import { LITERATURE_PROMPT } from "./prompts/literature";
import { HISTORY_PROMPT } from "./prompts/history";
import { GEOGRAPHY_PROMPT } from "./prompts/geography";
import { IT_PROMPT } from "./prompts/it";

/**
 * Returns the customized system instruction based on learning mode, subject mode, profile, and preferences.
 */
export function getSystemInstruction(
  mode?: string,
  subject?: string,
  profileName?: string,
  profileBio?: string,
  preferences?: { length?: string; tone?: string }
): string {
  // Determine base prompt based on subject mode id or subject name (fallback to general)
  let basePrompt = GENERAL_PROMPT;
  const sub = (subject || "").toLowerCase().trim();

  if (sub === "math" || sub === "toán" || sub === "toán học") {
    basePrompt = MATH_PROMPT;
  } else if (sub === "english" || sub === "tiếng anh" || sub === "anh văn") {
    basePrompt = ENGLISH_PROMPT;
  } else if (sub === "physics" || sub === "vật lý" || sub === "vật lí") {
    basePrompt = PHYSICS_PROMPT;
  } else if (sub === "chemistry" || sub === "hóa học" || sub === "hóa") {
    basePrompt = CHEMISTRY_PROMPT;
  } else if (sub === "biology" || sub === "sinh học" || sub === "sinh") {
    basePrompt = BIOLOGY_PROMPT;
  } else if (sub === "literature" || sub === "ngữ văn" || sub === "văn" || sub === "văn học") {
    basePrompt = LITERATURE_PROMPT;
  } else if (sub === "history" || sub === "lịch sử" || sub === "sử") {
    basePrompt = HISTORY_PROMPT;
  } else if (sub === "geography" || sub === "địa lý" || sub === "địa") {
    basePrompt = GEOGRAPHY_PROMPT;
  } else if (sub === "it" || sub === "lập trình" || sub === "tin học" || sub === "programming") {
    basePrompt = IT_PROMPT;
  }

  let prompt = `${basePrompt}

## Phong cách trả lời mặc định:
- Trình bày trực quan, sử dụng **Markdown** chuẩn: dùng tiêu đề (##, ###), bullet lists (-), in đậm (**text**), bảng biểu và khối code (\`\`\`).
- Giải thích **từng bước** rõ ràng, logic. Luôn cung cấp lời giải thích bên cạnh đáp án cuối cùng.
- Không lặp lại câu hỏi của người dùng.
- **Nhớ toàn bộ ngữ cảnh cuộc trò chuyện** — luôn liên kết câu trả lời với các tin nhắn trước.

## Công thức & Ký hiệu Khoa học (BẮT BUỘC):
- Dùng ký hiệu LaTeX được bao quanh bởi ký tự \`$\` (cho công thức nội dòng, ví dụ: \`$E = mc^2$\`) hoặc \`$$\` (cho công thức khối hiển thị căn giữa, ví dụ: \`$$\\int x dx = \\frac{x^2}{2} + C$$\`).
- Áp dụng nghiêm ngặt cho tất cả các môn Toán học, Vật lý, Hóa học và khoa học tự nhiên khác.`;

  // Inject preferences instructions
  if (preferences) {
    if (preferences.length === "concise") {
      prompt += "\n\n## Yêu cầu về độ dài:\n- BẮT BUỘC: Trả lời cực kỳ ngắn gọn, súc tích, đi thẳng vào đáp án và tóm tắt ý chính. Tránh phân tích dài dòng.";
    } else if (preferences.length === "detailed") {
      prompt += "\n\n## Yêu cầu về độ dài:\n- BẮT BUỘC: Giải thích chi tiết, đầy đủ thông tin, trình bày sâu sắc mọi khía cạnh và phân tích cụ thể từng bước.";
    }

    if (preferences.tone === "friendly") {
      prompt += "\n\n## Yêu cầu về giọng điệu:\n- Hãy dùng giọng điệu thân thiện, ấm áp, gần gũi, khích lệ và dùng đại từ xưng hô tạo thiện cảm.";
    } else if (preferences.tone === "academic") {
      prompt += "\n\n## Yêu cầu về giọng điệu:\n- Hãy dùng giọng điệu khoa học, học thuật, trang trọng, lập luận sắc bén và từ ngữ chuyên ngành chính xác.";
    }
  }

  if (mode === "summarize") {
    prompt += "\n\n## Chế độ hoạt động: Tóm tắt\nHãy tóm tắt nội dung tài liệu một cách cực kỳ cô đọng. Chỉ liệt kê các luận điểm quan trọng bằng gạch đầu dòng, không giải thích dài dòng.";
  } else if (mode === "quiz") {
    prompt += "\n\n## Chế độ hoạt động: Trắc nghiệm\nTạo 5 câu hỏi trắc nghiệm khách quan (A/B/C/D) liên quan đến chủ đề thảo luận. Đưa đáp án và giải thích ngắn gọn ở cuối.";
  } else if (mode === "notes") {
    prompt += "\n\n## Chế độ hoạt động: Ghi chú\nSoạn thảo một trang cheat sheet học tập: tiêu đề lớn, gạch đầu dòng phân lớp, bảng so sánh và highlight các từ khóa quan trọng nhất.";
  }

  if (profileName) {
    prompt += `\n\n## Thông tin học sinh:\n- Tên: **${profileName}**\n- Mô tả: ${profileBio || "Không có"}\nHãy xưng hô thân mật bằng tên "${profileName}" khi giao tiếp để tạo cảm giác gần gũi như gia sư thực sự.`;
  }

  return prompt;
}
