# FoodBridge System Design

## 1. Architecture Overview

FoodBridge follows a modular API-first monolith architecture with strong boundaries inside one Next.js repository.

Layers:

- Presentation Layer: React functional components + Tailwind dashboards
- API Layer: Route handlers grouped by domain (auth, donations, logistics, analytics, trust)
- Domain Services: reusable business logic in src/lib
- Persistence: PostgreSQL via Prisma

This design enables rapid iteration while preserving clean evolution paths to microservices if scale demands it.

## 2. Domain Modules

### Auth and Identity

- NextAuth credentials strategy, JWT sessions
- Password hashing via bcryptjs
- RBAC checks using requireRole utility
- Route protection via proxy.ts

### Donations

- Donor posts surplus metadata (food type, quantity, expiry, geo, image)
- Donation lifecycle status transitions:
  POSTED -> MATCHED -> PICKED_UP -> IN_TRANSIT -> DELIVERED

### Allocation Engine

Rule-based intelligent ranking combines:

- Distance score (Haversine)
- Urgency multiplier (expiry-driven)
- Demand multiplier (hotspot proximity model)
- Trust multiplier (ratings-derived score)

Priority formula:

score = (2 / (1 + distanceKm)) * demandMultiplier * urgencyMultiplier * trustMultiplier

### Logistics and Realtime

- Assignment status updates are persisted in Assignment table
- Frontend polling every 10 seconds provides near-real-time tracking
- Architecture can be upgraded to WebSockets without changing domain model

### Trust and Verification

- One-to-one rater-ratee constraint prevents duplicate rating spam
- Trust score continuously recalculated from average ratings
- Verification model supports admin governance workflows

### Analytics and Impact

- Core metrics: donations, deliveries, beneficiaries
- Environmental metrics: waste reduction and CO2 savings
- Heatmap endpoint exposes geospatial demand visualization data

## 3. Security Strategy

- Zod input validation at API edge
- Role authorization for all sensitive endpoints
- Rate limiting middleware for abuse mitigation
- JWT session checks for protected routes and APIs

## 4. Scalability Considerations

Current design is optimized for early production and can scale through:

- Caching high-read analytics endpoints
- Upgrading in-memory rate limits to Redis
- Introducing background workers for heavy matching and notifications
- Splitting modules into independently deployable services if traffic grows significantly

## 5. Trade-offs

- Polling chosen over WebSockets to simplify deployment and reliability on serverless targets
- Rule-based allocation chosen for interpretability and quick tuning; ML can be layered later
- Monorepo-style single deployment chosen for maintainability in early-stage product velocity

## 6. Advanced Feature Path

Future enhancements can add:

- ML spoilage prediction from historical donation outcomes
- Route optimization engine with map traffic constraints
- Image classification pipeline for food category auto-tagging
- Fraud detection model for anomaly scoring on fake listings
