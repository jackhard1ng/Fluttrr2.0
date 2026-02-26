# Fluttrr 2.0 — Implementation Plan (7 Phases)

## Current State Summary

| Area               | Status | What Works                          | What's Missing                        |
|--------------------|--------|-------------------------------------|---------------------------------------|
| Email/OTP          | ~50%   | OTP generation, validation, rate limiting | Actual email delivery (console.log)  |
| Push Notifications | ~90%   | Expo push service, cron reminders   | Minor: expand notification triggers   |
| Image Uploads      | ~70%   | Local multer disk storage           | Cloud storage (R2/S3)                 |
| Stripe/Payments    | ~5%    | DB fields only (stripeCustomerId)   | Everything — no Stripe code exists    |
| Geolocation        | ~40%   | DB lat/lng fields, area filtering   | Geocoding, distance queries, location request |
| App Store Prep     | ~80%   | app.json, permissions, assets exist | EAS config, OTA updates               |
| Deployment         | ~20%   | Dev server runs locally             | Docker, CI/CD, prod hosting           |

---

## Phase 1: Email Service (Resend)

### Goal
Replace `console.log('[OTP] email: code')` with real email delivery via Resend.

### Files to Create
- `fluttrr-api/src/utils/email.js` — Resend email service wrapper

### Files to Modify
- `fluttrr-api/src/routes/auth.js` — 4 locations (lines 104-105, 160, 336, 409) where OTPs are logged
- `fluttrr-api/.env` — Add `RESEND_API_KEY` and `EMAIL_FROM`
- `fluttrr-api/package.json` — Add `resend` dependency

### Implementation Steps

1. **Install Resend SDK**
   ```bash
   cd fluttrr-api && npm install resend
   ```

2. **Create `src/utils/email.js`**
   ```js
   const { Resend } = require('resend');
   const resend = new Resend(process.env.RESEND_API_KEY);
   const FROM = process.env.EMAIL_FROM || 'Fluttrr <noreply@fluttrr.com>';

   async function sendOtpEmail(to, code) { ... }
   async function sendPasswordResetEmail(to, code) { ... }
   async function sendWelcomeEmail(to, name) { ... }
   ```

3. **Replace all 4 `console.log('[OTP]...')` calls in `auth.js`**
   - User registration → `sendOtpEmail(email, code)`
   - Business registration → `sendOtpEmail(email, code)`
   - Resend OTP → `sendOtpEmail(email, code)`
   - Forgot password → `sendPasswordResetEmail(email, code)`

4. **Add fallback** — If `RESEND_API_KEY` is not set, fall back to `console.log` so dev mode still works without credentials.

5. **Email templates** — Simple HTML emails with the Fluttrr brand (dark background, blue accent, 6-digit code displayed large).

### Environment Variables
```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Fluttrr <noreply@fluttrr.com>
```

### Estimated Scope
- 1 new file (~80 lines)
- 4 edits in auth.js (~20 lines changed)
- 1 package added

---

## Phase 2: Push Notifications (Polish)

### Goal
Push notifications already work via Expo's service. Polish the integration: ensure tokens are saved on login (not just registration), add notification triggers for all event types, and handle notification taps.

### Files to Modify
- `fluttrr-app/src/services/notifications.ts` — Add notification response handler
- `fluttrr-app/app/_layout.tsx` — Register for push tokens on app launch (after auth)
- `fluttrr-api/src/routes/events.js` — Notify on event join/leave/cancel
- `fluttrr-api/src/routes/moments.js` — Notify on like/comment
- `fluttrr-api/src/routes/chats.js` — Notify on new message (when recipient offline)
- `fluttrr-api/src/routes/admin.js` — Notify business on verify/suspend

### Implementation Steps

1. **Frontend: Auto-register push token on login**
   - After successful login/refresh, call `registerAndSavePushToken()`
   - Store token in auth store so it persists across sessions

2. **Frontend: Handle notification taps**
   - `Notifications.addNotificationResponseReceivedListener` in `_layout.tsx`
   - Route to correct screen based on `data.type`:
     - `EVENT_REMINDER` / `EVENT_JOINED` → `/event/[id]`
     - `CHAT_MESSAGE` → `/(chats)/[chatId]`
     - `MOMENT_LIKE` / `MOMENT_COMMENT` → `/moment/[id]`
     - `BUSINESS_VERIFIED` → business dashboard

3. **Backend: Add push triggers**
   - **Event join**: Notify business owner that someone joined
   - **Event cancel**: Notify all attendees via `notifyEventAttendees()`
   - **Moment like**: Notify moment owner
   - **Moment comment**: Notify moment owner
   - **New chat message**: Notify offline chat members (check socket connection)
   - **Admin verify/suspend business**: Notify business

4. **Backend: Create in-app + push notification helper**
   ```js
   async function createAndPush(prisma, userId, { type, title, body, data }) {
     await prisma.notification.create({ data: { userId, type, title, body, data } });
     await notifyUser(prisma, userId, { title, body, data });
   }
   ```

### Estimated Scope
- 0 new files
- ~6 files modified (~150 lines changed)

---

## Phase 3: Cloud Image Uploads (Cloudflare R2)

### Goal
Replace local disk storage with Cloudflare R2 (S3-compatible) so uploaded images persist across deployments and are served via CDN.

### Files to Create
- `fluttrr-api/src/utils/storage.js` — S3/R2 client wrapper

### Files to Modify
- `fluttrr-api/src/routes/uploads.js` — Switch from multer disk to R2 stream upload
- `fluttrr-api/package.json` — Add `@aws-sdk/client-s3`
- `fluttrr-api/.env` — Add S3 credentials

### Implementation Steps

1. **Install AWS S3 SDK** (compatible with R2)
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Create `src/utils/storage.js`**
   ```js
   const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

   const s3 = new S3Client({
     region: 'auto',
     endpoint: process.env.S3_ENDPOINT,
     credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
   });

   async function uploadFile(buffer, key, contentType) { ... }
   async function deleteFile(key) { ... }
   function getPublicUrl(key) { return `${process.env.S3_PUBLIC_URL}/${key}`; }
   ```

3. **Update `uploads.js`**
   - Switch multer to memory storage (`multer.memoryStorage()`)
   - After validation, upload `req.file.buffer` to R2 via `uploadFile()`
   - Return public URL from R2 instead of local path
   - Add image compression with `sharp` (optional, resize to max 1200px width)

4. **Fallback** — If S3 env vars are not set, keep local disk storage so dev mode works.

5. **Migration helper** — Script to upload existing `/uploads` files to R2.

### Environment Variables
```
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=fluttrr-uploads
S3_ACCESS_KEY=xxxxx
S3_SECRET_KEY=xxxxx
S3_PUBLIC_URL=https://uploads.fluttrr.com
```

### Estimated Scope
- 1 new file (~60 lines)
- 1 file rewritten (~80 lines)
- 1 package added

---

## Phase 4: Stripe Payments (Business Subscriptions)

### Goal
Implement business subscription tiers (Free / Growth $29/mo / Pro $49/mo) with Stripe Checkout and webhook handling.

### Files to Create
- `fluttrr-api/src/routes/stripe.js` — Checkout session, portal, webhook endpoints
- `fluttrr-api/src/utils/stripe.js` — Stripe client singleton
- `fluttrr-api/src/middleware/requireSubscription.js` — Middleware to check plan limits

### Files to Modify
- `fluttrr-api/server.js` — Mount `/api/stripe` routes, raw body for webhooks
- `fluttrr-api/package.json` — Add `stripe` dependency
- `fluttrr-api/.env` — Add Stripe keys
- `fluttrr-api/prisma/schema.prisma` — Add `subscriptionTier` and `subscriptionEndsAt` to Business
- `fluttrr-app/app/(business)/(profile)/subscriptions.tsx` — Replace "Coming Soon" with Stripe Checkout
- `fluttrr-app/src/api/business.ts` — Add subscription API calls

### Implementation Steps

1. **Install Stripe**
   ```bash
   npm install stripe
   ```

2. **Create Stripe products/prices** (in Stripe Dashboard)
   - Growth: $29/month (price_growth)
   - Pro: $49/month (price_pro)

3. **Backend: `src/utils/stripe.js`**
   ```js
   const Stripe = require('stripe');
   module.exports = new Stripe(process.env.STRIPE_SECRET_KEY);
   ```

4. **Backend: `src/routes/stripe.js`**
   - `POST /api/stripe/checkout` — Create Stripe Checkout Session
     - Creates/retrieves Stripe customer for business
     - Returns checkout URL
   - `POST /api/stripe/portal` — Create billing portal session for managing subscription
   - `POST /api/stripe/webhook` — Handle Stripe events:
     - `checkout.session.completed` → Update business `stripeCustomerId`, `stripeSubId`, `subscriptionTier`
     - `customer.subscription.updated` → Update tier
     - `customer.subscription.deleted` → Revert to Free
     - `invoice.payment_failed` → Mark subscription at risk

5. **Database migration**
   ```prisma
   model Business {
     ...
     subscriptionTier    String    @default("FREE")  // FREE, GROWTH, PRO
     subscriptionEndsAt  DateTime?
   }
   ```

6. **Middleware: `requireSubscription.js`**
   - Check business tier before event creation
   - Free: 5 events/month → count events created this month
   - Growth/Pro: Unlimited

7. **Frontend: Update `subscriptions.tsx`**
   - Call `POST /api/stripe/checkout` with selected plan
   - Open Stripe Checkout URL in WebBrowser
   - On return, refresh business profile to show new tier
   - "Manage Subscription" button → opens Stripe billing portal

### Environment Variables
```
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_GROWTH_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
```

### Estimated Scope
- 3 new files (~250 lines)
- 1 migration
- 3 files modified (~100 lines)

---

## Phase 5: Geolocation

### Goal
Geocode business addresses to lat/lng, request user location, and enable distance-based event sorting.

### Files to Create
- `fluttrr-api/src/utils/geocode.js` — Google Maps geocoding wrapper
- `fluttrr-app/src/hooks/useLocation.ts` — Custom hook for requesting/caching user location

### Files to Modify
- `fluttrr-api/src/routes/auth.js` — Geocode address on business registration
- `fluttrr-api/src/routes/businesses.js` — Geocode on address update
- `fluttrr-api/src/routes/events.js` — Add distance-based sorting to list/search
- `fluttrr-app/app/(user)/(explore)/index.tsx` — Use device location, show distance badges
- `fluttrr-app/app/_layout.tsx` — Request location permission on first launch
- `fluttrr-api/.env` — Add `GOOGLE_MAPS_API_KEY`

### Implementation Steps

1. **Backend: `src/utils/geocode.js`**
   ```js
   async function geocodeAddress(address, city) {
     const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', ' + city)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
     const res = await fetch(url);
     const data = await res.json();
     if (data.results[0]) {
       const { lat, lng } = data.results[0].geometry.location;
       return { lat, lng };
     }
     return null;
   }
   ```

2. **Backend: Geocode on business registration/update**
   - After business create: `geocodeAddress(address, city)` → save lat/lng
   - After business update (if address changed): re-geocode
   - Events inherit lat/lng from their business on creation

3. **Backend: Distance-based event queries**
   - Add `?lat=X&lng=Y&radius=Z` query params to `GET /api/events`
   - Use Haversine formula in raw SQL:
     ```sql
     SELECT *, (
       3959 * acos(cos(radians($lat)) * cos(radians(lat)) *
       cos(radians(lng) - radians($lng)) + sin(radians($lat)) * sin(radians(lat)))
     ) AS distance
     FROM "Event"
     WHERE status = 'ACTIVE'
     HAVING distance < $radius
     ORDER BY distance ASC
     ```
   - Keep existing `area` filter as fallback

4. **Frontend: `useLocation` hook**
   ```ts
   export function useLocation() {
     // Request permission, get current position, cache for 5 min
     // Return { lat, lng, loading, error, refresh }
   }
   ```

5. **Frontend: Explore screen**
   - On mount, call `useLocation()` to get device position
   - Pass lat/lng to `eventsApi.list({ lat, lng, radius })`
   - Show distance badge on each event card ("0.3 mi", "2.1 mi")
   - Keep area filter tabs as alternative

### Environment Variables
```
GOOGLE_MAPS_API_KEY=AIzaSy_xxxxx
```

### Estimated Scope
- 2 new files (~100 lines)
- 5 files modified (~120 lines)

---

## Phase 6: App Store Prep

### Goal
Configure EAS Build for iOS and Android, ensure assets are correct, add OTA update support.

### Files to Create
- `fluttrr-app/eas.json` — EAS Build configuration
- `fluttrr-app/assets/` — Verify all required assets exist

### Files to Modify
- `fluttrr-app/app.json` — Add `extra`, `updates`, `owner` config
- `fluttrr-app/package.json` — Add build/submit scripts

### Implementation Steps

1. **Create EAS account and project**
   ```bash
   npx eas-cli login
   npx eas init
   ```

2. **Create `eas.json`**
   ```json
   {
     "cli": { "version": ">= 16.0.0" },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "ios": { "simulator": true }
       },
       "preview": {
         "distribution": "internal",
         "ios": { "simulator": false }
       },
       "production": {
         "autoIncrement": true
       }
     },
     "submit": {
       "production": {
         "ios": { "appleId": "jack@fluttrr.com", "ascAppId": "XXXXX", "appleTeamId": "XXXXX" },
         "android": { "serviceAccountKeyPath": "./google-services.json", "track": "internal" }
       }
     }
   }
   ```

3. **Update `app.json`**
   ```json
   {
     "expo": {
       ...
       "owner": "fluttrr",
       "runtimeVersion": { "policy": "appVersion" },
       "updates": {
         "url": "https://u.expo.dev/PROJECT_ID",
         "fallbackToCacheTimeout": 0
       },
       "extra": {
         "eas": { "projectId": "PROJECT_ID" }
       }
     }
   }
   ```

4. **Verify required assets**
   - `icon.png` — 1024x1024 (exists ✅)
   - `splash-icon.png` — 200x200+ (exists ✅)
   - `android-icon-foreground.png` — 108x108dp (exists ✅)
   - `android-icon-background.png` — 108x108dp (exists ✅)
   - `favicon.png` — 48x48 (exists ✅)
   - `notification-icon.png` — 96x96, white-on-transparent (needs verification)

5. **Add build scripts to `package.json`**
   ```json
   "scripts": {
     "build:dev": "eas build --profile development --platform all",
     "build:preview": "eas build --profile preview --platform all",
     "build:prod": "eas build --profile production --platform all",
     "submit:ios": "eas submit --platform ios",
     "submit:android": "eas submit --platform android"
   }
   ```

6. **App Store metadata checklist**
   - App name: Fluttrr
   - Subtitle: Find your vibe in KC
   - Category: Social Networking / Entertainment
   - Privacy policy URL: https://fluttrr.com/privacy
   - Support URL: https://fluttrr.com/support
   - Screenshots: 6.7" iPhone, 5.5" iPhone, iPad (if supported)

### Estimated Scope
- 1 new file (eas.json)
- 2 files modified
- Asset verification only (assets already exist)

---

## Phase 7: Deployment

### Goal
Deploy the API to Railway/Render, set up production PostgreSQL, configure environment variables, and create a CI/CD pipeline.

### Files to Create
- `fluttrr-api/Dockerfile` — Container for API
- `fluttrr-api/.dockerignore` — Exclude node_modules, .env, uploads
- `fluttrr-api/fly.toml` OR `railway.json` — Platform config (pick one)
- `.github/workflows/deploy.yml` — CI/CD pipeline

### Implementation Steps

1. **Create `Dockerfile`**
   ```dockerfile
   FROM node:22-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --omit=dev
   COPY prisma ./prisma
   RUN npx prisma generate
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Create `.dockerignore`**
   ```
   node_modules
   .env
   uploads
   .git
   ```

3. **Database: Set up production PostgreSQL**
   - Option A: Railway PostgreSQL (managed, auto-backup)
   - Option B: Neon (serverless, free tier)
   - Option C: Supabase (managed, has auth features)
   - Run `npx prisma migrate deploy` on first deploy

4. **Platform deployment (Railway recommended for simplicity)**

   **Railway setup:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   railway login
   railway init
   railway add postgresql
   railway up
   ```

   **Environment variables to set:**
   ```
   DATABASE_URL=postgresql://...@containers-us-west-XXX.railway.app:5432/railway
   JWT_SECRET=<generate 64-char random string>
   JWT_REFRESH_SECRET=<generate another 64-char random string>
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://fluttrr.com
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=Fluttrr <noreply@fluttrr.com>
   S3_ENDPOINT=https://XXXXX.r2.cloudflarestorage.com
   S3_BUCKET=fluttrr-uploads
   S3_ACCESS_KEY=xxxxx
   S3_SECRET_KEY=xxxxx
   S3_PUBLIC_URL=https://uploads.fluttrr.com
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_GROWTH_PRICE_ID=price_xxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxx
   GOOGLE_MAPS_API_KEY=AIzaSy_xxxxx
   ADMIN_EMAIL=jack@fluttrr.com
   ```

5. **CI/CD: `.github/workflows/deploy.yml`**
   ```yaml
   name: Deploy API
   on:
     push:
       branches: [main]
       paths: [fluttrr-api/**]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22 }
         - run: cd fluttrr-api && npm ci
         - run: cd fluttrr-api && npx prisma generate
         # Deploy to Railway / Fly.io / Render
         - uses: railwayapp/deploy@v1
           with:
             service: fluttrr-api
             token: ${{ secrets.RAILWAY_TOKEN }}
   ```

6. **Frontend: Update production API URL**
   - Create `fluttrr-app/.env.production`
     ```
     EXPO_PUBLIC_API_URL=https://api.fluttrr.com
     EXPO_PUBLIC_SOCKET_URL=https://api.fluttrr.com
     ```

7. **Post-deployment checklist**
   - [ ] Run `prisma migrate deploy`
   - [ ] Run `prisma db seed` for initial admin user
   - [ ] Verify API health: `GET /api/health`
   - [ ] Test OTP emails arrive
   - [ ] Test push notifications
   - [ ] Test image uploads to R2
   - [ ] Test Stripe webhook with `stripe listen --forward-to`
   - [ ] Configure custom domain (api.fluttrr.com → Railway)
   - [ ] Enable SSL (automatic on Railway/Fly)
   - [ ] Set up monitoring (Railway metrics / Sentry)

### Estimated Scope
- 3-4 new files
- 2 files modified
- External platform setup required

---

## Execution Order & Dependencies

```
Phase 1: Email (Resend)         ─── No dependencies, can start immediately
Phase 2: Push Notifications     ─── No dependencies, can run parallel with Phase 1
Phase 3: Cloud Storage (R2)     ─── No dependencies, can run parallel
Phase 4: Stripe Payments        ─── Requires Stripe account setup
Phase 5: Geolocation            ─── Requires Google Maps API key
Phase 6: App Store Prep         ─── Should come after Phases 1-5
Phase 7: Deployment             ─── Should be last, after all features are integrated
```

**Parallelizable:** Phases 1, 2, 3 can all be done simultaneously.
**Sequential:** Phase 7 should be last. Phase 6 ideally after features stabilize.

---

## Total Estimated Scope

| Phase | New Files | Modified Files | New Dependencies | Lines Changed |
|-------|-----------|----------------|------------------|---------------|
| 1. Email | 1 | 3 | resend | ~100 |
| 2. Push | 0 | 6 | none | ~150 |
| 3. Storage | 1 | 2 | @aws-sdk/client-s3 | ~140 |
| 4. Stripe | 3 | 5 | stripe | ~350 |
| 5. Geo | 2 | 5 | none | ~220 |
| 6. App Store | 1 | 2 | none | ~50 |
| 7. Deploy | 4 | 2 | none | ~150 |
| **Total** | **12** | **25** | **3** | **~1,160** |
