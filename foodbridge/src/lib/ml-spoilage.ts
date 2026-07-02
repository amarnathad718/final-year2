// ML spoilage module has been disabled because the ML/spoilage feature was removed.

export interface FoodSpoilageData {
  foodType: string;
  quantity: number;
  temperature: number;
  humidity: number;
  storageCondition: 'refrigerated' | 'frozen' | 'ambient' | 'heated';
  handlingQuality: number;
  timeFromPickup: number;
  initialQuality: number;
}

export interface SpoilageMLPrediction {
  predictedExpiryDate: Date;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hoursUntilSpoilage: number;
  confidence: number;
  factors: Record<string, number>;
  recommendations: string[];
}

export async function createSpoilageModel(): Promise<never> {
  throw new Error('ML spoilage feature has been removed');
}

export async function predictSpoilageWithML(): Promise<never> {
  throw new Error('ML spoilage feature has been removed');
}

export function generateTrainingData(): never {
  throw new Error('ML spoilage feature has been removed');
}
