// Food image model utilities have been removed because the ML/spoilage feature was disabled.

export const IMAGE_SIZE = 224;
export const FOOD_IMAGE_LABELS = ["fresh", "spoiled"] as const;

export type FoodImageLabel = (typeof FOOD_IMAGE_LABELS)[number];

export type FoodImagePrediction = {
  label: FoodImageLabel;
  confidence: number;
  probabilities: Record<FoodImageLabel, number>;
};

export async function imageBufferToTensor(): Promise<never> {
  throw new Error('Food image ML utilities have been removed');
}

export async function imageFileToTensor(): Promise<never> {
  throw new Error('Food image ML utilities have been removed');
}

export async function saveLayersModelToDir(): Promise<never> {
  throw new Error('Food image ML utilities have been removed');
}

export async function loadLayersModelFromDir(): Promise<never> {
  throw new Error('Food image ML utilities have been removed');
}

export function mapPrediction(): never {
  throw new Error('Food image ML utilities have been removed');
}
