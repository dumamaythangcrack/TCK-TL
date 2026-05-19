import { GoogleGenAI } from "@google/genai";

// Ensure we have an API key, otherwise fail gracefully in dev
const apiKey = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({
  apiKey: apiKey,
});

export async function solveProblemWithGemini(prompt: string, imagesBase64: string[] = []) {
  try {
    const contents: any[] = [{ text: prompt }];

    if (imagesBase64 && imagesBase64.length > 0) {
      for (const base64 of imagesBase64) {
        // Strip the data URL part if present (e.g., data:image/png;base64,...)
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const mimeType = base64.includes('jpeg') || base64.includes('jpg') ? 'image/jpeg' : 'image/png';
        
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
      }
    }

    let response;
    const systemInstruction = `Bạn là AI học tập của TCK Tài Liệu. Mục tiêu: Giải bài tập cực kỳ chi tiết, từng bước, dễ hiểu, chuẩn giáo viên, thân thiện.
Quy tắc:
- Không trả lời ngắn cộc lốc.
- Không bỏ qua bước trung gian.
- Không chỉ đưa đáp án.
- Luôn giải thích rõ ràng vì sao làm như vậy.
- Toán: ghi công thức, thay số, giải từng bước, kiểm tra lại kết quả.
- Sử dụng định dạng markdown rõ ràng, tiêu đề rõ, bullet hợp lý, công thức đẹp, có kết luận cuối cùng.`;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Try Gemini 2.5 Flash first
        contents: contents,
        config: {
          systemInstruction,
        }
      });
    } catch (firstError: any) {
      console.warn("Primary model (gemini-2.5-flash) failed, attempting fallback to gemini-1.5-flash...", firstError);
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // Fallback to Gemini 1.5 Flash
        contents: contents,
        config: {
          systemInstruction,
        }
      });
    }

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Dịch vụ AI hiện tại đang quá tải hoặc gặp lỗi. Vui lòng thử lại sau.");
  }
}
