# Authentication

This document describes the authentication system for the Docuflash backend and how the frontend should integrate with it.

## Overview

- Authentication is powered by **Supabase Auth** (identity provider only). The app's own Postgres remains the source of truth for files, folders, and a local mirror of users.
- The backend **wraps** the auth endpoints. The frontend talks to the Docuflash API (`/api/auth/*`), not to Supabase directly.
- Supported methods: **email/password**, **Google OAuth**, **GitHub OAuth**.
- Auth is **additive**. Anonymous upload/share continues to work exactly as before. If a request is authenticated, uploaded files/folders are stamped with the user's `ownerId`; otherwise `ownerId` is `null`.
- The backend verifies the Supabase JWT **locally** (HS256 via the project JWT secret) on every protected request — no network round-trip.

## Token model

A successful login/register/refresh returns a `session`:

```json
{
  "accessToken": "<supabase JWT>",
  "refreshToken": "<opaque refresh token>",
  "expiresAt": 1718200000,
  "expiresIn": 3600,
  "tokenType": "bearer"
}
```

- Send the access token on authenticated requests:
  `Authorization: Bearer <accessToken>`
- The access token is short-lived (default 1h). When it expires (or proactively, based on `expiresAt`), call `POST /api/auth/refresh` with the refresh token to get a new session.
- Store tokens however your app prefers (in-memory + refresh token in a secure store is recommended).

## Endpoints

Base path: `/api/auth`

All responses use the standard envelope: `{ success, msg, data, status }`. Shapes below describe the `data` field.

### `POST /register`

Body:
```json
{ "email": "a@b.com", "password": "secret123", "displayName": "Alice" }
```
`data`:
```json
{
  "user": { "id": "...", "email": "a@b.com", "displayName": "Alice", "avatarUrl": null, "provider": "email", "createdAt": "...", "updatedAt": "..." },
  "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": 0, "expiresIn": 3600, "tokenType": "bearer" },
  "needsEmailConfirmation": false
}
```
If email confirmation is enabled in Supabase, `session` will be `null` and `needsEmailConfirmation` is `true` — the user must confirm via email before logging in.

### `POST /login`

Body:
```json
{ "email": "a@b.com", "password": "secret123" }
```
`data`: `{ "user": {...}, "session": {...} }`

### `POST /refresh`

Body:
```json
{ "refreshToken": "..." }
```
`data`: `{ "session": {...} }`

### `POST /logout`

Requires `Authorization: Bearer <accessToken>`. Revokes the session server-side. `data`: `null`.

### `GET /me`

Requires `Authorization: Bearer <accessToken>`. Returns the local user profile.
`data`: `{ "id", "email", "displayName", "avatarUrl", "provider", "createdAt", "updatedAt" }`

### `GET /oauth/:provider`

`:provider` is `google` or `github`. This is a **browser navigation** endpoint, not an XHR call. Point the browser at it (e.g. `window.location.href = "<API>/api/auth/oauth/google"` or an anchor link). The backend redirects to the provider, then handles the callback and finally redirects the browser to:

```
<FRONTEND_URL>/auth/callback#access_token=...&refresh_token=...&expires_at=...&token_type=bearer
```

On error:
```
<FRONTEND_URL>/auth/callback#error=<message>
```

### `GET /callback`

Internal OAuth callback hit by the provider/Supabase. The frontend does not call this directly.

## Frontend OAuth flow

1. User clicks "Continue with Google" → navigate the browser to `GET <API>/api/auth/oauth/google`.
2. Provider auth happens; backend exchanges the code and redirects back to `<FRONTEND_URL>/auth/callback` with tokens in the URL **fragment** (`#...`).
3. On your `/auth/callback` route, parse `window.location.hash`:
   ```ts
   const params = new URLSearchParams(window.location.hash.slice(1))
   const accessToken = params.get('access_token')
   const refreshToken = params.get('refresh_token')
   const error = params.get('error')
   ```
4. Store the tokens and redirect into the app. Clear the hash from the URL.

## Authenticating normal requests

Existing file/folder endpoints remain public. Upload/create accept an **optional** bearer token:

- `POST /api/files` and `POST /api/folders` — if a valid `Authorization: Bearer` is present, the resulting record's `ownerId` is set to the user; otherwise it stays `null` (anonymous, unchanged behavior).
- An invalid/expired token on these optional routes does **not** fail the request — it is simply treated as anonymous.

## Backend configuration (for whoever deploys the API)

Create a Supabase project and set these env vars on the backend:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # used for logout / admin ops
SUPABASE_JWT_SECRET=<JWT secret>               # Settings > API > JWT Settings
FRONTEND_URL=http://localhost:3000             # where OAuth lands after callback (Next.js dev default)
BASE_URL=http://localhost:8000                 # this API's public base URL
```

In the Supabase dashboard:

1. **Authentication > Providers** — enable Google and GitHub, paste each provider's OAuth client ID/secret.
2. **Authentication > URL Configuration** — add `<BASE_URL>/api/auth/callback` to the **Redirect URLs** allowlist.
3. **Authentication > Providers > Email** — decide whether to require email confirmation. If on, handle `needsEmailConfirmation` in the frontend.

> Note: token verification uses the legacy HS256 JWT secret (`SUPABASE_JWT_SECRET`). If the project is configured to use asymmetric JWT signing keys instead, switch the verifier in `src/utils/supabaseToken.ts` to JWKS-based verification.
