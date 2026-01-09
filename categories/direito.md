---
layout: default
title: "Categoria: Advocacia"
permalink: /categories/advocacia/
---

<section class="intro-section">
  <h1>Categoria: Advocacia</h1>
</section>

<ul class="posts-list">
{% for post in site.categories.advocacia %}
  <li class="post-item">
    <a class="post-link" href="{{ post.url | relative_url }}">
      {%- comment -%} Tenta obter imagem destacada: front-matter `image` ou primeira `<img>` no conteúdo {%- endcomment -%}
      {% assign img_src = nil %}
      {% if post.image %}
        {% assign img_src = post.image %}
      {% else %}
        {% assign after_img = post.content | split:'<img' %}
        {% if after_img.size > 1 %}
          {% assign src_part = after_img[1] | split:'src="' %}
          {% if src_part.size > 1 %}
            {% assign img_src = src_part[1] | split:'"' | first %}
          {% else %}
            {% assign src_part = after_img[1] | split:"src='" %}
            {% if src_part.size > 1 %}
              {% assign img_src = src_part[1] | split:"'" | first %}
            {% endif %}
          {% endif %}
        {% endif %}
      {% endif %}

      {% if img_src %}
        <div class="post-thumbnail">
          <img src="{{ img_src | relative_url }}" alt="{{ post.title }}">
        </div>
      {% endif %}

      <div class="post-meta">
        <h2 class="post-title">{{ post.title }}</h2>
        <div class="post-date">{{ post.date | date: "%d %B %Y" }}</div>
        <p class="post-excerpt">
          {% assign excerpt_text = post.excerpt | strip_html %}
          {% if excerpt_text and excerpt_text != '' %}
            {{ excerpt_text | truncatewords: 30 }}
          {% else %}
            {{ post.content | strip_html | truncatewords: 30 }}
          {% endif %}
        </p>
      </div>
    </a>
  </li>
{% endfor %}
</ul>
