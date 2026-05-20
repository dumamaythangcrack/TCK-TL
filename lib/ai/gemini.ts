import { getBalancedGenAiClient, putKeyOnCooldown } from "@/lib/gemini/loadBalancer";

// Export placeholder 'ai' instance for backward compatibility with external imports
let defaultClient: any = null;
try {
  const balanced = getBalancedGenAiClient();
  defaultClient = balanced.client;
} catch (e) {
  // If no keys configured yet, create empty dummy client
  const { GoogleGenAI } = require("@google/genai");
  defaultClient = new GoogleGenAI({ apiKey: "" });
}
export const ai = defaultClient;

export async function solveProblemWithGemini(prompt: string, imagesBase64: string[] = []) {
  try {
    const contents: any[] = [{ text: prompt }];

    if (imagesBase64 && imagesBase64.length > 0) {
      for (const base64 of imagesBase64) {
        // Strip data URL header
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

    const systemInstruction = `Bạn là AI học tập của TCK Tài Liệu. Mục tiêu: Giải bài tập cực kỳ chi tiết, từng bước, dễ hiểu, chuẩn giáo viên, thân thiện.
Quy tắc:
- Không trả lời ngắn cộc lốc.
- Không bỏ qua bước trung gian.
- Không chỉ đưa đáp án.
- Luôn giải thích rõ ràng vì sao làm như vậy.
- Toán: ghi công thức, thay số, giải từng bước, kiểm tra lại kết quả.
- Sử dụng định dạng markdown rõ ràng, tiêu đề rõ, bullet hợp lý, công thức đẹp, có kết luận cuối cùng.`;

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      let clientInfo;
      try {
        clientInfo = getBalancedGenAiClient();
      } catch (err: any) {
        throw new Error(err.message || "Hệ thống chưa cấu hình khóa API Gemini.");
      }

      try {
        console.log(`[Gemini] Running solveProblem (Attempt ${attempts}/${maxAttempts}) using: ${clientInfo.keyName}`);
        const response = await clientInfo.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            systemInstruction,
          }
        });

        return response.text;
      } catch (error: any) {
        console.error(`[Gemini] Error on key ${clientInfo.keyName}:`, error);
        lastError = error;
        putKeyOnCooldown(clientInfo.rawKey);

        if (attempts < maxAttempts) {
          console.log(`[Gemini] Attempt ${attempts} failed. Trying another key...`);
          continue;
        }
      }
    }

    const isOverloaded = lastError?.message?.includes("503") || lastError?.message?.includes("demand") || lastError?.status === "UNAVAILABLE";
    if (isOverloaded) {
      throw new Error("Mô hình AI hiện đang quá tải do nhu cầu sử dụng cao. Vui lòng thử lại sau ít phút!");
    }
    throw new Error("Không thể kết nối với dịch vụ Gemini AI lúc này. Vui lòng thử lại.");

  } catch (error: any) {
    console.error("solveProblemWithGemini Error:", error);
    throw error;
  }
}
