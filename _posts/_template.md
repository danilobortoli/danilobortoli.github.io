---
layout: post
title: "TÍTULO_DO_POST"
subtitle: "Subtítulo opcional do post"
date: YYYY-MM-DD
categories: [categoria1, categoria2]
image: /assets/images/hero-image.jpg
---

Comece a escrever seu post aqui em Markdown...

## Seção 1

Conteúdo da seção...

### Exemplos de Notas

**Sidenote (nota numerada):**
```html
<label for="sn-1" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-1" class="margin-toggle"/>
<span class="sidenote">Texto da nota aqui.</span>
```

**Margin Note (nota sem numeração):**
```html
<span class="marginnote">Texto da nota de margem aqui.</span>
```

**Footnote (nota de rodapé em Markdown):**
```markdown
Texto com nota[^1].

[^1]: Texto da nota de rodapé.
```

## Seção 2

Mais conteúdo...

### Exemplos de Imagens

**Imagem simples em Markdown:**
```markdown
![Texto alternativo da imagem](/assets/images/nome-da-imagem.jpg)
```

**Figura do Tufte CSS (com legenda):**
```html
<figure>
  <img src="/assets/images/nome-da-imagem.jpg" alt="Descrição da imagem">
  <figcaption>Legenda da figura. Esta é uma característica especial do Tufte CSS.</figcaption>
</figure>
```

**Figura fullwidth (largura total):**
```html
<figure class="fullwidth">
  <img src="/assets/images/nome-da-imagem.jpg" alt="Descrição da imagem">
  <figcaption>Legenda para figura de largura total.</figcaption>
</figure>
```

**Imagem com margin note:**
```html
<figure>
  <img src="/assets/images/nome-da-imagem.jpg" alt="Descrição">
  <figcaption>Legenda principal da imagem.</figcaption>
  <span class="marginnote">Nota adicional sobre a imagem na margem.</span>
</figure>
```

