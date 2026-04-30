(function () {
  'use strict';

  var SEARCH_INDEX_URL = (document.querySelector('base') ? '' : '') + '/search.json';
  var EXCERPT_RADIUS = 90;
  var MAX_RESULTS = 50;

  var input = document.getElementById('search-input');
  var statusEl = document.getElementById('search-status');
  var resultsEl = document.getElementById('search-results');
  var filterEls = document.querySelectorAll('.search-filter input[type="checkbox"]');

  if (!input || !statusEl || !resultsEl) return;

  var lunrIndex = null;
  var documents = [];
  var docsById = {};
  var ready = false;

  function setStatus(html) {
    statusEl.innerHTML = html;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripDiacritics(str) {
    return str.normalize ? str.normalize('NFD').replace(/[̀-ͯ]/g, '') : str;
  }

  function buildExcerpt(content, query) {
    if (!content) return '';
    var terms = query
      .split(/\s+/)
      .map(function (t) { return t.replace(/[^\p{L}\p{N}]/gu, ''); })
      .filter(function (t) { return t.length > 1; });

    var lowerContent = stripDiacritics(content.toLowerCase());
    var idx = -1;
    var matchedTerm = null;

    for (var i = 0; i < terms.length; i++) {
      var t = stripDiacritics(terms[i].toLowerCase());
      var pos = lowerContent.indexOf(t);
      if (pos !== -1 && (idx === -1 || pos < idx)) {
        idx = pos;
        matchedTerm = terms[i];
      }
    }

    var excerpt;
    if (idx === -1) {
      excerpt = content.slice(0, EXCERPT_RADIUS * 2);
      if (content.length > EXCERPT_RADIUS * 2) excerpt += '…';
    } else {
      var start = Math.max(0, idx - EXCERPT_RADIUS);
      var end = Math.min(content.length, idx + EXCERPT_RADIUS);
      excerpt = (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
    }

    var safe = escapeHTML(excerpt);

    terms.forEach(function (t) {
      if (!t) return;
      var pattern = new RegExp('(' + escapeRegex(t) + ')', 'gi');
      safe = safe.replace(pattern, '<mark>$1</mark>');
    });

    return safe;
  }

  function activeTypes() {
    var types = [];
    filterEls.forEach(function (cb) { if (cb.checked) types.push(cb.value); });
    return types;
  }

  function render(query) {
    if (!ready) return;

    resultsEl.innerHTML = '';

    var trimmed = query.trim();
    if (trimmed.length < 2) {
      setStatus('<em>Digite ao menos 2 caracteres.</em>');
      return;
    }

    var hits;
    try {
      hits = lunrIndex.search(buildLunrQuery(trimmed));
    } catch (e) {
      setStatus('<em>Consulta inválida.</em>');
      return;
    }

    var types = activeTypes();
    var filtered = hits
      .map(function (h) { return docsById[h.ref]; })
      .filter(function (d) { return d && types.indexOf(d.type) !== -1; })
      .slice(0, MAX_RESULTS);

    if (filtered.length === 0) {
      setStatus('Nenhum resultado para <strong>' + escapeHTML(trimmed) + '</strong>.');
      return;
    }

    setStatus(filtered.length + (filtered.length === 1 ? ' resultado' : ' resultados') +
              ' para <strong>' + escapeHTML(trimmed) + '</strong>.');

    var fragment = document.createDocumentFragment();

    filtered.forEach(function (doc) {
      var li = document.createElement('li');
      li.className = 'search-result';

      var typeLabel = doc.type === 'nota' ? 'Nota' : 'Post';
      var title = doc.title || (doc.type === 'nota' ? 'Nota sem título' : 'Sem título');
      var excerpt = buildExcerpt(doc.content, trimmed);

      var html =
        '<a href="' + escapeHTML(doc.url) + '" class="search-result-link">' +
          '<div class="search-result-meta">' +
            '<span class="search-result-type search-result-type--' + doc.type + '">' + typeLabel + '</span>' +
            (doc.date_display ? '<span class="search-result-date">' + escapeHTML(doc.date_display) + '</span>' : '') +
          '</div>' +
          '<h3 class="search-result-title">' + escapeHTML(title) + '</h3>' +
          (doc.subtitle ? '<p class="search-result-subtitle">' + escapeHTML(doc.subtitle) + '</p>' : '') +
          (excerpt ? '<p class="search-result-excerpt">' + excerpt + '</p>' : '') +
        '</a>';

      li.innerHTML = html;
      fragment.appendChild(li);
    });

    resultsEl.appendChild(fragment);
  }

  function buildLunrQuery(raw) {
    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map(function (term) {
        var clean = term.replace(/[:^~+\-*]/g, '');
        if (!clean) return '';
        return clean + ' ' + clean + '*';
      })
      .join(' ');
  }

  function syncQueryParam(q) {
    if (!('history' in window) || !history.replaceState) return;
    var url = new URL(window.location.href);
    if (q) {
      url.searchParams.set('q', q);
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState(null, '', url.toString());
  }

  var debounceTimer = null;
  function onInput() {
    var q = input.value;
    syncQueryParam(q.trim());
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { render(q); }, 120);
  }

  function init(data) {
    documents = data.items || [];

    documents.forEach(function (d) { docsById[d.id] = d; });

    lunrIndex = lunr(function () {
      if (lunr.pt) {
        this.use(lunr.pt);
      }
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('subtitle', { boost: 5 });
      this.field('categories', { boost: 3 });
      this.field('content');

      documents.forEach(function (doc) {
        this.add({
          id: doc.id,
          title: doc.title || '',
          subtitle: doc.subtitle || '',
          categories: (doc.categories || []).join(' '),
          content: doc.content || ''
        });
      }, this);
    });

    ready = true;

    input.disabled = false;
    input.focus();

    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q') || '';
    if (initial) {
      input.value = initial;
      render(initial);
    } else {
      setStatus('Pronto. ' + documents.length + ' itens indexados.');
    }
  }

  function waitForLunr(cb) {
    if (typeof lunr !== 'undefined' && lunr.pt) {
      cb();
      return;
    }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (typeof lunr !== 'undefined' && lunr.pt) {
        clearInterval(iv);
        cb();
      } else if (tries > 100) {
        clearInterval(iv);
        setStatus('<em>Falha ao carregar a biblioteca de busca.</em>');
      }
    }, 50);
  }

  input.disabled = true;

  waitForLunr(function () {
    fetch(SEARCH_INDEX_URL, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(init)
      .catch(function (err) {
        setStatus('<em>Erro ao carregar índice: ' + escapeHTML(err.message) + '</em>');
      });
  });

  input.addEventListener('input', onInput);
  filterEls.forEach(function (cb) {
    cb.addEventListener('change', function () { render(input.value); });
  });
})();
