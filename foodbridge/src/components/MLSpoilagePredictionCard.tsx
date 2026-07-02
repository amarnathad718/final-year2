'use client';

interface MLSpoilagePredictionProps {
  donationId: string;
  foodType: string;
  expiryAt: Date;
}

export function MLSpoilagePredictionCard({ donationId, foodType, expiryAt }: MLSpoilagePredictionProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">🤖 ML Spoilage Predictor</h3>
        <p className="text-sm text-gray-600">This feature has been removed.</p>
      </div>
    </div>
  );
}
