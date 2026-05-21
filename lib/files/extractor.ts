import { parseFile } from "./parser";
import { chunkText, TextChunk } from "./chunker";

export interface ExtractedDocument {
  rawText: string;
  chunks: TextChunk[];
  wordCount: number;
}

export async function extractDocumentContent(
  buffer: Buffer, 
  mimeType: string, 
  filename: string
): Promise<ExtractedDocument> {
  let text = await parseFile(buffer, mimeType, filename);
  
  // Clean whitespace
  text = text.replace(/\\r\\n/g, '\\n').replace(/\\n{3,}/g, '\\n\\n').trim();
  
  const wordCount = text.split(/\\s+/).length;
  const chunks = chunkText(text, 1500, 200);

  return {
    rawText: text,
    chunks,
    wordCount
  };
}
