import { TextChunk } from "./chunker";

export interface HybridRankedChunk extends TextChunk {
  score: number;
}

export function searchChunksHybrid(
  query: string,
  chunks: TextChunk[],
  maxResults: number = 4
): HybridRankedChunk[] {
  if (!query || chunks.length === 0) return [];

  const queryTerms = tokenizeQuery(query.toLowerCase());
  if (queryTerms.length === 0) {
    return chunks.slice(0, maxResults).map((c) => ({ ...c, score: 0 }));
  }

  const scored: HybridRankedChunk[] = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase();
    let score = 0;

    // 1. Keyword density score
    for (const term of queryTerms) {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedTerm}\\b`, "g");
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 2.0; // Term match weight
      } else if (text.includes(term)) {
        score += 0.8; // Substring fallback weight
      }
    }

    // 2. Structural boost (headings / list items have higher weight)
    const isHeading = chunk.text.trim().startsWith("#") || chunk.text.trim().startsWith("---");
    if (isHeading) {
      score *= 1.25;
    }

    // 3. Exact query substring matching (highest weight)
    if (text.includes(query.toLowerCase())) {
      score += 15.0;
    }

    return {
      ...chunk,
      score
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top results that have some match score
  return scored.filter((c) => c.score > 0).slice(0, maxResults);
}

function tokenizeQuery(text: string): string[] {
  const stopwords = new Set([
    "là", "của", "và", "trong", "các", "cho", "với", "một", "những", 
    "có", "không", "để", "được", "người", "khi", "đã", "thì", "sẽ",
    "cái", "này", "đó", "the", "a", "an", "in", "on", "at", "to", "for", "with"
  ]);

  const words = text
    .replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopwords.has(w));

  return Array.from(new Set(words));
}
