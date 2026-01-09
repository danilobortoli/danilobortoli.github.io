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
  <li>
    <a class="post-link" href="{{ post.url | relative_url }}">
      <h2 class="post-title">{{ post.title }}</h2>
      <div class="post-date">{{ post.date | date: "%d %B %Y" }}</div>
      {% if post.excerpt %}<p class="post-excerpt">{{ post.excerpt }}</p>{% endif %}
    </a>
  </li>
{% endfor %}
</ul>
