import * as pdf from "pdf-parse";
import mammoth from "mammoth";
import * as xlsx from "xlsx";

const pdfParse = (pdf as any).default || pdf;

/**
 * Extracts formatted text from a document buffer based on its MIME type or extension.
 */
export async function parseFile(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  try {
    if (ext === "pdf" || mimeType === "application/pdf") {
      const parsed = await pdfParse(buffer);
      const text = parsed.text || "";
      if (text.trim().length < 100) {
        return text + "\n\n[Lưu ý hệ thống: Tài liệu PDF này dường như là ảnh quét không có text lớp. Bạn có thể sử dụng ảnh chụp tài liệu này để AI nhận diện tốt hơn.]";
      }
      return text;
    }

    if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Use convertToHtml to keep tables, lists, and bold text layouts readable for LLMs
      const result = await mammoth.convertToHtml({ buffer });
      return result.value || "";
    }

    if (
      ext === "xlsx" ||
      ext === "xls" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let fullText = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          fullText += `--- Trang tính: ${sheetName} ---\n${csv}\n\n`;
        }
      });
      return fullText;
    }

    // Auto-detect txt file encoding
    const encodings = ["utf-8", "utf-16le", "windows-1258", "latin1"];
    for (const enc of encodings) {
      try {
        const decoded = new TextDecoder(enc, { fatal: true }).decode(buffer);
        if (decoded.trim().length > 0) {
          return decoded;
        }
      } catch {}
    }

    // Default fallback
    return buffer.toString("utf-8");
  } catch (error: any) {
    console.error(`[File Parser] Error parsing ${filename}:`, error);
    throw new Error(`Không thể trích xuất văn bản từ tệp "${filename}": ${error.message || error}`);
  }
}

