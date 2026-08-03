# Upload this version to GitHub

1. Open your existing Topway GitHub repository.
2. Choose **Add file** then **Upload files**.
3. Open this folder and select all of its contents:
   `app.js`, `server.js`, `styles.css`, `index.html`, `package.json`, the `assets` folder, and the documentation files.
4. Upload them to the **top level** of the repository. Do not upload this outer folder or a ZIP file.
5. Commit the changes. Render will then deploy the new version from GitHub.

For Render, this must be a **Web Service** with:

- Build Command: `npm install`
- Start Command: `npm start`

Set `DATABASE_URL` and `TOPWAY_ADMIN_PASSWORD` in Render's environment settings.
