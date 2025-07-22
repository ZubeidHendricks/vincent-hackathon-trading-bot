# 🚀 Vercel Deployment Guide

## Quick Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
# Follow the prompts to authenticate with your GitHub account
```

### 3. Deploy Your Bot
```bash
cd /home/zubeid/autoapeHackathon/ZUBAID/hackathon-trading-bot
vercel --prod
```

### 4. Set Environment Variables
```bash
# Set your production environment variables
vercel env add RECALL_NETWORK_PRODUCTION_API_KEY
vercel env add RECALL_NETWORK_SANDBOX_API_KEY
vercel env add VINCENT_DELEGATEE_PRIVATE_KEY
vercel env add VINCENT_DELEGATEE_ADDRESS
vercel env add COINRANKING_API_KEY
vercel env add MONGODB_URI
```

## Your Vercel URLs

After deployment, you'll get URLs like:
- **Production:** `https://vincent-hackathon-trading-bot.vercel.app`
- **Preview:** `https://vincent-hackathon-trading-bot-git-main-yourusername.vercel.app`

## Vincent App Registration URLs

Use these redirect URIs in your Vincent app registration:

### Primary Production URL:
```
https://vincent-hackathon-trading-bot.vercel.app/auth/callback
```

### Additional Backup URLs:
```
https://vincent-hackathon-trading-bot-git-main.vercel.app/auth/callback
https://vincent-hackathon-trading-bot-yourusername.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

## Deployment Commands

### Deploy to Production
```bash
vercel --prod
```

### Deploy Preview (for testing)
```bash
vercel
```

### View Deployment Info
```bash
vercel ls
vercel inspect [deployment-url]
```

## Environment Setup
Make sure these variables are set in Vercel dashboard:
- `RECALL_NETWORK_PRODUCTION_API_KEY`
- `RECALL_NETWORK_SANDBOX_API_KEY`  
- `VINCENT_DELEGATEE_PRIVATE_KEY`
- `VINCENT_DELEGATEE_ADDRESS`
- `COINRANKING_API_KEY`
- `MONGODB_URI`
- `BASE_RPC_URL=https://mainnet.base.org/`
- `NODE_ENV=production`
- `RECALL_NETWORK_ENVIRONMENT=production`