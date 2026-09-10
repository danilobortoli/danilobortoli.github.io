---
# Artigo "vintage" — copie este arquivo para _artigos/AAAA-MM-DD-slug-do-titulo.md
# (o slug do nome do arquivo vira a URL: /artigos/slug-do-titulo/)
title: "TÍTULO DO ARTIGO"
subtitle: "subtítulo em itálico, opcional"
date: AAAA-MM-DD
capitulo: "Capítulo Primeiro"     # kicker em versaletes acima do título (ou "Proposição VI", "Prancha XXI"…)
serie: "Nome da série"            # opcional: cabeçalho corrido, à esquerda
numero: 1                         # opcional: cabeçalho corrido, "N.º 1 · mês de ano"
formato: colunas                  # colunas (duas, com filete) | coluna (uma, estreita) | prancha (uma, larga)
capitular: true                   # letra capitular no primeiro parágrafo
continua: false                   # imprime "Continua no próximo número" ao pé
---

<span class="newthought">As primeiras palavras</span> do artigo em versaletes, como nos incipits antigos. O corpo é markdown comum; equações em LaTeX vão entre `$…$` (em linha) ou `$$…$$` (destacadas); notas de rodapé usam a sintaxe kramdown `[^1]` e saem ao pé da folha.

## Da primeira seção

Os títulos de seção (`##`) saem centrados, em versaletes espaçados. Subseções (`###`) saem em itálico.

Figura a partir de arquivo (SVG ou bitmap em traço, de preferência com fundo transparente):

{% include figura-artigo.html src="/assets/img/artigos/exemplo.svg" alt="Descrição" num="1" caption="Legenda em itálico." largura="80" %}

Figura desenhada em SVG no próprio texto, usando a biblioteca de gravura
(ver _includes/gravura-defs.html para a lista completa de padrões e símbolos):

<figure class="art-fig">
<svg viewBox="0 0 300 160" role="img" aria-label="Esfera sobre o solo">
  <rect x="20" y="130" width="260" height="9" fill="url(#art-solo)"/>
  <line x1="20" y1="130" x2="280" y2="130" class="art-tinta" stroke-width="1.2"/>
  <use href="#art-bola" x="122" y="74" width="56" height="56"/>
  <line x1="150" y1="102" x2="150" y2="150" class="art-tinta" stroke-width="1.1" marker-end="url(#art-seta)"/>
  <text x="156" y="152" class="art-rotulo">mg</text>
</svg>
<figcaption><span class="art-fig-num">Fig. 2.</span> Uma esfera sombreada a traço, sobre solo hachurado.</figcaption>
</figure>

{% include ornamento-artigo.html %}

## Da prancha

Uma prancha atravessa as duas colunas:

{% include prancha.html src="/assets/img/artigos/exemplo-prancha.svg" alt="Descrição" num="II" title="Título da prancha" caption="subtítulo em itálico" %}

Ou, em SVG inline, com `<figure class="art-plate">` e um cabeçalho `.art-plate-head`.

[^1]: Texto da nota de rodapé.
