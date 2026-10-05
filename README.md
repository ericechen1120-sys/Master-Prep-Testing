# Topway / Master Tutoring Center Exam App

Secure server-backed prototype for Topway student exams.

## Run Locally

```bash
node server.js
```

Then open:

```text
http://127.0.0.1:4173/
```

Do not open `index.html` directly for real use. The server is what keeps the admin password, answer keys, and grading away from the student browser.

## Admin

The admin password is checked on the server, not in the student browser. For publishing, set it with an environment variable:

```bash
TOPWAY_ADMIN_PASSWORD="your-secure-password" node server.js
```

## Saving Results on Render

Render can restart your web service. If the app only saves to a local file, saved exams and student results can disappear after a restart or redeploy.

Recommended free option: use Neon Postgres and set this in Render:

```text
DATABASE_URL = your Neon Postgres connection string
```

When `DATABASE_URL` is set, exams, answer keys, and student submissions are saved in the database and can be viewed from admin on any device.

Paid Render disk fallback:

```text
Environment Variable:
DATA_DIR = /opt/render/project/src/data

Persistent Disk Mount Path:
/opt/render/project/src/data
```

The app saves data to:

```text
topway-data.json
```

Local development still works without a database by saving this JSON file under `data/`.

## Student Safety

Students only receive:

- exam title
- timer
- PDF
- question numbers/types/choices
- question images and shared passage images
- shuffled display order

They do not receive:

- admin password
- answer key
- scores after submitting
- class reports

## PDF Question Import

This project also includes a local FastAPI + Docling PDF question extractor.

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run the extractor:

```bash
python run_extractor.py
```

Then open:

```text
http://127.0.0.1:8000/
```

Endpoint:

```text
POST /extract-questions
```

It accepts PDF files only, limits uploads to 50 MB, extracts Markdown with Docling, separates numbered questions, and returns JSON with question number, text, choices, page number when available, subject, difficulty level, and original filename.

## Image-Bound Questions

The main exam app no longer uses a full test PDF upload. Tutors can attach an image directly to a question or attach the same shared image to multiple English questions. When questions are randomized, the attached image stays with its question. Reports still return to original question order.
