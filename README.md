# NumID MVP

NumID is a production-ready SaaS application that allows users to use their phone number as a permanent, public email address (e.g., `5154146054@numid.us`). When an email is received, Cloudflare Email Routing forwards it instantly to the user's private destination email (e.g., `sanjaya.ghimire@gmail.com`).

Users can update their forwarding address at any time from their secure dashboard without changing their public NumID email address.

---

## 🛠️ Technology Stack

*   **Frontend & API:** Next.js 15 App Router (React 19, TypeScript, Tailwind CSS, Lucide icons)
*   **Database & Authentication:** Supabase (PostgreSQL with RLS, auth logs, and DB triggers)
*   **Verification Infrastructure:** Twilio Verify API (SMS OTP codes)
*   **Routing Infrastructure:** Cloudflare Email Routing API (DNS-level forwarding rules)
*   **Hosting:** Vercel

---

## 📋 Domains Layout

1.  **`numid.us`**: Email routing domain. Hosts the Cloudflare Email Routing rules and handles incoming user email forwards.
2.  **`numid.dev`**: Customer-facing portal. Handles signup, login, dashboard controls, audit trails, and the administration panel.

---

## 🚀 Getting Started (Local Setup)

### 1. Initialize Project Configuration

Copy the environment variables template and configure your values:

```bash
cp .env.example .env.local
```

### 2. Sandbox Mock Mode (Zero-Config Testing)

To review this application immediately without configuring active Twilio or Cloudflare API accounts, set:

```env
NEXT_PUBLIC_MOCK_APIS=true
```

In Mock Mode:
*   **SMS OTP Verification:** You can enter *any* phone number and verify it instantly using the mock code `123456`.
*   **Cloudflare Email Routing Verification:** In the user dashboard, a mock sandbox control card is displayed. Click **"Simulate Cloudflare Email Link Verification Click"** to verify the email address instantly, then click **"Check Cloudflare Status"** to activate DNS forwarding rules.

---

## 🗄️ Database Setup

1.  Create a Supabase project at [supabase.com](https://supabase.com).
2.  Open the **SQL Editor** in your Supabase dashboard.
3.  Copy and execute the contents of the initial migration script: `supabase/migrations/20260613000000_init.sql`. This sets up tables, performance indexes, triggers, and Row Level Security (RLS) policies.
4.  Copy and execute the contents of `supabase/seed.sql` to register pre-packaged testing accounts:
    *   **Regular User:** `sanjaya.ghimire@gmail.com` / Password: `password123` (Phone: `+15154146054`, fully active forwarding)
    *   **Admin User:** `admin@numid.dev` / Password: `password123` (Phone: `+19999999999`)

---

## 🔑 Environment Variables Reference

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project API URL | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keeps server actions secure) | Supabase > Project Settings > API |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Twilio Console Dashboard |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Twilio Console Dashboard |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID | Twilio > Verify > Services |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | Cloudflare Profile > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Cloudflare Account Dashboard url |
| `CLOUDFLARE_ZONE_ID` | Cloudflare Zone ID for `numid.us` | Cloudflare > DNS > Zone Overview |
| `NEXT_PUBLIC_MOCK_APIS` | Set `true` to enable mock simulation | Local setting |

---

## ⚡ Running Locally

Install the dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Vercel Deployment Instructions

1.  Push your code repository to GitHub, GitLab, or Bitbucket.
2.  Create a new project in your **Vercel Dashboard** and link the repository.
3.  In the deployment settings, configure the environment variables listed in the reference table above. **Ensure `NEXT_PUBLIC_MOCK_APIS` is set to `false` for active integrations.**
4.  Configure the **redirect URL** in Supabase Auth:
    *   Navigate to **Supabase > Authentication > URL Configuration**.
    *   Set **Site URL** to your Vercel production domain (e.g., `https://numid.dev`).
    *   Add `https://numid.dev/auth/callback` to the **Redirect URLs** list.
5.  Click **Deploy**. Vercel will build the Next.js production bundle.
