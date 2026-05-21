export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(text: string, chunkSize: number = 1500, overlap: number = 200): TextChunk[] {
  if (!text || text.trim() === "") return [];

  const chunks: TextChunk[] = [];
  let i = 0;
  let index = 0;

  while (i < text.length) {
    let end = i + chunkSize;
    
    // Try to break at a newline or period if possible
    if (end < text.length) {
      const naturalBreak = text.lastIndexOf('\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);
      
      if (naturalBreak > i + chunkSize / 2) {
        end = naturalBreak + 1;
      } else if (sentenceBreak > i + chunkSize / 2) {
        end = sentenceBreak + 2;
      }
    }

    const chunkStr = text.slice(i, end).trim();
    if (chunkStr.length > 0) {
      chunks.push({ text: chunkStr, index });
      index++;
    }

    i = end - overlap;
    if (i < 0 || end >= text.length) {
      break;
    }
  }

  return chunks;
}
