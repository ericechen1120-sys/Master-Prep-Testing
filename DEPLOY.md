# Deploy Topway on Render

Upload the files in this folder to GitHub, then create a Render Web Service.

Important: upload the files at the repository root, not inside an extra nested folder. GitHub should show `app.js`, `server.js`, `package.json`, `index.html`, `styles.css`, and the `assets/` folder at the top level of the repository.

If you use the GitHub website, do not upload the `.zip` file itself. First open/extract the folder, then drag the files inside it into GitHub. GitHub should show the changed `app.js` file, not only `TOPWAY_RENDER_UPLOAD_LATEST_20260721.zip`.

Use:

```text
Build Command: npm install
Start Command: npm start
```

Add this environment variable:

```text
TOPWAY_ADMIN_PASSWORD = your admin password
DATABASE_URL = your Neon Postgres connection string
TOPWAY_DB_POOL_MAX = 3
```

Set the Render Health Check Path to `/api/health`. Build `2026.10.05.1` also
reports `memoryMb` there, which makes memory growth visible without opening the
full admin dashboard.

The service automatically moves embedded `data:image/...` values from imported
PDF questions into deduplicated database media. Keep `DATABASE_URL` configured:
the new `media_assets` table is created automatically during startup.

Do not set `WEB_CONCURRENCY` above `1` for this build. If Render still prints a
V8 heap-limit error after this version is live, a 2 GB instance may use
`NODE_OPTIONS=--max-old-space-size=1400` as a temporary guard, leaving memory for
Postgres buffers and the operating system. The code changes in this build are
the primary fix; increasing the heap alone does not remove duplicated images or
full-state serialization.

Recommended free storage: create a free Neon Postgres database, copy its pooled connection string, and paste it into Render as `DATABASE_URL`.

Do not add a Render disk if you are using Neon. The database is what keeps exams, answer keys, and student results after Render restarts.

Optional paid Render-disk fallback:

```text
Environment Variable:
DATA_DIR = /opt/render/project/src/data

Mount Path: /opt/render/project/src/data
```

Do not deploy this as a static site, GitHub Pages site, or static Netlify site. It must run `server.js`.

If login says "Request failed", the deployed site is probably serving only static files and the `/api/admin/login` endpoint is not running. Use a Render Web Service with `npm start`.

If the logo is missing, confirm `assets/topway-prep-logo.png` was uploaded and that `assets/` is at the repository root beside `app.js`.
