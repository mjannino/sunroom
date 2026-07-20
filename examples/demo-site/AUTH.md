# Demo auth

This demo mounts Sunroom's admin auth via three one-line files:

- `app/api/sunroom/[[...route]]/route.ts` — exposes `sunroom.handlers` (login, callback, owner, logout).
- `app/admin/layout.tsx` — `sunroom.AdminLayout`, the guard + shell.
- `app/admin/[[...segments]]/page.tsx` — `sunroom.AdminPage`.

> For the full integration contract (mounting the public site + admin, keeping
> the admin isolated from your site chrome, the API surface), see the package
> README: `packages/sunroom/README.md`. This file covers the auth env specifics.

Config lives in `.env.local` (gitignored — never commit it):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SUNROOM_SESSION_SECRET=...
SUNROOM_EDITORS=you@example.com
SUNROOM_URL=http://localhost:3000
SUNROOM_OWNER_TOKEN=dev-owner-token
```

## Owner-token path (no Google needed)

With the placeholder values above, you can prove the whole session → guard →
shell → logout loop without a real Google client:

```bash
curl -s -i -c cookies.txt -X POST localhost:3000/api/sunroom/auth/owner \
  -d 'token=dev-owner-token'
curl -s -b cookies.txt localhost:3000/admin
curl -s -i -b cookies.txt -X POST localhost:3000/api/sunroom/auth/logout
```

The first call sets a `sunroom_session` cookie for `owner@sunroom.local`; the
second shows the admin shell ("Signed in as owner@sunroom.local"); the third
clears the cookie.

## Verifying the live Google flow (manual)

The owner-token path proves everything except Google's own consent screen.
To verify that too:

1. Create a Google OAuth client (OAuth consent screen + credentials) in the
   Google Cloud console.
2. Add `http://localhost:3000/api/sunroom/auth/callback` as an authorized
   redirect URI.
3. Put the real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and your own email
   (in `SUNROOM_EDITORS`) into `.env.local`.
4. Run the demo (`pnpm --filter demo-site build && pnpm --filter demo-site start`),
   visit `/admin`, and click "Sign in with Google".
5. Confirm you land on the admin shell signed in as your Google identity.
