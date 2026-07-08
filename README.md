# Techtio Ops CRM Starter

A starter MVP for tracking daily media buying spend, shared media buyer budget pools, accounts, agencies, buyers, geos, offers, CPL, FTDs, revenue, profit and ROI.

## Stack

- Next.js
- React
- TypeScript
- Supabase-ready PostgreSQL schema
- Recharts-ready dashboard structure

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Pages

- `/dashboard`
- `/daily-spend`
- `/accounts`
- `/agencies`
- `/offers`
- `/buyers`
- `/reports`
- `/settings`

## Budget Pool

The dashboard now includes a shared media buying pool budget:

- Total pool budget
- Pool spent
- Remaining pool budget
- Usage percentage
- Buyer-level allocated budget
- Buyer-level remaining budget

For the MVP, these values are in `lib/mock-data.ts`. When Supabase is connected, use the `budget_pools`, `buyer_budget_allocations`, `budget_pool_usage`, and `buyer_budget_usage` objects from `sql/schema.sql`.

## Database

Use `sql/schema.sql` in Supabase SQL editor.

## Next build step

Connect the forms to Supabase and replace mock data in `lib/mock-data.ts` with real database queries.
