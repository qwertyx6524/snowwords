# Using Your Custom Domain with Cloudflare + Northflank

You can use your existing domain with Cloudflare DNS pointing to your Northflank app!

## Overview

1. Deploy app to Northflank (get temporary URL)
2. Add custom domain in Northflank
3. Update Cloudflare DNS settings
4. Update OAuth/webhook URLs to use your domain
5. Done!

## Step 1: Deploy to Northflank First

Follow the `NORTHFLANK-SIMPLE-GUIDE.md` to:
- Create your service on Northflank
- Get it working with the temporary URL first
- Make sure everything works before adding custom domain

**Why?** It's easier to troubleshoot if you verify the app works first, then add the domain.

## Step 2: Add Custom Domain in Northflank

Once your app is deployed and working:

1. Go to your Northflank dashboard
2. Click on your **Snowwords** service
3. Go to the **"Networking"** tab
4. Click **"Add Domain"**
5. Enter your domain name (e.g., `snowwords.yourdomain.com` or `yourdomain.com`)
6. Click **"Add"**

Northflank will show you the DNS records you need to add.

## Step 3: Configure Cloudflare DNS

### Option A: Using a Subdomain (Recommended)
Example: `app.yourdomain.com` or `snowwords.yourdomain.com`

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **"Add record"**
5. Configure:
   - **Type**: `CNAME`
   - **Name**: `app` (or `snowwords`, or whatever subdomain you want)
   - **Target**: Your Northflank URL (e.g., `snowwords-xxxxx.northflank.app`)
   - **Proxy status**: 🟠 **DNS only** (click to toggle - important!)
   - **TTL**: Auto
6. Click **"Save"**

### Option B: Using Root Domain
Example: `yourdomain.com`

1. Log in to Cloudflare Dashboard
2. Go to **DNS** → **Records**
3. Click **"Add record"**
4. Configure:
   - **Type**: `CNAME`
   - **Name**: `@` (this means root domain)
   - **Target**: Your Northflank URL (e.g., `snowwords-xxxxx.northflank.app`)
   - **Proxy status**: 🟠 **DNS only** (click to toggle)
   - **TTL**: Auto
5. Click **"Save"**

**Important Notes:**
- Set proxy to **"DNS only"** (gray cloud ☁️, not orange 🟠)
- You can enable Cloudflare proxy later after verifying it works
- DNS changes can take 5-60 minutes to propagate

## Step 4: Verify Domain Works

1. Wait 5-10 minutes for DNS to propagate
2. Visit your custom domain in a browser
3. You should see your Snowwords app!

Check DNS propagation: https://www.whatsmydns.net/#CNAME/yourdomain.com

## Step 5: Enable HTTPS/SSL

Northflank automatically provisions SSL certificates for custom domains.

1. In Northflank, go to **Networking** tab
2. Wait for SSL certificate status to show **"Active"** (takes 1-5 minutes)
3. Your site will now work with `https://yourdomain.com`

## Step 6: Update OAuth & Webhooks to Use Your Domain

Now that you have a custom domain, update these services:

### Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Under **"Authorized redirect URIs"**, add:
   ```
   https://yourdomain.com/auth/google/callback
   ```
5. **Save**
6. In Northflank, update `GOOGLE_CALLBACK_URL` environment variable:
   ```
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   ```

### Update Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Edit your webhook endpoint
3. Change URL to:
   ```
   https://yourdomain.com/subscription/webhook
   ```
4. **Save**

### Update Chrome Extension (if applicable)

If you have a Chrome extension, update the API URL in the extension code to point to your custom domain.

## Step 7: Enable Cloudflare Proxy (Optional)

Once everything works, you can enable Cloudflare's proxy for:
- DDoS protection
- CDN caching
- Analytics
- Firewall rules

1. Go to Cloudflare DNS settings
2. Click the cloud icon next to your record
3. Change from **"DNS only"** (gray) to **"Proxied"** (orange)

**Note:** Some features might need additional configuration when proxied.

## Using Both Northflank URL and Custom Domain

You can keep both working:
- `https://snowwords-xxxxx.northflank.app` (Northflank URL)
- `https://yourdomain.com` (Your custom domain)

Both will point to the same app!

## Cloudflare Settings (Optional but Recommended)

### SSL/TLS Settings
1. Go to **SSL/TLS** in Cloudflare
2. Set SSL mode to **"Full (strict)"**
3. Enable **"Always Use HTTPS"**

### Page Rules (Optional)
You can set up redirects, caching rules, etc.

Example: Redirect www to non-www
1. Go to **Rules** → **Page Rules**
2. Add rule:
   - URL: `www.yourdomain.com/*`
   - Setting: **Forwarding URL** (301)
   - Destination: `https://yourdomain.com/$1`

## Troubleshooting

### "DNS_PROBE_FINISHED_NXDOMAIN"
- Wait longer (DNS can take up to 1 hour)
- Check DNS records are correct in Cloudflare
- Verify CNAME target matches your Northflank URL

### "Too Many Redirects"
- Make sure Cloudflare SSL is set to **"Full (strict)"**
- Try disabling Cloudflare proxy temporarily

### "Certificate Invalid"
- Wait for Northflank to provision SSL (can take 5-10 minutes)
- Make sure domain is added in Northflank Networking tab
- Check that DNS is pointing correctly

### "Site Not Working"
- Verify app works on Northflank URL first
- Check Northflank logs for errors
- Ensure all environment variables are updated with new domain

## Domain Configuration Checklist

- [ ] App deployed to Northflank successfully
- [ ] App works on Northflank temporary URL
- [ ] Custom domain added in Northflank
- [ ] Cloudflare DNS CNAME record created
- [ ] DNS propagated (check whatsmydns.net)
- [ ] Custom domain loads the app
- [ ] SSL certificate active
- [ ] Google OAuth updated with new domain
- [ ] Stripe webhook updated with new domain
- [ ] `GOOGLE_CALLBACK_URL` env var updated
- [ ] Cloudflare proxy enabled (optional)
- [ ] Everything tested and working!

## Quick Example

**Your domain:** `snowwords.example.com`
**Northflank URL:** `snowwords-abc123.northflank.app`

**Cloudflare DNS:**
```
Type:   CNAME
Name:   snowwords
Target: snowwords-abc123.northflank.app
Proxy:  DNS only (initially)
```

**Updated URLs:**
- Google OAuth: `https://snowwords.example.com/auth/google/callback`
- Stripe Webhook: `https://snowwords.example.com/subscription/webhook`

---

**Still confused?** Let me know which step you're on and I'll help you through it!
