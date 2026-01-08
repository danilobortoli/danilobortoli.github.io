# danilobortoli.github.io

Blog pessoal usando o estilo Tufte CSS, inspirado nos livros de Edward Tufte sobre visualização de dados e design de informação.

## Estrutura do Projeto

Este site usa **Jekyll** para gerar páginas estáticas a partir de arquivos Markdown.

```
.
├── _config.yml              # Configuração do Jekyll
├── _layouts/                # Layouts reutilizáveis
│   ├── default.html         # Layout base
│   └── post.html            # Layout para posts
├── _includes/                # Componentes reutilizáveis
│   └── navigation.html      # Menu de navegação
├── _posts/                  # Posts do blog em Markdown
│   ├── _template.md         # Template para novos posts
│   └── YYYY-MM-DD-titulo.md # Posts (formato Jekyll)
├── assets/                  # Arquivos estáticos
│   └── images/              # Imagens do site
├── index.html               # Página inicial
├── posts.html               # Página listando todos os posts
├── sobre.html               # Página sobre
├── Gemfile                  # Dependências Ruby/Jekyll
└── README.md
```

## Navegação

O site possui um menu de navegação presente em todas as páginas com links para:
- **Início**: Página principal com uma breve introdução
- **Posts**: Lista de todos os posts do blog (gerada automaticamente)
- **Sobre**: Informações sobre você

## Como Adicionar um Novo Post

1. Copie o arquivo `_posts/_template.md` para um novo arquivo no diretório `_posts/`
2. O nome do arquivo deve seguir o formato: `YYYY-MM-DD-titulo-do-post.md`
   - Exemplo: `2024-01-15-meu-primeiro-post.md`
3. Edite o front matter (cabeçalho YAML) do arquivo:
   ```yaml
   ---
   layout: post
   title: "Título do Post"
   date: 2024-01-15
   ---
   ```
4. Escreva seu conteúdo em Markdown abaixo do front matter
5. Faça commit e push - o post aparecerá automaticamente na lista de posts!

### Exemplo de Post

```markdown
---
layout: post
title: "Meu Primeiro Post"
date: 2024-01-15
---

Este é o conteúdo do meu post em **Markdown**!

## Seção 1

Mais conteúdo aqui...
```

## Como Adicionar Imagens

1. **Faça upload da imagem**: Adicione o arquivo de imagem (JPG, PNG, GIF, SVG, WebP) no diretório `assets/images/`
   - Você pode fazer isso via interface do GitHub (arrastar e soltar) ou via git:
     ```bash
     git add assets/images/nome-da-imagem.jpg
     git commit -m "Adiciona imagem"
     git push
     ```

2. **Referencie a imagem no Markdown**:
   ```markdown
   ![Texto alternativo](/assets/images/nome-da-imagem.jpg)
   ```

3. **Use figuras do Tufte CSS** (com legendas elegantes):
   ```html
   <figure>
     <img src="/assets/images/nome-da-imagem.jpg" alt="Descrição">
     <figcaption>Legenda da figura.</figcaption>
   </figure>
   ```

4. **Figura de largura total**:
   ```html
   <figure class="fullwidth">
     <img src="/assets/images/nome-da-imagem.jpg" alt="Descrição">
     <figcaption>Legenda para figura de largura total.</figcaption>
   </figure>
   ```

**Formatos suportados**: JPG, PNG, GIF, SVG, WebP

## Características do Tufte CSS

O Tufte CSS oferece:
- Tipografia elegante e legível
- Espaçamento generoso
- Suporte para notas laterais (sidenotes)
- Figuras e tabelas bem formatadas
- Design responsivo

## Tecnologias

- **Jekyll**: Gerador de sites estáticos
- **Markdown**: Formato de escrita para posts
- **Tufte CSS**: Framework CSS para estilo elegante
- **GitHub Pages**: Hospedagem gratuita
- **GitHub Actions**: Deploy automático

## Publicação com GitHub Actions

O site usa GitHub Actions para compilar o Jekyll e publicar automaticamente. O workflow está configurado em `.github/workflows/deploy.yml`.

### Configuração Inicial (apenas uma vez)

1. No GitHub, vá em **Settings** → **Pages**
2. Em **Source**, selecione **GitHub Actions** (não "Deploy from a branch")
3. Salve as alterações

### Como Funciona

- **Automático**: Toda vez que você faz `git push` para o branch `main`, o GitHub Actions:
  1. Faz checkout do código
  2. Compila o Jekyll (converte Markdown para HTML)
  3. Faz upload dos arquivos gerados
  4. Publica automaticamente no GitHub Pages

- **Manual**: Você também pode executar o workflow manualmente em **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### Acessar o Site

Após o deploy, seu site estará disponível em: `https://danilobortoli.github.io`

O workflow mostra o status do deploy na aba **Actions** do seu repositório.

## Desenvolvimento Local

Para testar o site localmente antes de publicar:

1. Instale o Ruby e o Bundler (se ainda não tiver)
2. Instale as dependências:
   ```bash
   bundle install
   ```
3. Execute o servidor local:
   ```bash
   bundle exec jekyll serve
   ```
4. Acesse `http://localhost:4000` no navegador

## Personalização

Você pode personalizar:
- A introdução pessoal na página `index.html`
- As informações sobre você na página `sobre.html`
- Os estilos CSS no layout `_layouts/default.html`
- O menu de navegação em `_includes/navigation.html`
- As configurações do Jekyll em `_config.yml`

## Recursos Úteis

- [Tufte CSS no GitHub](https://github.com/edwardtufte/tufte-css)
- [Documentação do Tufte CSS](https://edwardtufte.github.io/tufte-css/)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Markdown Guide](https://www.markdownguide.org/)
