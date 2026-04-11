# Jain's Got Latent

A real-time, high-performance Live Event Voting and Presentation engine, built for Next.js App Router and securely powered by Supabase.

This software orchestrates live stage performances, handles audience voting in real-time, displays live updating projector leaderboards (using Framer Motion physics), and features a central Admin Switchboard for managing the event pipeline seamlessly.

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Real-Time Engine:** Supabase Realtime (WebSockets) with automated REST Fallback Polling
- **Security:** In-memory Edge Middleware (Global Rate Limiting / DDoS protection)

---

## 📂 Folder Structure

```text
/latent
├── app/
│   ├── (pages)/
│   │   └── team/[code]/          # The "Audience Page" where users Cast Votes for active teams.
│   ├── admin/                    # The "Command Center" Switchboard. Protected by `x-admin-password`.
│   ├── api/                      # Backend API Logic (Next.js serverless functions)
│   │   ├── admin/                # Secure mutating endpoints (set-stage, delete-team, etc.)
│   │   ├── game-state/           # Live pulling for the current stage phase.
│   │   └── ...                   
│   ├── results/                  # The "Projector View" displaying massive live rankings tracking all points.
│   ├── globals.css               # Core Tailwind injections.
│   ├── layout.tsx                # Base HTML wrapper.
│   └── page.tsx                  # Landing / Root landing page. User selects team to join.
├── lib/
│   └── supabase-browser.ts       # Supabase frontend initialization client.
├── public/                       # Static web assets (Favicons, etc).
├── middleware.ts                 # Global Edge Bouncer tracking IPs and enforcing Rate Limits to block spam.
├── .env.local                    # Environment Variables.
└── database-setup.sql            # The raw SQL schema necessary to spin up the Supabase database.
```

---

## 🛠️ Installation & Setup

### 1. Database Setup (Supabase)
Create a new project on [Supabase](https://supabase.com). Go to the SQL Editor and copy-paste the entire contents of `database-setup.sql` to initialize your schemas and default rows.

### 2. Environment Configuration
Create a `.env.local` file in the root directory formatting your project URL and keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# Never commit this. Ensure it is very strong.
ADMIN_PASSWORD=your_super_secret_password_here
```

### 3. Local Installation

If you are pulling down the repository for the first time, install the dependencies using NPM:
```bash
npm install
```

### 4. Running the Dev Server
Fire up the Next.js development server to compile the site:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

*(Note: To access the Admin panel, manually navigate to `/admin` in the URL bar. It is completely hidden from the public UI to prevent audience snooping).*
