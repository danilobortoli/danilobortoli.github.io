# danilobortoli.github.io

Blog pessoal usando o estilo Tufte CSS, inspirado nos livros de Edward Tufte sobre visualização de dados e design de informação.

## Estrutura do Projeto

```
.
├── index.html              # Página principal do blog
├── posts/                  # Diretório com os posts do blog
│   ├── exemplo-de-post.html
│   └── _template.html      # Template para criar novos posts
└── README.md
```

## Como Adicionar um Novo Post

1. Copie o arquivo `posts/_template.html` para um novo arquivo com um nome descritivo (ex: `meu-primeiro-post.html`)
2. Edite o novo arquivo:
   - Substitua `TÍTULO_DO_POST` pelo título do seu post
   - Substitua `DATA_DO_POST` pela data do post
   - Adicione seu conteúdo na seção `<section>`
3. Adicione o link para o novo post no `index.html` na lista de posts

## Características do Tufte CSS

O Tufte CSS oferece:
- Tipografia elegante e legível
- Espaçamento generoso
- Suporte para notas laterais (sidenotes)
- Figuras e tabelas bem formatadas
- Design responsivo

## Recursos Úteis

- [Tufte CSS no GitHub](https://github.com/edwardtufte/tufte-css)
- [Documentação do Tufte CSS](https://edwardtufte.github.io/tufte-css/)
- [GitHub Pages Documentation](https://docs.github.com/pages)

## Publicação

O site é automaticamente publicado no GitHub Pages quando você faz push para o branch `main` (ou `master`). Acesse seu site em: `https://danilobortoli.github.io`

## Personalização

Você pode personalizar:
- O título e subtítulo do blog no `index.html`
- As cores e estilos adicionais através das tags `<style>` nos arquivos HTML
- A estrutura de navegação e layout
