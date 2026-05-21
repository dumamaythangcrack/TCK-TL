// Future architecture for OCR integration
export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  // TODO: Integrate with Tesseract.js, Google Vision, or OpenRouter vision models
  console.log(`[OCR] Requested extraction for image type: ${mimeType}`);
  return "Hệ thống đang nâng cấp tính năng đọc ảnh (OCR). Vui lòng thử lại sau.";
}
