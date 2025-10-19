# M3alem Deployment Guide

This guide covers deploying the M3alem AI tutoring platform with:
- **Backend**: Railway (Node.js + WebSocket server)
- **Frontend**: Vercel (Next.js application)

---

## Prerequisites

1. **Accounts Required**:
   - [Railway.app](https://railway.app) account
   - [Vercel](https://vercel.com) account
   - [Supabase](https://supabase.com) project
   - [OpenAI](https://platform.openai.com) API key

2. **Required API Keys**:
   - OpenAI API key with Realtime API access
   - Supabase URL and Service Key

---

## Part 1: Deploy Backend to Railway

### Step 1: Prepare Your Backend

1. Ensure `backend/railway.json` exists (already created)
2. Ensure `backend/package.json` has `engines` field (already configured)

### Step 2: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect the Node.js project

### Step 3: Configure Railway Service

1. In Railway dashboard, click on your service
2. Go to **Settings** tab
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install && npm run build`
5. Set **Start Command**: `npm start`

### Step 4: Add Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```env
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app,*.vercel.app
```

**Important Notes**:
- Replace `your-app.vercel.app` with your actual Vercel domain (you'll update this after deploying frontend)
- `*.vercel.app` allows all Vercel preview deployments
- Railway auto-assigns `PORT`, so don't set it manually

### Step 5: Deploy

1. Click **"Deploy"** in Railway
2. Wait for build to complete (usually 2-3 minutes)
3. Once deployed, Railway will provide a URL like: `https://your-backend.up.railway.app`
4. **Copy this URL** - you'll need it for the frontend!

### Step 6: Verify Backend Deployment

Test the health endpoint:
```bash
curl https://your-backend.up.railway.app/
```

You should see:
```json
{
  "status": "ok",
  "service": "M3alem Backend",
  "version": "0.1.0",
  "timestamp": "..."
}
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Your Frontend

1. Create `.env.production` in project root:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
```
Replace with your actual Railway backend URL from Part 1, Step 5.

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

#### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel --prod
```

### Step 3: Configure Vercel Project

1. In Vercel dashboard, go to your project
2. Go to **Settings** → **Environment Variables**
3. Add environment variable:
   - **Key**: `NEXT_PUBLIC_BACKEND_URL`
   - **Value**: `https://your-backend.up.railway.app` (your Railway URL)
   - **Environments**: Production, Preview, Development

### Step 4: Trigger Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Check **"Use existing Build Cache"** = No
4. Click **"Redeploy"**

### Step 5: Get Your Vercel URL

After deployment completes:
1. Vercel will provide a production URL: `https://your-app.vercel.app`
2. **Copy this URL**

---

## Part 3: Update Backend CORS Settings

Now that you have your Vercel URL, update the backend:

### Step 1: Update Railway Environment Variables

1. Go back to Railway dashboard → Your backend service
2. Go to **Variables** tab
3. Update `CORS_ORIGIN` to:
```
https://your-app.vercel.app,*.vercel.app
```
Replace `your-app.vercel.app` with your actual Vercel domain.

### Step 2: Redeploy Backend

Railway should auto-redeploy when you update environment variables. If not:
1. Go to **Deployments** tab
2. Click **"Redeploy"**

---

## Part 4: Verify Full Deployment

### Test WebSocket Connection

1. Open your Vercel app: `https://your-app.vercel.app`
2. Open browser DevTools → Console
3. You should see WebSocket connection logs like:
   ```
   [WS] Connected to server
   [WS] Session started
   ```

### Test Features

1. **Text Chat**: Send a message and verify AI responds
2. **Voice Call**: Click the floating sphere, test voice conversation
3. **STT (Mic Button)**: Click mic, speak, verify transcription appears
4. **RAG Sources**: Upload a PDF, ask questions about it

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJhbGc...` |
| `NODE_ENV` | Environment | `production` |
| `CORS_ORIGIN` | Allowed frontend origins | `https://app.vercel.app,*.vercel.app` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | `https://backend.railway.app` |

---

## Troubleshooting

### WebSocket Connection Failed

**Problem**: Frontend can't connect to backend WebSocket

**Solutions**:
1. Verify backend is deployed and health endpoint responds
2. Check `NEXT_PUBLIC_BACKEND_URL` is set correctly in Vercel
3. Ensure Railway backend has correct `CORS_ORIGIN`
4. Check browser console for CORS errors

### CORS Errors

**Problem**: `Access-Control-Allow-Origin` errors in browser

**Solutions**:
1. Verify `CORS_ORIGIN` in Railway includes your Vercel domain
2. Include `*.vercel.app` for preview deployments
3. Ensure protocol matches (https:// not http://)

### Environment Variables Not Working

**Problem**: Changes to env vars not taking effect

**Solutions**:
1. Redeploy after changing env vars (disable build cache)
2. For frontend: Env vars must start with `NEXT_PUBLIC_` to be available in browser
3. For backend: Railway auto-redeploys on env var changes

### Railway Build Fails

**Problem**: `npm run build` fails on Railway

**Solutions**:
1. Check build logs in Railway dashboard
2. Ensure `tsconfig.json` is correct
3. Verify all dependencies are in `package.json` (not devDependencies)
4. Try building locally: `cd backend && npm run build`

### Vercel Build Fails

**Problem**: Next.js build fails on Vercel

**Solutions**:
1. Check build logs in Vercel dashboard
2. Ensure `NEXT_PUBLIC_BACKEND_URL` is set
3. Try building locally: `npm run build`
4. Check for TypeScript errors

---

## Monitoring & Logs

### Railway Logs

View backend logs:
1. Railway dashboard → Your service
2. Click **"View Logs"**
3. Filter by severity (info, warning, error)

### Vercel Logs

View frontend logs:
1. Vercel dashboard → Your project
2. Go to **Deployments** → Click deployment
3. View **Build Logs** or **Function Logs**

---

## Custom Domains (Optional)

### Add Custom Domain to Vercel

1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain (e.g., `tutorme.com`)
3. Configure DNS records as instructed
4. Update Railway `CORS_ORIGIN` to include custom domain

### Add Custom Domain to Railway

1. Go to Railway service → **Settings** → **Domains**
2. Add custom domain
3. Configure DNS records
4. Update Vercel `NEXT_PUBLIC_BACKEND_URL`

---

## Updating Deployments

### Update Backend

1. Push changes to GitHub
2. Railway auto-deploys from `main` branch
3. Or manually trigger deployment in Railway dashboard

### Update Frontend

1. Push changes to GitHub
2. Vercel auto-deploys from `main` branch
3. Or manually trigger deployment in Vercel dashboard

---

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Backend health endpoint responds
- [ ] WebSocket connection works
- [ ] Text chat works
- [ ] Voice call works
- [ ] STT (mic button) works
- [ ] RAG upload and query works
- [ ] CORS configured for production domain
- [ ] SSL/HTTPS enabled (automatic on Railway & Vercel)
- [ ] Error monitoring setup (optional: Sentry, LogRocket)
- [ ] Database backups configured in Supabase

---

## Support

For deployment issues:
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support

For M3alem-specific issues, check:
- Backend logs in Railway
- Frontend logs in Vercel
- Browser console for client-side errors
