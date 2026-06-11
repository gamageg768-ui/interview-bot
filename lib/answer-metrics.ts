import type { AnswerMetrics } from './types';

export function computeAnswerMetrics(answer: string, expectedTopics: string[]): AnswerMetrics {
  const words = answer.trim() ? answer.trim().split(/\s+/) : [];
  const wordCount = words.length;
  const estimatedSpeakingTimeSec = Math.round((wordCount / 130) * 60);

  // Fuzzy keyword coverage: check how many expectedTopics appear in the answer
  const lowerAnswer = answer.toLowerCase();
  const matched = expectedTopics.filter(topic =>
    topic.toLowerCase().split(/\s+/).some(word => word.length > 3 && lowerAnswer.includes(word))
  );
  const topicCoveragePercent =
    expectedTopics.length > 0 ? Math.round((matched.length / expectedTopics.length) * 100) : 0;

  // Structure score heuristics (0-100)
  let score = 0;
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 2) score += 20;
  if (sentences.length >= 4) score += 15;
  if (wordCount >= 50) score += 20;
  if (wordCount >= 100) score += 10;

  const connectors = /\b(first|second|finally|however|therefore|additionally|furthermore|for example|specifically|in conclusion|as a result)\b/i;
  if (connectors.test(answer)) score += 20;

  const hasConcluding = /\b(in summary|overall|in conclusion|to summarize|ultimately)\b/i.test(answer);
  if (hasConcluding) score += 15;

  const structureScore = Math.min(score, 100);

  return { wordCount, estimatedSpeakingTimeSec, topicCoveragePercent, structureScore };
}
