# Bot de notas via Telegram (AWS Lambda + SAM)

Recebe mensagens (texto, foto, link) num bot do Telegram e publica como nota
no `_notas/` do site, comitando direto no GitHub via API.

```
Telegram ──webhook──▶ API Gateway HTTP ──▶ Lambda (Python) ──▶ GitHub Contents API
```

## Pré-requisitos

- Conta AWS com credenciais configuradas (`aws configure`).
- AWS SAM CLI instalado: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html>
- Python 3.12 (apenas para `sam build`; o handler não usa libs externas).

## 1. Crie o bot do Telegram

1. Abra <https://t.me/BotFather> e mande `/newbot`.
2. Escolha um nome e um username terminando em `bot`.
3. Guarde o **token** que ele devolve (`123456:ABC-...`).
4. Mande `/start` para o seu próprio bot.
5. Pegue seu `chat_id`: abra
   `https://api.telegram.org/bot<TOKEN>/getUpdates` no navegador e procure
   `"chat":{"id": 12345678, ...}`. Esse número é seu `ALLOWED_CHAT_ID`.

## 2. Gere um GitHub PAT

Use **fine-grained tokens** restritos a este repositório:
<https://github.com/settings/personal-access-tokens/new>

- **Repository access**: só `danilobortoli/danilobortoli.github.io`.
- **Repository permissions** → **Contents**: `Read and write`.
- Defina uma expiração (90 dias é razoável; renove quando expirar).

## 3. Defina o secret token do webhook

Gere uma string aleatória (32+ caracteres alfanuméricos):

```sh
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Vai usar em dois lugares: na Lambda (env var `TELEGRAM_SECRET_TOKEN`) e ao
chamar `setWebhook` mais à frente.

## 4. Deploy

Da pasta `telegram-bot/`:

```sh
sam build
sam deploy --guided
```

No `--guided`, responda:

- Stack name: `telegram-note-publisher`
- Region: a sua (ex. `us-east-1`)
- Vai pedir cada parâmetro: cole token do bot, secret token, chat_id, PAT.
- `Confirm changes before deploy`: `y` (na primeira vez).
- `Allow SAM CLI IAM role creation`: `y`.
- `Save arguments to configuration file`: `y` (gera `samconfig.toml`, **não comite com secrets**).

No fim, ele imprime o output `WebhookUrl`, algo como
`https://abc123.execute-api.us-east-1.amazonaws.com/webhook`.

Para deploys seguintes, basta `sam build && sam deploy`.

## 5. Aponte o Telegram para a Lambda

Substitua `<TOKEN>`, `<URL>` e `<SECRET>` e rode:

```sh
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<URL>",
    "secret_token": "<SECRET>",
    "allowed_updates": ["message", "channel_post"],
    "drop_pending_updates": true
  }'
```

Para conferir o status: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`.

## 6. Use

Mande mensagens para o bot:

- **Texto curto**: vira o corpo da nota, sem `title`.
- **Texto multilinha**: a primeira linha (até 80 chars, sem pontuação final)
  vira `title`; o resto vira o corpo.
- **Foto**: a imagem vai para `assets/images/notas/<data>-<slug>.<ext>`,
  referenciada no topo da nota. A legenda segue a mesma regra de título/corpo.
- **Links**: URLs viram `<url>` ou `[texto](url)` quando o Telegram entrega o
  texto formatado.

Cada mensagem gera 1 commit (ou 2, se tiver imagem) na branch `main`. Pages
faz o rebuild em alguns minutos.

## Como atualizar

- Edite `src/handler.py` e rode `sam build && sam deploy`.
- Para mudar parâmetros (ex. trocar PAT): `sam deploy --parameter-overrides GitHubToken=<novo>`.

## Logs e debug

```sh
sam logs --stack-name telegram-note-publisher --tail
```

Erros aparecem como mensagem no próprio chat do Telegram (`Erro ao publicar: ...`).

## Custos

Em uso pessoal (algumas mensagens por dia):

- Lambda: virtualmente zero (free tier cobre).
- API Gateway HTTP: ~US$ 1.00 por milhão de requests.
- CloudWatch Logs: alguns centavos/mês.

## Segurança

- Validação dupla: header `X-Telegram-Bot-Api-Secret-Token` e `chat_id`
  allow-list. Mensagens de outros chats são silenciosamente ignoradas.
- Nenhum secret é gravado em log; o `NoEcho` no template impede vazamento via
  CloudFormation.
- O PAT é fine-grained e restrito a este repo. Se vazar, revogue em
  <https://github.com/settings/personal-access-tokens>.

## Desligando

```sh
sam delete --stack-name telegram-note-publisher
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```
