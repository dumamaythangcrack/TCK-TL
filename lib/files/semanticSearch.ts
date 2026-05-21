import { TextChunk } from "./chunker";

export interface RankedChunk extends TextChunk {
  score: number;
}

export function searchChunks(query: string, chunks: TextChunk[], maxResults: number = 3): RankedChunk[] {
  if (!query || chunks.length === 0) return [];

  const queryTerms = tokenize(query.toLowerCase());
  if (queryTerms.length === 0) {
    return chunks.slice(0, maxResults).map(c => ({ ...c, score: 0 }));
  }

  // Very simple term frequency ranking
  const ranked = chunks.map(chunk => {
    const chunkText = chunk.text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      // Basic frequency count
      const regex = new RegExp(`\\\\b${term}\\\\b`, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    return { ...chunk, score };
  });

  // Sort descending by score
  ranked.sort((a, b) => b.score - a.score);

  // Return the top K that have at least some relevance, or just top K if all zero
  return ranked.filter(c => c.score > 0).slice(0, maxResults);
}

function tokenize(text: string): string[] {
  const stopwords = new Set([
    "là", "của", "và", "trong", "các", "cho", "với", "một", "những", 
    "có", "không", "để", "được", "người", "khi", "đã", "thì", "sẽ",
    "cái", "này", "đó", "the", "a", "an", "in", "on", "at", "to", "for", "with"
  ]);

  const words = text.replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
                    .split(/\\s+/)
                    .filter(w => w.length > 1 && !stopwords.has(w));
  return Array.from(new Set(words));
}
