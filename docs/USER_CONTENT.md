# Feature: List a logged-in user's files & folders (backend ready — integrate on frontend)

The backend now exposes two authenticated endpoints that return the content owned by the currently logged-in user. Use these to build "My Files" / "My Folders" / dashboard views.

## Auth

Both endpoints require the user's Supabase access token:
```
Authorization: Bearer <accessToken>
```
(`accessToken` is what you already get from `POST /api/auth/login` / `register` / the OAuth callback.) Missing/invalid token → `401`.

All responses use the standard envelope: `{ success, msg, data, status }`. The shapes below describe the `data` field.

## Endpoints

### `GET /api/files/mine`
Returns the authenticated user's files, newest first. Sensitive fields are stripped server-side.

`data` — array of:
```json
{
  "id": "uuid",
  "fileName": "report.pdf",
  "fileType": "pdf",
  "shareToken": "a1b2c3...",
  "accessType": "public",
  "downloadCount": 0,
  "expireAt": "2026-07-01T00:00:00.000Z",
  "fileSize": 123456,
  "ownerId": "uuid",
  "createdAt": "2026-06-14T10:00:00.000Z"
}
```

### `GET /api/folders/mine`
Returns the authenticated user's folders, newest first. The `password` field is stripped. The folder's file list is **not** included (keep it light); fetch a single folder's contents via the existing folder endpoints if needed.

`data` — array of:
```json
{
  "id": "uuid",
  "folderName": "Invoices",
  "shareToken": "a1b2c3...",
  "accessType": "public",
  "ownerId": "uuid",
  "expireAt": "2026-07-01T00:00:00.000Z",
  "createdAt": "2026-06-14T10:00:00.000Z"
}
```

## Important integration notes

- **Only content created while authenticated appears here.** A file/folder gets an `ownerId` only if the user's bearer token was sent on `POST /api/files` / `POST /api/folders`. So: make sure the upload/create requests include `Authorization: Bearer <accessToken>` when the user is logged in. Anonymous uploads (no token) have `ownerId: null` and will never show in these lists.
- These are **read-only listings**. Opening/sharing/deleting a specific item still uses the existing file/folder endpoints (by `shareToken` or `id`).
- Files use `shareToken` for share links; `accessType` is `"public"` or `"protected"`; `fileType` is one of `pdf | xls | txt | zip | docx`.
- `expireAt` reflects the existing ephemeral-expiry behavior — items auto-expire and are cleaned up, so a list may shrink over time.

## Example

```ts
const res = await fetch(`${API_URL}/api/files/mine`, {
  headers: { Authorization: `Bearer ${accessToken}` },
})
const { data: files } = await res.json()
```
