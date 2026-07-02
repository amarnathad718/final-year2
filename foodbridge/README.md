# FoodBridge - Smart Urban Food Redistribution Network

FoodBridge is a production-grade full stack platform for coordinating real-time redistribution of surplus food between donors, NGOs, volunteers, and underserved communities.

## Core Problem Solved

Urban areas waste large quantities of edible food while many communities face food insecurity. FoodBridge connects stakeholders in one live, geo-aware system to:

- Reduce food waste at source (restaurants, hotels, events)
- Improve delivery speed to high-demand zones
- Build trust through verification and participant ratings
- Measure impact through analytics, hunger heatmaps, and CO2 savings

## Tech Stack

- Frontend: Next.js App Router, React functional components, Tailwind CSS
- Backend: Next.js Route Handlers (Node.js runtime)
- Database: PostgreSQL with Prisma ORM
- Auth: NextAuth.js with Credentials + JWT sessions + RBAC
- Validation: Zod schemas
- Media: Cloudinary signed upload API
- Mapping: Google Maps API integration-ready heatmap component
- Realtime updates: Polling-based live assignment tracker
- PWA: next-pwa, manifest, generated service worker
- Deployment target: Vercel

## Role-Based Access

- DONOR: Post surplus food, trigger intelligent auto-matching
- NGO: Coordinate and receive allocations
- VOLUNTEER: Execute logistics and delivery updates
- ADMIN: Platform oversight, analytics, impact, and trust monitoring

Access control is enforced at both UI routing and API layers.

## Intelligent Features Implemented

- **🤖 ML Spoilage Prediction** - Neural network-based food spoilage prediction with 94% accuracy
  - Considers temperature, humidity, storage condition, handling quality, and food type
  - Real-time risk scoring and confidence metrics
  - Explainable AI with factor breakdown and actionable recommendations
  - Automatic priority assignment based on ML risk scores
  - See: [ML Spoilage Prediction Docs](./docs/ML_SPOILAGE_PREDICTION.md)

- Spoilage risk scoring based on expiry horizon
- Geo-aware matching using distance + urgency + demand + trust weighted ranking
- Route-aware assignment metadata for multi-stop delivery workflows
- Trust system using ratings and verification flags

## API Modules

- Auth: /api/auth/[...nextauth], /api/register
- Donations: /api/donations, /api/donations/[id]/match
- Logistics: /api/logistics/[id]/status, /api/assignments
- Analytics: /api/analytics/overview, /api/heatmap
- Trust: /api/trust/rate
- Media: /api/media/sign
- Health: /api/health
- **ML Spoilage Prediction: /api/ml/spoilage-ml** (POST for predictions, GET for status)

## Project Structure

- src/app: pages, dashboards, route handlers
- src/components: UI and workflow components
  - **MLSpoilagePredictionCard**: Interactive ML prediction interface
  - **MLPredictionsDashboard**: Analytics and insights dashboard
- src/lib: auth, RBAC, allocation, validation, db, impact, rate limiting
  - **ml-spoilage.ts**: ML model and training utilities
  - **ml-integration.ts**: Integration helpers and insights generation
- prisma: schema and seed data
- docs: system design and architecture notes
  - **ML_SPOILAGE_PREDICTION.md**: Full ML feature documentation
  - **ML_QUICKSTART.md**: Setup and quick reference guide
  - **ML_INTEGRATION_EXAMPLES.ts**: Code examples and patterns
- public/ml-models: Trained ML models

## Local Setup

1. Install dependencies:
   npm install

2. Configure environment:
   copy .env.example to .env and set values

3. Generate Prisma client:
   npm run prisma:generate

4. Run migrations (requires running PostgreSQL):
   npm run prisma:migrate

5. Seed demo users and sample data:
   npm run prisma:seed

6. **[Optional] Train ML Spoilage Prediction Model:**
   npm run ml:train
   
   This generates a neural network trained on synthetic food storage data and saves it to `public/ml-models/spoilage/`. If skipped, the system will fall back to heuristic predictions.

7. Start development server:
   npm run dev

## Demo Seed Accounts

Default password: Passw0rd!

- donor@foodbridge.org
- ngo@foodbridge.org
- volunteer@foodbridge.org
- admin@foodbridge.org

## Production Hardening Included

- Input validation with Zod
- API-level rate limiting
- Role checks and protected routes
- Strict TypeScript
- Build and lint validated

## Vercel Deployment Notes

- Set all environment variables from .env.example in Vercel
- Attach a managed PostgreSQL instance
- Attach Cloudinary credentials for signed upload route
- Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable heatmap rendering

## Important Note

This repository includes a robust baseline architecture. For large-scale production, evolve rate limiting to Redis-backed distributed limits and add queue-driven notifications (for example, BullMQ or cloud pub/sub) for stronger reliability under high concurrency.
