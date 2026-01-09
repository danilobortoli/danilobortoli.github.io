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
    {% if post.categories contains target %}
      {% assign matched = true %}
    {% endif %}
  {% endif %}
  {% if post.category == target %}
    {% assign matched = true %}
  {% endif %}

  {% if matched %}
  <li>
    <a class="post-link" href="{{ post.url | relative_url }}">
      <h2 class="post-title">{{ post.title }}</h2>
      <div class="post-date">{{ post.date | date: "%d %B %Y" }}</div>
      {% if post.excerpt %}<p class="post-excerpt">{{ post.excerpt }}</p>{% endif %}
    </a>
  </li>
  {% endif %}
{% endfor %}
</ul>
