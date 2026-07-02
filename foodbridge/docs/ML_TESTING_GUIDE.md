# 🧪 ML Spoilage Prediction - Testing Guide

## Pre-Testing Checklist

- [x] Dependencies installed (`npm install`)
- [x] Database migrations applied (`npm run prisma:migrate`)
- [x] ML model trained (`npm run ml:train`)
- [x] Environment variables configured (`.env`)

---

## Test Scenarios

### Test 1: Model Training Verification

**Objective**: Verify the ML model trains successfully and generates required files

**Steps**:
```bash
npm run ml:train
```

**Expected Output**:
```
🤖 Starting ML Spoilage Prediction Model Training...

📊 Generating training data (1000 samples)...
✓ Training data ready
  - Features shape: 1000,9
  - Labels shape: 1000,2

🏗️  Creating neural network model...
✓ Model architecture:
[Details about Dense layers, activations, dropouts]

🚀 Training model (50 epochs)...
[Training progress with loss and MAE]

✓ Training completed
Final loss: 0.02-0.05
Final MAE: 0.03-0.05

💾 Saving model...
✓ Model saved to: public/ml-models/spoilage

✓ Normalization parameters saved

🎉 Model training completed successfully!
```

**Verification**:
```bash
# Check if model files exist
ls -la public/ml-models/spoilage/
# Should see: model.json, weights.bin, normalization-params.json
```

---

### Test 2: API Endpoint - Basic Prediction

**Objective**: Test the ML prediction API with valid input

**Setup**:
```bash
npm run dev
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "foodType": "dairy",
    "quantity": 50,
    "temperature": 5,
    "humidity": 65,
    "storageCondition": "refrigerated",
    "handlingQuality": 4,
    "timeFromPickup": 2,
    "initialQuality": 4
  }'
```

**Expected Response** (200 OK):
```json
{
  "prediction": {
    "type": "ml",
    "predictedExpiryDate": "2026-05-02T10:30:00.000Z",
    "riskScore": 0.382,
    "riskLevel": "MEDIUM",
    "hoursUntilSpoilage": 36.5,
    "confidence": 0.92,
    "factors": {
      "temperature": 0.125,
      "humidity": 0.083,
      "handlingQuality": 0.2,
      "foodTypeInfluence": 0.9,
      "storageConditionImpact": 0.3
    },
    "recommendations": [
      "✓ Storage conditions are good",
      "⏰ This is a highly perishable item. Prioritize for immediate delivery."
    ],
    "model": "Neural Network Ensemble v1"
  }
}
```

**Pass Criteria**:
- ✅ Status code: 200
- ✅ Has `prediction` object
- ✅ `riskScore` between 0 and 1
- ✅ `riskLevel` is one of: LOW, MEDIUM, HIGH, CRITICAL
- ✅ `hoursUntilSpoilage` > 0
- ✅ `confidence` between 0 and 1
- ✅ Has `recommendations` array

---

### Test 3: Risk Level Classification

**Objective**: Verify correct risk level assignment

**Test Cases**:

| Food Type | Temp | Humidity | Storage | Expected Risk | Why |
|-----------|------|----------|---------|----------------|-----|
| Dairy | 2 | 60 | refrigerated | LOW | Ideal conditions |
| Dairy | 8 | 75 | ambient | CRITICAL | Too warm, high humidity |
| Seafood | 4 | 65 | refrigerated | MEDIUM | Perishable but cold |
| Produce | 20 | 40 | ambient | HIGH | Too warm |

**Script**:
```bash
# Test 1: Dairy in ideal conditions (expect LOW risk)
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN" \
  -d '{"foodType":"dairy","quantity":50,"temperature":2,"humidity":60,"storageCondition":"refrigerated","handlingQuality":5,"timeFromPickup":0,"initialQuality":5}'

# Test 2: Dairy in bad conditions (expect CRITICAL risk)
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN" \
  -d '{"foodType":"dairy","quantity":50,"temperature":25,"humidity":80,"storageCondition":"ambient","handlingQuality":2,"timeFromPickup":8,"initialQuality":2}'
```

**Verification**:
- ✅ Test 1 returns `riskLevel: "LOW"` with `riskScore < 0.35`
- ✅ Test 2 returns `riskLevel: "CRITICAL"` with `riskScore > 0.8`

---

### Test 4: Error Handling - Invalid Input

**Objective**: Verify proper validation and error responses

**Test Case 1**: Missing required field
```bash
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN" \
  -d '{"quantity":50,"temperature":5}' # Missing foodType
```

**Expected Response** (422 Unprocessable Entity):
```json
{
  "error": "foodType is required and must be a string"
}
```

**Test Case 2**: Invalid temperature range
```bash
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "foodType":"dairy",
    "quantity":50,
    "temperature":-50,
    "humidity":65,
    "storageCondition":"refrigerated",
    "handlingQuality":4,
    "timeFromPickup":2,
    "initialQuality":4
  }'
```

**Expected Response** (422 Unprocessable Entity):
```json
{
  "error": "temperature must be between -30°C and 50°C"
}
```

**Test Case 3**: Invalid storage condition
```bash
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "foodType":"dairy",
    "quantity":50,
    "temperature":5,
    "humidity":65,
    "storageCondition":"unknown",
    "handlingQuality":4,
    "timeFromPickup":2,
    "initialQuality":4
  }'
```

**Expected Response** (422 Unprocessable Entity):
```json
{
  "error": "storageCondition must be: refrigerated, frozen, ambient, or heated"
}
```

---

### Test 5: Model Status Endpoint

**Objective**: Verify GET endpoint returns correct model status

**Request**:
```bash
curl -X GET http://localhost:3000/api/ml/spoilage-ml \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "modelStatus": {
    "available": true,
    "type": "neural_network",
    "lastUpdated": "2026-04-30T18:55:00.000Z",
    "cacheStatus": {
      "loaded": false,
      "modelLoaded": false
    }
  }
}
```

**After first prediction**:
```json
{
  "modelStatus": {
    "available": true,
    "type": "neural_network",
    "lastUpdated": "2026-04-30T18:55:00.000Z",
    "cacheStatus": {
      "loaded": true,
      "modelLoaded": true
    }
  }
}
```

---

### Test 6: Frontend Component

**Objective**: Verify MLSpoilagePredictionCard works correctly

**Setup**:
1. Navigate to donation creation page (or any page with the component)
2. Locate the "🤖 ML Spoilage Predictor" card

**Manual Tests**:

**Test 6.1**: Form Submission
- Fill in all fields:
  - Temperature: 5
  - Humidity: 65
  - Storage: refrigerated
  - Handling Quality: 4
  - Hours from Pickup: 2
  - Initial Quality: 4
- Click "🔮 Get ML Prediction"
- Expected: Form submits, loading state appears

**Test 6.2**: Results Display
- Expected: Result card appears with:
  - ✅ Risk Score percentage
  - ✅ Hours Until Spoilage
  - ✅ Confidence percentage
  - ✅ Risk Level badge (color-coded)

**Test 6.3**: Details Toggle
- Click "▶ Show Details"
- Expected: Expandable section reveals:
  - ✅ Predicted Expiry Date
  - ✅ Factor breakdown with progress bars
  - ✅ Recommendations list

**Test 6.4**: Error Handling
- Submit form with invalid temperature (e.g., 100°C)
- Expected: Error message displayed clearly

---

### Test 7: Performance Testing

**Objective**: Verify prediction latency meets requirements

**Script**:
```bash
# Make 10 sequential predictions and measure time
time for i in {1..10}; do
  curl -X POST http://localhost:3000/api/ml/spoilage-ml \
    -H "Authorization: Bearer TOKEN" \
    -d '{"foodType":"dairy","quantity":50,"temperature":5,"humidity":65,"storageCondition":"refrigerated","handlingQuality":4,"timeFromPickup":2,"initialQuality":4}' \
    > /dev/null 2>&1
done
```

**Expected**:
- First request: ~500ms (model loading + prediction)
- Subsequent requests: <50ms each
- Total time for 10 requests: <1 second (after first)

---

### Test 8: Database Integration

**Objective**: Verify predictions are stored correctly

**Steps**:
1. Make a prediction via API
2. Query database:

```sql
SELECT * FROM "MLSpoilagePrediction" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Verification**:
- ✅ Record created with correct fields
- ✅ `riskScore` matches API response
- ✅ `riskLevel` matches API response
- ✅ `hoursUntilSpoilage` matches API response
- ✅ `recommendations` array populated
- ✅ Model version recorded

---

### Test 9: Authorization & Rate Limiting

**Objective**: Verify security controls

**Test 9.1**: Unauthorized Request
```bash
curl -X POST http://localhost:3000/api/ml/spoilage-ml \
  -H "Content-Type: application/json" \
  -d '{"foodType":"dairy",...}'
  # No Authorization header
```

**Expected**: 401 Unauthorized

**Test 9.2**: Rate Limiting
```bash
# Make 101 requests in quick succession
for i in {1..101}; do
  curl -X POST http://localhost:3000/api/ml/spoilage-ml \
    -H "Authorization: Bearer TOKEN" \
    -d '{"foodType":"dairy",...}' &
done
wait
```

**Expected**: 100th request succeeds, 101st returns 429 (Rate limit exceeded)

---

### Test 10: Different Food Types

**Objective**: Verify predictions vary correctly by food type

**Test Data**:

| Food Type | Expected Risk Factor |
|-----------|---------------------|
| Seafood | 0.95 (highest) |
| Dairy | 0.9 |
| Meat | 0.85 |
| Cooked | 0.7 |
| Bakery | 0.5 |
| Produce | 0.4 |
| Beverage | 0.2 (lowest) |

**Script**:
```bash
# Test each food type with same storage conditions
for food in "seafood" "dairy" "meat" "cooked" "bakery" "produce" "beverage"; do
  curl -X POST http://localhost:3000/api/ml/spoilage-ml \
    -H "Authorization: Bearer TOKEN" \
    -d "{
      \"foodType\":\"$food\",
      \"quantity\":50,
      \"temperature\":5,
      \"humidity\":65,
      \"storageCondition\":\"refrigerated\",
      \"handlingQuality\":4,
      \"timeFromPickup\":2,
      \"initialQuality\":4
    }" | jq '.prediction | {foodType, riskScore, riskLevel}'
done
```

**Verification**:
- ✅ Seafood has highest risk score
- ✅ Beverage has lowest risk score
- ✅ Risk scores increase in expected order

---

## Automated Test Suite

**Optional**: Create a test file (`tests/ml-spoilage.test.ts`):

```typescript
import { predictSpoilageWithML, createSpoilageModel } from '@/lib/ml-spoilage';

describe('ML Spoilage Prediction', () => {
  it('should load model successfully', async () => {
    const model = await createSpoilageModel();
    expect(model).toBeDefined();
  });

  it('should return risk between 0 and 1', async () => {
    const model = await createSpoilageModel();
    const prediction = await predictSpoilageWithML({
      foodType: 'dairy',
      quantity: 50,
      temperature: 5,
      humidity: 65,
      storageCondition: 'refrigerated',
      handlingQuality: 4,
      timeFromPickup: 2,
      initialQuality: 4,
    }, model);
    
    expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
    expect(prediction.riskScore).toBeLessThanOrEqual(1);
  });

  // More tests...
});
```

Run with: `npm test`

---

## Troubleshooting During Testing

### Issue: Model Not Found
```
Error: ML model unavailable. Using heuristic fallback.
```
**Solution**: Run `npm run ml:train`

### Issue: Timeout
```
Request timeout after 30000ms
```
**Solution**: Increase timeout or check CPU/memory usage

### Issue: 401 Unauthorized
```
"error": "Unauthorized"
```
**Solution**: Ensure you're logged in and token is valid

### Issue: Slow Performance
```
First prediction takes >1000ms
```
**Solution**: Normal on cold start. Model caches automatically.

---

## Test Results Checklist

- [ ] Model training completes successfully
- [ ] API returns valid predictions
- [ ] Risk levels classified correctly
- [ ] Error handling works properly
- [ ] Model status endpoint works
- [ ] Frontend component displays correctly
- [ ] Performance meets requirements
- [ ] Database stores predictions
- [ ] Authorization enforced
- [ ] Rate limiting works
- [ ] Different food types vary predictions
- [ ] All edge cases handled

---

## Success Criteria

✅ **All tests pass** if:
1. Model trains without errors
2. API predictions valid and accurate
3. Error handling comprehensive
4. Performance <50ms (cached)
5. Database stores correctly
6. Security controls enforced
7. UI responsive and functional
8. Documentation complete
9. No crashes or exceptions
10. Graceful fallback when needed

---

**You're ready to test!** Follow the test scenarios above and verify your implementation is working correctly.
