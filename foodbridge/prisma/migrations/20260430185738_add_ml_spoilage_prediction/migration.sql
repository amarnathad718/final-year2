/*
  Warnings:

  - A unique constraint covering the columns `[mlPredictionId]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "handlingQuality" DOUBLE PRECISION,
ADD COLUMN     "humidity" DOUBLE PRECISION,
ADD COLUMN     "mlPredictionId" TEXT,
ADD COLUMN     "mlRiskScore" DOUBLE PRECISION,
ADD COLUMN     "storageCondition" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MLSpoilagePrediction" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "predictedExpiryDate" TIMESTAMP(3) NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "hoursUntilSpoilage" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "modelType" TEXT NOT NULL DEFAULT 'neural_network',
    "temperatureFactor" DOUBLE PRECISION,
    "humidityFactor" DOUBLE PRECISION,
    "handlingQualityFactor" DOUBLE PRECISION,
    "foodTypeInfluence" DOUBLE PRECISION,
    "storageConditionImpact" DOUBLE PRECISION,
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accuracy" DOUBLE PRECISION,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MLSpoilagePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MLSpoilagePrediction_donationId_key" ON "MLSpoilagePrediction"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_mlPredictionId_key" ON "Donation"("mlPredictionId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_mlPredictionId_fkey" FOREIGN KEY ("mlPredictionId") REFERENCES "MLSpoilagePrediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
