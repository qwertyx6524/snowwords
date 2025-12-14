# Northflank Deployment - Simple Step-by-Step Guide

Don't worry about the confusing terms! Follow these exact steps:

## Step 1: Sign Up & Initial Setup

1. Go to https://northflank.com
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with your GitHub account (easiest option)
4. You'll be asked to create a **Project** - just name it "Snowwords" and click Create

## Step 2: Understanding Northflank Terms (Don't Panic!)

- **Project** = A folder for your apps (you just created this)
- **Cluster** = The server where your app runs (Northflank provides a free one)
- **Service** = Your actual application (this is what we'll create)

## Step 3: Use the Free Cluster (No Setup Needed!)

When you first sign up, Northflank gives you access to their **shared cluster** for free.

**YOU DON'T NEED TO CREATE A CLUSTER!**

Just skip any cluster creation - Northflank's free tier uses their shared infrastructure automatically.

## Step 4: Create Your Service (This is Your App!)

1. In your Northflank dashboard, click the big **"+ Create Service"** button

2. You'll see options - choose:
   - **"Build service"** (this is for apps that need to be built from code)

3. **Connect GitHub:**
   - Click "Connect to GitHub"
   - Authorize Northflank to access your GitHub
   - Select your snowwords repository
   - Select the **main** branch

4. **Build Configuration:**
   - Build Type: Select **"Dockerfile"**
   - Dockerfile Path: Leave as `Dockerfile` (default)
   - That's it!

5. **Service Configuration:**
   - Service Name: `snowwords` (or whatever you like)
   - Port: `3000`
   - Resources: Leave as default (free tier)

6. Click **"Create Service"** at the bottom

## Step 5: Add Environment Variables

This is important! Your app won't work without these.

1. After creating the service, go to the **"Environment"** tab
2. Click **"Add Variable"**
3. Add each variable one by one:

### Copy these from your Render dashboard:

**Variable Name** | **Where to Get It** | **Type**
---|---|---
`DATABASE_URL` | Your Supabase connection string | Secret
`SESSION_SECRET` | Copy from Render | Secret
`NODE_ENV` | Type: `production` | Variable
`GOOGLE_CLIENT_ID` | Copy from Render | Variable
`GOOGLE_CLIENT_SECRET` | Copy from Render | Secret
`GOOGLE_CALLBACK_URL` | Your new Northflank URL + `/auth/google/callback` | Variable
`STRIPE_SECRET_KEY` | Copy from Render | Secret
`STRIPE_PUBLISHABLE_KEY` | Copy from Render | Variable
`STRIPE_WEBHOOK_SECRET` | Copy from Render | Secret
`GROQ_API_KEY` | Copy from Render | Secret
`ADMIN_PASSWORD` | Copy from Render (or create new) | Secret

**Important:**
- For "Type", choose **"Secret"** for passwords/keys
- Choose **"Variable"** for non-sensitive values

4. Click **"Save"** after adding all variables

## Step 6: Deploy!

1. After saving environment variables, Northflank will automatically start building
2. Go to the **"Builds"** tab to watch progress
3. Wait 2-5 minutes for the build to complete
4. Once done, go to the **"Networking"** tab to find your app URL

## Step 7: Get Your App URL

1. Click on the **"Networking"** tab
2. You'll see a URL like: `https://snowwords-XXXXX.northflank.app`
3. **Copy this URL** - this is your new website!
4. Click it to test if your app is running

## Step 8: Update Google OAuth

Your Google login won't work until you update the callback URL:

1. Go to https://console.cloud.google.com
2. Click on your project
3. Go to **"APIs & Services"** → **"Credentials"**
4. Click on your OAuth 2.0 Client ID
5. Under **"Authorized redirect URIs"**, add:
   ```
   https://your-northflank-url.northflank.app/auth/google/callback
   ```
   (Replace with your actual Northflank URL)
6. Click **"Save"**
7. Go back to Northflank and update the `GOOGLE_CALLBACK_URL` environment variable with this same URL

## Step 9: Update Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-northflank-url.northflank.app/subscription/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update `STRIPE_WEBHOOK_SECRET` in Northflank with this value

## Troubleshooting

### "Build Failed"
- Check the **Builds** tab for error messages
- Make sure your code is pushed to GitHub
- Verify the Dockerfile exists in your repo

### "App Not Loading"
- Check the **Logs** tab for errors
- Verify all environment variables are set correctly
- Check that `DATABASE_URL` is correct

### "Can't Connect to Database"
- Make sure your Supabase database is running
- Check that `DATABASE_URL` includes `?sslmode=require` or similar SSL config
- Verify Supabase allows connections from all IPs (or add Northflank IPs)

### "Still Confused?"
Don't worry! I can help you through each step. Just tell me:
1. Where you're stuck
2. What screen you're looking at
3. What error message you see (if any)

## Quick Checklist

- [ ] Signed up for Northflank
- [ ] Created a service from GitHub
- [ ] Added all environment variables
- [ ] Build completed successfully
- [ ] App URL is accessible
- [ ] Updated Google OAuth callback
- [ ] Updated Stripe webhook
- [ ] Tested login
- [ ] Everything works!

---

**Remember:** You're using Northflank's FREE shared cluster - you don't need to create or manage any clusters yourself!
