---
layout: post
title: Guia de Estilo Tufte CSS
subtitle: Documentação completa das features disponíveis para posts
date: 2026-01-16
category: Tutorial
tags:
  - tufte
  - design
  - css
  - tutorial
---

{% include epigraph.html quote="A excelência no design estatístico consiste em apresentar dados complexos de forma clara, precisa e eficiente." author="Edward Tufte" source="The Visual Display of Quantitative Information" %}

{% include newthought.html text="Este guia documenta" %} todas as features do Tufte CSS disponíveis neste site. O Tufte CSS foi criado para produzir artigos web com o estilo característico dos livros de Edward Tufte, conhecido por sua ênfase em tipografia elegante e notas na margem.

## Epigraphs

Epigraphs são citações usadas para introduzir uma página ou seção. São renderizadas em itálico com atribuição ao autor.

**Uso no Markdown:**

```liquid
{% raw %}{% include epigraph.html
  quote="Texto da citação aqui."
  author="Nome do Autor"
  source="Título da Obra" %}{% endraw %}
```

## Sidenotes e Margin Notes

Uma das características mais distintivas do estilo Tufte são as notas laterais, que permitem adicionar informações complementares sem interromper o fluxo do texto principal.{% include sidenote.html id="sn-exemplo" text="Esta é uma sidenote criada manualmente com o include. Note o número de referência no texto." %}

### Sidenotes Automáticas

A forma mais fácil de criar sidenotes é usando a sintaxe padrão de footnotes do Markdown[^1]. O JavaScript do site converte automaticamente para o formato Tufte CSS.

[^1]: Esta nota de rodapé foi escrita usando a sintaxe `[^1]` do Markdown e convertida automaticamente para sidenote.

### Sidenotes Manuais

Para maior controle, use o include diretamente:

```liquid
{% raw %}{% include sidenote.html id="sn-nome" text="Conteúdo da nota." %}{% endraw %}
```

### Margin Notes

Margin notes são similares às sidenotes, mas sem número de referência.{% include marginnote.html id="mn-exemplo" text="Esta é uma margin note. Ela aparece na margem mas sem um número de referência no texto. Útil para comentários contextuais." %} São úteis para informações complementares que não precisam de referência explícita no texto.

```liquid
{% raw %}{% include marginnote.html id="mn-nome" text="Conteúdo da nota." %}{% endraw %}
```

## Newthought

{% include newthought.html text="Use newthought para iniciar" %} novas seções ou parágrafos importantes. As primeiras palavras aparecem em small caps, criando uma transição visual elegante.

```liquid
{% raw %}{% include newthought.html text="Primeiras palavras" %} resto do texto...{% endraw %}
```

## Figuras

O Tufte CSS oferece três tipos de figuras:

### Figura Regular

Figuras com legenda na margem:

```liquid
{% raw %}{% include figure.html
  src="/assets/images/exemplo.jpg"
  alt="Descrição da imagem"
  caption="Legenda explicativa"
  id="fig-1" %}{% endraw %}
```

### Figura Full-width

Para imagens panorâmicas que ocupam toda a largura:

```liquid
{% raw %}{% include fullwidth.html
  src="/assets/images/panorama.jpg"
  alt="Vista panorâmica"
  caption="Legenda opcional" %}{% endraw %}
```

### Figura na Margem

Pequenas imagens que aparecem na margem do texto:

```liquid
{% raw %}{% include marginfigure.html
  id="mf-1"
  src="/assets/images/small.jpg"
  alt="Descrição"
  caption="Legenda na margem" %}{% endraw %}
```

## Vídeos Incorporados

Para incorporar vídeos do YouTube ou outras plataformas de forma responsiva:

```liquid
{% raw %}{% include iframe.html
  url="https://www.youtube.com/embed/VIDEO_ID"
  title="Título do vídeo" %}{% endraw %}
```

## Citações (Blockquotes)

Citações em bloco são renderizadas com um design elegante:

> O bom design é tão pouco design quanto possível. Menos, mas melhor, porque se concentra nos aspectos essenciais. De volta à pureza, de volta à simplicidade.

As citações podem incluir atribuição usando a tag `footer`:

<blockquote>
  <p>Simplicidade é a sofisticação máxima.</p>
  <footer>Leonardo da Vinci</footer>
</blockquote>

## Código

### Código Inline

Use backticks para código inline como `const x = 42;` ou nomes de arquivos como `_config.yml`.

### Blocos de Código

```javascript
function convertFootnotesToSidenotes() {
  const footnoteRefs = document.querySelectorAll('sup[id^="fnref:"]');

  footnoteRefs.forEach((ref, index) => {
    // Processa cada nota de rodapé
    const footnoteId = ref.id.replace('fnref:', '');
    console.log(`Convertendo nota ${index + 1}: ${footnoteId}`);
  });
}
```

## Texto Sans-Serif

<p class="sans">Este parágrafo usa a fonte sans-serif (Gill Sans), que pode ser útil para textos que precisam de um estilo diferente, como avisos ou notas técnicas.</p>

Para usar, adicione a classe `sans` diretamente no HTML:

```html
<p class="sans">Texto em sans-serif</p>
```

## Estrutura de Documento

O Tufte CSS segue uma hierarquia clara:

- **h1**: Título do documento (usado automaticamente pelo layout de post)
- **h2**: Seções principais
- **h3**: Subseções (use com moderação)

{% include newthought.html text="Evite usar h4-h6" %} pois o estilo Tufte favorece uma hierarquia mais plana. Se você precisa de mais níveis, considere reorganizar o conteúdo.

## Resumo dos Includes Disponíveis

| Include | Uso |
|---------|-----|
| `epigraph.html` | Citações introdutórias |
| `newthought.html` | Início de seção em small caps |
| `sidenote.html` | Notas laterais com número |
| `marginnote.html` | Notas laterais sem número |
| `figure.html` | Figuras com legenda na margem |
| `fullwidth.html` | Figuras em largura total |
| `marginfigure.html` | Figuras pequenas na margem |
| `iframe.html` | Vídeos responsivos |

---

Este guia serve como referência e exemplo vivo das features disponíveis. Consulte-o sempre que precisar lembrar a sintaxe de algum elemento.
