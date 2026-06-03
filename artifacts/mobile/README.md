# Small Claims Genie — Mobile App

React Native (Expo) app for the Small Claims Genie platform. Targets iOS and Android.

## Environment Setup

### Required environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | `.env` / EAS staging profile | Staging Replit dev domain for API calls |
| `EXPO_PUBLIC_API_URL` | `eas.json` production env | Production API base URL (e.g. `https://smallclaimsgenie.com`) |
| `EXPO_PUBLIC_APP_ENV` | `eas.json` production env | Set to `production` to switch API and Clerk keys |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` / EAS | Clerk publishable key for auth |

### Clerk key strategy (staging vs production)

- **Staging/development** builds: use the Clerk dev-tenant publishable key in `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Production** builds: set a separate `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in the `eas.json` production profile pointing to the production Clerk tenant.
- The `api-base-url.ts` helper switches API targets automatically: when `EXPO_PUBLIC_APP_ENV=production` it uses `EXPO_PUBLIC_API_URL`; otherwise it falls back to `https://${EXPO_PUBLIC_DOMAIN}`.

### Local development

```bash
pnpm --filter @workspace/mobile run dev
```

The Expo dev server is accessible via `$REPLIT_EXPO_DEV_DOMAIN` in the Replit environment.

---

## Build commands (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in
eas login

# Development build (device/simulator)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores after a successful production build
eas submit --platform ios
eas submit --platform android
```

---

## App Store (iOS) Submission Checklist

### Before building

- [ ] Bump `version` and `ios.buildNumber` in `app.json`
- [ ] Confirm `ios.bundleIdentifier` matches the App Store Connect record
- [ ] Verify `EXPO_PUBLIC_API_URL` in `eas.json` production env points to the live domain
- [ ] Verify `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in the production EAS profile uses the production Clerk key
- [ ] Confirm `EXPO_PUBLIC_APP_ENV=production` is set in the production EAS profile
- [ ] Confirm all required permissions in `app.json` include usage description strings (microphone, camera, photo library)
- [ ] Replace any placeholder app icon / splash assets with final 1024×1024 icon (no transparency, no rounded corners — Apple adds those)

### App Store Connect setup

- [ ] Create/verify the app record in App Store Connect
- [ ] Fill in app name, subtitle, description, keywords, support URL, privacy policy URL
- [ ] Add at least 3 iPhone screenshots (6.9" display required; 6.5" recommended)
- [ ] Add iPad screenshots if `iPad` is a supported device
- [ ] Set age rating (Small Claims Genie: 4+, no restricted content)
- [ ] Set price (Free)
- [ ] Complete App Privacy questionnaire — the app collects: Name, Email (via Clerk), User-generated content (case facts), Usage data
- [ ] Add `NSMicrophoneUsageDescription` — "Used for voice input when asking the AI legal assistant questions."
- [ ] Review export compliance (the app uses standard HTTPS encryption — select Yes → standard encryption)

### Review submission

- [ ] Submit for App Review, note in review notes: "This is a legal self-help app. Reviewer can sign up with any email to access the case workspace."
- [ ] Monitor for reviewer feedback within 24–48 hours

---

## Play Store (Android) Submission Checklist

### Before building

- [ ] Bump `version` and `android.versionCode` in `app.json` (versionCode must strictly increase)
- [ ] Confirm `android.package` matches the Play Console record
- [ ] Verify all production env vars as above (same as iOS checklist)
- [ ] Confirm signing keystore is stored in EAS Credentials (run `eas credentials` to verify)
- [ ] Confirm `RECORD_AUDIO` permission is declared (for voice input)

### Play Console setup

- [ ] Create/verify the app in Google Play Console
- [ ] Complete store listing: title, short description (80 chars max), full description, contact email
- [ ] Upload at least 2 phone screenshots (16:9 or 9:16, min 320px on short side)
- [ ] Upload a 512×512 icon (PNG, no transparency) and a 1024×500 feature graphic
- [ ] Set content rating (complete the IARC questionnaire — expected: Everyone)
- [ ] Set pricing (Free)
- [ ] Complete Data safety form — declare: name, email address, user-generated content; purpose: app functionality; encrypted in transit: Yes; deletion supported: Yes (contact support)
- [ ] Add privacy policy URL

### Internal/closed testing before production

- [ ] Upload AAB to Internal Testing track first
- [ ] Install on a physical device and verify: sign-in, case creation, document upload, form download, AI chat, voice input
- [ ] Promote to Production track once verified

---

## Post-submission

- [ ] Monitor crash-free rate in App Store Connect / Play Console (target > 99%)
- [ ] Set up an alert for ANRs and crashes in Firebase Crashlytics or Sentry (if integrated)
- [ ] Update `CHANGELOG.md` with the released version and date
