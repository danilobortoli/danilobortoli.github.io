#!/usr/bin/env python3
"""
Script para processar emails e converter em notas para o site.
Lê emails não lidos de uma caixa de entrada e cria arquivos markdown na pasta _notas/.
"""

import imaplib
import email
import os
import re
from datetime import datetime
from email.header import decode_header
import sys


def slugify(text):
    """Converte texto em slug válido para nome de arquivo."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text[:50]  # Limita tamanho


def decode_email_header(header):
    """Decodifica header de email que pode estar em diferentes encodings."""
    if header is None:
        return ""

    decoded_parts = decode_header(header)
    decoded_string = ""

    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            decoded_string += part.decode(encoding or 'utf-8', errors='ignore')
        else:
            decoded_string += part

    return decoded_string


def get_email_body(msg):
    """Extrai o corpo do email (texto plano preferencialmente)."""
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))

            # Pega texto plano, ignora anexos
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    break
                except:
                    continue

            # Se não tiver texto plano, pega HTML
            elif content_type == "text/html" and not body and "attachment" not in content_disposition:
                try:
                    html = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    # Remove tags HTML básicas
                    body = re.sub(r'<[^>]+>', '', html)
                except:
                    continue
    else:
        # Email não é multipart
        try:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        except:
            body = str(msg.get_payload())

    return body.strip()


def create_note_file(subject, body, email_date):
    """Cria arquivo de nota no formato Jekyll."""
    # Formata data para nome do arquivo
    file_date = email_date.strftime("%Y-%m-%d")
    slug = slugify(subject) if subject else "nota"

    # Nome do arquivo
    filename = f"{file_date}-{slug}.md"
    filepath = os.path.join("_notas", filename)

    # Evita duplicatas
    counter = 1
    original_filepath = filepath
    while os.path.exists(filepath):
        filename = f"{file_date}-{slug}-{counter}.md"
        filepath = os.path.join("_notas", filename)
        counter += 1

    # Formata data com timezone
    formatted_date = email_date.strftime("%Y-%m-%d %H:%M:%S -0300")

    # Limpa o corpo do email
    # Remove assinaturas comuns
    body = re.split(r'\n[-_]{2,}\s*$', body, 1)[0]  # Remove linhas de assinatura
    body = re.split(r'\n\s*Enviado do meu', body, 1)[0]  # Remove "Enviado do meu iPhone/Android"
    body = body.strip()

    # Conteúdo do arquivo
    content = f"""---
date: {formatted_date}
---

{body}
"""

    # Cria o arquivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Nota criada: {filename}")
    return filepath


def process_emails():
    """Processa emails não lidos e cria notas."""
    # Pega configurações do ambiente
    email_host = os.getenv('EMAIL_HOST', 'imap.gmail.com')
    email_port = int(os.getenv('EMAIL_PORT', '993'))
    email_user = os.getenv('EMAIL_USER')
    email_password = os.getenv('EMAIL_PASSWORD')
    allowed_sender = os.getenv('ALLOWED_SENDER', email_user)

    if not email_user or not email_password:
        print("❌ Erro: EMAIL_USER e EMAIL_PASSWORD devem estar configurados")
        sys.exit(1)

    print(f"📧 Conectando ao servidor {email_host}:{email_port}...")

    try:
        # Conecta ao servidor IMAP
        mail = imaplib.IMAP4_SSL(email_host, email_port)
        mail.login(email_user, email_password)
        print(f"✅ Conectado como {email_user}")

        # Seleciona caixa de entrada
        mail.select('INBOX')

        # Busca emails não lidos com assunto contendo "Nota"
        # Ou todos os não lidos se não especificado
        search_criteria = 'UNSEEN SUBJECT "Nota"'

        status, messages = mail.search(None, search_criteria)
        email_ids = messages[0].split()

        if not email_ids:
            print("ℹ️ Nenhum email novo encontrado")
            mail.logout()
            return

        print(f"📬 Encontrados {len(email_ids)} email(s) não lido(s)")

        # Garante que o diretório existe
        os.makedirs("_notas", exist_ok=True)

        notes_created = 0

        for email_id in email_ids:
            # Busca o email
            status, msg_data = mail.fetch(email_id, '(RFC822)')

            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    # Parse do email
                    msg = email.message_from_bytes(response_part[1])

                    # Decodifica assunto
                    subject = decode_email_header(msg.get('Subject', ''))
                    sender = decode_email_header(msg.get('From', ''))

                    print(f"\n📨 Processando: '{subject}' de {sender}")

                    # Verifica se é do remetente permitido
                    if allowed_sender and allowed_sender not in sender:
                        print(f"⚠️ Ignorado: remetente não autorizado ({sender})")
                        continue

                    # Pega data do email
                    email_date_str = msg.get('Date')
                    try:
                        email_date = email.utils.parsedate_to_datetime(email_date_str)
                    except:
                        email_date = datetime.now()

                    # Extrai corpo do email
                    body = get_email_body(msg)

                    if not body:
                        print("⚠️ Email sem conteúdo, ignorado")
                        continue

                    # Remove "Nota:" do assunto se presente
                    subject_clean = re.sub(r'^Nota:\s*', '', subject, flags=re.IGNORECASE)

                    # Cria arquivo de nota
                    create_note_file(subject_clean, body, email_date)
                    notes_created += 1

                    # Marca como lido
                    mail.store(email_id, '+FLAGS', '\\Seen')

        print(f"\n✨ Processamento concluído: {notes_created} nota(s) criada(s)")

        # Fecha conexão
        mail.logout()

    except imaplib.IMAP4.error as e:
        print(f"❌ Erro IMAP: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    print("🚀 Iniciando processamento de emails...\n")
    process_emails()
