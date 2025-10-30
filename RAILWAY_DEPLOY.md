# 🚂 Railway Deployment Guide

## Quick Deploy Steps

### 1. Connect Repository to Railway
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or Git provider)
4. Select your `Sanctum` repository

### 2. Add PostgreSQL Database
1. In Railway dashboard, click "+ New" → "Database" → "PostgreSQL"
2. Railway will auto-create database and set `DATABASE_URL` environment variable
3. **IMPORTANT**: Copy the `DATABASE_URL` value (you'll need it)

### 3. Set Environment Variables
Go to your service → Variables tab, add these:

**REQUIRED:**
```
SANCTUM_GATEWAY_API_KEY=01K8HMCYMFBA3FT0RSWW0C68KV
SESSION_SECRET=<generate-random-32-char-string>
```

**OPTIONAL:**
```
OPENROUTER_API_KEY=<your-openrouter-key>  # For AI features
NODE_ENV=production
```

**DATABASE_URL** → Already set by Railway automatically when you add PostgreSQL

### 4. Run Database Migration
After first deploy, run migration manually:

**Option A: Via Railway CLI**
```bash
railway run pnpm run db:push
```

**Option B: Via Railway Dashboard**
1. Go to your service → Settings → Command
2. Add custom command: `pnpm run db:push`
3. Run it once, then remove the command

**Option C: Via Railway Shell**
1. Click on your service → "View Logs" → "Shell"
2. Run: `pnpm run db:push`

### 5. Deploy!
Railway will automatically:
1. Detect `pnpm-lock.yaml` and use pnpm
2. Run `pnpm install`
3. Run `pnpm run build`
4. Start with `node dist/index.js`
5. Health check at `/api/public/health`

## Verification

### Check if Deployment Success
1. Visit your Railway URL (shown in dashboard)
2. Should see Observatory landing page
3. Try logging in with default admin:
   - Email: `admin@observatory.dev`
   - Password: `Observatory2024!`

### Check Logs for Errors
Railway Dashboard → Your Service → Logs tab

Look for:
- ✅ `[express] serving on port [PORT]`
- ✅ `[SanctumGateway] Running in LIVE mode with real API (mainnet)`
- ✅ `[Server] Default admin account already exists`
- ❌ Any "Invalid request body" errors (should be fixed now!)

### Test Gateway Integration
1. Login to dashboard
2. Go to Benchmarking page
3. Generate wallet → Fund with small amount
4. Run 1-2 transactions
5. Check logs should show:
   - `✅ Gateway build successful!`
   - `✅ Transaction sent successfully`

## Troubleshooting

### Build Fails
- Check Railway logs for error
- Ensure `pnpm-lock.yaml` exists
- Verify Node.js version (should auto-detect)

### Database Connection Error
- Verify `DATABASE_URL` is set in Variables
- Check PostgreSQL service is running
- Run `pnpm run db:push` to create tables

### Gateway API Errors
- Verify `SANCTUM_GATEWAY_API_KEY` is set correctly
- Check Gateway API is accessible from Railway IPs
- Review logs for specific Gateway error messages

### Port Issues
- Railway auto-assigns PORT (check `process.env.PORT`)
- Don't hardcode port 5000 in production
- App should read from `process.env.PORT || 5000`

## What's Already Fixed

✅ **buildGatewayTransaction Error Fixed**
- Removed invalid `lastValidBlockHeight` property
- Fixed serialization to use `serializeMessage()`
- Enhanced error handling

✅ **Railway Configuration**
- Updated `railway.json` for pnpm support
- Correct start command
- Health check endpoint configured

## Next Steps After Deploy

1. **Create Admin Account** (if not auto-created)
2. **Run Database Migration** (`pnpm run db:push`)
3. **Test Benchmark** → Run small test transaction
4. **Monitor Logs** → Check for any Gateway errors
5. **Set Custom Domain** (optional) → Railway → Settings → Generate Domain

---

**Railway will auto-deploy on every push to main branch!** 🚀

