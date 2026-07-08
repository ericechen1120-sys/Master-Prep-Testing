# Deploy Topway on Render

Upload the files in this folder to GitHub, then create a Render Web Service.

Use:

```text
Build Command: npm install
Start Command: npm start
```

Add this environment variable:

```text
TOPWAY_ADMIN_PASSWORD = your admin password
DATABASE_URL = your Neon Postgres connection string
```

Recommended free storage: create a free Neon Postgres database, copy its pooled connection string, and paste it into Render as `DATABASE_URL`.

Do not add a Render disk if you are using Neon. The database is what keeps exams, answer keys, and student results after Render restarts.

Optional paid Render-disk fallback:

```text
Environment Variable:
DATA_DIR = /opt/render/project/src/data

Mount Path: /opt/render/project/src/data
```

Do not deploy this as a static site. It must run `server.js`.
