# Railway Deployment Guide

## Quick Setup

### 1. Deploy to Railway
```bash
# Connect your GitHub repo to Railway
# Railway will auto-detect Next.js and deploy
```

### 2. Add Redis Plugin
1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway automatically creates `storage_REDIS_URL` environment variable
4. Your app will automatically connect to Redis!

### 3. Set Other Environment Variables
Add these in Railway's **Variables** tab:

```bash
# Required for LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# Required for blog generation
GEMINI_API_KEY=your_gemini_api_key

# Required for GitHub commits
GITHUB_TOKEN=your_github_token
GITHUB_REPO=username/repo
GITHUB_BRANCH=main

# Required for JWT security
JWT_SECRET=your_32_character_secret_key_here

# Optional - Admin access
MCP_MASTER_TOKEN=your_master_token
```

### 4. Domain Setup (Optional)
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** for a free `.railway.app` domain
3. Or add your custom domain

## Environment Variables Reference

### Automatically Set by Railway
- ✅ `storage_REDIS_URL` - Set when you add Redis plugin
- ✅ `PORT` - Railway sets this automatically
- ✅ `NODE_ENV` - Set to `production`

### You Need to Set
- 🔧 `LINKEDIN_CLIENT_ID`
- 🔧 `LINKEDIN_CLIENT_SECRET`
- 🔧 `GEMINI_API_KEY`
- 🔧 `GITHUB_TOKEN`
- 🔧 `GITHUB_REPO`
- 🔧 `GITHUB_BRANCH`
- 🔧 `JWT_SECRET`
- 🔧 `MCP_MASTER_TOKEN` (optional)

## LinkedIn OAuth Redirect URI

After deploying, update your LinkedIn app settings:

```
Redirect URI: https://your-app.railway.app/api/auth/linkedin/callback
```

## Monitoring

Check deployment logs in Railway dashboard:
- ✅ `Redis connected successfully` - Redis is working
- ⚠️ `Redis unavailable, using in-memory storage fallback` - Redis plugin not added

## Troubleshooting

### Redis Not Connecting
1. Verify Redis plugin is added to your project
2. Check that `storage_REDIS_URL` appears in Variables tab
3. Redeploy the app

### LinkedIn OAuth Not Working
1. Update redirect URI in LinkedIn Developer Portal
2. Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set
3. Check that the domain matches exactly (including https://)

### Build Failures
1. Check build logs in Railway dashboard
2. Ensure all required environment variables are set
3. Verify `package.json` has correct build script

## Cost Optimization

Railway offers:
- **Free tier**: $5/month credit (enough for small apps)
- **Redis**: ~$5/month for 256MB
- **App**: Pay for usage (typically $5-10/month for small traffic)

**Total estimated cost**: $10-15/month for production app with Redis

## Scaling

Railway auto-scales based on:
- CPU usage
- Memory usage
- Request volume

No manual configuration needed for basic scaling!
