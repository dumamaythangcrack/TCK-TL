const STOPWORDS = new Set([
  "và", "của", "là", "các", "có", "trong", "cho", "để", "với", "tại", "nhà", "này", "ra", "vào",
  "the", "of", "and", "to", "a", "in", "is", "that", "it", "on", "for", "with", "as", "at", "by", "an"
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts and returns the most contextually relevant sections of a document matching the user query.
 * Restricts output size to maxChars to save tokens and prevent API latency.
 */
export function limitFileContext(fileContext: string, query: string, maxChars = 8000): string {
  if (!fileContext || fileContext.length <= maxChars) {
    return fileContext;
  }

  // Tokenize and clean query
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u1EF9]/g, "")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

  // If query tokens are empty, return the beginning of the file
  if (queryTokens.length === 0) {
    return fileContext.slice(0, maxChars) + "\n\n[...Nội dung bị cắt do quá dài...]";
  }

  // Split content into paragraphs
  const paragraphs = fileContext.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: { text: string; index: number; score: number }[] = [];

  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if ((currentChunk + "\n" + para).length > 1200) {
      if (currentChunk) {
        chunks.push({ text: currentChunk, index: chunkIndex++, score: 0 });
      }
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n" + para : para;
    }
  }
  if (currentChunk) {
    chunks.push({ text: currentChunk, index: chunkIndex++, score: 0 });
  }

  // Score each chunk
  for (const chunk of chunks) {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      const regex = new RegExp(escapeRegExp(token), "g");
      const matches = chunkLower.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    chunk.score = score;
  }

  // Sort descending by score, then ascending by original index
  const sorted = [...chunks].sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: typeof chunks = [];
  let currentLength = 0;

  // Always keep first chunk as it represents document metadata/intro
  if (chunks.length > 0) {
    selected.push(chunks[0]);
    currentLength += chunks[0].text.length;
  }

  for (const chunk of sorted) {
    if (chunk.index === 0) continue; // already added

    if (currentLength + chunk.text.length + 50 > maxChars) {
      break;
    }

    selected.push(chunk);
    currentLength += chunk.text.length + 50;
  }

  // Sort selected chunks back to original chronology
  selected.sort((a, b) => a.index - b.index);

  let output = selected.map((c) => c.text).join("\n\n---\n\n");
  if (currentLength < fileContext.length) {
    output += "\n\n[...Đã lọc bớt nội dung không liên quan để tiết kiệm token...]";
  }

  return output;
}
