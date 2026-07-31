---
layout: default
title: "Categoria: Direito"
permalink: /categories/direito/
---

<section class="intro-section">
  <h1>Categoria: Direito</h1>
</section>

<ul class="posts-list">
{% assign target = "direito" %}
{% for post in site.posts %}
  {% assign matched = false %}
  {% if post.categories and post.categories.size > 0 %}
    {% for c in post.categories %}
      {% assign c_slug = c | downcase %}
      {% if c_slug == target %}
        {% assign matched = true %}
      {% endif %}
    {% endfor %}
  {% endif %}

  {% if matched %}
  <li>
    <a class="post-link" href="{{ post.url | relative_url }}">
      <h2 class="post-title">{{ post.title }}</h2>
      {% if post.subtitle %}
        <p class="post-subtitle">{{ post.subtitle }}</p>
      {% endif %}
      <div class="post-date">{{ post.date | date: "%d de %B de %Y" | replace: "January", "Janeiro" | replace: "February", "Fevereiro" | replace: "March", "Março" | replace: "April", "Abril" | replace: "May", "Maio" | replace: "June", "Junho" | replace: "July", "Julho" | replace: "August", "Agosto" | replace: "September", "Setembro" | replace: "October", "Outubro" | replace: "November", "Novembro" | replace: "December", "Dezembro" }}</div>

      <div class="post-excerpt">
        {% assign excerpt_text = post.excerpt | strip_html | strip %}
        {% if excerpt_text and excerpt_text != '' %}
          {{ excerpt_text | truncatewords: 30 }}
        {% else %}
          {{ post.content | strip_html | truncatewords: 30 }}
        {% endif %}
      </div>
    </a>
  </li>
  {% endif %}
{% endfor %}
</ul>
