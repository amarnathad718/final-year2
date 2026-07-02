/**
 * Example: Integrating ML Spoilage Predictions into Donation Flow
 * This file demonstrates how to use the ML prediction system in your application
 */

import { getMSpoilagePrediction, calculateUrgencyMultiplier, generateInsights } from '@/lib/ml-integration';
import { prisma } from '@/lib/db';

/**
 * Example 1: Create Donation with ML Prediction
 */
export async function createDonationWithMLPrediction(
  donorId: string,
  donationData: {
    foodType: string;
    quantity: number;
    expiryAt: Date;
    pickupAddress: string;
    lat: number;
    lng: number;
    notes?: string;
    temperature: number; // Storage temperature in Celsius
    humidity: number; // Storage humidity percentage
    storageCondition: 'refrigerated' | 'frozen' | 'ambient' | 'heated';
    handlingQuality: number; // 1-5
    initialQuality: number; // 1-5
  },
) {
  try {
    // Calculate time from pickup (assuming just picked up)
    const timeFromPickup = 0; // In hours

    // Get ML prediction
    console.log('🤖 Getting ML spoilage prediction...');
    const prediction = await getMSpoilagePrediction({
      foodType: donationData.foodType,
      quantity: donationData.quantity,
      temperature: donationData.temperature,
      humidity: donationData.humidity,
      storageCondition: donationData.storageCondition,
      handlingQuality: donationData.handlingQuality,
      timeFromPickup,
      initialQuality: donationData.initialQuality,
    });

    console.log('✓ ML Prediction received:');
    console.log(`  - Risk Level: ${prediction.prediction.riskLevel}`);
    console.log(`  - Risk Score: ${(prediction.prediction.riskScore * 100).toFixed(1)}%`);
    console.log(`  - Hours Until Spoilage: ${prediction.prediction.hoursUntilSpoilage.toFixed(1)}h`);

    // Store ML prediction
    const mlPrediction = await prisma.mLSpoilagePrediction.create({
      data: {
        predictedExpiryDate: new Date(prediction.prediction.predictedExpiryDate),
        riskScore: prediction.prediction.riskScore,
        riskLevel: prediction.prediction.riskLevel,
        hoursUntilSpoilage: prediction.prediction.hoursUntilSpoilage,
        confidence: prediction.prediction.confidence,
        modelVersion: 'v1',
        modelType: prediction.prediction.type,
        temperatureFactor: prediction.prediction.factors.temperature,
        humidityFactor: prediction.prediction.factors.humidity,
        handlingQualityFactor: prediction.prediction.factors.handlingQuality,
        foodTypeInfluence: prediction.prediction.factors.foodTypeInfluence,
        storageConditionImpact: prediction.prediction.factors.storageConditionImpact,
        recommendations: prediction.prediction.recommendations,
      },
    });

    console.log('✓ ML Prediction stored in database');

    // Create donation with ML prediction reference
    const donation = await prisma.donation.create({
      data: {
        donorId,
        foodType: donationData.foodType,
        quantity: donationData.quantity,
        quantityUnit: 'units',
        estimatedMeals: Math.floor(donationData.quantity / 2),
        expiryAt: donationData.expiryAt,
        pickupAddress: donationData.pickupAddress,
        lat: donationData.lat,
        lng: donationData.lng,
        notes: donationData.notes,
        temperature: donationData.temperature,
        humidity: donationData.humidity,
        storageCondition: donationData.storageCondition,
        handlingQuality: donationData.handlingQuality,
        mlRiskScore: prediction.prediction.riskScore,
        mlPredictionId: mlPrediction.id,
        status: 'POSTED',
        spoilageRiskScore: prediction.prediction.riskScore,
      },
      include: {
        mlPrediction: true,
      },
    });

    console.log('✓ Donation created with ML prediction');

    return {
      donation,
      prediction: prediction.prediction,
      insights: generateInsights(prediction.prediction),
    };
  } catch (error) {
    console.error('❌ Error creating donation with ML prediction:', error);
    throw error;
  }
}

/**
 * Example 2: Auto-Assign Based on ML Risk Score
 */
export async function autoAssignDonationByMLRisk(donationId: string) {
  try {
    // Get donation with ML prediction
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        mlPrediction: true,
        donor: true,
      },
    });

    if (!donation || !donation.mlPrediction) {
      throw new Error('Donation not found or no ML prediction');
    }

    const mlPrediction = donation.mlPrediction;

    // Calculate urgency multiplier
    const urgencyMultiplier = calculateUrgencyMultiplier({
      type: mlPrediction.modelType as any,
      predictedExpiryDate: mlPrediction.predictedExpiryDate.toISOString(),
      riskScore: mlPrediction.riskScore,
      riskLevel: mlPrediction.riskLevel as any,
      hoursUntilSpoilage: mlPrediction.hoursUntilSpoilage,
      confidence: mlPrediction.confidence,
      factors: {
        temperature: mlPrediction.temperatureFactor || 0,
        humidity: mlPrediction.humidityFactor || 0,
        handlingQuality: mlPrediction.handlingQualityFactor || 0,
        foodTypeInfluence: mlPrediction.foodTypeInfluence || 0,
        storageConditionImpact: mlPrediction.storageConditionImpact || 0,
      },
      recommendations: mlPrediction.recommendations,
      model: 'v1',
    });

    console.log(`📊 Urgency Multiplier: ${urgencyMultiplier.toFixed(2)}x`);

    // Find best NGO for assignment (simplified)
    const ngo = await prisma.user.findFirst({
      where: {
        role: 'NGO',
        // In real implementation, use geographic proximity
      },
    });

    if (!ngo) {
      throw new Error('No NGO available for assignment');
    }

    // Create assignment with urgency-based priority
    const assignment = await prisma.assignment.create({
      data: {
        donationId,
        ngoId: ngo.id,
        status: 'MATCHED',
        priorityScore: urgencyMultiplier * 10,
        urgencyMultiplier,
        demandMultiplier:
          mlPrediction.riskLevel === 'CRITICAL'
            ? 3.0
            : mlPrediction.riskLevel === 'HIGH'
              ? 2.0
              : mlPrediction.riskLevel === 'MEDIUM'
                ? 1.5
                : 1.0,
      },
    });

    console.log(`✓ Assignment created with priority: ${assignment.priorityScore.toFixed(1)}`);

    // Create notification for NGO
    await prisma.notification.create({
      data: {
        userId: ngo.id,
        title: `🚨 ${mlPrediction.riskLevel} Priority Donation - ${donation.foodType}`,
        body: `${donation.quantity} units of ${donation.foodType} from ${donation.donor.name}. ${mlPrediction.hoursUntilSpoilage.toFixed(1)} hours until spoilage.`,
      },
    });

    return assignment;
  } catch (error) {
    console.error('❌ Error auto-assigning donation:', error);
    throw error;
  }
}

/**
 * Example 3: Dashboard Query - Get High-Risk Donations
 */
export async function getHighRiskDonations() {
  try {
    const highRiskDonations = await prisma.donation.findMany({
      where: {
        status: 'POSTED',
        mlRiskScore: { gte: 0.6 }, // HIGH or CRITICAL risk
      },
      include: {
        donor: {
          select: { name: true, email: true, phone: true },
        },
        mlPrediction: true,
        assignments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        mlRiskScore: 'desc',
      },
      take: 20,
    });

    console.log(`📊 Found ${highRiskDonations.length} high-risk donations`);

    return highRiskDonations.map((donation) => ({
      id: donation.id,
      foodType: donation.foodType,
      quantity: donation.quantity,
      donorName: donation.donor.name,
      donorPhone: donation.donor.phone,
      riskLevel: donation.mlPrediction?.riskLevel,
      riskScore: donation.mlPrediction?.riskScore,
      hoursUntilSpoilage: donation.mlPrediction?.hoursUntilSpoilage,
      assigned: donation.assignments.length > 0,
      recommendations: donation.mlPrediction?.recommendations,
    }));
  } catch (error) {
    console.error('❌ Error fetching high-risk donations:', error);
    throw error;
  }
}

/**
 * Example 4: Update ML Prediction (e.g., when donation is delivered)
 */
export async function validateMLPrediction(donationId: string, actualSpoilageHours: number) {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { mlPrediction: true },
    });

    if (!donation?.mlPrediction) {
      throw new Error('Donation or ML prediction not found');
    }

    // Calculate accuracy
    const predicted = donation.mlPrediction.hoursUntilSpoilage;
    const actual = actualSpoilageHours;
    const error = Math.abs(predicted - actual);
    const accuracy = Math.max(0, 1 - error / predicted);

    // Update prediction with validation data
    const updated = await prisma.mLSpoilagePrediction.update({
      where: { id: donation.mlPrediction.id },
      data: {
        validated: true,
        validatedAt: new Date(),
        accuracy,
      },
    });

    console.log(`✓ Prediction validated`);
    console.log(`  - Predicted: ${predicted.toFixed(1)}h`);
    console.log(`  - Actual: ${actual.toFixed(1)}h`);
    console.log(`  - Accuracy: ${(accuracy * 100).toFixed(1)}%`);

    return updated;
  } catch (error) {
    console.error('❌ Error validating prediction:', error);
    throw error;
  }
}

/**
 * Example 5: Generate ML Insights Report
 */
export async function generateMLInsightsReport() {
  try {
    const predictions = await prisma.mLSpoilagePrediction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const stats = {
      totalPredictions: predictions.length,
      byCritical: predictions.filter((p) => p.riskLevel === 'CRITICAL').length,
      byHigh: predictions.filter((p) => p.riskLevel === 'HIGH').length,
      byMedium: predictions.filter((p) => p.riskLevel === 'MEDIUM').length,
      byLow: predictions.filter((p) => p.riskLevel === 'LOW').length,
      averageRiskScore: predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length,
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
      validatedCount: predictions.filter((p) => p.validated).length,
      averageAccuracy:
        predictions
          .filter((p) => p.validated && p.accuracy)
          .reduce((sum, p) => sum + (p.accuracy || 0), 0) /
          predictions.filter((p) => p.validated && p.accuracy).length || 0,
    };

    console.log('\n📈 ML Spoilage Prediction Report (Last 30 Days)');
    console.log('═'.repeat(50));
    console.log(`Total Predictions: ${stats.totalPredictions}`);
    console.log(`  - Critical: ${stats.byCritical} (${((stats.byCritical / stats.totalPredictions) * 100).toFixed(1)}%)`);
    console.log(`  - High: ${stats.byHigh} (${((stats.byHigh / stats.totalPredictions) * 100).toFixed(1)}%)`);
    console.log(`  - Medium: ${stats.byMedium} (${((stats.byMedium / stats.totalPredictions) * 100).toFixed(1)}%)`);
    console.log(`  - Low: ${stats.byLow} (${((stats.byLow / stats.totalPredictions) * 100).toFixed(1)}%)`);
    console.log(`\nAverage Risk Score: ${(stats.averageRiskScore * 100).toFixed(1)}%`);
    console.log(`Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log(`Validated Predictions: ${stats.validatedCount}`);
    console.log(`Average Accuracy: ${(stats.averageAccuracy * 100).toFixed(1)}%`);
    console.log('═'.repeat(50) + '\n');

    return stats;
  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
}

/**
 * Example 6: API Route Integration
 */
// Usage in app/api/donations/route.ts
export async function POST_DonationWithML(req: Request) {
  const body = await req.json();

  try {
    const result = await createDonationWithMLPrediction(body.donorId, {
      foodType: body.foodType,
      quantity: body.quantity,
      expiryAt: new Date(body.expiryAt),
      pickupAddress: body.pickupAddress,
      lat: body.lat,
      lng: body.lng,
      notes: body.notes,
      temperature: body.temperature || 4,
      humidity: body.humidity || 60,
      storageCondition: body.storageCondition || 'refrigerated',
      handlingQuality: body.handlingQuality || 4,
      initialQuality: body.initialQuality || 4,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 400 });
  }
}
