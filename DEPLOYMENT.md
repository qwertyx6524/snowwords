# Snowwords - Northflank Deployment Guide

This guide will help you deploy Snowwords to Northflank with your existing Supabase database.

## Prerequisites

1. **Northflank Account**: Sign up at [northflank.com](https://northflank.com)
2. **Supabase Database**: Your existing Supabase PostgreSQL database
3. **GitHub Repository**: Push your code to GitHub (Northflank deploys from Git)

## Environment Variables Required

Configure these environment variables in Northflank:

### Database (Required)
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
  - Example: `postgresql://user:password@db.your-project.supabase.co:5432/postgres`
  - Find this in Supabase Dashboard → Project Settings → Database → Connection String

### Session & Security (Required)
- `SESSION_SECRET` - Random string for session encryption (generate with: `openssl rand -base64 32`)
- `NODE_ENV` - Set to `production`

### Google OAuth (Required for Google Sign-In)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_CALLBACK_URL` - Your Northflank URL + `/auth/google/callback`
  - Example: `https://your-app.northflank.app/auth/google/callback`

### Stripe Payments (Required for Premium Features)
- `STRIPE_SECRET_KEY` - From Stripe Dashboard
- `STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe Webhook settings

### AI Chat (Required)
- `GROQ_API_KEY` - Get free API key from [console.groq.com](https://console.groq.com)

### Admin Panel (Optional)
- `ADMIN_PASSWORD` - Admin panel password (defaults to `snowwords-admin` if not set)

### Port (Auto-configured by Northflank)
- `PORT` - Northflank automatically sets this, no need to configure

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
# If you haven't already initialized git
git init
git add .
git commit -m "Prepare for Northflank deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/snowwords.git
git branch -M main
git push -u origin main
```

### Step 2: Create a New Service on Northflank

1. Log in to [Northflank](https://app.northflank.com)
2. Click **"Create Service"**
3. Choose **"Combined service"** (or "Web service")
4. Select **"GitHub"** as the source
5. Connect your GitHub account if not already connected
6. Select your **snowwords** repository
7. Select the **main** branch

### Step 3: Configure Build Settings

1. **Build Type**: Select **Dockerfile**
2. **Dockerfile Path**: Leave as default (`./Dockerfile`)
3. **Build Context**: Leave as default (`.`)

### Step 4: Configure Environment Variables

1. In the service settings, go to **"Environment Variables"**
2. Add all required environment variables listed above
3. Mark sensitive variables (like secrets and API keys) as **"Secret"**

### Step 5: Configure Port & Health Check

1. **Port**: Set to `3000` (Northflank will map this automatically)
2. **Health Check** (optional but recommended):
   - Path: `/`
   - Port: `3000`
   - Initial Delay: `30` seconds

### Step 6: Deploy

1. Click **"Create Service"**
2. Northflank will automatically:
   - Clone your repository
   - Build the Docker image
   - Deploy your application
   - Provide you with a public URL

### Step 7: Update Google OAuth Callback

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services → Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add your Northflank URL to **Authorized redirect URIs**:
   - `https://your-app.northflank.app/auth/google/callback`
5. Update the `GOOGLE_CALLBACK_URL` environment variable in Northflank

### Step 8: Update Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Create a new webhook endpoint:
   - URL: `https://your-app.northflank.app/subscription/webhook`
   - Events to send: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
3. Copy the webhook signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in Northflank environment variables

## Monitoring & Logs

- **View Logs**: Northflank Dashboard → Your Service → Logs
- **Metrics**: Northflank Dashboard → Your Service → Metrics
- **Restart**: If needed, go to Service → Actions → Restart

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Supabase IP allowlist (should allow all IPs or Northflank IPs)
- Ensure SSL is enabled in connection string

### Build Failures
- Check build logs in Northflank
- Verify Dockerfile syntax
- Ensure all dependencies in package.json

### Application Errors
- Check application logs in Northflank
- Verify all environment variables are set
- Check for missing secrets

## Scaling

Northflank's free tier includes:
- 2 free services
- Always-on (no sleep)
- Auto-scaling available on paid plans

To scale:
1. Go to Service Settings
2. Adjust **Replicas** or **Resources**
3. Save changes

## Custom Domain (Optional)

1. Go to Service → Networking → Domains
2. Click **"Add Custom Domain"**
3. Enter your domain name
4. Update DNS records as instructed
5. SSL certificate will be auto-provisioned

## Continuous Deployment

Northflank automatically redeploys when you push to your connected GitHub branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Your app will automatically rebuild and redeploy!

## Support

- **Northflank Docs**: https://northflank.com/docs
- **Northflank Community**: https://community.northflank.com
- **Supabase Docs**: https://supabase.com/docs

## Migration Checklist

- [ ] Code pushed to GitHub
- [ ] Northflank service created
- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Google OAuth callback updated
- [ ] Stripe webhook endpoint updated
- [ ] Application accessible via Northflank URL
- [ ] Test login functionality
- [ ] Test premium features
- [ ] Monitor logs for errors

---

**Note**: Keep your Supabase database - no migration needed! Northflank will connect to it using the `DATABASE_URL`.
