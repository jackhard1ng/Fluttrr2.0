# Fluttrr 2.0 — Activation Guide

Everything is built. This guide covers what YOU need to do to activate each service.

All services have **dev-mode fallbacks** — the app runs locally with zero API keys.

---

## Phase 1: Email (Resend)

**What it does:** Sends real OTP verification and password reset emails.

**Dev mode:** OTPs are logged to console (`[OTP] email: 123456`).

### Steps to Activate

1. **Create Resend account:** Go to [resend.com](https://resend.com) → Sign up
2. **Add your domain:**
   - Resend Dashboard → Domains → Add Domain → `fluttrr.com`
   - Add the DNS records Resend gives you (1 TXT, 1-3 CNAME records)
   - Wait for verification (usually < 5 min)
3. **Get API key:** Resend Dashboard → API Keys → Create API Key
4. **Set in production `.env`:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxx
   EMAIL_FROM="Fluttrr <noreply@fluttrr.com>"
   ```

**Cost:** Free tier = 3,000 emails/month. More than enough for launch.

---

## Phase 2: Push Notifications (Expo)

**What it does:** Sends push notifications for events, chats, likes, admin actions.

**Dev mode:** Works on physical devices only (not simulators). No API key needed.

### Steps to Activate

1. **Create Expo account:** Go to [expo.dev](https://expo.dev) → Sign up
2. **Link your project:**
   ```bash
   cd fluttrr-app
   npx eas-cli login
   npx eas init
   ```
3. **That's it.** Expo push service is free and requires no additional configuration. Push tokens are auto-generated when users grant permission.

**Cost:** Free (Expo push service has no limit).

---

## Phase 3: Cloud Storage (Cloudflare R2)

**What it does:** Stores uploaded images (profile photos, event photos) on a CDN.

**Dev mode:** Images saved to local `uploads/` folder on disk.

### Steps to Activate

1. **Create Cloudflare account:** Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Create R2 bucket:**
   - Cloudflare Dashboard → R2 Object Storage → Create bucket
   - Bucket name: `fluttrr-uploads`
3. **Create API token:**
   - R2 → Manage R2 API Tokens → Create API token
   - Permissions: Object Read & Write
   - Copy the Access Key ID and Secret Access Key
4. **Enable public access:**
   - Option A: Bucket settings → Public Access → Allow
   - Option B: Bucket settings → Custom Domains → Add `uploads.fluttrr.com`
5. **Get your account ID:** Cloudflare Dashboard → right sidebar → Account ID
6. **Set in production `.env`:**
   ```
   S3_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_BUCKET=fluttrr-uploads
   S3_ACCESS_KEY=<from step 3>
   S3_SECRET_KEY=<from step 3>
   S3_PUBLIC_URL=https://uploads.fluttrr.com
   ```

**Cost:** Free tier = 10 GB storage + 10 million reads/month.

---

## Phase 4: Stripe Payments

**What it does:** Business subscription billing (Free / Growth $29/mo / Pro $49/mo).

**Dev mode:** Subscriptions screen shows "Payments are not configured yet" error.

### Steps to Activate

1. **Create Stripe account:** Go to [stripe.com](https://stripe.com) → Sign up
2. **Create products and prices:**
   - Stripe Dashboard → Product catalog → Add product
   - **Product 1:** Name = "Fluttrr Growth", Price = $29/month recurring → copy the `price_xxxxx` ID
   - **Product 2:** Name = "Fluttrr Pro", Price = $49/month recurring → copy the `price_xxxxx` ID
3. **Get your API key:**
   - Stripe Dashboard → Developers → API keys
   - Copy the Secret key (`sk_test_xxxxx` for testing, `sk_live_xxxxx` for production)
4. **Set up webhook:**
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - Endpoint URL: `https://api.fluttrr.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the Signing secret (`whsec_xxxxx`)
5. **Set in production `.env`:**
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
   STRIPE_GROWTH_PRICE_ID=price_xxxxxxxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxxxxxxx
   ```
6. **Test locally with Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

**Cost:** 2.9% + $0.30 per transaction (Stripe standard pricing).

### How the subscription flow works:
1. Business taps "Upgrade" on Growth or Pro plan
2. App calls `POST /api/stripe/checkout` → gets a Stripe Checkout URL
3. App opens the URL in the browser (Stripe-hosted payment page)
4. After payment, Stripe fires `checkout.session.completed` webhook
5. Backend updates the business's `subscriptionTier` to GROWTH or PRO
6. Free tier: limited to 5 events/month. Growth/Pro: unlimited.

---

## Phase 5: Geolocation (Google Maps)

**What it does:** Geocodes business addresses to lat/lng, enables distance-based event sorting.

**Dev mode:** Geocoding returns null, events have no lat/lng, distance not calculated.

### Steps to Activate

1. **Create Google Cloud project:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project → name it "Fluttrr"
2. **Enable Geocoding API:**
   - APIs & Services → Library → Search "Geocoding API" → Enable
3. **Create API key:**
   - APIs & Services → Credentials → Create Credentials → API Key
   - Restrict the key: Application restrictions → None (or IP if you know your server IP)
   - API restrictions → Restrict to Geocoding API only
4. **Set in production `.env`:**
   ```
   GOOGLE_MAPS_API_KEY=AIzaSy_xxxxxxxxxx
   ```

**Cost:** $5 per 1,000 geocoding requests. First $200/month free credit.

### How it works:
- On business registration: address is geocoded → lat/lng saved to DB
- On business profile update (address change): re-geocodes automatically
- Events inherit lat/lng from their business on creation
- Frontend `useLocation` hook requests device GPS
- `GET /api/events?lat=X&lng=Y&radius=25` returns events sorted by distance
- Each event in the response has a `distance` field (miles)

---

## Phase 6: App Store Prep (EAS Build)

**What it does:** Builds iOS/Android binaries and submits to app stores.

### Steps to Activate

1. **Link EAS project:**
   ```bash
   cd fluttrr-app
   npx eas-cli login          # Log in to your Expo account
   npx eas init               # Creates project, gives you a PROJECT_ID
   ```
2. **Update `app.json`:**
   - Replace BOTH instances of `YOUR_EAS_PROJECT_ID` with the ID from step 1
3. **Update `eas.json`:**
   - Replace `YOUR_APP_STORE_CONNECT_APP_ID` with your App Store Connect app ID
   - Replace `YOUR_APPLE_TEAM_ID` with your Apple Developer team ID
4. **Update `app.json` owner field:**
   - Replace `"owner": "fluttrr"` with your Expo account username

### Apple Developer Account ($99/year)
1. Go to [developer.apple.com](https://developer.apple.com) → Enroll
2. Create an App ID: Certificates, Identifiers & Profiles → Identifiers → `com.fluttrr.app`
3. Create app in App Store Connect → Get the App Store Connect App ID

### Google Play Console ($25 one-time)
1. Go to [play.google.com/console](https://play.google.com/console) → Sign up
2. Create app → Package name: `com.fluttrr.app`
3. Create a Google Service Account for automated uploads:
   - Google Cloud Console → IAM → Service Accounts → Create
   - Download JSON key → save as `fluttrr-app/google-services.json`
   - Grant access in Play Console → Users & permissions → Invite → service account email

### Build Commands
```bash
# Development build (with dev client, for testing)
npm run build:dev

# Preview build (internal distribution, real API)
npm run build:preview

# Production build (for app store submission)
npm run build:prod

# Submit to stores
npm run submit:ios
npm run submit:android

# Push OTA update (no new binary needed)
npm run update
```

### App Store Metadata Checklist
- [ ] App name: Fluttrr
- [ ] Subtitle: Find your vibe in KC
- [ ] Category: Social Networking
- [ ] Privacy policy URL: https://fluttrr.com/privacy
- [ ] Support URL: https://fluttrr.com/support
- [ ] Screenshots: 6.7" iPhone (1290x2796), 5.5" iPhone (1242x2208)
- [ ] App icon: 1024x1024 (already at `assets/icon.png`)

---

## Quick Reference: All Environment Variables

### Backend (`fluttrr-api/.env`)
```env
# Core
DATABASE_URL="postgresql://user:pass@host:5432/fluttrr"
JWT_SECRET="<64-char-random-string>"
JWT_REFRESH_SECRET="<64-char-random-string>"
PORT=3000
NODE_ENV=production
CORS_ORIGIN="https://fluttrr.com"
ADMIN_EMAIL="jack@fluttrr.com"

# Email (Phase 1)
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM="Fluttrr <noreply@fluttrr.com>"

# Cloud Storage (Phase 3)
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=fluttrr-uploads
S3_ACCESS_KEY=xxxxxxxxxx
S3_SECRET_KEY=xxxxxxxxxx
S3_PUBLIC_URL=https://uploads.fluttrr.com

# Payments (Phase 4)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
STRIPE_GROWTH_PRICE_ID=price_xxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxx

# Geolocation (Phase 5)
GOOGLE_MAPS_API_KEY=AIzaSy_xxxxxxxxxx
```

### Frontend (`fluttrr-app/.env`)
```env
EXPO_PUBLIC_API_URL=https://api.fluttrr.com
EXPO_PUBLIC_SOCKET_URL=https://api.fluttrr.com
```

---

## Database Migration

After adding Stripe fields, run the migration:
```bash
cd fluttrr-api
npx prisma migrate dev --name add-subscription-fields
npx prisma generate
```

In production:
```bash
npx prisma migrate deploy
```

---

## Post-Launch Roadmap

Once all services above are activated and you're live in the app stores, here's what to prioritize next:

### Immediate (Week 1-2 after launch)
- **Monitor error logs** — Watch Railway logs (`railway logs`) and Stripe webhook dashboard for failures
- **Seed initial data** — Create 5-10 real or demo events from verified business accounts so the explore screen isn't empty
- **Test the full user flow** on a physical device: register → verify OTP → browse events → join → chat → leave review
- **Test the business flow**: register business → get verified (admin marks verified) → create event → view attendees → check analytics
- **Run `npx prisma migrate deploy`** if you haven't already — the subscription fields need to exist in production

### Short-term (Month 1)
- **Stories UI** — The `Story` model and cron cleanup exist in the backend. Add a stories carousel to the home screen (stories auto-expire after 24h)
- **Wire ReportSheet into screens** — The `ReportSheet` bottom-sheet component exists at `src/components/ReportSheet.tsx`. Import it into event detail, user profile, and chat screens to let users report content inline
- **Deep linking** — Add `expo-linking` config so shared event URLs open directly in the app
- **App Store review prompts** — Use `expo-store-review` to prompt happy users for ratings after attending 3+ events

### Medium-term (Month 2-3)
- **Image optimization** — Add sharp/blurhash to generate thumbnails and placeholder hashes on upload
- **Event reminders** — Schedule push notifications 1 hour before events the user has joined
- **Business promotions** — Let Growth/Pro businesses pin or boost events to the top of the explore feed
- **Search improvements** — Add full-text search with PostgreSQL `tsvector` instead of basic `ILIKE`
- **Analytics v2** — Add event-specific analytics (views over time, conversion rate from view → join)

### Long-term (Month 3+)
- **Expand beyond KC** — Generalize the city/neighborhood system to support multiple metro areas
- **Event ticketing** — Integrate Stripe Connect for paid events where businesses charge attendees
- **Social graph** — Follow users, activity feed showing friends' event activity
- **Business verification automation** — Use Stripe Identity or a third-party KYB service
- **Redis migration** — Move account lockout, rate limiting, and Socket.IO adapter from in-memory to Redis for multi-instance deployment
