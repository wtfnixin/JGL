# Production Deployment & Failure Handling Guide

This document is a comprehensive guide to understanding what is required to deploy this Next.js + Supabase application to a production environment (such as Vercel). It covers performance optimizations, avoiding leaks, protecting your database, and strategies for handling downstream and upstream server failures.

---

## 1. Environment & Secrets Management
Before deploying, the way you handle variables must shift from a local mindset to a secure production mindset.

- **`.env.local` Exclusion**: The `.env.local` file is explicitly ignored by Git (via `.gitignore`). This ensures local service keys are never leaked to public or private version control systems like GitHub.
- **Vercel Dashboard Environment Configuration**:
  - In your Vercel project, navigate to **Settings > Environment Variables**.
  - Add all properties found in your local `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, and any `ADMIN_PASSWORD`.
  - **CRITICAL WARNING**: Never add the prefix `NEXT_PUBLIC_` to `SUPABASE_SERVICE_KEY` or `ADMIN_PASSWORD`. Doing so will bundle these highly sensitive keys into your frontend JavaScript that is sent to the client's browser, granting any user full administrator/bypass access to your database.

---

## 2. Supabase Optimization & Security

### Row Level Security (RLS)
By default, newly created Supabase tables don't restrict who can query or write to them from the client-side API.
- You must go to the Supabase dashboard -> **Authentication** -> **Policies** and enable Row Level Security on **all tables** (`teams`, `votes`, `scores`, `game_state`).
- Since your application interacts with Supabase exclusively via API routes using the `SUPABASE_SERVICE_KEY` (which natively bypasses RLS), no user should be able to maliciously open their browser's dev-tools and dispatch a query to `supabase.from('teams').delete()`. Enabling RLS without writing any 'ALLOW' policies effectively defaults to denying all client-side queries, protecting your data.

### Database Indexing
During an event with hundreds of simultaneous visitors, inefficient queries can cause database CPU spikes.
- **Indexes**: Identify the columns used inside `.eq()` clauses in your code. For instance, the `code` column in `teams` or the `team_id` in `scores`. 
- You can create indexes via Supabase SQL Editor:
  ```sql
  CREATE INDEX idx_teams_code ON public.teams (code);
  CREATE INDEX idx_scores_team_id ON public.scores (team_id);
  ```

### Connections & Pooling
Next.js API routes scale horizontally on Vercel by spinning up dozens of serverless instances concurrently.
- If you were using an ORM like Prisma, connection exhaustion would crash your database. Fortunately, since you are using the `@supabase/supabase-js` client, requests are made via HTTP (PostgREST API) rather than direct TCP database connections. This largely negates connection limit issues, meaning your backend can scale very aggressively without maxing out PostgreSQL connections.

---

## 3. Server Crashes in Serverless Environments

Unlike traditional backend servers (e.g., Express running on an EC2 instance) which can crash and require manual restarts (via `systemd` or `pm2`), Next.js operates in a Serverless architecture on Vercel.

### How Crashes Work in Serverless
- **Stateless Isolation**: Each user request (or batch of requests) is handled by an ephemeral "Serverless Function".
- If your code throws a fatal `UnhandledPromiseRejection` or syntax error during an API call, **only the function fulfilling that specific request dies**.
- **Self-Healing**: The next incoming request will hit a fresh Vercel function. There is no concept of a "server crashing and staying down". 
- **The Real Threat**: The main source of "application downtime" in Serverless is dependencies timing out (e.g., Supabase goes down, returning 5xx HTTP codes), misconfigured environment variables, or infinite loops causing out-of-memory (OOM) errors forcing Vercel to terminate the function.

---

## 4. Strategies for Handling Failures

### 1. Next.js Error Boundaries
You must define how the User Interface reacts when a server or component fails. Without an error boundary, your app will show an unstyled white page.

- **`error.tsx`**: Create an `error.tsx` file inside your `/app` directory, or nested inside specific route groups (e.g., `/app/(pages)/error.tsx`). This acts as a React Error Boundary.
- **Implementation Example**:
  ```tsx
  'use client'; // Error components must be Client Components
  import { useEffect } from 'react';

  export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
      // Send error to your observability tracker
      console.error(error);
    }, [error]);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <button 
            onClick={() => reset()} 
            className="px-4 py-2 bg-indigo-500 rounded hover:bg-indigo-600 transition"
          >
            Try repairing connection
          </button>
        </div>
      </div>
    );
  }
  ```

### 2. Global Exception Tracking
Since Vercel automatically heals functions, you will lose the log output of *why* a function failed unless you are actively looking at the Vercel Logs tab. 
- **Integrate Sentry**: Sentry (`@sentry/nextjs`) wraps your Next.js application. Whenever a user experiences a crash or unhandled error, Sentry logs the stack trace, the user's browser details, and the API payload, and alerts you via email/Slack.
- **To Install**: run `npx @sentry/wizard@latest -i nextjs` in your terminal and follow the instructions.

### 3. Graceful API Error Handling
When making database queries, never assume success. You should already be wrapping your Supabase calls in `try/catch` and checking the `error` object returned from Supabase.
- **Do not leak stack traces**: If an API route fails, never `return Response.json({ error: error.message })`. This leaks internal database structures. Instead, securely log it to the console/Sentry, and return a sanitized `500 Internal Server Error`.

---

## 5. Traffic Spikes & DDoS Resilience

### Upgrading Edge Middleware for Rate Limiting
Your current `middleware.ts` uses an in-memory `Map<string, number[]>` to rate limit requests. While effective for local development and minor anti-spam protection, it has fatal flaws in production:
1. **Edge Isolation**: Vercel routes traffic through a global CDN. A user hitting an Edge node in New York populates a different `Map` memory space than a user in California.
2. **Ephemeral Memory**: The `Map` is wiped clean whenever Vercel scales the Edge function down after 15 minutes of inactivity.

**Production Solution - Upstash Redis**:
To truly rate limit a global application, you require a synchronized datastore rapidly accessible at the Edge.
- **Upstash Redis** offers sub-millisecond global caching.
- By integrating `@upstash/ratelimit`, you check the user's IP against a centralized global Redis instance. If they exceed 200 requests, they are blocked globally across all edge nodes instantly.

---

## 6. Real-time Subscriptions Fallback
If you are heavily reliant on Supabase Realtime (WebSockets) for your live dashboard/actions:
- WebSockets can drop due to poor user network connectivity (mobile data hopping).
- Ensure your frontend components automatically re-fetch the latest state (`game_state`, `votes`) upon reconnecting, rather than assuming they haven't missed any events while disconnected.

### Final Sanity Checklist
1. All `.env.local` variables securely mirrored onto the Vercel Dashboard?
2. Row Level Security (RLS) toggled ON in the Supabase Dashboard for all tables?
3. Indexes deployed via SQL for commonly searched items?
4. `error.tsx` created to prevent unrecoverable white screens?
5. Application registered in an observability platform like Sentry or Vercel Analytics?
