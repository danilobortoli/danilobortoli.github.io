# Guia de Configuração: Notas por Email

Este guia explica como configurar o sistema de notas por email, permitindo que você envie emails que serão automaticamente convertidos em notas no site.

## Como Funciona

1. Você envia um email com assunto "Nota: [título]" para uma conta específica
2. A cada 30 minutos, o GitHub Actions verifica essa conta
3. Emails não lidos com "Nota" no assunto são processados
4. Uma nova nota é criada automaticamente no site

## Opção 1: Gmail (Recomendado)

### Passo 1: Criar uma Conta Gmail Dedicada (Opcional mas Recomendado)

Você pode usar sua conta pessoal ou criar uma nova conta Gmail só para enviar notas.

### Passo 2: Gerar Senha de App do Gmail

1. Acesse sua conta Google em [myaccount.google.com](https://myaccount.google.com)
2. Vá em **Segurança**
3. Em "Como fazer login no Google", ative a **Verificação em duas etapas** (se ainda não estiver ativa)
4. Volte para **Segurança** e procure por **Senhas de app**
5. Selecione:
   - **App**: Outro (nome personalizado)
   - **Nome**: "Notas Blog" (ou qualquer nome)
6. Clique em **Gerar**
7. **Copie a senha de 16 caracteres** (você vai precisar dela)

### Passo 3: Configurar Secrets no GitHub

1. Vá para o seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** > **Actions**
4. Clique em **New repository secret** e adicione cada um:

| Nome do Secret | Valor | Exemplo |
|----------------|-------|---------|
| `EMAIL_HOST` | `imap.gmail.com` | `imap.gmail.com` |
| `EMAIL_PORT` | `993` | `993` |
| `EMAIL_USER` | Seu email completo | `seu.email@gmail.com` |
| `EMAIL_PASSWORD` | A senha de app de 16 caracteres | `abcd efgh ijkl mnop` |
| `ALLOWED_SENDER` | Seu email pessoal (de onde você vai enviar) | `seu.email.pessoal@gmail.com` |

**IMPORTANTE:**
- `EMAIL_USER`: A conta que VAI RECEBER os emails (pode ser a mesma que envia)
- `ALLOWED_SENDER`: Seu email pessoal de ONDE você vai enviar as notas
- `EMAIL_PASSWORD`: Use a **senha de app**, NÃO sua senha normal do Gmail

## Opção 2: Outlook/Hotmail

### Configuração para Outlook

1. Acesse [account.live.com/activity](https://account.live.com/activity)
2. Vá em **Segurança** > **Opções de segurança avançadas**
3. Em **Segurança de aplicativos**, crie uma **senha de app**
4. Configure os secrets:

| Nome do Secret | Valor |
|----------------|-------|
| `EMAIL_HOST` | `outlook.office365.com` |
| `EMAIL_PORT` | `993` |
| `EMAIL_USER` | Seu email Outlook |
| `EMAIL_PASSWORD` | Senha de app gerada |
| `ALLOWED_SENDER` | Seu email pessoal |

## Opção 3: Outros Provedores

Para outros provedores de email, você precisará:

1. Descobrir o servidor IMAP e porta:
   - Geralmente `imap.seudominio.com` na porta `993`
   - Procure por "configuração IMAP" + nome do provedor
2. Ativar IMAP nas configurações da conta
3. Gerar uma senha de app (se disponível)

## Como Usar

### Enviando uma Nota

1. **Do WhatsApp, Telegram ou qualquer lugar:**
   - Escreva sua nota
   - Toque em compartilhar/enviar
   - Escolha "Email" ou "Gmail"
   - Envie para a conta configurada em `EMAIL_USER`
   - **Assunto deve conter "Nota"** (ex: "Nota: Pensamento do dia")

2. **Do Email diretamente:**
   - Crie um novo email
   - **Para:** O email configurado em `EMAIL_USER`
   - **Assunto:** `Nota: Título da sua nota` (ou apenas "Nota")
   - **Corpo:** O conteúdo da sua nota
   - Envie

### Exemplos de Assuntos Válidos

- ✅ `Nota: Reflexão sobre design`
- ✅ `Nota`
- ✅ `nota: Ideia para o projeto`
- ❌ `Lembretes` (não contém "Nota")
- ❌ `Anotações` (contém "nota" mas dentro de outra palavra)

### O que Acontece

1. O GitHub Actions verifica emails a cada 30 minutos
2. Emails não lidos com "Nota" no assunto são processados
3. Uma nota é criada em `_notas/` com:
   - Data do email
   - Conteúdo do corpo
4. O email é marcado como lido
5. A nota aparece automaticamente no site em alguns minutos

## Testando a Configuração

1. Após configurar os secrets, vá em **Actions** no GitHub
2. Clique em "Processar Notas por Email"
3. Clique em **Run workflow** > **Run workflow**
4. Aguarde a execução (leva ~1 minuto)
5. Veja os logs para confirmar se funcionou

Para testar:
1. Envie um email de teste com assunto "Nota: Teste"
2. Execute o workflow manualmente (passos acima)
3. Verifique se uma nota foi criada em `_notas/`

## Frequência de Verificação

Por padrão, o sistema verifica emails **a cada 30 minutos**.

Para mudar a frequência, edite `.github/workflows/process-email-notes.yml`:

```yaml
schedule:
  - cron: '*/30 * * * *'  # A cada 30 minutos
  # - cron: '*/15 * * * *'  # A cada 15 minutos
  # - cron: '0 * * * *'     # A cada hora
  # - cron: '0 */2 * * *'   # A cada 2 horas
```

## Solução de Problemas

### "Erro IMAP: authentication failed"
- Verifique se a senha de app está correta
- Confirme que a verificação em duas etapas está ativa (Gmail)
- Tente gerar uma nova senha de app

### "Nenhum email novo encontrado"
- Verifique se o email está marcado como não lido
- Confirme que o assunto contém "Nota"
- Verifique se está na conta correta (`EMAIL_USER`)

### Nota não aparece no site
- GitHub Pages pode levar 1-5 minutos para atualizar após o commit
- Verifique se o arquivo foi criado em `_notas/`
- Limpe o cache do navegador

### "Remetente não autorizado"
- O email deve vir do endereço configurado em `ALLOWED_SENDER`
- Se quiser aceitar de qualquer remetente, deixe `ALLOWED_SENDER` vazio

## Segurança

- **Nunca** compartilhe sua senha de app
- Use senha de app, **não** sua senha normal
- Configure `ALLOWED_SENDER` para aceitar apenas emails do seu endereço
- Os secrets são criptografados pelo GitHub
- O workflow só roda no seu repositório

## Dicas

1. **Salve o email como contato:** Adicione o `EMAIL_USER` aos seus contatos como "Notas Blog" para enviar rapidamente
2. **Use do WhatsApp:** Compartilhe mensagens direto do WhatsApp para o email
3. **Rascunhos:** Emails em rascunho não são processados, apenas emails recebidos
4. **Formatação:** Mantenha as notas curtas e simples, como tweets
5. **Título automático:** Se não quiser pensar em títulos, use apenas "Nota" no assunto

---

**Criado com** ❤️ **usando GitHub Actions e Python**
