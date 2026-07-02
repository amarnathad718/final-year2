/**
 * ML integration utilities have been disabled because the ML/spoilage feature was removed.
 */

export async function getMSpoilagePrediction(): Promise<never> {
  throw new Error('ML spoilage prediction feature has been removed');
}

export async function checkMLModelStatus(): Promise<{
  available: boolean;
  type: 'neural_network' | 'heuristic_fallback';
  lastUpdated: string | null;
  cacheStatus: {
    loaded: boolean;
    modelLoaded: boolean;
  };
}> {
  throw new Error('ML spoilage prediction feature has been removed');
}

export function getPriorityLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (riskScore >= 0.8) return 'CRITICAL';
  if (riskScore >= 0.6) return 'HIGH';
  if (riskScore >= 0.35) return 'MEDIUM';
  return 'LOW';
}

export function formatRiskScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function calculateUrgencyMultiplier(): number {
  return 1;
}

export function generateInsights(): { criticalIssues: string[]; warnings: string[]; recommendations: string[]; actionItems: string[] } {
  return { criticalIssues: [], warnings: [], recommendations: [], actionItems: [] };
}

export function formatPredictionDate(dateString: string): string {
  return dateString;
}

export function getRiskColor(riskLevel: string) {
  return { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
}
