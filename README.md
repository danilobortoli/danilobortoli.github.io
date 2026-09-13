# danilobortoli.github.io

Este é o repositório do meu blog pessoal, disponível em [danilobortoli.github.io](https://danilobortoli.github.io).

## Sobre mim

Sou advogado, com atuação em Direito Empresarial, Tributário e Direito Público. Sou coordenador jurídico da [MATRA – Marília Transparente](https://matr.org.br), organização da sociedade civil dedicada ao controle social da administração pública, à promoção da transparência e ao combate à corrupção.

Tenho interesse contínuo por filosofia, teoria do Estado, tecnologia e pelo uso estratégico de ferramentas digitais aplicadas ao direito e à gestão pública. Cultivo também apreço pela literatura, pela crítica cultural e pela música.

## Sobre o blog

O blog funciona como espaço de convergência entre advocacia, reflexão institucional, tecnologia, escrita e cultura. Escrevo sobre o que me interessa — direito, leituras, programação, política, ideias — sem compromisso com regularidade ou tema fixo.

O design é inspirado no estilo de Edward Tufte, cuja tipografia e organização visual do espaço considero exemplares.

## Seções

- **Escrita** (`_posts/`) — ensaios longos, layout `post`.
- **Notas** (`_notas/`) — fragmentos curtos, layout `nota`.
- **Artigos** (`_artigos/`) — matérias ilustradas compostas à maneira dos periódicos científicos antigos (papel quente, EB Garamond com algarismos antigos, duas colunas com filete, seções em versaletes, figuras "Fig. n.", pranchas, notas ao pé da folha, equações via MathJax), layout `artigo`. A estética segue [Foadsf/vintage-latex](https://github.com/Foadsf/vintage-latex) e [jemmybutton/fiziko](https://github.com/jemmybutton/fiziko). As figuras podem ser desenhadas em SVG direto no markdown com a biblioteca de gravura de `_includes/gravura-defs.html` (hachuras, veios de madeira, esfera sombreada a traço, setas de cota). Modelo em `_artigos/_template.md`.

## Editor

`/editor/` é um editor markdown com preview ao vivo, rascunhos no navegador e exportação do `.md` pronto com front matter. Tipos de documento: Post, Nota, Mídia e Artigo (`/editor/?doc=artigo` abre direto no papel vintage, com barra de ferramentas de gravura: seção, figura, figura em SVG, prancha, nota de rodapé, equação, tabela, ornamento).

## Imagens

Toda imagem do site vive em `assets/images/<ano>/` com o nome
`AAAA-MM-DD-<slug>[-n].<ext>` (JPEG por padrão, PNG só quando há
transparência, lado maior de 1600 px). No markdown, referencie pelo caminho
absoluto: `![](/assets/images/2026/2026-09-13-titulo.jpg)`. Três caminhos
levam a esse resultado sem trabalho manual:

- **Editor** (`/editor/`): cole (⌘V) ou arraste a imagem para o texto, ou use
  o botão `img`. O navegador reduz, recomprime e batiza o arquivo, insere o
  markdown e mostra a imagem no preview. Depois, **Baixar** gera um `.zip`
  com o `.md` e as imagens já nas pastas do repositório (descompacte na raiz
  e comite), ou **Publicar** faz o commit direto na `main` com um token
  fine-grained do GitHub (Contents: read and write), guardado só no
  navegador. As imagens ficam salvas junto do rascunho, no IndexedDB.
- **Linha de comando**: `./nova-imagem foto.HEIC "Captura de Tela.png"`
  converte (com `sips` no macOS ou ImageMagick), reduz, move para
  `assets/images/<ano>/` e imprime o markdown, já copiado para a área de
  transferência. Opções: `-s slug`, `-d AAAA-MM-DD`, `-l "legenda"` (emite
  `figure.html`), `-p` (mantém PNG), `-n` (só mostra o que faria).
- **Telegram** (`telegram-bot/`): mandar uma foto, ou uma imagem como
  arquivo, publica uma nota com ela já no lugar.

## Tecnologias

- [Jekyll](https://jekyllrb.com/) — gerador de sites estáticos
- [Tufte CSS](https://edwardtufte.github.io/tufte-css/) — estilo tipográfico
- [GitHub Pages](https://pages.github.com/) — hospedagem
