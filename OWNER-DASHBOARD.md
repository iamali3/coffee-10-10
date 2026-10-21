# Coffee 10:10 owner studio

## What is implemented

The owner studio lives at `/admin/`. It maintains the 66 existing products and all original image paths. The owner can add, edit, and delete products; change prices, descriptions, badges, and photos; mark products sold out or hidden; create, rename, move, reorder, and delete categories; edit Arabic and English website copy; and update WhatsApp, social links, location, and opening hours.

**Save draft** stores a private draft. **Preview** saves the current draft and opens the actual customer page, authenticated, with a draft banner and phone/desktop sizing. **Publish changes** requires an explicit confirmation, then updates the content read by the public website. The previous publication can be restored. The public menu refreshes its content when opened, when the tab becomes visible, and when connectivity returns. It does not require a GitHub commit or a Vercel build for each menu edit.

## Local use

```sh
npm install
npm run owner:setup
npm run dev
```

Open `http://127.0.0.1:4180/admin/`. Setup creates `.env.local` with a scrypt password hash and a random session signing secret. Local drafts, publications, and uploads persist under `.owner-data/`. This directory and all real environment files are excluded from Git and the static build. Local development is deliberately isolated from production storage.

For this initial implementation, private generated credentials are in `.owner-data/owner-access.txt`. Running `npm run owner:setup` lets you replace them with your chosen credentials. Keep this file private and do not upload it to the repository.

## Connect the existing Vercel deployment

The website already uses `iamali3/coffee-10-10`, branch `main`, and `https://coffee1010.vercel.app/`. The owner code is prepared for Vercel's Node.js Functions; the customer website stays a static build.

1. While signed into the existing Vercel project, create and connect a **private Vercel Blob store** to **Production**. The server requires its `BLOB_READ_WRITE_TOKEN`. A public store must not be used for the state document, which contains unpublished drafts.
2. Add `OWNER_USERNAME`, `OWNER_PASSWORD_HASH`, and `OWNER_SESSION_SECRET` to the project's Production environment variables. Generated values are in the ignored local `.owner-data/vercel.env`; do not paste them into chat, commit them, or expose them using a frontend prefix. The raw owner password is never sent to Vercel as an environment variable.
3. Deploy this source using the existing `main` integration. `vercel.json` sets `npm run build` and output directory `public/`. No changes to the existing public domain or menu images are needed.
4. Open `/api/owner?action=session`. It must report `configured: true`, `storageReady: true`, and `authenticated: false` before sign-in. The customer `/api/menu` must still return the original menu until the first publication.
5. Log into `/admin/`, save an innocuous draft, preview it, confirm the public page remains unchanged, then publish and confirm the public menu reflects the edit. Check photo upload and both languages too. These production checks are still required; local tests do not substitute for live Blob verification.

Reference: https://vercel.com/docs/vercel-blob/private-storage

## Security and consistency

- The password is checked on the server with scrypt and constant-time comparison.
- Sessions are signed and expire after eight hours; cookies use HttpOnly and SameSite=Strict, plus Secure on Vercel. Changing the password hash or session secret invalidates old sessions.
- Same-origin validation and a session-specific CSRF value protect every authenticated mutation.
- Failed sign-ins are limited to five attempts per IP per minute using persistent private storage, including across cold starts. Only an HMAC of the address is stored.
- Every draft save, publication, discard, and rollback checks its revision. Vercel Blob ETag conditional writes prevent concurrent edits from silently overwriting each other.
- Private drafts, state, rate records, and uploads are in a private store. An uploaded photo becomes publicly readable only once a visible published item references it. Owner requests and previews bypass the PWA cache; public uploads are cached only when their server response explicitly marks them public.
- SVG uploads, external photo URLs, script URL links, invalid categories, duplicate IDs, and invalid prices are rejected server-side. Edited strings are escaped before rendering product HTML; website copy uses textContent.
- The static build is an explicit allowlist and excludes server code and all credentials.

## Hosting scope

The Vercel website is the canonical editable menu. GitHub Pages cannot run the server APIs, so that older static URL keeps the menu snapshot included in the repository; dashboard publications do not update GitHub Pages. Point printed QR codes to `https://coffee1010.vercel.app/`.

If the server is not configured, sign-in and writes are disabled; the existing public menu remains available. If storage is temporarily unavailable, the public page retains the last published cached menu for offline use. An open owner tab retains unsaved work after a network error. Photos uploaded but never attached to a saved item are retained in private storage and can be cleaned up later.

## Checks

```sh
npm run build
npm test
```

Tests cover authentication, origin and CSRF checks, draft privacy, publication, sold-out and hidden products, optimistic concurrency, rollback, upload validation and privacy, persistent login throttling, seed preservation, PWA exclusions, and the public build allowlist. Desktop and 390px phone layouts were also checked in the browser.
