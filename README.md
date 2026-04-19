# Jain's Got Latent

A real-time, high-performance Live Event Voting and Presentation engine, built for Next.js App Router and securely powered by Supabase.

This software orchestrates live stage performances, handles audience voting in real-time, displays live updating projector leaderboards (using Framer Motion physics), and features a central Admin Switchboard for managing the event pipeline seamlessly.

---

## ✨ Features

- **Real-Time Voting:** Audience members can vote for performers on stage using their devices in real-time.
- **Dynamic Leaderboard Projector:** A breathtaking `/results` projector page driven by Framer Motion, showing shifting ranks and live score updates over WebSockets.
- **Admin Command Center:** A secure, password-protected switchboard to completely control the event's lifecycle. Admins can verify teams, bring teams on/off stage, toggle voting phases, award bonuses, and handle malicious votes. 
- **Graceful Error Handling:** Comprehensive `error.tsx` boundaries to ensure serverless crashes from Next.js don't result in fatal unstyled white-screens of death.
- **DDoS Resiliency:** Edge rate limiting built straight into the Next.js `middleware.ts` to bounce bot-spammers or excessive voting attempts. 

---

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Actions)
- **Styling:** Tailwind CSS + Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Real-Time Engine:** Supabase Realtime (WebSockets) with automated REST Fallback Polling
- **Security:** Next.js Edge Middleware for global IP rate-limiting, and Supabase Row Level Security (RLS).

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
│   ├── error.tsx                 # Global boundary preventing Next.js white screens.
│   └── page.tsx                  # Root landing page. User selects team to join.
├── lib/
│   └── supabase-browser.ts       # Supabase frontend initialization client.
├── public/                       # Static web assets (Favicons, etc).
├── middleware.ts                 # Global Edge Bouncer tracking IPs and enforcing Rate Limits to block spam.
└── database-setup.sql            # The raw SQL schema necessary to spin up the Supabase database.
```

---

## 🛠️ Installation & Setup

### 1. Database Setup (Supabase)
Create a new project on [Supabase](https://supabase.com). Go to the SQL Editor and copy-paste the entire contents of `database-setup.sql` to initialize your schemas and default rows.

*Important Security Note:* Ensure **Row Level Security (RLS)** is enabled on all tables (`teams`, `votes`, `scores`, `game_state`) to prevent malicious users from querying the database from their browser client.

### 2. Configure Environment Variables
You must provide your own Supabase credentials and a secure admin password. Do not hardcode these or commit them. Create a `.env.local` file locally to host these safely, and add them directly to your hosting provider's (like Vercel) dashboard for production.

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

---

## 📦 Production Deployment (Vercel)

This application is optimized for Vercel Serverless deployment. 

1. Push your repository to GitHub.
2. Import the project into Vercel. 
3. Supply your Environment Variables in the Vercel dashboard. **WARNING: Never prefix your Admin Password or Supabase Service Key with `NEXT_PUBLIC_`** as this bundles secrets into the public client JavaScript.
4. Deploy. Vercel will aggressively cache your server components and optimize your assets. 
