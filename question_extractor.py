import os
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles


MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ROOT_DIR = Path(__file__).resolve().parent
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}

app = FastAPI(title="Topway PDF Question Extractor")
app.mount("/assets", StaticFiles(directory=ROOT_DIR), name="assets")


def build_docling_converter():
    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        return DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
    except Exception:
        from docling.document_converter import DocumentConverter

        return DocumentConverter()


def convert_pdf_to_markdown(pdf_path: Path) -> str:
    try:
        converter = build_docling_converter()
        result = converter.convert(str(pdf_path))
        return result.document.export_to_markdown()
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="Docling is not installed. Run: pip install -r requirements.txt",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract text from this PDF with Docling: {exc}",
        ) from exc


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_numbered_questions(markdown: str) -> list[dict[str, Any]]:
    text = normalize_text(markdown)
    question_pattern = re.compile(
        r"(?ms)(?:^|\n)\s*(?:#{1,6}\s*)?(?:Question\s+)?(\d{1,3})[\).:\-]\s+(.+?)(?=(?:\n\s*(?:#{1,6}\s*)?(?:Question\s+)?\d{1,3}[\).:\-]\s+)|\Z)"
    )
    matches = list(question_pattern.finditer(text))

    if not matches:
        return []

    questions = []
    for match in matches:
        number = int(match.group(1))
        body = normalize_text(match.group(2))
        question_text, choices = extract_choices(body)
        questions.append(
            {
                "question_number": number,
                "question_text": question_text,
                "answer_choices": choices,
                "page_number": infer_page_number(match.start(), text),
            }
        )
    return questions


def extract_choices(body: str) -> tuple[str, list[dict[str, str]]]:
    choice_pattern = re.compile(
        r"(?ms)(?:^|\n)\s*(?:[\(\[]?([A-E])[\)\].:\-]|([A-E])\s{2,})\s+(.+?)(?=(?:\n\s*(?:[\(\[]?[A-E][\)\].:\-]|[A-E]\s{2,})\s+)|\Z)"
    )
    matches = list(choice_pattern.finditer(body))
    choices = []

    if matches:
        question_text = normalize_text(body[: matches[0].start()])
        for match in matches:
            label = match.group(1) or match.group(2)
            choices.append({"label": label, "text": normalize_text(match.group(3))})
    else:
        question_text = body

    return question_text, choices


def infer_page_number(position: int, text: str) -> int | None:
    before = text[:position]
    markers = re.findall(r"(?:<!--\s*)?page\s*(?:number)?\s*[:#-]?\s*(\d+)", before, re.I)
    if markers:
        return int(markers[-1])
    return None


def infer_subject(question_text: str, filename: str) -> str:
    blob = f"{filename} {question_text}".lower()
    math_terms = [
        "solve",
        "equation",
        "function",
        "triangle",
        "angle",
        "graph",
        "integer",
        "percent",
        "ratio",
        "x",
        "y",
        "=",
    ]
    english_terms = [
        "passage",
        "author",
        "paragraph",
        "sentence",
        "main idea",
        "vocabulary",
        "grammar",
        "punctuation",
    ]
    if any(term in blob for term in math_terms):
        return "math"
    if any(term in blob for term in english_terms):
        return "english"
    return "unknown"


def infer_difficulty(question_text: str, choices: list[dict[str, str]]) -> str:
    word_count = len(re.findall(r"\w+", question_text))
    has_math = bool(re.search(r"[=<>√π]|\bquadratic\b|\bsystem\b|\bfunction\b", question_text, re.I))
    if word_count > 120 or has_math:
        return "hard"
    if word_count > 60 or len(choices) >= 5:
        return "medium"
    return "easy"


def enrich_questions(
    raw_questions: list[dict[str, Any]], original_filename: str
) -> list[dict[str, Any]]:
    enriched = []
    for item in raw_questions:
        question_text = item["question_text"]
        choices = item["answer_choices"]
        enriched.append(
            {
                "question_number": item["question_number"],
                "question_text": question_text,
                "answer_choices": choices,
                "page_number": item["page_number"],
                "subject": infer_subject(question_text, original_filename),
                "difficulty_level": infer_difficulty(question_text, choices),
                "original_filename": original_filename,
            }
        )
    return enriched


async def save_upload_to_temp(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    if upload.content_type and upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    fd, temp_name = tempfile.mkstemp(prefix="topway_pdf_", suffix=".pdf")
    temp_path = Path(temp_name)
    total = 0

    try:
        with os.fdopen(fd, "wb") as temp_file:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="PDF is too large. Maximum upload size is 50 MB.",
                    )
                temp_file.write(chunk)
        if total == 0:
            raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")
        return temp_path
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise


@app.get("/")
async def upload_page():
    return FileResponse(ROOT_DIR / "extractor.html")


@app.post("/extract-questions")
async def extract_questions(request: Request, file: UploadFile = File(...)):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_BYTES + 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF is too large. Maximum upload size is 50 MB.",
        )

    temp_path: Path | None = None
    original_filename = Path(file.filename or "uploaded.pdf").name
    try:
        temp_path = await save_upload_to_temp(file)
        markdown = convert_pdf_to_markdown(temp_path)
        raw_questions = split_numbered_questions(markdown)
        if not raw_questions:
            raise HTTPException(
                status_code=422,
                detail="No numbered questions were found. Make sure questions start like '1.' or 'Question 1:'.",
            )
        return JSONResponse(
            {
                "original_filename": original_filename,
                "markdown": markdown,
                "question_count": len(raw_questions),
                "questions": enrich_questions(raw_questions, original_filename),
            }
        )
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
