"""Lambda handler: recebe um update do Telegram e publica uma nota no repo."""
import base64
import json
import logging
import os
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_SECRET_TOKEN = os.environ["TELEGRAM_SECRET_TOKEN"]
ALLOWED_CHAT_ID = int(os.environ["ALLOWED_CHAT_ID"])
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
GITHUB_REPO = os.environ["GITHUB_REPO"]
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
TELEGRAM_FILE_API = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}"
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}"
SAO_PAULO = timezone(timedelta(hours=-3))


def handler(event, _context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    if headers.get("x-telegram-bot-api-secret-token") != TELEGRAM_SECRET_TOKEN:
        logger.warning("Webhook hit with bad secret token")
        return {"statusCode": 401, "body": "unauthorized"}

    try:
        update = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": "bad json"}

    message = update.get("message") or update.get("channel_post")
    if not message:
        return ack()

    chat_id = (message.get("chat") or {}).get("id")
    if chat_id != ALLOWED_CHAT_ID:
        logger.warning("Rejected message from chat_id %s", chat_id)
        return ack()

    text = (message.get("text") or message.get("caption") or "").strip()
    if text in ("/start", "/help"):
        send_telegram(chat_id, "Mande texto, foto ou link e eu publico como nota.")
        return ack()
    if text.startswith("/"):
        return ack()

    try:
        reply = process_message(message)
        send_telegram(chat_id, reply)
    except Exception as exc:
        logger.exception("Failed to process message")
        send_telegram(chat_id, f"Erro ao publicar: {exc}")
    return ack()


def ack():
    return {"statusCode": 200, "body": "ok"}


def process_message(message):
    text = message.get("text") or message.get("caption") or ""
    entities = message.get("entities") or message.get("caption_entities") or []
    photos = message.get("photo") or []
    sent_at = message.get("date")

    note_dt = (
        datetime.fromtimestamp(sent_at, SAO_PAULO)
        if sent_at
        else datetime.now(SAO_PAULO)
    )

    rendered = apply_link_entities(text, entities)
    title, body = split_title(rendered)

    base_slug = slugify(title) if title else note_dt.strftime("%H%M%S")

    if photos:
        photo = photos[-1]  # maior resolução
        image_bytes, ext = download_telegram_file(photo["file_id"])
        image_path = (
            f"assets/images/notas/"
            f"{note_dt.strftime('%Y-%m-%d')}-{base_slug}{ext}"
        )
        commit_file(
            image_path,
            image_bytes,
            f"Adiciona imagem para nota {base_slug}",
        )
        image_md = f"![]({'/' + image_path})"
        body = f"{image_md}\n\n{body}".strip() if body else image_md

    note_path = ensure_unique(
        f"_notas/{note_dt.strftime('%Y-%m-%d')}-{base_slug}.md"
    )
    markdown = build_markdown(title, note_dt, body)
    commit = commit_file(
        note_path,
        markdown.encode("utf-8"),
        f"Add note via Telegram: {title or base_slug}",
    )
    return f"Publicada: {note_path}\n{commit['commit']['html_url']}"


def split_title(text):
    """Primeira linha curta vira título; o resto vira corpo."""
    text = text.strip()
    if not text:
        return None, ""
    parts = text.split("\n", 1)
    first = parts[0].strip()
    rest = parts[1].strip() if len(parts) > 1 else ""
    if rest and len(first) <= 80 and not first.endswith((".", "?", "!", ",", ";")):
        return first, rest
    return None, text


def apply_link_entities(text, entities):
    """Converte entities do Telegram (text_link/url) em links Markdown."""
    if not text or not entities:
        return text
    units = utf16_units(text)
    edits = []
    for ent in entities:
        kind = ent.get("type")
        start = ent["offset"]
        end = start + ent["length"]
        if kind == "text_link":
            display = decode_units(units[start:end])
            edits.append((start, end, f"[{display}]({ent['url']})"))
        elif kind == "url":
            url = decode_units(units[start:end])
            edits.append((start, end, f"<{url}>"))
    if not edits:
        return text
    edits.sort(key=lambda e: e[0])
    out, cursor = [], 0
    for start, end, replacement in edits:
        if start < cursor:
            continue  # entities sobrepostas: ignora a segunda
        out.append(decode_units(units[cursor:start]))
        out.append(replacement)
        cursor = end
    out.append(decode_units(units[cursor:]))
    return "".join(out)


def utf16_units(text):
    raw = text.encode("utf-16-le")
    return [raw[i:i + 2] for i in range(0, len(raw), 2)]


def decode_units(units):
    return b"".join(units).decode("utf-16-le")


def slugify(text):
    if not text:
        return "Nota"
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9-]+", "-", normalized).strip("-")
    return slug or "Nota"


def build_markdown(title, dt, body):
    lines = ["---"]
    if title:
        lines.append(f"title: {title}")
    lines.append(f"date: {dt.strftime('%Y-%m-%d %H:%M:%S %z')}")
    lines.append("---")
    front = "\n".join(lines)
    body = (body or "").strip()
    return f"{front}\n{body}\n" if body else f"{front}\n"


def commit_file(path, content_bytes, message):
    url = f"{GITHUB_API}/contents/{urllib.parse.quote(path)}"
    sha = None
    try:
        existing = github_request("GET", f"{url}?ref={GITHUB_BRANCH}")
        sha = existing.get("sha")
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
    payload = {
        "message": message,
        "content": base64.b64encode(content_bytes).decode("ascii"),
        "branch": GITHUB_BRANCH,
    }
    if sha:
        payload["sha"] = sha
    return github_request("PUT", url, payload)


def github_request(method, url, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "telegram-aws-note-publisher",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ensure_unique(path):
    base, ext = os.path.splitext(path)
    candidate = path
    n = 2
    while github_path_exists(candidate):
        candidate = f"{base}-{n}{ext}"
        n += 1
    return candidate


def github_path_exists(path):
    url = f"{GITHUB_API}/contents/{urllib.parse.quote(path)}?ref={GITHUB_BRANCH}"
    try:
        github_request("GET", url)
        return True
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return False
        raise


def download_telegram_file(file_id):
    info = telegram_request("getFile", {"file_id": file_id})
    file_path = info["result"]["file_path"]
    ext = os.path.splitext(file_path)[1] or ".jpg"
    with urllib.request.urlopen(f"{TELEGRAM_FILE_API}/{file_path}", timeout=20) as resp:
        return resp.read(), ext


def send_telegram(chat_id, text):
    try:
        telegram_request(
            "sendMessage",
            {"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        )
    except Exception:
        logger.exception("Failed to send confirmation")


def telegram_request(method, body):
    req = urllib.request.Request(
        f"{TELEGRAM_API}/{method}",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))
