import * as pdf from "pdf-parse";
import mammoth from "mammoth";
import * as xlsx from "xlsx";

const pdfParse = (pdf as any).default || pdf;

/**
 * Extracts raw text from a document buffer based on its MIME type or extension.
 */
export async function parseFile(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  try {
    if (ext === "pdf" || mimeType === "application/pdf") {
      const parsed = await pdfParse(buffer);
      return parsed.text || "";
    }

    if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
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

    // Default: treat as text file
    return buffer.toString("utf-8");
  } catch (error: any) {
    console.error(`[File Parser] Error parsing ${filename}:`, error);
    throw new Error(`Không thể trích xuất văn bản từ tệp "${filename}": ${error.message || error}`);
  }
}
