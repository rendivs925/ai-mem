// Deduplication using cosine similarity
// Based on research: Cosine Similarity > 0.95 = duplicate

import type { CMU } from "../../../types/brain/memory";

export interface DedupeCandidate {
  keep: CMU;
  remove: CMU;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function textToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount: Map<string, number> = new Map();

  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }

  const uniqueWords = Array.from(wordCount.keys());
  const vector: number[] = [];

  for (const word of uniqueWords) {
    vector.push(wordCount.get(word) || 0);
  }

  return vector;
}

function vectorizeToVocabulary(text: string, vocabulary: string[]): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return vocabulary.map((word) => counts.get(word) || 0);
}

export function calculateSimilarity(cmu1: CMU, cmu2: CMU): number {
  const combined1 = [
    cmu1.content.title,
    cmu1.content.narrative,
    ...cmu1.content.facts,
    ...cmu1.content.concepts,
  ].join(" ");

  const combined2 = [
    cmu2.content.title,
    cmu2.content.narrative,
    ...cmu2.content.facts,
    ...cmu2.content.concepts,
  ].join(" ");

  const vocabulary = Array.from(new Set([...combined1.toLowerCase().split(/\s+/), ...combined2.toLowerCase().split(/\s+/)].filter(Boolean)));
  const vec1 = vectorizeToVocabulary(combined1, vocabulary);
  const vec2 = vectorizeToVocabulary(combined2, vocabulary);

  return cosineSimilarity(vec1, vec2);
}

export function findDuplicates(
  cmus: CMU[],
  threshold: number = 0.95
): DedupeCandidate[] {
  const duplicates: DedupeCandidate[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < cmus.length; i++) {
    for (let j = i + 1; j < cmus.length; j++) {
      const id1 = cmus[i].id;
      const id2 = cmus[j].id;

      if (processed.has(id1) || processed.has(id2)) continue;

      const similarity = calculateSimilarity(cmus[i], cmus[j]);

      if (similarity >= threshold) {
        const keep =
          cmus[i].metadata.accessCount > cmus[j].metadata.accessCount
            ? cmus[i]
            : cmus[j];
        const remove =
          cmus[i].metadata.accessCount > cmus[j].metadata.accessCount
            ? cmus[j]
            : cmus[i];

        duplicates.push({ keep, remove, similarity });
        processed.add(remove.id);
      }
    }
  }

  return duplicates;
}
