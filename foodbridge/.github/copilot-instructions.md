# Workspace Instructions for Copilot

This project is FoodBridge, a production-grade urban food redistribution platform.

## Priorities

- Maintain modular domain boundaries: auth, donations, logistics, analytics, trust
- Keep APIs validation-first with Zod
- Preserve role-based access controls for DONOR, NGO, VOLUNTEER, ADMIN
- Favor server-safe code in route handlers and typed reusable logic in src/lib
- Keep UI responsive and mobile-first using Tailwind

## Reliability Expectations

- Do not bypass auth checks for protected endpoints
- Keep business logic in lib modules instead of bloating route files
- Preserve Prisma schema integrity and migration consistency
- Ensure any new feature includes API error handling and role checks
