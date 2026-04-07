# Deployment Guide -- Hostinger VPS + Supabase Cloud

Step-by-step playbook for deploying Hybrid OS to production.

**Architecture:** Supabase Cloud (Postgres, Auth, Realtime, Storage) + Hostinger VPS (Next.js app, Nginx, SSL)

---

## Step 1: Create Supabase Cloud Project (~5 min)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose region **US East** (or closest to your users)
3. Set a strong database password and save it somewhere safe
4. Once the project is ready, go to **Settings > API** and note:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (keep this secret)
5. Go to **Settings > Database** and note the **Connection string** (URI format)
6. Go to **Authentication > Providers** and enable **Email** provider
7. Go to **Storage** and create a bucket called `uploads` (set to private)

---

## Step 2: Get API Keys (~5 min)

### Required

| Service | Where to get it | Env var |
|---|---|---|
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY` |

### Optional (can add later)

| Service | Where to get it | Env var |
|---|---|---|
| OpenAI (embeddings) | [platform.openai.com](https://platform.openai.com) | `OPENAI_API_KEY` |
| Inngest (background jobs) | [inngest.com](https://inngest.com) | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| Sentry (error tracking) | [sentry.io](https://sentry.io) | `SENTRY_DSN` |
| Resend (email) | [resend.com](https://resend.com) | `RESEND_API_KEY` |

---

## Step 3: Apply Database Migrations (~3 min)

From your local machine:

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Navigate to project
cd ~/App\ Projects/hybrid-os

# Link to your Supabase project (find project ref in Supabase URL: https://supabase.com/dashboard/project/YOUR_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
npx supabase db push
```

This creates all tables, RLS policies, indexes, and vector search functions.

---

## Step 4: Create GitHub Repo and Push (~3 min)

```bash
cd ~/App\ Projects/hybrid-os

# Create a private repo on GitHub first, then:
git remote add origin git@github.com:YOUR_USERNAME/hybrid-os.git
git push -u origin main
```

---

## Step 5: Set Up VPS (~15 min)

SSH into your Hostinger VPS:

```bash
ssh root@YOUR_VPS_IP
```

### 5a. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v  # Should show v22.x
```

### 5b. Install PM2

```bash
npm install -g pm2
```

### 5c. Install Nginx and Certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### 5d. Create log directory

```bash
mkdir -p /var/log/hybrid-os
```

### 5e. Clone and build the app

```bash
cd /var/www
git clone git@github.com:YOUR_USERNAME/hybrid-os.git
cd hybrid-os
npm ci --omit=dev
```

### 5f. Create environment file

```bash
cp .env.production.example .env.local
nano .env.local
```

Fill in all the values from Steps 1 and 2. At minimum you need:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
NEXT_PUBLIC_SITE_URL=https://your-domain.com
ANTHROPIC_API_KEY=sk-ant-...
CSRF_SECRET=generate-with-openssl-rand-hex-32
```

Generate a CSRF secret:

```bash
openssl rand -hex 32
```

### 5g. Build and start

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the printed command to enable auto-start on reboot
```

### 5h. Configure Nginx

```bash
cp deploy/nginx/hybrid-os.conf /etc/nginx/sites-available/hybrid-os

# Edit to replace YOUR_DOMAIN with your actual domain
nano /etc/nginx/sites-available/hybrid-os

# Enable the site
ln -s /etc/nginx/sites-available/hybrid-os /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

---

## Step 6: Point Domain and Get SSL (~5 min)

### 6a. DNS Setup

In your Hostinger DNS panel (or wherever your domain DNS is managed):

1. Add an **A record**: `your-domain.com` pointing to `YOUR_VPS_IP`
2. If using a subdomain (e.g. `app.hybrid-os.com`), add the A record for that subdomain
3. Wait 2-5 minutes for propagation

### 6b. SSL Certificate

```bash
certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

---

## Step 7: Configure Supabase Auth URLs (~2 min)

Go to your Supabase dashboard:

1. **Authentication > URL Configuration**
2. Set **Site URL** to: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/api/auth/callback`

---

## Step 8: Seed Default Data (~2 min)

From your local machine (with `.env.local` configured):

```bash
cd ~/App\ Projects/hybrid-os

# After creating your first account through the signup page,
# find your workspace ID in Supabase Dashboard > Table Editor > workspaces
# Then seed default agents and skills:
npx tsx scripts/seed-workspace.ts YOUR_WORKSPACE_ID
```

---

## Step 9: Verify (~5 min)

Run through this checklist:

- [ ] `https://your-domain.com/api/health` returns `{"status":"ok"}`
- [ ] Login page loads at `https://your-domain.com/login`
- [ ] You can create an account via signup
- [ ] Onboarding flow completes
- [ ] Dashboard loads with data
- [ ] Chat sends and receives messages
- [ ] SSL certificate is valid (padlock icon in browser)

---

## Step 10: Set Up CI/CD (Optional, ~5 min)

This enables automatic deployment when you push to `main`.

### 10a. Generate SSH key for GitHub Actions

On your VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy  # Copy this private key
```

### 10b. Add GitHub Secrets

Go to your GitHub repo > Settings > Secrets and variables > Actions. Add:

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | `root` (or your deploy user) |
| `VPS_SSH_KEY` | The private key from step 10a |

### 10c. Test

Push a small change to `main` and check the Actions tab for deployment status.

---

## Ongoing Operations

### Manual deploy (without CI/CD)

```bash
ssh root@YOUR_VPS_IP
cd /var/www/hybrid-os
bash deploy/deploy.sh
```

### Rollback

```bash
ssh root@YOUR_VPS_IP
cd /var/www/hybrid-os
bash deploy/deploy.sh rollback
```

### View logs

```bash
pm2 logs hybrid-os          # Live logs
pm2 logs hybrid-os --lines 100  # Last 100 lines
```

### Restart app

```bash
pm2 reload hybrid-os   # Zero-downtime reload
pm2 restart hybrid-os  # Hard restart
```

### Check status

```bash
pm2 status
curl http://localhost:3000/api/health
```

---

## Integration Setup (Optional, post-launch)

### HubSpot

1. Go to [developers.hubspot.com](https://developers.hubspot.com) and create a new app
2. Set redirect URL: `https://your-domain.com/api/hubspot/callback`
3. Required scopes: `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read`
4. Add `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_APP_ID` to `.env.local`

### Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. OAuth redirect URL: `https://your-domain.com/api/slack/callback`
3. Bot scopes: `chat:write`, `channels:read`, `users:read`
4. Event subscriptions URL: `https://your-domain.com/api/webhooks/slack`
5. Add `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` to `.env.local`

### Google Drive

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create OAuth credentials
2. Redirect URI: `https://your-domain.com/api/google/callback`
3. Enable Google Drive API
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `.env.local`

After adding any env vars, rebuild and restart:

```bash
cd /var/www/hybrid-os
npm run build
pm2 reload hybrid-os
```
