# FlowLine AI — AI Cash-Flow Underwriter for SaaS & Agencies

Full-stack MERN web application (React + Vite + Tailwind CSS frontend, Node.js + Express + MongoDB backend) for underwriting non-dilutive revolving credit lines using verified recurring monthly cash flow from **Stripe**, **QuickBooks Online**, and **Plaid** bank feeds—complete with an explainable AI/SHAP underwriting engine, 4-step Borrower Portal, and a 6-module RBAC Admin Panel.

## Architecture & Features

- **Borrower Portal:** KYB & UBO onboarding, read-only OAuth financial stack linking (Stripe, QuickBooks Online, Plaid), AI credit offer & e-sign activation, revolving credit line dashboard, 2FA-verified ACH drawdowns, and repayment tracking.
- **AI Underwriting Engine (`backend/src/services/underwritingEngine.js`):** Cross-source reconciliation (Stripe payouts vs. Plaid settled deposits), 14+ engineered cash-flow features, deterministic policy knockouts, calibrated PD risk tiering (Tiers A–D), credit-limit sizing, and SHAP feature attributions with Adverse Action reason codes.
- **Complete Admin Panel:**
  1. **Underwriter Queue & Workbench** (12-month cash-flow reconciliation chart, SHAP risk drivers, Counter-Offer, Dual-Approval co-signing)
  2. **Borrowers & Credit Lines** (global search, instant Freeze/Unfreeze controls)
  3. **Credit Policy & Shadow Backtester** (versioned policy rules + 500-app historical simulation)
  4. **Portfolio & Covenant Monitor** (exposure KPIs, segment breakdown, automated covenant alerts)
  5. **Integrations & DLQ Ops** (Stripe/QBO/Plaid health + Dead-Letter Queue job replay)
  6. **Immutable Compliance Audit Logs** (append-only trail + CSV export)
- **Live Sandbox + Zero-Friction Demo Mode:** Connects to real Stripe, QuickBooks, and Plaid sandbox APIs when keys are set in `.env`, and automatically falls back to realistic reconciled sandbox data when keys are omitted so you can demo immediately.

---

## 1. Run Locally

### Backend
```bash
cd backend
cp .env.example .env
# Add your MongoDB Atlas URI in .env (or leave blank to run with in-memory fallback? No, add free MongoDB Atlas URI)
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Use the built-in **1-Click Demo Login** buttons on the Login screen (Borrower or Super-Admin) or register a new account.

---

## 2. Upload to GitHub

```bash
cd flowline-ai
git init
git add .
git commit -m "Initial commit: FlowLine AI full-stack Cash-Flow Underwriter"
git branch -M main
git remote add origin https://github.com/<your-username>/flowline-ai.git
git push -u origin main
```

---

## 3. Deploy Backend on Render (Free Tier)

1. Create a free **MongoDB Atlas** cluster at https://www.mongodb.com/atlas and copy your connection string (`MONGODB_URI`). Whitelist `0.0.0.0/0` in Network Access.
2. Go to https://dashboard.render.com -> **New +** -> **Web Service** -> connect your `flowline-ai` GitHub repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables on Render:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = any strong random string
   - `FRONTEND_URL` = your Vercel URL (add after Step 4, e.g. `https://flowline-ai.vercel.app`)
   - *(Optional)* `STRIPE_SECRET_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`
5. Deploy and copy your live Render URL (e.g. `https://flowline-ai-backend.onrender.com`).

---

## 4. Deploy Frontend on Vercel (Free Tier)

1. Go to https://vercel.com/new -> import your `flowline-ai` GitHub repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable on Vercel:
   - `VITE_API_URL` = `https://<your-render-backend>.onrender.com/api`
4. Click **Deploy**. Copy your live Vercel URL and paste it into `FRONTEND_URL` on Render (then redeploy Render once so CORS allows your Vercel domain).
