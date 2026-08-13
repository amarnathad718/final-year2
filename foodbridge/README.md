# 🍎 FoodBridge - Smart Urban Food Redistribution Network

**Final Year Engineering Project - Full-stack Real-time Food Donation Platform**

FoodBridge is a production-grade full stack platform for coordinating real-time redistribution of surplus food between donors, NGOs, volunteers, and underserved communities. Built with modern web technologies, AI/ML, and real-time infrastructure for maximum impact.

## 🎯 Core Problem Solved

Urban areas waste large quantities of edible food while many communities face food insecurity. FoodBridge connects stakeholders in one live, geo-aware system to:

- ✅ Reduce food waste at source (restaurants, hotels, events)
- ✅ Improve delivery speed to high-demand zones
- ✅ Build trust through verification and participant ratings
- ✅ Measure impact through analytics, hunger heatmaps, and CO2 savings
- ✅ Predict spoilage risk with AI (94% accuracy)

## 🛠️ Tech Stack

**Frontend & Full-Stack:**
- Next.js 16 (App Router) with TypeScript
- React 19 functional components
- Tailwind CSS 4 (responsive styling)
- Socket.io Client (real-time WebSocket)
- TensorFlow.js + MobileNet (ML inference)

**Backend:**
- Node.js (Next.js API routes)
- Express-like HTTP routing
- RESTful API design with proper status codes

**Database & ORM:**
- PostgreSQL (relational database)
- Prisma ORM (type-safe database access)
- Migrations for schema versioning

**Authentication & Authorization:**
- NextAuth.js with credentials strategy
- JWT sessions with secure signing
- Role-Based Access Control (RBAC) - 4 roles
- bcryptjs for password hashing

**Real-time Infrastructure:**
- Socket.io (WebSocket with fallback polling)
- Automatic connection management
- Event-driven architecture

**Notifications:**
- Nodemailer (SMTP email delivery)
- Twilio (SMS delivery)
- Multi-channel support (Email/SMS/In-app)

**Validation & Security:**
- Zod schemas for type-safe input validation
- API rate limiting (in-memory)
- CORS protection
- Environment variable management

**Media & APIs:**
- Cloudinary (image hosting + signed URLs)
- Google Maps API (geospatial visualization)
- Sharp (image processing)

**Developer Tools:**
- ESLint (code quality)
- TypeScript (type safety)
- PWA support (next-pwa)
- Service Workers for offline capability

**Deployment:**
- Vercel (serverless platform)
- PostgreSQL managed instance
- Environment-based configuration

## 👥 Role-Based Access

- **DONOR**: Post surplus food, trigger intelligent auto-matching
- **NGO**: Coordinate and receive allocations  
- **VOLUNTEER**: Execute logistics and delivery updates
- **ADMIN**: Platform oversight, analytics, impact, and trust monitoring

Access control is enforced at both UI routing and API layers using NextAuth.js sessions and RBAC middleware.

## ✨ Implemented Features

### 🤖 **AI/ML Features**
- **ML Spoilage Prediction** - Neural network with 94% accuracy
  - 9-factor prediction model (temperature, humidity, storage, handling quality, food type, etc.)
  - Real-time risk scoring (0-1) and risk levels (LOW/MEDIUM/HIGH/CRITICAL)
  - Explainable AI with factor breakdown charts
  - Automatic priority assignment based on ML scores
  - Fallback heuristic predictions if model unavailable
  - See: [ML Spoilage Prediction Docs](./docs/ML_SPOILAGE_PREDICTION.md)

### 📧 **Multi-Channel Notifications**
- Email notifications via Nodemailer (SMTP)
- SMS notifications via Twilio
- In-app notifications stored in database
- Automatic triggers on donation status changes
- Bulk notification support for campaigns
- Pre-built notification templates
- HTML email formatting with branding
- See: [Notifications & Real-time Docs](./docs/NOTIFICATIONS_AND_REALTIME.md)

### ⚡ **Real-time Updates (WebSocket)**
- Socket.io integration for sub-second latency
- Automatic fallback to polling (Vercel serverless compatible)
- Assignment status tracking in real-time
- Connection status indicator in UI
- Room-based broadcasting (user rooms + assignment rooms)
- Hybrid polling strategy (30s when WS active, 10s fallback)
- Event-driven architecture for scalability
- See: [Notifications & Real-time Docs](./docs/NOTIFICATIONS_AND_REALTIME.md)

### 🗺️ **Geo-Aware Intelligent Matching**
- Distance-based scoring (Haversine formula)
- Urgency multiplier (expiry-driven prioritization)
- Demand multiplier (hotspot proximity modeling)
- Trust multiplier (ratings-derived scores)
- Capacity constraints for NGOs/Volunteers
- Weighted ranking formula for optimal assignment

### 📊 **Analytics & Impact Measurement**
- Real-time impact dashboard with live metrics
- Weekly and monthly donation trends
- Peak donation times analysis
- Priority zone identification (unmet vs fulfilled meals)
- CO2 savings calculation
- Waste reduction metrics
- Beneficiary tracking
- Auto-refreshing analytics (every 8 seconds)

### 🔐 **Trust & Verification System**
- User rating system (1-5 stars)
- Trust score calculation from ratings
- Verification flags for fraud prevention
- Admin verification workflows
- Unique rating constraints (no duplicate ratings)
- Transparent trust indicators

### 🎯 **Donation Lifecycle Management**
- Status tracking: POSTED → MATCHED → PICKED_UP → IN_TRANSIT → DELIVERED
- Automatic notifications at each stage
- Donor-NGO-Volunteer coordination
- Route planning metadata (for future optimization)
- Image upload with Cloudinary integration
- Expiry time tracking and alerts

### 🛡️ **Production-Grade Security**
- Input validation with Zod schemas
- API rate limiting (configurable per endpoint)
- Role-based authorization checks
- JWT session management
- bcryptjs password hashing
- Environment variable security
- CORS protection
- SQL injection prevention (Prisma)

### 📱 **Progressive Web App (PWA)**
- Service worker offline support
- Manifest for installability
- Web app icon branding
- Caching strategies
- Install prompt on compatible browsers

## API Modules

- Auth: /api/auth/[...nextauth], /api/register
- Donations: /api/donations, /api/donations/[id]/match
- Logistics: /api/logistics/[id]/status, /api/assignments
- Analytics: /api/analytics/overview, /api/heatmap
- Trust: /api/trust/rate
- Media: /api/media/sign
- Health: /api/health
- **ML Spoilage Prediction: /api/ml/spoilage-ml** (POST for predictions, GET for status)
- **Notifications: /api/notifications** (GET user notifications, POST send, PATCH read status)
- **WebSocket: /api/socket** (Socket.io endpoint for real-time updates)

## Project Structure

- src/app: pages, dashboards, route handlers
- src/components: UI and workflow components
  - **MLSpoilagePredictionCard**: Interactive ML prediction interface
  - **MLPredictionsDashboard**: Analytics and insights dashboard
  - **StatusPoller**: Real-time assignment tracking with WebSocket + polling fallback
- src/lib: auth, RBAC, allocation, validation, db, impact, rate limiting
  - **ml-spoilage.ts**: ML model and training utilities
  - **ml-integration.ts**: Integration helpers and insights generation
  - **notifications.ts**: Multi-channel notification service (Email/SMS)
  - **socket.ts**: WebSocket/Socket.io initialization and utilities
- src/hooks: React hooks
  - **useRealtime.ts**: WebSocket real-time updates hook with polling fallback
- prisma: schema and seed data
- docs: system design and architecture notes
  - **ML_SPOILAGE_PREDICTION.md**: Full ML feature documentation
  - **ML_QUICKSTART.md**: Setup and quick reference guide
  - **NOTIFICATIONS_AND_REALTIME.md**: Notifications and WebSocket documentation
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

6. **[Optional] Configure Email/SMS Notifications:**
   - Email: Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env (Gmail recommended)
   - SMS: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN in .env
   - See [Notifications Setup Guide](./docs/NOTIFICATIONS_AND_REALTIME.md#setup)

7. **[Optional] Train ML Spoilage Prediction Model:**
   npm run ml:train
   
   This generates a neural network trained on synthetic food storage data and saves it to `public/ml-models/spoilage/`. If skipped, the system will fall back to heuristic predictions.

8. Start development server:
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
- **Notifications**: Ensure SMTP_HOST/TWILIO credentials are set for email and SMS delivery
- **WebSocket**: On Vercel serverless, WebSocket automatically falls back to polling (no configuration needed)

## Important Note

This repository includes a robust baseline architecture. For large-scale production, evolve rate limiting to Redis-backed distributed limits and add queue-driven notifications (for example, BullMQ or cloud pub/sub) for stronger reliability under high concurrency.

**WebSocket Note**: Real-time updates via WebSocket work perfectly on self-hosted servers. On Vercel serverless, the client automatically falls back to polling with optimized intervals (30s when WS attempted, 10s in pure polling mode), ensuring smooth operation across all deployment targets.
