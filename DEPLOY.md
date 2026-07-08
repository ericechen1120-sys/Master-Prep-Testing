# Deploy Topway on Render

Upload this folder to GitHub, then create a Render Web Service.

Use:

```text
Build Command: npm install
Start Command: npm start
```

Add this environment variable:

```text
TOPWAY_ADMIN_PASSWORD = your admin password
```

Add a persistent disk so uploaded exams and results do not disappear:

```text
Mount Path: /opt/render/project/src/data
```

Do not deploy this as a static site. It must run `server.js`.
