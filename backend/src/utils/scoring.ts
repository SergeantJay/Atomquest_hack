import { UomType, ScoreResult } from '../types';

export function calculateScore(
  uomType: UomType,
  target: number,
  actual: number | null | undefined,
  weightage: number,
  targetDate?: Date | null,
  actualDate?: Date | null
): ScoreResult {
  if (actual === null || actual === undefined) return { score: 0, weightedScore: 0 };

  let score = 0;
  switch (uomType) {
    case 'MIN':
      score = target === 0 ? (actual > 0 ? 100 : 0) : Math.min((actual / target) * 100, 150);
      break;
    case 'MAX':
      score = actual === 0 ? 100 : target === 0 ? 0 : Math.min((target / actual) * 100, 150);
      break;
    case 'TIMELINE':
      if (!targetDate) { score = actual > 0 ? 100 : 0; }
      else if (actualDate) { score = actualDate <= targetDate ? 100 : 0; }
      else { score = 0; }
      break;
    case 'ZERO':
      score = actual === 0 ? 100 : 0;
      break;
    default:
      score = 0;
  }

  score = Math.max(0, Math.min(score, 150));
  const weightedScore = (score * weightage) / 100;
  return { score: Math.round(score * 100) / 100, weightedScore: Math.round(weightedScore * 100) / 100 };
}
