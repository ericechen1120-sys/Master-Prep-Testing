# Topway upload folder — August 5, 2026

This is the complete current Topway testing system, including the student exam experience, SHSAT Original score conversion, Self Check, and all required assets.

## Upload the app

1. Open your existing Topway GitHub repository.
2. Click **Add file** → **Upload files**.
3. Open this folder and select everything inside it.
4. Upload the files to the top level of the repository. GitHub should show app.js, server.js, styles.css, index.html, package.json, assets/, and templates/ at the top level.
5. Commit the changes. Render will deploy the updated app.

Do not upload this outer folder itself as one nested folder, and do not upload the ZIP file to GitHub.

## Render settings

Use a **Web Service** (not a Static Site):

- Build command: npm install
- Start command: npm start
- Environment variables: DATABASE_URL and TOPWAY_ADMIN_PASSWORD

## CSV templates for Question Bank → Import

Open **Admin → Questions → Import**, choose one CSV template from the templates folder, replace the sample rows with your own questions, save as CSV UTF-8, preview it in the app, then import.

- topway_question_bank_standard_template.csv — regular multiple-choice, dropdown, fill-in-the-blank, drag-and-drop, and table-grid questions.
- topway_question_bank_example_with_passage.csv — ELA/reading passages with questions grouped beside a shared passage.
- topway_math_question_types_template.csv — grid-in, equation editor, math fill-in-the-blank, dropdown, drag-and-drop, and hot-spot questions.
- topway_claim_evidence_template.csv — formal claim/evidence classification tables.

Use Question Family ID for all versions of the same source question. The exam builder will avoid selecting two versions of the same family in one exam.

## Before importing

- Keep **Question Type** exactly as shown in the template.
- Add a skill and a difficulty from 1 to 4 for every question.
- For hot-spot questions, replace the sample image URL with a real public image URL and keep zone values in the Options column.
- Use **Question Bank → Self Check** after importing. It flags incomplete questions and duplicates, but never changes questions automatically.

For hot-text questions, use the standard template: set Question Type to hot_text, put the selectable words or phrases in Options separated by semicolons, and put the exact correct word or phrase in Correct Answer Text. Each selectable phrase must also appear in the Question text.
