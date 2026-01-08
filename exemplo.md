---
layout: default
---

<h1>Exemplo de Uso do Tufte CSS</h1>

<section>
Esta página demonstra as principais características e funcionalidades do Tufte CSS, o estilo tipográfico usado neste site.

O Tufte CSS oferece uma tipografia limpa e espaçamento generoso, criando uma experiência de leitura agradável. Ele também suporta elementos especiais como notas laterais (sidenotes) e figuras com legendas.

## Características do Tufte CSS

Algumas das características principais incluem:

- Tipografia elegante e legível
- Espaçamento generoso
- Suporte para notas laterais
- Figuras e tabelas bem formatadas
- Design responsivo

## Usando Notas no Tufte CSS

O Tufte CSS suporta três tipos principais de notas: **sidenotes** (notas laterais numeradas), **margin notes** (notas de margem sem numeração) e **footnotes** (notas de rodapé convertidas automaticamente em sidenotes).

### 1. Sidenotes (Notas Laterais Numeradas)

As sidenotes são notas numeradas que aparecem na margem lateral. Para criar uma sidenote, você precisa usar HTML diretamente no Markdown:

<label for="sn-1" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-1" class="margin-toggle"/>
<span class="sidenote">Esta é uma sidenote numerada. Ela aparece na margem lateral quando você visualiza o post em uma tela grande. Em telas menores, ela aparece como uma nota de rodapé.</span>

Você pode referenciar esta nota no texto. O número da nota aparece automaticamente quando você usa a estrutura correta de `<label>` e `<input>`.

### 2. Margin Notes (Notas de Margem Sem Numeração)

As margin notes são notas que aparecem na margem sem numeração. Elas são úteis para comentários adicionais ou informações complementares:

<span class="marginnote">Esta é uma nota de margem sem numeração. Ela simplesmente aparece na margem lateral para fornecer contexto adicional ou informações complementares.</span>

As margin notes são mais simples de usar, pois não requerem a estrutura de label/input. Basta usar a classe `marginnote` em um elemento `<span>`.

### 3. Footnotes (Notas de Rodapé)

O kramdown (processador de Markdown do Jekyll) suporta notas de rodapé usando a sintaxe padrão do Markdown. No Tufte CSS, essas notas de rodapé são automaticamente convertidas em sidenotes na margem lateral.[^1]

Você pode criar múltiplas notas de rodapé[^2] e elas serão numeradas automaticamente.[^3]

[^1]: Esta é a primeira nota de rodapé. Ela será automaticamente convertida em uma sidenote pelo Tufte CSS.

[^2]: Esta é a segunda nota de rodapé. O kramdown gerencia a numeração automaticamente.

[^3]: Esta é a terceira nota de rodapé. Todas as notas de rodapé aparecerão na margem lateral quando renderizadas com Tufte CSS.

### Quando Usar Cada Tipo?

- **Sidenotes**: Use quando quiser controle total sobre a numeração e posicionamento da nota
- **Margin Notes**: Use para comentários informais ou informações complementares que não precisam de numeração
- **Footnotes**: Use quando quiser a conveniência da sintaxe Markdown padrão e numeração automática

## Conclusão

Este exemplo demonstra as principais funcionalidades do Tufte CSS. Você pode expandir este template para criar posts mais elaborados com figuras, tabelas, equações matemáticas e muito mais. As notas são uma característica distintiva do estilo Tufte e ajudam a criar uma experiência de leitura rica e informativa.
</section>

