# danilobortoli.github.io

Blog pessoal usando o estilo Tufte CSS, inspirado nos livros de Edward Tufte sobre visualização de dados e design de informação.

## Estrutura do Projeto

```
.
├── index.html              # Página inicial com introdução pessoal
├── posts.html              # Página listando todos os posts
├── sobre.html              # Página sobre
├── posts/                  # Diretório com os posts do blog
│   ├── exemplo-de-post.html
│   └── _template.html      # Template para criar novos posts
└── README.md
```

## Navegação

O site possui um menu de navegação presente em todas as páginas com links para:
- **Início**: Página principal com uma breve introdução
- **Posts**: Lista de todos os posts do blog
- **Sobre**: Informações sobre você

## Como Adicionar um Novo Post

1. Copie o arquivo `posts/_template.html` para um novo arquivo com um nome descritivo (ex: `meu-primeiro-post.html`)
2. Edite o novo arquivo:
   - Substitua `TÍTULO_DO_POST` pelo título do seu post
   - Substitua `DATA_DO_POST` pela data do post
   - Adicione seu conteúdo na seção `<section>`
3. Adicione o link para o novo post na página `posts.html` na lista de posts

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

## Publicação com GitHub Actions

O site usa GitHub Actions para publicação automática. O workflow está configurado em `.github/workflows/deploy.yml`.

### Configuração Inicial (apenas uma vez)

1. No GitHub, vá em **Settings** → **Pages**
2. Em **Source**, selecione **GitHub Actions** (não "Deploy from a branch")
3. Salve as alterações

### Como Funciona

- **Automático**: Toda vez que você faz `git push` para o branch `main`, o GitHub Actions:
  1. Faz checkout do código
  2. Faz upload dos arquivos
  3. Publica automaticamente no GitHub Pages

- **Manual**: Você também pode executar o workflow manualmente em **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### Acessar o Site

Após o deploy, seu site estará disponível em: `https://danilobortoli.github.io`

O workflow mostra o status do deploy na aba **Actions** do seu repositório.

## Personalização

Você pode personalizar:
- A introdução pessoal na página `index.html`
- As informações sobre você na página `sobre.html`
- As cores e estilos adicionais através das tags `<style>` nos arquivos HTML
- O menu de navegação está presente em todas as páginas e pode ser customizado
