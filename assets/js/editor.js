/**
 * Editor — núcleo
 * ===============
 * Editor markdown com preview Tufte ao vivo, modo WYSIWYG opcional,
 * toolbar, slash menu, atalhos de teclado e auto-save em localStorage.
 */
(function () {
  'use strict';

  // ===========================================================================
  // 1. Estado
  // ===========================================================================

  const state = {
    draftId: null,         // id do rascunho atual no localStorage
    doc: 'post',          // 'post' | 'nota' | 'media' | 'artigo'
    mode: 'split',         // 'markdown' | 'split' | 'tufte'
    source: '',
    meta: {
      title: '',
      subtitle: '',
      date: new Date(),
      category: '',
      image: '',
      media: {
        type: 'livro',
        id: '',
        titulo: '',
        creator: '',
        ano: '',
        generos: '',
        publisher: '',
        album: '',
        capa: '',
        nota: '',
      },
      artigo: { capitulo: '', serie: '', numero: '', formato: 'colunas', capitular: true, continua: false },
    },
    savedAt: null,
    published: null,    // { at, path, commit } depois de publicar no GitHub
  };

  // ===========================================================================
  // 2. Helpers
  // ===========================================================================

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const htmlEl = document.documentElement;
  const source = $('#ed-source');
  const previewContent = $('#ed-preview-content');

  const pad2 = (n) => String(n).padStart(2, '0');
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const capitalize = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

  function toast(msg, ms) {
    let el = $('.ed-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ed-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('visible'), ms || 1800);
  }

  // ===========================================================================
  // 3. Marked setup + Tufte preprocessing
  // ===========================================================================

  marked.setOptions({ gfm: true, breaks: false, headerIds: false });

  function parseLiquidArgs(str) {
    const args = {};
    str.replace(/(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/g, (m, k, v) => {
      args[k] = v.replace(/\\"/g, '"');
      return '';
    });
    return args;
  }

  /**
   * Converte includes Liquid e footnotes kramdown em HTML inline antes do marked.
   */
  // LaTeX ($…$ e $$…$$) protegido do marked: caracteres que o markdown
  // interpretaria (\ _ * ` [ ~ <) viram entidades; o TeX original fica em
  // data-tex para a volta HTML→markdown (modo Tufte/Papel) e o MathJax lê o
  // texto já decodificado pelo navegador.
  function protectTex(tex) {
    return String(tex)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\\/g, '&#92;').replace(/_/g, '&#95;').replace(/\*/g, '&#42;')
      .replace(/`/g, '&#96;').replace(/\[/g, '&#91;').replace(/~/g, '&#126;')
      .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
  }
  function protectMath(md) {
    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
      `\n\n<div class="art-math art-math-display" data-tex="${escapeAttr(tex)}">$$${protectTex(tex)}$$</div>\n\n`);
    md = md.replace(/(^|[^\\$\w])\$([^\n$]+?)\$(?![\w$])/g, (m, pre, tex) =>
      `${pre}<span class="art-math" data-tex="${escapeAttr(tex)}">$${protectTex(tex)}$</span>`);
    return md;
  }

  function preprocessMarkdown(md) {
    if (!md) return '';

    md = protectMath(md);

    md = md.replace(/\{%\s*include\s+sidenote\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const id = a.id || ('sn-' + Math.random().toString(36).slice(2, 7));
      return `<label for="${id}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="${id}" class="margin-toggle"/><span class="sidenote">${escapeHtml(a.text || '')}</span>`;
    });

    md = md.replace(/\{%\s*include\s+marginnote\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const id = a.id || ('mn-' + Math.random().toString(36).slice(2, 7));
      return `<label for="${id}" class="margin-toggle">⊕</label><input type="checkbox" id="${id}" class="margin-toggle"/><span class="marginnote">${escapeHtml(a.text || '')}</span>`;
    });

    md = md.replace(/\{%\s*include\s+newthought\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      return `<span class="newthought">${escapeHtml(a.text || '')}</span>`;
    });

    md = md.replace(/\{%\s*include\s+epigraph\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const footer = (a.author || a.source)
        ? `<footer>${escapeHtml(a.author || '')}${a.author && a.source ? ', ' : ''}${a.source ? `<cite>${escapeHtml(a.source)}</cite>` : ''}</footer>`
        : '';
      return `\n\n<div class="epigraph"><blockquote><p>${escapeHtml(a.quote || '')}</p>${footer}</blockquote></div>\n\n`;
    });

    md = md.replace(/\{%\s*include\s+figure\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const id = a.id || 'fig';
      const caption = a.caption
        ? `<label for="${id}" class="margin-toggle">⊕</label><input type="checkbox" id="${id}" class="margin-toggle"/><span class="marginnote">${escapeHtml(a.caption)}</span>`
        : '';
      return `\n\n<figure>${caption}<img src="${escapeAttr(a.src || '')}" alt="${escapeAttr(a.alt || '')}"/></figure>\n\n`;
    });

    md = md.replace(/\{%\s*include\s+fullwidth\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const cap = a.caption ? `<figcaption>${escapeHtml(a.caption)}</figcaption>` : '';
      return `\n\n<figure class="fullwidth"><img src="${escapeAttr(a.src || '')}" alt="${escapeAttr(a.alt || '')}"/>${cap}</figure>\n\n`;
    });

    // Includes do artigo "vintage" (ver _includes/figura-artigo.html etc.)
    md = md.replace(/\{%\s*include\s+figura-artigo\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      const style = a.largura ? ` style="--art-fig-w: ${escapeAttr(a.largura)}%"` : '';
      const cap = (a.caption || a.num)
        ? `<figcaption>${a.num ? `<span class="art-fig-num">Fig. ${escapeHtml(a.num)}.</span> ` : ''}${escapeHtml(a.caption || '')}</figcaption>`
        : '';
      return `\n\n<figure class="art-fig"${style}><img src="${escapeAttr(a.src || '')}" alt="${escapeAttr(a.alt || '')}"/>${cap}</figure>\n\n`;
    });

    md = md.replace(/\{%\s*include\s+prancha\.html\s+([^%]+)%\}/g, (_, args) => {
      const a = parseLiquidArgs(args);
      let head = '';
      if (a.num || a.title) {
        head = '<header class="art-plate-head">' +
          (a.num ? `<p class="art-plate-num">Prancha ${escapeHtml(a.num)}</p>` : '') +
          (a.title ? `<p class="art-plate-title">${escapeHtml(a.title)}</p>` : '') +
          (a.caption ? `<p class="art-plate-sub">${escapeHtml(a.caption)}</p>` : '') +
          '</header>';
      }
      const cap = (!head && a.caption) ? `<figcaption>${escapeHtml(a.caption)}</figcaption>` : '';
      return `\n\n<figure class="art-plate">${head}<img src="${escapeAttr(a.src || '')}" alt="${escapeAttr(a.alt || '')}"/>${cap}</figure>\n\n`;
    });

    md = md.replace(/\{%\s*include\s+ornamento-artigo\.html\s*%\}/g, '\n\n<div class="art-ornament" aria-hidden="true">❦</div>\n\n');

    // Kramdown footnote syntax → Tufte sidenotes (post/nota) ou rodapé (artigo)
    const fnDefs = {};
    md = md.replace(/^\[\^([^\]]+)\]:[ \t]+(.*(?:\n[ \t]+.*)*)/gm, (_, name, body) => {
      fnDefs[name] = body.replace(/\n[ \t]+/g, '\n').trim();
      return '';
    });
    let snCounter = 0;
    const footList = [];
    md = md.replace(/\[\^([^\]]+)\]/g, (_, name) => {
      snCounter++;
      const id = `sn-fn-${snCounter}`;
      const def = fnDefs[name];
      let content;
      if (def) {
        try { content = marked.parseInline(def); } catch (e) { content = escapeHtml(def); }
      } else {
        content = `<em>nota '${escapeHtml(name)}' não definida</em>`;
      }
      if (state.doc === 'artigo') {
        footList.push(`<li id="fn:${snCounter}">${content}</li>`);
        return `<sup class="art-fnref" id="fnref:${snCounter}"><a href="#fn:${snCounter}">${snCounter}</a></sup>`;
      }
      return `<label for="${id}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="${id}" class="margin-toggle"/><span class="sidenote">${content}</span>`;
    });
    if (footList.length) {
      md = md.trimEnd() + `\n\n<div class="footnotes" role="doc-endnotes"><ol>${footList.join('')}</ol></div>\n`;
    }

    return md;
  }

  // ===========================================================================
  // 4. Render preview
  // ===========================================================================

  function render() {
    const md = state.source;
    const processed = preprocessMarkdown(md);
    let renderedHtml = '';
    try { renderedHtml = marked.parse(processed); }
    catch (e) { renderedHtml = `<p style="color:var(--color-accent)">Erro ao renderizar: ${escapeHtml(e.message)}</p>`; }

    const isArt = state.doc === 'artigo';
    const article = $('#ed-preview-article');
    article.className = 'ed-preview-article' + (isArt
      ? ` artigo-paper formato-${state.meta.artigo.formato || 'colunas'}${state.meta.artigo.capitular ? ' has-capitular' : ''}`
      : '');
    previewContent.className = isArt
      ? 'ed-preview-content artigo-body'
      : 'ed-preview-content post-content nota-single-content';

    if (state.mode !== 'tufte') {
      previewContent.innerHTML = renderedHtml;
      resolvePreviewImages(previewContent);
      if (isArt) scheduleTypeset();
    }
    updatePreviewMeta();
    updateMediaPreview();
    updateStatusBar();
    updateFilenameDisplay();
  }

  // MathJax no preview do artigo (adiado: não recompor a cada tecla)
  let typesetTimer = null;
  function scheduleTypeset() {
    clearTimeout(typesetTimer);
    typesetTimer = setTimeout(() => {
      if (state.doc !== 'artigo' || state.mode === 'tufte') return;
      const MJ = window.MathJax;
      if (!MJ || !MJ.typesetPromise) return;
      try {
        if (MJ.typesetClear) MJ.typesetClear([previewContent]);
        MJ.typesetPromise([previewContent]).catch(() => {});
      } catch (e) { /* MathJax ainda carregando */ }
    }, 350);
  }

  function updateArtigoPreviewHead() {
    const isArt = state.doc === 'artigo';
    const m = state.meta;
    const a = m.artigo;
    const running = $('#ed-preview-art-running');
    const head = $('#ed-preview-art-head');
    const cont = $('#ed-preview-art-continua');
    if (!isArt) { running.hidden = true; head.hidden = true; cont.hidden = true; return; }
    head.hidden = false;
    $('#ed-preview-art-kicker').textContent = a.capitulo || '';
    $('#ed-preview-art-title').textContent = m.title || 'Sem título';
    $('#ed-preview-art-subtitle').textContent = m.subtitle || '';
    const hasRunning = !!(a.serie || a.numero);
    running.hidden = !hasRunning;
    if (hasRunning) {
      $('#ed-preview-art-serie').textContent = a.serie || '';
      const d = m.date instanceof Date && !isNaN(m.date) ? m.date : new Date();
      const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      $('#ed-preview-art-numero').textContent =
        (a.numero ? `N.º ${a.numero} · ` : '') + `${months[d.getMonth()]} de ${d.getFullYear()}`;
    }
    cont.hidden = !a.continua;
  }

  function updatePreviewMeta() {
    updateArtigoPreviewHead();
    const m = state.meta;
    const hasHero = state.doc === 'post' && !!m.image;
    htmlEl.setAttribute('data-has-hero', hasHero ? 'true' : 'false');

    // Herói: imagem simples abaixo do cabeçalho (como o site novo), sem overlay.
    const hero = $('#ed-preview-hero');
    if (hasHero) {
      hero.hidden = false;
      $('#ed-preview-hero-image').src = resolveImageSrc(m.image);
    } else {
      hero.hidden = true;
    }

    // Cabeçalho editorial: kicker · título italic · subtítulo · meta (data · leitura).
    const header = $('#ed-preview-header');
    header.hidden = state.doc === 'artigo';
    if (state.doc === 'post') {
      $('#ed-preview-eyebrow').textContent = m.category ? (m.category + ' · ensaio') : 'ensaio';
      $('#ed-preview-title').textContent = m.title || 'Sem título';
      $('#ed-preview-subtitle').textContent = m.subtitle || '';
      $('#ed-preview-date').textContent =
        formatDate(m.date) + ' · ' + readingTime(state.source) + ' min de leitura';
    } else {
      $('#ed-preview-eyebrow').textContent = '';
      $('#ed-preview-title').textContent = m.title || (state.doc === 'nota' ? '' : 'Sem título');
      $('#ed-preview-subtitle').textContent = m.subtitle || '';
      $('#ed-preview-date').textContent = formatDate(m.date);
    }
  }

  function updateMediaPreview() {
    const aside = $('#ed-preview-media');
    if (state.doc !== 'media') {
      aside.hidden = true;
      return;
    }
    const m = state.meta.media;
    const labels = {
      livro: { creator: 'Autor' },
      filme: { creator: 'Diretor' },
      série: { creator: 'Criador' },
      álbum: { creator: 'Artista' },
      canção: { creator: 'Artista' },
    }[m.type] || { creator: 'Autor' };

    // Manual fields take priority; fetched data (by external ID) fills the gaps.
    const fetched = (m.id && typeof mediaFetchCache[m.type + ':' + m.id] === 'object')
      ? mediaFetchCache[m.type + ':' + m.id] : {};
    const titulo = m.titulo || fetched.title || '';
    const creator = m.creator || fetched.creator || '';
    const ano = m.ano || fetched.year || '';
    const generos = m.generos || fetched.genres || '';
    const publisher = m.publisher || fetched.publisher || '';
    const album = m.album || fetched.album || '';
    const capa = m.capa || fetched.coverUrl || '';

    const fields = [];
    if (creator) fields.push(`<div class="media-review-field"><dt>${labels.creator}</dt><dd>${escapeHtml(creator)}</dd></div>`);
    if (m.type === 'canção' && album) fields.push(`<div class="media-review-field"><dt>Álbum</dt><dd>${escapeHtml(album)}</dd></div>`);
    if (m.type === 'livro' && publisher) fields.push(`<div class="media-review-field"><dt>Editora</dt><dd>${escapeHtml(publisher)}</dd></div>`);
    if (ano) fields.push(`<div class="media-review-field"><dt>Ano</dt><dd>${escapeHtml(ano)}</dd></div>`);
    if (generos) fields.push(`<div class="media-review-field"><dt>Gêneros</dt><dd>${escapeHtml(generos)}</dd></div>`);

    const ratingHtml = m.nota ? `
      <div class="media-review-rating">
        <span class="media-review-rating-value">${escapeHtml(m.nota)}</span>
        <span class="media-review-rating-max">/10</span>
        <div class="media-review-rating-bar">
          <div class="media-review-rating-fill" style="width: ${parseFloat(m.nota || 0) * 10}%"></div>
        </div>
      </div>` : '';

    const cover = capa
      ? `<img src="${escapeAttr(resolveImageSrc(capa))}" alt="Capa" class="media-review-img"/>`
      : `<div class="media-review-img media-review-placeholder"></div>`;

    aside.hidden = false;
    aside.className = 'media-review media-review--marginalia';
    aside.innerHTML = `
      <div class="media-review-cover">${cover}</div>
      <div class="media-review-info">
        <span class="media-review-type">${m.type ? capitalize(m.type) : ''}</span>
        <h3 class="media-review-title">${escapeHtml(titulo)}</h3>
        <dl class="media-review-meta">${fields.join('')}</dl>
        ${ratingHtml}
      </div>`;

    scheduleMediaFetch(m.type, m.id);
  }

  // ---------------------------------------------------------------------------
  // Busca de metadados por ID externo, espelhando o site publicado, para que o
  // preview mostre capa/criador/ano reais enquanto se edita. Resultados ficam
  // em cache (por tipo+id) e a busca é adiada para não disparar a cada tecla.
  // ---------------------------------------------------------------------------
  const mediaFetchCache = {};
  let mediaFetchTimer = null;

  function scheduleMediaFetch(type, id) {
    clearTimeout(mediaFetchTimer);
    if (!id) return;
    const key = type + ':' + id;
    if (mediaFetchCache[key] !== undefined) return;
    mediaFetchTimer = setTimeout(function () { runMediaFetch(type, id); }, 600);
  }

  function runMediaFetch(type, id) {
    const key = type + ':' + id;
    if (mediaFetchCache[key] !== undefined) return;
    mediaFetchCache[key] = 'pending';

    let promise;
    if (type === 'filme' || type === 'série') promise = fetchTmdbData(type, id);
    else if (type === 'álbum' || type === 'canção') promise = fetchMusicBrainzData(type, id);
    else if (type === 'livro') promise = fetchOpenLibraryData(id);
    else { mediaFetchCache[key] = {}; return; }

    promise
      .then(function (data) {
        mediaFetchCache[key] = data || {};
      })
      .catch(function () {
        mediaFetchCache[key] = {};
      })
      .then(function () {
        const cur = state.meta.media;
        if (state.doc === 'media' && cur.type === type && cur.id === id) updateMediaPreview();
      });
  }

  function tmdbRequest(kind, id, key) {
    const url = 'https://api.themoviedb.org/3/' + kind + '/' + id +
      '?api_key=' + key + '&language=pt-BR&append_to_response=credits';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('TMDB ' + r.status);
      return r.json();
    });
  }

  function fetchTmdbData(type, id) {
    const key = window.TMDB_API_KEY;
    if (!key) return Promise.reject(new Error('sem chave TMDB'));
    const primary = type === 'série' ? 'tv' : 'movie';
    const secondary = primary === 'tv' ? 'movie' : 'tv';
    return tmdbRequest(primary, id, key)
      .catch(function () { return tmdbRequest(secondary, id, key); })
      .then(function (data) {
        const out = {};
        out.title = data.title || data.name || data.original_title || data.original_name || '';
        if (data.poster_path) out.coverUrl = 'https://image.tmdb.org/t/p/w300' + data.poster_path;
        if (data.created_by && data.created_by.length) {
          out.creator = data.created_by.map(function (p) { return p.name; }).join(', ');
        } else if (data.credits && data.credits.crew) {
          const dirs = data.credits.crew.filter(function (c) { return c.job === 'Director'; });
          if (dirs.length) out.creator = dirs.map(function (d) { return d.name; }).join(', ');
        }
        const date = data.release_date || data.first_air_date;
        if (date) out.year = date.substring(0, 4);
        if (data.genres && data.genres.length) out.genres = data.genres.map(function (g) { return g.name; }).join(', ');
        return out;
      });
  }

  function fetchOpenLibraryData(id) {
    const isWork = /W$/.test(id);
    const url = 'https://openlibrary.org/' + (isWork ? 'works/' : 'books/') + id + '.json';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('OL ' + r.status);
      return r.json();
    }).then(function (data) {
      const out = {};
      if (data.title) out.title = data.title;
      const dateStr = data.first_publish_date || data.publish_date || '';
      const ym = dateStr.match(/\d{4}/);
      if (ym) out.year = ym[0];
      if (data.publishers && data.publishers.length) out.publisher = data.publishers[0];
      if (data.subjects && data.subjects.length) {
        out.genres = data.subjects.slice(0, 3).map(function (s) {
          return typeof s === 'string' ? s : s.name;
        }).join(', ');
      }
      if (data.covers && data.covers.length && data.covers[0] > 0) {
        out.coverUrl = 'https://covers.openlibrary.org/b/id/' + data.covers[0] + '-M.jpg';
      }

      const tasks = [];
      if (data.authors) {
        const keys = data.authors.map(function (a) { return a.author ? a.author.key : a.key; }).filter(Boolean);
        if (keys.length) {
          tasks.push(Promise.all(keys.map(function (k) {
            return fetch('https://openlibrary.org' + k + '.json').then(function (r) { return r.ok ? r.json() : null; });
          })).then(function (authors) {
            const names = authors.filter(Boolean).map(function (a) { return a.name; });
            if (names.length) out.creator = names.join(', ');
          }).catch(function () {}));
        }
      }
      if (!out.coverUrl && isWork) {
        tasks.push(fetch('https://openlibrary.org/works/' + id + '/editions.json?limit=50')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (eds) {
            if (eds && eds.entries) {
              const ed = eds.entries.find(function (e) { return e.covers && e.covers[0] > 0; });
              if (ed) out.coverUrl = 'https://covers.openlibrary.org/b/id/' + ed.covers[0] + '-M.jpg';
            }
          }).catch(function () {}));
      }
      return Promise.all(tasks).then(function () { return out; });
    });
  }

  function fetchMusicBrainzData(type, id) {
    const entity = type === 'álbum' ? 'release-group' : 'recording';
    const inc = 'artist-credits+genres' + (type === 'canção' ? '+releases' : '');
    const url = 'https://musicbrainz.org/ws/2/' + entity + '/' + id + '?inc=' + inc + '&fmt=json';
    return fetch(url).then(function (r) {
      if (!r.ok) {
        if (type === 'álbum' && r.status === 404) {
          return fetch('https://musicbrainz.org/ws/2/release/' + id + '?inc=artist-credits+genres+release-groups&fmt=json')
            .then(function (r2) { if (!r2.ok) throw new Error('MB ' + r2.status); return r2.json().then(function (d) { d._isRelease = true; return d; }); });
        }
        if (type === 'canção' && r.status === 404) {
          return fetch('https://musicbrainz.org/ws/2/release/' + id + '?inc=artist-credits+genres+recordings+release-groups&fmt=json')
            .then(function (r2) { if (!r2.ok) throw new Error('MB ' + r2.status); return r2.json().then(function (d) { d._isRelease = true; if (!d.releases) d.releases = [{ id: id, title: d.title }]; return d; }); });
        }
        throw new Error('MB ' + r.status);
      }
      return r.json();
    }).then(function (data) {
      const out = {};
      if (data.title) out.title = data.title;
      if (data['artist-credit']) {
        out.creator = data['artist-credit'].map(function (a) { return a.name || (a.artist && a.artist.name); }).join(', ');
      }
      const date = data['first-release-date'] || data.date || '';
      if (date) out.year = date.substring(0, 4);
      let genres = (data.genres && data.genres.length) ? data.genres : null;
      if (!genres && data._isRelease && data['release-group'] && data['release-group'].genres) genres = data['release-group'].genres;
      if (genres && genres.length) out.genres = genres.map(function (g) { return g.name; }).join(', ');
      if (type === 'canção' && data.releases && data.releases.length) out.album = data.releases[0].title;

      const releaseGroupId = (data._isRelease && data['release-group']) ? data['release-group'].id : null;
      let coverId = releaseGroupId || id;
      let coverEntity = releaseGroupId ? 'release-group' : (data._isRelease ? 'release' : 'release-group');
      if (type === 'canção' && data.releases && data.releases.length) { coverId = data.releases[0].id; coverEntity = 'release'; }
      if (type === 'canção' && data._isRelease && data['release-group']) { coverId = data['release-group'].id; coverEntity = 'release-group'; }

      return fetchCoverArtUrl(coverId, coverEntity).then(function (coverUrl) {
        if (coverUrl) out.coverUrl = coverUrl;
        return out;
      });
    });
  }

  function fetchCoverArtUrl(id, entity) {
    return fetch('https://coverartarchive.org/' + entity + '/' + id)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.images && data.images.length) {
          const front = data.images.find(function (img) { return img.front; });
          return front
            ? (front.thumbnails.small || front.thumbnails['250'] || front.image)
            : (data.images[0].thumbnails.small || data.images[0].image);
        }
        return null;
      }).catch(function () { return null; });
  }

  function updateStatusBar() {
    const md = state.source || '';
    const text = md.replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    $('#ed-status-words').textContent = words + ' palavras';
    $('#ed-status-reading').textContent = readingTime(md) + ' min';
    const n = Object.keys(images).length;
    const imgEl = $('#ed-status-images');
    if (imgEl) {
      imgEl.hidden = !n;
      imgEl.textContent = n ? plural(n, 'imagem', 'imagens') : '';
    }
  }

  function readingTime(md) {
    const text = (md || '').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    return Math.max(1, Math.round(words / 200));
  }

  function formatDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function updateFilenameDisplay() {
    $('#ed-status-filename').textContent = generateFilename();
  }

  // ===========================================================================
  // 5. Frontmatter + filename
  // ===========================================================================

  function dateForFilename(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

  function dateTimeISO(d) {
    const tz = -d.getTimezoneOffset();
    const sign = tz >= 0 ? '+' : '-';
    return `${dateForFilename(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${sign}${pad2(Math.floor(Math.abs(tz)/60))}${pad2(Math.abs(tz)%60)}`;
  }

  function slugify(str) {
    return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function generateFilename() {
    const m = state.meta;
    const d = m.date instanceof Date && !isNaN(m.date) ? m.date : new Date();
    if (state.doc === 'post') {
      const slug = m.title || 'sem-titulo';
      return `${dateForFilename(d)}-${slug}.md`;
    }
    if (state.doc === 'artigo') {
      return `${dateForFilename(d)}-${slugify(m.title) || 'artigo'}.md`;
    }
    const t = (m.title || 'Nota').replace(/\s+/g, '');
    return `${dateForFilename(d)}-${t}.md`;
  }

  function yamlString(s) {
    if (s == null || s === '') return '';
    if (/[:#&*!|>%@`{}\[\],]|^["'-]|^\s|\s$/.test(String(s))) {
      return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return String(s);
  }

  function generateFrontmatter() {
    const m = state.meta;
    const d = m.date instanceof Date && !isNaN(m.date) ? m.date : new Date();
    const lines = ['---'];

    if (state.doc === 'post') {
      lines.push('layout: post');
      if (m.title) lines.push(`title: ${yamlString(m.title)}`);
      if (m.subtitle) lines.push(`subtitle: ${yamlString(m.subtitle)}`);
      lines.push(`date: ${dateForFilename(d)}`);
      if (m.category) lines.push(`category: ${yamlString(m.category)}`);
      if (m.image) lines.push(`image: ${m.image}`);
    } else if (state.doc === 'artigo') {
      const a = m.artigo;
      if (m.title) lines.push(`title: ${yamlString(m.title)}`);
      if (m.subtitle) lines.push(`subtitle: ${yamlString(m.subtitle)}`);
      lines.push(`date: ${dateForFilename(d)}`);
      if (a.capitulo) lines.push(`capitulo: ${yamlString(a.capitulo)}`);
      if (a.serie) lines.push(`serie: ${yamlString(a.serie)}`);
      if (a.numero) lines.push(`numero: ${yamlString(a.numero)}`);
      lines.push(`formato: ${a.formato || 'colunas'}`);
      lines.push(`capitular: ${a.capitular ? 'true' : 'false'}`);
      if (a.continua) lines.push('continua: true');
    } else {
      if (m.title) lines.push(`title: ${yamlString(m.title)}`);
      lines.push(`date: ${dateTimeISO(d)}`);
      if (state.doc === 'media') {
        const md = m.media;
        lines.push('media:');
        if (md.type) lines.push(`  type: ${md.type}`);
        if (md.id) {
          if (md.type === 'filme' || md.type === 'série') lines.push(`  tmdb_id: ${md.id}`);
          else if (md.type === 'álbum' || md.type === 'canção') lines.push(`  musicbrainz_id: "${md.id}"`);
          else if (md.type === 'livro') lines.push(`  openlibrary_id: "${md.id}"`);
        }
        if (md.titulo) lines.push(`  titulo: ${yamlString(md.titulo)}`);
        if (md.type === 'livro' && md.creator) lines.push(`  autor: ${yamlString(md.creator)}`);
        else if (md.type === 'filme' && md.creator) lines.push(`  diretor: ${yamlString(md.creator)}`);
        else if (md.type === 'série' && md.creator) lines.push(`  criador: ${yamlString(md.creator)}`);
        else if ((md.type === 'álbum' || md.type === 'canção') && md.creator) lines.push(`  artista: ${yamlString(md.creator)}`);
        if (md.type === 'canção' && md.album) lines.push(`  album: ${yamlString(md.album)}`);
        if (md.type === 'livro' && md.publisher) lines.push(`  editora: ${yamlString(md.publisher)}`);
        if (md.ano) lines.push(`  ano: ${md.ano}`);
        if (md.generos) lines.push(`  generos: ${yamlString(md.generos)}`);
        if (md.capa) lines.push(`  capa: ${md.capa}`);
        if (md.nota) lines.push(`  nota: ${md.nota}`);
      }
    }
    lines.push('---', '');
    return lines.join('\n');
  }

  function generateFullDocument() {
    return generateFrontmatter() + (state.source || '');
  }

  // ===========================================================================
  // 6. Comandos do toolbar (insertion no textarea)
  // ===========================================================================

  function insertText(before, after, placeholder) {
    if (state.mode === 'tufte') {
      document.execCommand('insertHTML', false, before + (placeholder || '') + (after || ''));
      return;
    }
    after = after || '';
    placeholder = placeholder || '';
    const t = source;
    const start = t.selectionStart;
    const end = t.selectionEnd;
    const sel = t.value.slice(start, end) || placeholder;
    t.value = t.value.slice(0, start) + before + sel + after + t.value.slice(end);
    t.selectionStart = start + before.length;
    t.selectionEnd = start + before.length + sel.length;
    t.focus();
    state.source = t.value;
    render();
    autosave();
  }

  function insertBlock(text, placeholder) {
    const t = source;
    const start = t.selectionStart;
    const end = t.selectionEnd;
    const sel = t.value.slice(start, end) || (placeholder || '');
    let value = text.replace('$1', sel);
    const before = t.value.slice(0, start);
    const after = t.value.slice(end);
    const needsLineBefore = before.length > 0 && !before.endsWith('\n\n') && !before.endsWith('\n');
    const needsLineAfter = after.length > 0 && !after.startsWith('\n');
    const padded = (needsLineBefore ? '\n\n' : (before.endsWith('\n') && !before.endsWith('\n\n') ? '\n' : '')) + value + (needsLineAfter ? '\n\n' : '\n');
    t.value = before + padded + after;
    const cursorPos = before.length + (padded.length - value.length - (needsLineAfter ? 2 : 1)) + value.length;
    t.selectionStart = t.selectionEnd = cursorPos;
    t.focus();
    state.source = t.value;
    render();
    autosave();
  }

  function lineWrap(prefix, placeholder) {
    const t = source;
    const start = t.selectionStart;
    const end = t.selectionEnd;
    const before = t.value.slice(0, start);
    const sel = t.value.slice(start, end) || placeholder || '';
    const after = t.value.slice(end);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineBefore = before.slice(0, lineStart);
    const lineCurrent = before.slice(lineStart);
    const newLine = prefix + lineCurrent + sel;
    t.value = lineBefore + newLine + after;
    t.selectionStart = lineBefore.length + prefix.length + lineCurrent.length;
    t.selectionEnd = t.selectionStart + sel.length;
    t.focus();
    state.source = t.value;
    render();
    autosave();
  }

  function nextSidenoteId() {
    const matches = (state.source || '').match(/\[\^(\d+)\]/g) || [];
    let max = 0;
    matches.forEach(m => { const n = parseInt(m.match(/\d+/)[0], 10); if (n > max) max = n; });
    return max + 1;
  }
  function nextMargInId() {
    const matches = (state.source || '').match(/id="mn-(\d+)"/g) || [];
    let max = 0;
    matches.forEach(m => { const n = parseInt(m.match(/\d+/)[0], 10); if (n > max) max = n; });
    return max + 1;
  }

  function nextFigNum() {
    const src = state.source || '';
    let max = 0;
    (src.match(/\bnum="(\d+)"/g) || []).forEach(m => { const n = parseInt(m.match(/\d+/)[0], 10); if (n > max) max = n; });
    (src.match(/Fig\.\s*(\d+)\./g) || []).forEach(m => { const n = parseInt(m.match(/\d+/)[0], 10); if (n > max) max = n; });
    return max + 1;
  }

  const SVG_FIG_TEMPLATE = (n, caption) => `<figure class="art-fig">
<svg viewBox="0 0 300 160" role="img" aria-label="${escapeAttr(caption || 'Figura')}">
  <rect x="20" y="130" width="260" height="9" fill="url(#art-solo)"/>
  <line x1="20" y1="130" x2="280" y2="130" class="art-tinta" stroke-width="1.2"/>
  <use href="#art-bola" x="122" y="74" width="56" height="56"/>
  <line x1="150" y1="102" x2="150" y2="150" class="art-tinta" stroke-width="1.1" marker-end="url(#art-seta)"/>
  <text x="156" y="152" class="art-rotulo">mg</text>
</svg>
<figcaption><span class="art-fig-num">Fig. ${n}.</span> ${escapeHtml(caption || 'Legenda da figura.')}</figcaption>
</figure>`;

  const cmds = {
    bold:    () => insertText('**', '**', 'texto'),
    italic:  () => insertText('*', '*', 'texto'),
    strike:  () => insertText('~~', '~~', 'texto'),
    code:    () => insertText('`', '`', 'código'),
    h1:      () => lineWrap('# ', 'Título'),
    h2:      () => lineWrap('## ', 'Subtítulo'),
    h3:      () => lineWrap('### ', 'Seção'),
    link:    () => {
      const url = prompt('URL do link:');
      if (url === null || url === '') return;
      insertText('[', `](${url})`, 'texto');
    },
    image:   () => pickImages(true).then(insertImageFiles),
    imageurl: () => {
      const url = prompt('URL da imagem:');
      if (url === null || url === '') return;
      const alt = prompt('Texto alternativo:') || '';
      insertBlock(`![${alt}](${url})`);
    },
    ul:      () => lineWrap('- ', 'item'),
    ol:      () => lineWrap('1. ', 'item'),
    quote:   () => lineWrap('> ', 'citação'),
    codeblock: () => insertBlock('```\n$1\n```', 'código'),
    hr:      () => insertBlock('---'),

    newthought: () => insertText('<span class="newthought">', '</span>', 'As primeiras palavras'),

    sidenote: () => {
      const text = prompt('Texto da sidenote (vai pra margem, com número):');
      if (!text) return;
      const n = nextSidenoteId();
      const t = source;
      const start = t.selectionStart;
      const before = t.value.slice(0, start);
      const after = t.value.slice(start);
      const ref = `[^${n}]`;
      const def = `\n\n[^${n}]: ${text}\n`;
      const trailing = after.endsWith('\n') ? after : after;
      t.value = before + ref + after + (after.length === 0 || /\n\s*$/.test(after) ? '' : '\n') + def;
      t.selectionStart = t.selectionEnd = start + ref.length;
      t.focus();
      state.source = t.value;
      render();
      autosave();
    },

    marginnote: () => {
      const text = prompt('Texto da marginnote (livre, sem número):');
      if (!text) return;
      const n = nextMargInId();
      insertText(`{% include marginnote.html id="mn-${n}" text="${text.replace(/"/g, '\\"')}" %}`);
    },

    epigraph: () => {
      const quote = prompt('Texto da epígrafe:');
      if (!quote) return;
      const author = prompt('Autor (opcional):') || '';
      const sourceText = prompt('Fonte/obra (opcional):') || '';
      const args = [`quote="${quote.replace(/"/g, '\\"')}"`];
      if (author) args.push(`author="${author.replace(/"/g, '\\"')}"`);
      if (sourceText) args.push(`source="${sourceText.replace(/"/g, '\\"')}"`);
      insertBlock(`{% include epigraph.html ${args.join(' ')} %}`);
    },

    figure: async () => {
      const src = await askImageSrc('URL da imagem:');
      if (!src) return;
      const alt = prompt('Texto alternativo:') || '';
      const caption = prompt('Legenda (opcional, vai pra margem):') || '';
      const id = 'fig-' + Math.random().toString(36).slice(2, 7);
      const args = [`src="${src.replace(/"/g, '\\"')}"`, `alt="${alt.replace(/"/g, '\\"')}"`];
      if (caption) {
        args.push(`caption="${caption.replace(/"/g, '\\"')}"`);
        args.push(`id="${id}"`);
      }
      insertBlock(`{% include figure.html ${args.join(' ')} %}`);
    },

    // ---- Artigo (papel vintage) ----
    secao:   () => lineWrap('## ', 'Da alavanca'),
    incipit: () => insertText('<span class="newthought">', '</span>', 'As primeiras palavras'),

    figura: async () => {
      const src = await askImageSrc('URL/caminho da imagem (SVG ou traço, fundo transparente):');
      if (!src) return;
      const alt = prompt('Texto alternativo:') || '';
      const caption = prompt('Legenda (itálico, opcional):') || '';
      const n = nextFigNum();
      const args = [`src="${src.replace(/"/g, '\\"')}"`, `alt="${alt.replace(/"/g, '\\"')}"`, `num="${n}"`];
      if (caption) args.push(`caption="${caption.replace(/"/g, '\\"')}"`);
      insertBlock(`{% include figura-artigo.html ${args.join(' ')} %}`);
    },

    figsvg: () => {
      const caption = prompt('Legenda da figura (o SVG de partida é uma esfera sobre o solo; edite as coordenadas):') || '';
      insertBlock(SVG_FIG_TEMPLATE(nextFigNum(), caption));
    },

    prancha: async () => {
      const src = await askImageSrc('URL/caminho da imagem da prancha:');
      if (!src) return;
      const alt = prompt('Texto alternativo:') || '';
      const num = prompt('Número da prancha (romano, ex.: II):') || '';
      const title = prompt('Título da prancha (opcional):') || '';
      const caption = prompt('Subtítulo/legenda em itálico (opcional):') || '';
      const args = [`src="${src.replace(/"/g, '\\"')}"`, `alt="${alt.replace(/"/g, '\\"')}"`];
      if (num) args.push(`num="${num.replace(/"/g, '\\"')}"`);
      if (title) args.push(`title="${title.replace(/"/g, '\\"')}"`);
      if (caption) args.push(`caption="${caption.replace(/"/g, '\\"')}"`);
      insertBlock(`{% include prancha.html ${args.join(' ')} %}`);
    },

    rodape: () => cmds.sidenote(),
    equacao: () => insertBlock('$$ $1 $$', 'W_1\\, a = W_2\\, b'),
    tabela: () => insertBlock('| Peso | 1 | 2 | 3 |\n|:-----|--:|--:|--:|\n| 1 | 1 | 2 | 3 |\n| 2 | 2 | 4 | 6 |'),
    ornamento: () => insertBlock('{% include ornamento-artigo.html %}'),

    fullwidth: async () => {
      const src = await askImageSrc('URL da imagem (full-width):');
      if (!src) return;
      const alt = prompt('Texto alternativo:') || '';
      const caption = prompt('Legenda (opcional):') || '';
      const args = [`src="${src.replace(/"/g, '\\"')}"`, `alt="${alt.replace(/"/g, '\\"')}"`];
      if (caption) args.push(`caption="${caption.replace(/"/g, '\\"')}"`);
      insertBlock(`{% include fullwidth.html ${args.join(' ')} %}`);
    },
  };

  // ===========================================================================
  // 6b. Imagens: colar / arrastar / escolher arquivo → assets/images/AAAA/
  // ===========================================================================
  //
  // Cada imagem anexada é redimensionada (lado maior ≤ IMAGE_MAX_DIM),
  // recomprimida (JPEG, ou PNG se tiver transparência), batizada como
  // assets/images/AAAA/AAAA-MM-DD-<slug-do-título>[-n].<ext> e guardada no
  // IndexedDB junto do rascunho. No markdown entra só o caminho final
  // (/assets/images/...); o preview troca o caminho por um object URL.
  // Na hora de exportar, o .zip (ou o commit no GitHub) leva o .md e as
  // imagens já nos lugares certos do repositório.

  const IMAGE_MAX_DIM = 1600;
  const IMAGE_JPEG_QUALITY = 0.85;
  const IMAGE_ROOT = 'assets/images';
  const images = {};     // path (assets/images/...) → { blob, ext, width, height, size, name }
  const imageUrls = {};  // path → object URL usado no preview
  let imageInput = null;

  function docFolder() {
    return state.doc === 'post' ? '_posts' : state.doc === 'artigo' ? '_artigos' : '_notas';
  }

  function metaDate() {
    const d = state.meta.date;
    return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
  }

  function imageBaseSlug() {
    const m = state.meta;
    return slugify(m.title) || (state.doc === 'media' ? slugify(m.media.titulo) : '') || 'imagem';
  }

  function suffixedPath(path, n) {
    const dot = path.lastIndexOf('.');
    return `${path.slice(0, dot)}-${n}${path.slice(dot)}`;
  }

  function stripExt(p) { return p.replace(/\.[^.]+$/, ''); }

  // Nome já usado por outra imagem anexada (ignorando a extensão, para não
  // conviverem foto.jpg e foto.png).
  function imageBaseTaken(base, except) {
    return Object.keys(images).some(p => p !== except && stripExt(p) === base);
  }

  function uniqueImagePath(ext) {
    const d = metaDate();
    const base = `${IMAGE_ROOT}/${d.getFullYear()}/${dateForFilename(d)}-${imageBaseSlug()}`;
    let cand = base;
    let n = 2;
    while (imageBaseTaken(cand)) cand = `${base}-${n++}`;
    return `${cand}.${ext}`;
  }

  function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

  function localImagePath(src) {
    const m = String(src || '').match(/assets\/images\/[^\s"')]+/);
    return m && images[m[0]] ? m[0] : null;
  }

  function resolveImageSrc(src) {
    const p = localImagePath(src);
    return p && imageUrls[p] ? imageUrls[p] : src;
  }

  // Troca, no preview, os caminhos locais pelos object URLs das imagens anexadas.
  function resolvePreviewImages(root) {
    $$('img', root).forEach(img => {
      const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
      const p = localImagePath(src);
      if (!p || !imageUrls[p]) return;
      img.setAttribute('data-src', src);
      img.src = imageUrls[p];
    });
  }

  function usedImagePaths() {
    const text = [state.source, state.meta.image, state.meta.media && state.meta.media.capa].join('\n');
    return Object.keys(images).filter(p => text.includes(p));
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(() => createImageBitmap(file))
        .catch(() => loadBitmapViaImg(file));
    }
    return loadBitmapViaImg(file);
  }

  function loadBitmapViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('não decodificou')); };
      img.src = url;
    });
  }

  function hasTransparency(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = 4 * 7; // amostra 1 em cada 7 pixels
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 250) return true;
    }
    return false;
  }

  async function processImage(file) {
    const type = file.type || '';
    const origExt = (file.name.split('.').pop() || '').toLowerCase();
    if (type === 'image/svg+xml' || origExt === 'svg') return { blob: file, ext: 'svg' };
    if (type === 'image/gif' || origExt === 'gif') return { blob: file, ext: 'gif' };

    let bmp;
    try { bmp = await loadBitmap(file); }
    catch (e) {
      // HEIC fora do Safari, por exemplo: sobe como está e avisa.
      return { blob: file, ext: origExt || 'jpg', undecoded: true };
    }
    const bw = bmp.naturalWidth || bmp.width;
    const bh = bmp.naturalHeight || bmp.height;
    const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(bw, bh));
    const w = Math.max(1, Math.round(bw * scale));
    const h = Math.max(1, Math.round(bh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();

    const isPng = type === 'image/png' || origExt === 'png';
    const keepPng = isPng && hasTransparency(ctx, w, h);
    const outType = keepPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => canvas.toBlob(res, outType, IMAGE_JPEG_QUALITY));
    if (!blob) return { blob: file, ext: origExt || 'jpg', width: w, height: h };
    // Original já pequeno e do mesmo tipo: não vale a pena recomprimir.
    if (scale === 1 && type === outType && file.size <= blob.size) {
      return { blob: file, ext: keepPng ? 'png' : 'jpg', width: w, height: h };
    }
    return { blob, ext: keepPng ? 'png' : 'jpg', width: w, height: h };
  }

  async function attachImage(file) {
    const out = await processImage(file);
    const path = uniqueImagePath(out.ext);
    images[path] = { blob: out.blob, ext: out.ext, width: out.width, height: out.height, size: out.blob.size, name: file.name };
    imageUrls[path] = URL.createObjectURL(out.blob);
    if (!state.draftId) persist();
    idbPutImage(state.draftId, path, images[path]).catch(() => {});
    if (out.undecoded) toast(`Não consegui converter ${file.name}; vai como está`);
    updateStatusBar();
    return path;
  }

  function isImageFile(f) {
    return f && (/^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|gif|webp|svg|avif)$/i.test(f.name || ''));
  }

  // Insere as imagens no ponto do cursor (markdown) ou na seleção (modo Tufte).
  async function insertImageFiles(fileList) {
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) return;
    toast(files.length === 1 ? 'Processando imagem…' : `Processando ${files.length} imagens…`);
    const paths = [];
    for (const f of files) paths.push(await attachImage(f));
    if (state.mode === 'tufte') {
      const html = paths.map(p => `<p><img src="${imageUrls[p]}" data-src="/${p}" alt=""></p>`).join('');
      previewContent.focus();
      document.execCommand('insertHTML', false, html);
      scheduleTufteSync();
    } else {
      insertBlock(paths.map(p => `![](/${p})`).join('\n\n'));
    }
    const kb = Math.round(paths.reduce((s, p) => s + images[p].size, 0) / 1024);
    toast(`${paths.length === 1 ? 'Imagem anexada' : plural(paths.length, 'imagem anexada', 'imagens anexadas')} (${kb} KB)`);
  }

  function pickImages(multiple) {
    return new Promise(resolve => {
      if (!imageInput) {
        imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*,.heic,.heif';
        imageInput.hidden = true;
        document.body.appendChild(imageInput);
      }
      imageInput.multiple = !!multiple;
      imageInput.value = '';
      imageInput.onchange = () => resolve(Array.from(imageInput.files || []));
      imageInput.click();
    });
  }

  // prompt de URL que, deixado vazio, abre o seletor de arquivo.
  async function askImageSrc(label) {
    const url = prompt(`${label} (deixe vazio para escolher um arquivo do computador)`);
    if (url === null) return null;
    if (url.trim()) return url.trim();
    const files = (await pickImages(false)).filter(isImageFile);
    if (!files.length) return null;
    return '/' + (await attachImage(files[0]));
  }

  async function pickImageForField(sel, setter) {
    const files = (await pickImages(false)).filter(isImageFile);
    if (!files.length) return;
    const path = '/' + (await attachImage(files[0]));
    $(sel).value = path;
    setter(path);
    render();
    autosave();
  }

  // Renomeia uma imagem anexada (colisão com arquivo já existente no site, por ex.)
  async function remapImagePath(from, to) {
    if (from === to || !images[from]) return;
    images[to] = images[from]; delete images[from];
    imageUrls[to] = imageUrls[from]; delete imageUrls[from];
    const swap = (s) => (s || '').split(from).join(to);
    state.source = swap(state.source);
    source.value = state.source;
    state.meta.image = swap(state.meta.image);
    if (state.meta.media) state.meta.media.capa = swap(state.meta.media.capa);
    $('#meta-image').value = state.meta.image || '';
    $('#meta-media-capa').value = state.meta.media.capa || '';
    try {
      await idbDeleteImage(state.draftId, from);
      await idbPutImage(state.draftId, to, images[to]);
    } catch (e) {}
    render();
    autosave();
  }

  function clearImages() {
    Object.keys(imageUrls).forEach(p => { try { URL.revokeObjectURL(imageUrls[p]); } catch (e) {} });
    Object.keys(images).forEach(p => delete images[p]);
    Object.keys(imageUrls).forEach(p => delete imageUrls[p]);
  }

  async function loadImagesForDraft(id) {
    clearImages();
    if (!id) return;
    let rows = [];
    try { rows = await idbListImages(id); } catch (e) { return; }
    rows.forEach(r => {
      images[r.path] = { blob: r.blob, ext: r.ext, width: r.width, height: r.height, size: r.blob.size, name: r.name };
      imageUrls[r.path] = URL.createObjectURL(r.blob);
    });
    if (rows.length) {
      render();
      // No modo Tufte o render não refaz o HTML; troca os caminhos no lugar.
      resolvePreviewImages(previewContent);
      updateStatusBar();
    }
  }

  // ---- IndexedDB: imagens sobrevivem ao reload junto do rascunho ----
  const IDB_NAME = 'editor-images';
  const IDB_STORE = 'images';
  let idbPromise = null;

  function idbOpen() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('sem IndexedDB'));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(IDB_STORE, { keyPath: 'key' });
        store.createIndex('draft', 'draft', { unique: false });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return idbPromise;
  }

  function idbRun(mode, fn) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  function idbPutImage(draft, path, entry) {
    return idbRun('readwrite', s => s.put({
      key: `${draft}|${path}`, draft, path,
      blob: entry.blob, ext: entry.ext, width: entry.width, height: entry.height, name: entry.name,
    }));
  }
  function idbListImages(draft) {
    return idbRun('readonly', s => s.index('draft').getAll(draft)).then(r => r || []);
  }
  function idbDeleteImage(draft, path) {
    return idbRun('readwrite', s => s.delete(`${draft}|${path}`));
  }
  function idbDeleteDraftImages(draft) {
    return idbListImages(draft).then(rows => Promise.all(rows.map(r => idbDeleteImage(draft, r.path)))).catch(() => {});
  }

  // ---- Colar / arrastar ----
  function setupImageDropAndPaste() {
    const onPaste = (e) => {
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const files = items.filter(i => i.kind === 'file' && /^image\//.test(i.type)).map(i => i.getAsFile()).filter(Boolean);
      if (!files.length) return;
      e.preventDefault();
      insertImageFiles(files);
    };
    source.addEventListener('paste', onPaste);
    previewContent.addEventListener('paste', onPaste);

    let dragDepth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    document.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      dragDepth++;
      document.body.classList.add('ed-dragging');
    });
    document.addEventListener('dragleave', (e) => {
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) document.body.classList.remove('ed-dragging');
    });
    document.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('ed-dragging');
      insertImageFiles(e.dataTransfer.files);
    });

    $$('[data-pick-image-for]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.pickImageFor;
        if (target === 'meta-image') pickImageForField('#meta-image', (v) => state.meta.image = v);
        else if (target === 'meta-media-capa') pickImageForField('#meta-media-capa', (v) => state.meta.media.capa = v);
      });
    });
  }

  // ===========================================================================
  // 6c. Publicação: .zip com imagens, ou commit direto no GitHub
  // ===========================================================================

  const GH_REPO = 'danilobortoli/danilobortoli.github.io';
  const GH_BRANCH = 'main';
  const GH_TOKEN_KEY = 'editor:github-token:v1';
  const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('falha ao carregar ' + url));
      document.head.appendChild(s);
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function encodeGhPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function ghToken() {
    try { return localStorage.getItem(GH_TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setGhToken(t) {
    try { t ? localStorage.setItem(GH_TOKEN_KEY, t) : localStorage.removeItem(GH_TOKEN_KEY); } catch (e) {}
  }

  async function gh(method, path, body, token) {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}${path}`, {
      method,
      headers: Object.assign({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      let msg = `GitHub respondeu ${res.status}`;
      try { msg += `: ${(await res.json()).message}`; } catch (e) {}
      throw new Error(msg);
    }
    return res.status === 204 ? {} : res.json();
  }

  function ghExists(path, token) {
    return gh('GET', `/contents/${encodeGhPath(path)}?ref=${GH_BRANCH}`, null, token).then(r => !!r);
  }

  function publishPlan() {
    return { mdPath: `${docFolder()}/${generateFilename()}`, images: usedImagePaths() };
  }

  function defaultCommitMessage() {
    const kind = state.doc === 'post' ? 'post' : state.doc === 'artigo' ? 'artigo' : 'nota';
    const t = state.meta.title || (state.doc === 'media' && state.meta.media.titulo) || '';
    return t ? `Nova ${kind}: ${t}` : `Nova ${kind}`;
  }

  function showPublishModal() {
    const plan = publishPlan();
    const list = $('#ed-publish-files');
    const rows = [`<li><code>${escapeHtml(plan.mdPath)}</code></li>`]
      .concat(plan.images.map(p => `<li><code>${escapeHtml(p)}</code> <small>${Math.round(images[p].size / 1024)} KB</small></li>`));
    list.innerHTML = rows.join('');
    const unused = Object.keys(images).length - plan.images.length;
    $('#ed-publish-unused').textContent = unused
      ? (unused === 1
        ? '1 imagem anexada mas não usada no texto fica de fora.'
        : `${unused} imagens anexadas mas não usadas no texto ficam de fora.`)
      : '';
    $('#ed-publish-message').value = defaultCommitMessage();
    $('#ed-publish-token').value = ghToken();
    $('#ed-publish-status').innerHTML = '';
    $('#ed-publish-go').disabled = false;
    $('#ed-publish').hidden = false;
    (ghToken() ? $('#ed-publish-go') : $('#ed-publish-token')).focus();
  }

  function hidePublishModal() { $('#ed-publish').hidden = true; }

  function publishStatus(html, kind) {
    const el = $('#ed-publish-status');
    el.innerHTML = html;
    el.className = 'ed-publish-status' + (kind ? ` ${kind}` : '');
  }

  async function publishToGitHub() {
    const token = $('#ed-publish-token').value.trim();
    const message = $('#ed-publish-message').value.trim() || defaultCommitMessage();
    if (!token) { publishStatus('Cole um token do GitHub para publicar.', 'error'); $('#ed-publish-token').focus(); return; }
    setGhToken(token);
    const go = $('#ed-publish-go');
    go.disabled = true;
    try {
      publishStatus('Verificando acesso ao repositório…');
      if (!(await gh('GET', '', null, token))) throw new Error('o token não tem acesso a ' + GH_REPO);

      let { mdPath } = publishPlan();
      if (await ghExists(mdPath, token)) {
        if (!confirm(`Já existe ${mdPath} no site. Substituir pelo conteúdo deste rascunho?`)) {
          publishStatus('Cancelado: o arquivo já existia.', 'error');
          go.disabled = false;
          return;
        }
      }

      // Imagens com o mesmo nome já no site ganham sufixo -2, -3…
      for (const p of usedImagePaths()) {
        let cand = p, n = 2;
        while (imageBaseTaken(stripExt(cand), p) || await ghExists(cand, token)) cand = suffixedPath(p, n++);
        if (cand !== p) await remapImagePath(p, cand);
      }
      const plan = publishPlan();
      mdPath = plan.mdPath;

      publishStatus('Enviando arquivos…');
      const ref = await gh('GET', `/git/ref/heads/${GH_BRANCH}`, null, token);
      if (!ref) throw new Error(`branch ${GH_BRANCH} não encontrada`);
      const headSha = ref.object.sha;
      const headCommit = await gh('GET', `/git/commits/${headSha}`, null, token);

      const tree = [];
      for (let i = 0; i < plan.images.length; i++) {
        const p = plan.images[i];
        publishStatus(`Enviando imagem ${i + 1} de ${plan.images.length}…`);
        const b64 = await blobToBase64(images[p].blob);
        const blob = await gh('POST', '/git/blobs', { content: b64, encoding: 'base64' }, token);
        tree.push({ path: p, mode: '100644', type: 'blob', sha: blob.sha });
      }
      tree.push({ path: mdPath, mode: '100644', type: 'blob', content: generateFullDocument() });

      publishStatus('Criando commit…');
      const newTree = await gh('POST', '/git/trees', { base_tree: headCommit.tree.sha, tree }, token);
      const commit = await gh('POST', '/git/commits', { message, tree: newTree.sha, parents: [headSha] }, token);
      await gh('PATCH', `/git/refs/heads/${GH_BRANCH}`, { sha: commit.sha, force: false }, token);

      state.published = { at: new Date().toISOString(), path: mdPath, commit: commit.html_url };
      persist();
      publishStatus(
        `Publicado <code>${escapeHtml(mdPath)}</code>${plan.images.length ? ` com ${plural(plan.images.length, 'imagem', 'imagens')}` : ''}. ` +
        `<a href="${escapeAttr(commit.html_url)}" target="_blank" rel="noopener">Ver commit</a> · ` +
        `o site atualiza em alguns minutos.`,
        'ok'
      );
      toast('Publicado no GitHub');
    } catch (e) {
      publishStatus(`Erro: ${escapeHtml(e.message || String(e))}`, 'error');
      go.disabled = false;
    }
  }

  function setupPublishBindings() {
    $('#ed-action-publish').addEventListener('click', showPublishModal);
    $('#ed-publish-close').addEventListener('click', hidePublishModal);
    $('#ed-publish').addEventListener('click', (e) => { if (e.target.id === 'ed-publish') hidePublishModal(); });
    $('#ed-publish-go').addEventListener('click', publishToGitHub);
    $('#ed-publish-forget').addEventListener('click', () => {
      setGhToken('');
      $('#ed-publish-token').value = '';
      toast('Token esquecido neste navegador');
    });
  }

  // ===========================================================================
  // 7. Tufte WYSIWYG mode (contenteditable + Turndown)
  // ===========================================================================

  let turndown = null;
  const sidenoteCounter = { n: 0, defs: [] };

  function initTurndown() {
    if (turndown || typeof TurndownService === 'undefined') return;
    turndown = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      blankReplacement: function (content, node) {
        return node.isBlock ? '\n\n' : '';
      },
    });

    turndown.addRule('hiddenInputs', {
      filter: (n) => n.tagName === 'INPUT' && n.classList && n.classList.contains('margin-toggle'),
      replacement: () => '',
    });

    turndown.addRule('sidenoteSpan', {
      filter: (n) => n.classList && n.classList.contains('sidenote'),
      replacement: () => '',
    });

    turndown.addRule('sidenoteNumber', {
      filter: (n) => n.classList && n.classList.contains('sidenote-number'),
      replacement: (content, node) => {
        const sn = node.parentElement && node.parentElement.querySelector('.sidenote');
        if (!sn) return '';
        const text = sn.textContent.replace(/\s+/g, ' ').trim();
        sidenoteCounter.n++;
        sidenoteCounter.defs.push(`[^${sidenoteCounter.n}]: ${text}`);
        return `[^${sidenoteCounter.n}]`;
      },
    });

    turndown.addRule('marginToggle', {
      filter: (n) => n.classList && n.classList.contains('margin-toggle') && !n.classList.contains('sidenote-number'),
      replacement: (content, node) => {
        const mn = node.parentElement && node.parentElement.querySelector('.marginnote');
        if (!mn) return '';
        const id = node.getAttribute('for') || ('mn-' + Math.random().toString(36).slice(2, 7));
        const text = mn.textContent.replace(/\s+/g, ' ').trim();
        return `{% include marginnote.html id="${id}" text="${text.replace(/"/g, '\\"')}" %}`;
      },
    });

    turndown.addRule('marginnoteSpan', {
      filter: (n) => n.classList && n.classList.contains('marginnote'),
      replacement: () => '',
    });

    turndown.addRule('newthought', {
      filter: (n) => n.classList && n.classList.contains('newthought'),
      replacement: (content) => `<span class="newthought">${content}</span>`,
    });

    turndown.addRule('epigraph', {
      filter: (n) => n.classList && n.classList.contains('epigraph'),
      replacement: (content, node) => {
        const p = node.querySelector('blockquote p');
        const footer = node.querySelector('blockquote footer');
        const cite = footer && footer.querySelector('cite');
        let author = '';
        if (footer) {
          const cloned = footer.cloneNode(true);
          if (cite) {
            const c = cloned.querySelector('cite');
            if (c) c.remove();
          }
          author = cloned.textContent.replace(/^[—\s,]+|[\s,]+$/g, '').trim();
        }
        const sourceText = cite ? cite.textContent : '';
        const args = [`quote="${(p ? p.textContent : '').replace(/"/g, '\\"')}"`];
        if (author) args.push(`author="${author.replace(/"/g, '\\"')}"`);
        if (sourceText) args.push(`source="${sourceText.replace(/"/g, '\\"')}"`);
        return `\n\n{% include epigraph.html ${args.join(' ')} %}\n\n`;
      },
    });

    // Imagens anexadas: no preview o src é um object URL; o caminho real está em data-src.
    turndown.addRule('localImage', {
      filter: 'img',
      replacement: (content, node) => {
        const src = node.getAttribute('data-src') || node.getAttribute('src') || '';
        const alt = (node.getAttribute('alt') || '').replace(/\]/g, '\\]');
        return src ? `![${alt}](${src})` : '';
      },
    });

    turndown.addRule('fullwidthFigure', {
      filter: (n) => n.tagName === 'FIGURE' && n.classList && n.classList.contains('fullwidth'),
      replacement: (content, node) => {
        const img = node.querySelector('img');
        const cap = node.querySelector('figcaption');
        if (!img) return content;
        const args = [`src="${img.getAttribute('data-src') || img.getAttribute('src') || ''}"`, `alt="${(img.getAttribute('alt') || '').replace(/"/g, '\\"')}"`];
        if (cap && cap.textContent.trim()) args.push(`caption="${cap.textContent.replace(/"/g, '\\"').trim()}"`);
        return `\n\n{% include fullwidth.html ${args.join(' ')} %}\n\n`;
      },
    });

    turndown.addRule('marginalFigure', {
      filter: (n) => n.tagName === 'FIGURE' && (!n.classList || !n.classList.contains('fullwidth')),
      replacement: (content, node) => {
        const img = node.querySelector('img');
        const cap = node.querySelector('.marginnote, figcaption');
        if (!img) return content;
        const args = [`src="${img.getAttribute('data-src') || img.getAttribute('src') || ''}"`, `alt="${(img.getAttribute('alt') || '').replace(/"/g, '\\"')}"`];
        if (cap && cap.textContent.trim()) {
          args.push(`caption="${cap.textContent.replace(/"/g, '\\"').trim()}"`);
          args.push(`id="fig-${Math.random().toString(36).slice(2, 7)}"`);
        }
        return `\n\n{% include figure.html ${args.join(' ')} %}\n\n`;
      },
    });
  }

  function initTurndownArtigo() {
    if (!turndown || turndown._artigoRules) return;
    turndown._artigoRules = true;

    turndown.addRule('artMath', {
      filter: (n) => n.classList && n.classList.contains('art-math'),
      replacement: (content, node) => {
        const tex = node.getAttribute('data-tex') || node.textContent.replace(/^\$+|\$+$/g, '');
        return node.classList.contains('art-math-display') ? `\n\n$$${tex}$$\n\n` : `$${tex}$`;
      },
    });

    turndown.addRule('artFootnotesDiv', {
      filter: (n) => n.classList && n.classList.contains('footnotes'),
      replacement: () => '',
    });

    turndown.addRule('artFnref', {
      filter: (n) => n.tagName === 'SUP' && n.classList && n.classList.contains('art-fnref'),
      replacement: (content, node) => {
        const href = (node.querySelector('a') || {}).getAttribute ? node.querySelector('a').getAttribute('href') : '';
        const id = (href || '').replace('#', '');
        const li = id ? previewContent.querySelector(`.footnotes li[id="${id}"]`) : null;
        const text = li ? li.textContent.replace(/\s+/g, ' ').trim() : content.trim();
        sidenoteCounter.n++;
        sidenoteCounter.defs.push(`[^${sidenoteCounter.n}]: ${text}`);
        return `[^${sidenoteCounter.n}]`;
      },
    });

    turndown.addRule('artOrnament', {
      filter: (n) => n.classList && n.classList.contains('art-ornament'),
      replacement: () => '\n\n{% include ornamento-artigo.html %}\n\n',
    });

    turndown.addRule('artFigure', {
      filter: (n) => n.tagName === 'FIGURE' && n.classList && (n.classList.contains('art-fig') || n.classList.contains('art-plate')),
      replacement: (content, node) => {
        const isPlate = node.classList.contains('art-plate');
        const img = node.querySelector(':scope > img');
        const svg = node.querySelector(':scope > svg');
        if (svg || !img) {
          // Figura desenhada em SVG: volta como HTML literal
          return '\n\n' + node.outerHTML.replace(/\s+contenteditable="[^"]*"/g, '') + '\n\n';
        }
        const q = (v) => (v || '').replace(/"/g, '\\"').trim();
        const args = [`src="${img.getAttribute('src') || ''}"`, `alt="${q(img.getAttribute('alt'))}"`];
        if (isPlate) {
          const num = node.querySelector('.art-plate-num');
          const title = node.querySelector('.art-plate-title');
          const sub = node.querySelector('.art-plate-sub, figcaption');
          if (num) args.push(`num="${q(num.textContent.replace(/^Prancha\s*/i, ''))}"`);
          if (title) args.push(`title="${q(title.textContent)}"`);
          if (sub) args.push(`caption="${q(sub.textContent)}"`);
          return `\n\n{% include prancha.html ${args.join(' ')} %}\n\n`;
        }
        const cap = node.querySelector('figcaption');
        const numEl = cap && cap.querySelector('.art-fig-num');
        if (numEl) args.push(`num="${q(numEl.textContent.replace(/^Fig\.\s*/i, '').replace(/\.$/, ''))}"`);
        if (cap) {
          const c = cap.cloneNode(true);
          const ne = c.querySelector('.art-fig-num');
          if (ne) ne.remove();
          const text = c.textContent.replace(/\s+/g, ' ').trim();
          if (text) args.push(`caption="${q(text)}"`);
        }
        const w = node.style && node.style.getPropertyValue('--art-fig-w');
        if (w) args.push(`largura="${q(w.replace('%', ''))}"`);
        return `\n\n{% include figura-artigo.html ${args.join(' ')} %}\n\n`;
      },
    });
  }

  function htmlToMarkdown(htmlIn) {
    initTurndown();
    initTurndownArtigo();
    if (!turndown) return state.source;
    sidenoteCounter.n = 0;
    sidenoteCounter.defs = [];
    let md = turndown.turndown(htmlIn);
    if (sidenoteCounter.defs.length) {
      md = md.trimEnd() + '\n\n' + sidenoteCounter.defs.join('\n') + '\n';
    }
    return md;
  }

  let tufteSyncTimer = null;
  function scheduleTufteSync() {
    clearTimeout(tufteSyncTimer);
    tufteSyncTimer = setTimeout(() => {
      const newMd = htmlToMarkdown(previewContent.innerHTML);
      state.source = newMd;
      source.value = newMd;
      updateStatusBar();
      autosave();
    }, 500);
  }

  // ===========================================================================
  // 8. Modes (doc + view)
  // ===========================================================================

  function setDoc(doc) {
    state.doc = doc;
    htmlEl.setAttribute('data-doc', doc);
    $$('[data-segmented="doc"] button').forEach(b => b.classList.toggle('active', b.dataset.doc === doc));
    if (doc === 'media') updateMediaTypeFields();
    render();
    autosave();
  }

  function setMode(mode) {
    if (state.mode === 'tufte' && mode !== 'tufte') {
      const md = htmlToMarkdown(previewContent.innerHTML);
      state.source = md;
      source.value = md;
      previewContent.removeAttribute('contenteditable');
      previewContent.removeEventListener('input', scheduleTufteSync);
    }
    state.mode = mode;
    htmlEl.setAttribute('data-mode', mode);
    $$('[data-segmented="mode"] button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'tufte') {
      render();
      previewContent.setAttribute('contenteditable', 'true');
      previewContent.setAttribute('data-placeholder', state.doc === 'artigo' ? 'Comece a escrever no papel…' : 'Comece a escrever no design Tufte…');
      previewContent.addEventListener('input', scheduleTufteSync);
      previewContent.focus();
    } else {
      render();
      if (mode === 'markdown' || mode === 'split') {
        source.focus();
      }
    }
  }

  function updateMediaTypeFields() {
    const t = state.meta.media.type;

    const creatorMap = { livro: 'Autor', filme: 'Diretor', série: 'Criador', álbum: 'Artista', canção: 'Artista' };
    const creatorLabel = $('[data-creator-label]');
    if (creatorLabel) creatorLabel.textContent = creatorMap[t] || 'Autor';

    const idMap = {
      livro:  { label: 'ID Open Library', ph: 'OL…W ou OL…M' },
      filme:  { label: 'ID TMDB', ph: 'ex: 550' },
      série:  { label: 'ID TMDB', ph: 'ex: 88055' },
      álbum:  { label: 'ID MusicBrainz', ph: 'UUID do release group' },
      canção: { label: 'ID MusicBrainz', ph: 'UUID da recording' },
    };
    const idInfo = idMap[t] || idMap.livro;
    const idLabel = $('[data-id-label]');
    if (idLabel) idLabel.textContent = idInfo.label;
    const idInput = $('#meta-media-id');
    if (idInput) idInput.placeholder = idInfo.ph;

    $('.ed-meta-publisher').hidden = (t !== 'livro');
    $('.ed-meta-album').hidden = (t !== 'canção');
  }

  // ===========================================================================
  // 9. Bindings
  // ===========================================================================

  function setupBindings() {
    source.addEventListener('input', () => {
      state.source = source.value;
      render();
      autosave();
    });

    $$('[data-segmented="doc"] button').forEach(b => {
      b.addEventListener('click', () => setDoc(b.dataset.doc));
    });
    $$('[data-segmented="mode"] button').forEach(b => {
      b.addEventListener('click', () => setMode(b.dataset.mode));
    });

    bindMeta('#meta-title', (v) => state.meta.title = v);
    bindMeta('#meta-subtitle', (v) => state.meta.subtitle = v);
    bindMeta('#meta-date', (v) => state.meta.date = v ? new Date(v) : new Date());
    bindMeta('#meta-category', (v) => state.meta.category = v);
    bindMeta('#meta-image', (v) => state.meta.image = v);
    bindMeta('#meta-media-type', (v) => { state.meta.media.type = v; updateMediaTypeFields(); });
    bindMeta('#meta-media-id', (v) => state.meta.media.id = v);
    bindMeta('#meta-media-titulo', (v) => state.meta.media.titulo = v);
    bindMeta('#meta-media-creator', (v) => state.meta.media.creator = v);
    bindMeta('#meta-media-ano', (v) => state.meta.media.ano = v);
    bindMeta('#meta-media-generos', (v) => state.meta.media.generos = v);
    bindMeta('#meta-media-publisher', (v) => state.meta.media.publisher = v);
    bindMeta('#meta-media-album', (v) => state.meta.media.album = v);
    bindMeta('#meta-media-capa', (v) => state.meta.media.capa = v);
    bindMeta('#meta-media-nota', (v) => state.meta.media.nota = v);
    bindMeta('#meta-art-capitulo', (v) => state.meta.artigo.capitulo = v);
    bindMeta('#meta-art-serie', (v) => state.meta.artigo.serie = v);
    bindMeta('#meta-art-numero', (v) => state.meta.artigo.numero = v);
    bindMeta('#meta-art-formato', (v) => state.meta.artigo.formato = v);
    bindCheck('#meta-art-capitular', (v) => state.meta.artigo.capitular = v);
    bindCheck('#meta-art-continua', (v) => state.meta.artigo.continua = v);

    $$('.ed-toolbar button[data-cmd]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = cmds[b.dataset.cmd];
        if (cmd) cmd();
      });
    });

    $('#ed-action-download').addEventListener('click', downloadMd);
    $('#ed-action-copy').addEventListener('click', copyMd);
    $('#ed-action-help').addEventListener('click', () => $('#ed-help').hidden = false);
    $('#ed-help-close').addEventListener('click', () => $('#ed-help').hidden = true);
    $('#ed-help').addEventListener('click', (e) => { if (e.target.id === 'ed-help') $('#ed-help').hidden = true; });
    $('#ed-action-new').addEventListener('click', confirmNew);

    $('#ed-action-drafts').addEventListener('click', showDraftsModal);
    $('#ed-drafts-close').addEventListener('click', hideDraftsModal);
    $('#ed-drafts').addEventListener('click', (e) => { if (e.target.id === 'ed-drafts') hideDraftsModal(); });
    $('#ed-drafts-new').addEventListener('click', () => { newDraft(); hideDraftsModal(); });

    document.addEventListener('keydown', handleKeydown);
    source.addEventListener('keydown', handleSourceKeydown);

    setupImageDropAndPaste();
    setupPublishBindings();
  }

  function bindCheck(sel, setter) {
    const el = $(sel);
    if (!el) return;
    el.addEventListener('change', () => {
      setter(!!el.checked);
      render();
      autosave();
    });
  }

  function bindMeta(sel, setter) {
    const el = $(sel);
    if (!el) return;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      setter(el.value);
      render();
      autosave();
    });
  }

  // ===========================================================================
  // 10. Atalhos de teclado
  // ===========================================================================

  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && !e.shiftKey && key === 'b') { e.preventDefault(); cmds.bold(); }
    else if (mod && !e.shiftKey && key === 'i') { e.preventDefault(); cmds.italic(); }
    else if (mod && !e.shiftKey && key === 'k') { e.preventDefault(); cmds.link(); }
    else if (mod && !e.shiftKey && key === 's') { e.preventDefault(); downloadMd(); }
    else if (mod && e.shiftKey && key === 'c') { e.preventDefault(); copyMd(); }
    else if (mod && e.shiftKey && key === 'p') { e.preventDefault(); setMode('split'); }
    else if (mod && e.shiftKey && key === 'm') { e.preventDefault(); setMode('markdown'); }
    else if (mod && e.shiftKey && key === 't') { e.preventDefault(); setMode('tufte'); }
    else if (mod && e.shiftKey && key === 'd') { e.preventDefault(); showDraftsModal(); }
    else if (mod && e.key === 'Enter') {
      e.preventDefault();
      if ($('#ed-publish').hidden) showPublishModal();
      else if (!$('#ed-publish-go').disabled) publishToGitHub();
    }
    else if (e.key === '?' && !isTyping(e.target)) {
      e.preventDefault();
      $('#ed-help').hidden = !$('#ed-help').hidden;
    } else if (e.key === 'Escape') {
      $('#ed-help').hidden = true;
      hideDraftsModal();
      hidePublishModal();
      hideSlashMenu();
    }
  }

  function isTyping(el) {
    return el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable);
  }

  function handleSourceKeydown(e) {
    if (e.key === '/') {
      const t = source;
      const lineStart = t.value.lastIndexOf('\n', t.selectionStart - 1) + 1;
      const lineSoFar = t.value.slice(lineStart, t.selectionStart);
      if (/^\s*$/.test(lineSoFar)) {
        setTimeout(showSlashMenu, 0);
      }
      return;
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      insertText('  ');
      return;
    }
    if (e.key === 'Enter') {
      const t = source;
      const start = t.selectionStart;
      const before = t.value.slice(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const line = before.slice(lineStart);
      const m = line.match(/^(\s*)([-*+]\s|\d+\.\s|>\s)/);
      if (m) {
        if (m[0].length === line.length) {
          e.preventDefault();
          t.value = t.value.slice(0, lineStart) + t.value.slice(start);
          t.selectionStart = t.selectionEnd = lineStart;
          state.source = t.value;
          render();
          return;
        }
        e.preventDefault();
        let next = '\n' + m[1] + m[2];
        if (/\d+\.\s/.test(m[2])) {
          const num = parseInt(m[2]) + 1;
          next = '\n' + m[1] + num + '. ';
        }
        const after = t.value.slice(start);
        t.value = before + next + after;
        t.selectionStart = t.selectionEnd = start + next.length;
        state.source = t.value;
        render();
      }
    }
  }

  // ===========================================================================
  // 11. Slash menu
  // ===========================================================================

  const SLASH_ITEMS = [
    { label: 'Título 1', hint: 'h1', cmd: 'h1' },
    { label: 'Título 2', hint: 'h2', cmd: 'h2' },
    { label: 'Título 3', hint: 'h3', cmd: 'h3' },
    { label: 'Citação', hint: 'blockquote', cmd: 'quote' },
    { label: 'Lista', hint: 'bullet', cmd: 'ul' },
    { label: 'Lista numerada', hint: '1.', cmd: 'ol' },
    { label: 'Bloco de código', hint: '```', cmd: 'codeblock' },
    { label: 'Régua', hint: '---', cmd: 'hr' },
    { label: 'Imagem (arquivo)', hint: 'colar/arrastar', cmd: 'image' },
    { label: 'Imagem por URL', hint: 'externa', cmd: 'imageurl' },
    { label: 'Newthought', hint: 'small-caps', cmd: 'newthought' },
    { label: 'Sidenote', hint: 'numerada', cmd: 'sidenote' },
    { label: 'Marginnote', hint: 'livre', cmd: 'marginnote' },
    { label: 'Epígrafo', hint: 'epigraph', cmd: 'epigraph' },
    { label: 'Figura', hint: 'figure', cmd: 'figure' },
    { label: 'Figura full-width', hint: 'fullwidth', cmd: 'fullwidth' },
    // Só no artigo (papel vintage)
    { label: 'Seção em versaletes', hint: '## seção', cmd: 'secao', only: 'artigo' },
    { label: 'Incipit', hint: 'versaletes', cmd: 'incipit', only: 'artigo' },
    { label: 'Figura (arquivo)', hint: 'Fig. n.', cmd: 'figura', only: 'artigo' },
    { label: 'Figura em SVG', hint: 'gravura', cmd: 'figsvg', only: 'artigo' },
    { label: 'Prancha', hint: 'colunas', cmd: 'prancha', only: 'artigo' },
    { label: 'Nota de rodapé', hint: '[^n]', cmd: 'rodape', only: 'artigo' },
    { label: 'Equação', hint: '$$', cmd: 'equacao', only: 'artigo' },
    { label: 'Tabela', hint: '| |', cmd: 'tabela', only: 'artigo' },
    { label: 'Ornamento', hint: '❦', cmd: 'ornamento', only: 'artigo' },
  ];
  const TUFTE_ONLY = ['newthought', 'sidenote', 'marginnote', 'epigraph', 'figure', 'fullwidth'];

  let slashOpen = false;
  let slashStart = -1;
  let slashIndex = 0;

  function showSlashMenu() {
    slashOpen = true;
    slashStart = source.selectionStart - 1;
    slashIndex = 0;
    renderSlashMenu();
    positionSlashMenu();
    source.addEventListener('keydown', slashKeyHandler, true);
    source.addEventListener('input', slashInputHandler);
    source.addEventListener('blur', delayedHideSlashMenu);
  }

  function delayedHideSlashMenu() { setTimeout(hideSlashMenu, 150); }

  function hideSlashMenu() {
    if (!slashOpen) return;
    slashOpen = false;
    $('#ed-slash').hidden = true;
    source.removeEventListener('keydown', slashKeyHandler, true);
    source.removeEventListener('input', slashInputHandler);
    source.removeEventListener('blur', delayedHideSlashMenu);
  }

  function getSlashQuery() {
    return source.value.slice(slashStart + 1, source.selectionStart);
  }

  function filteredSlashItems() {
    const q = getSlashQuery().toLowerCase();
    const base = SLASH_ITEMS.filter(i => {
      if (i.only && i.only !== state.doc) return false;
      if (state.doc === 'artigo' && TUFTE_ONLY.includes(i.cmd)) return false;
      return true;
    });
    if (!q) return base;
    return base.filter(i =>
      i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q) || i.cmd.toLowerCase().includes(q)
    );
  }

  function renderSlashMenu() {
    const items = filteredSlashItems();
    const popover = $('#ed-slash');
    if (slashIndex >= items.length) slashIndex = Math.max(0, items.length - 1);
    popover.innerHTML = '<div class="ed-popover-header">Inserir bloco</div>' +
      items.map((it, i) => `<button type="button" class="ed-popover-item ${i === slashIndex ? 'active' : ''}" data-slash-index="${i}"><span>${it.label}</span><small>${it.hint}</small></button>`).join('');
    popover.hidden = items.length === 0;
    popover._items = items;
    popover.querySelectorAll('.ed-popover-item').forEach(b => {
      b.addEventListener('mousedown', (e) => {
        e.preventDefault();
        slashIndex = parseInt(b.dataset.slashIndex, 10);
        runSlashSelection();
      });
    });
  }

  function positionSlashMenu() {
    const popover = $('#ed-slash');
    const rect = source.getBoundingClientRect();
    const coords = getCaretCoordinates(source, source.selectionStart);
    let top = rect.top + coords.top - source.scrollTop + 22;
    let left = rect.left + coords.left;
    const popH = 280;
    if (top + popH > window.innerHeight) top = rect.top + coords.top - source.scrollTop - popH - 4;
    popover.style.left = Math.max(8, left) + 'px';
    popover.style.top = Math.max(8, top) + 'px';
  }

  function slashKeyHandler(e) {
    if (!slashOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); hideSlashMenu(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = $('#ed-slash')._items || [];
      slashIndex = Math.min(slashIndex + 1, items.length - 1);
      renderSlashMenu();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      slashIndex = Math.max(slashIndex - 1, 0);
      renderSlashMenu();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      runSlashSelection();
      return;
    }
    if (e.key === 'Backspace' && source.selectionStart <= slashStart + 1) {
      hideSlashMenu();
    }
  }

  function slashInputHandler() {
    if (!slashOpen) return;
    if (source.selectionStart < slashStart + 1) {
      hideSlashMenu();
      return;
    }
    slashIndex = 0;
    renderSlashMenu();
    positionSlashMenu();
  }

  function runSlashSelection() {
    const items = $('#ed-slash')._items || filteredSlashItems();
    const item = items[slashIndex];
    if (!item) { hideSlashMenu(); return; }
    const t = source;
    const removeFrom = slashStart;
    const removeTo = t.selectionStart;
    t.value = t.value.slice(0, removeFrom) + t.value.slice(removeTo);
    t.selectionStart = t.selectionEnd = removeFrom;
    state.source = t.value;
    hideSlashMenu();
    if (cmds[item.cmd]) cmds[item.cmd]();
  }

  function getCaretCoordinates(el, position) {
    const props = ['boxSizing','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontSizeAdjust','lineHeight','fontFamily','textAlign','textTransform','textIndent','textDecoration','letterSpacing','wordSpacing','tabSize','MozTabSize'];
    const div = document.createElement('div');
    document.body.appendChild(div);
    const style = div.style;
    const computed = getComputedStyle(el);
    style.whiteSpace = 'pre-wrap';
    style.wordWrap = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.top = '0';
    style.left = '0';
    style.width = el.offsetWidth + 'px';
    style.height = el.offsetHeight + 'px';
    style.overflow = 'hidden';
    props.forEach(p => style[p] = computed[p]);
    div.textContent = el.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = el.value.substring(position) || '.';
    div.appendChild(span);
    const coords = { top: span.offsetTop, left: span.offsetLeft };
    document.body.removeChild(div);
    return coords;
  }

  // ===========================================================================
  // 12. Persist / load / drafts
  // ===========================================================================

  const LEGACY_KEY = 'editor:state:v1';
  const DRAFTS_KEY = 'editor:drafts:v1';
  const CURRENT_DRAFT_KEY = 'editor:current-draft:v1';

  function readDrafts() {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function writeDrafts(drafts) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch (e) {}
  }

  function newDraftId() {
    return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function snapshot() {
    return {
      id: state.draftId,
      doc: state.doc,
      source: state.source,
      meta: {
        ...state.meta,
        date: state.meta.date instanceof Date ? state.meta.date.toISOString() : state.meta.date,
      },
      published: state.published || null,
      updatedAt: new Date().toISOString(),
    };
  }

  function persist() {
    if (!state.draftId) state.draftId = newDraftId();
    const drafts = readDrafts();
    const snap = snapshot();
    const existing = drafts[state.draftId];
    drafts[state.draftId] = {
      ...snap,
      createdAt: (existing && existing.createdAt) || snap.updatedAt,
    };
    writeDrafts(drafts);
    try { localStorage.setItem(CURRENT_DRAFT_KEY, state.draftId); } catch (e) {}
  }

  let autosaveTimer = null;
  function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      persist();
      state.savedAt = new Date();
      const sav = $('#ed-status-saved');
      sav.textContent = `salvo às ${pad2(state.savedAt.getHours())}:${pad2(state.savedAt.getMinutes())}`;
      sav.classList.add('saved');
    }, 500);
  }

  function loadDraftFromStorage(id) {
    const drafts = readDrafts();
    const d = drafts[id];
    if (!d) return false;
    state.draftId = id;
    state.doc = d.doc || 'post';
    state.source = d.source || '';
    state.meta = {
      title: '', subtitle: '', date: new Date(), category: '', image: '',
      ...(d.meta || {}),
      date: d.meta && d.meta.date ? new Date(d.meta.date) : new Date(),
      media: {
        type: 'livro', id: '', titulo: '', creator: '', ano: '', generos: '', publisher: '', album: '', capa: '', nota: '',
        ...((d.meta && d.meta.media) || {}),
      },
      artigo: {
        ...{ capitulo: '', serie: '', numero: '', formato: 'colunas', capitular: true, continua: false },
        ...((d.meta && d.meta.artigo) || {}),
      },
    };
    state.published = d.published || null;
    try { localStorage.setItem(CURRENT_DRAFT_KEY, id); } catch (e) {}
    loadImagesForDraft(id);
    return true;
  }

  function migrateLegacy() {
    const drafts = readDrafts();
    if (Object.keys(drafts).length > 0) return;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    try {
      const data = JSON.parse(legacy);
      const id = newDraftId();
      const now = new Date().toISOString();
      drafts[id] = {
        id,
        doc: data.doc || 'post',
        source: data.source || '',
        meta: data.meta || {},
        createdAt: now,
        updatedAt: now,
      };
      writeDrafts(drafts);
      try { localStorage.setItem(CURRENT_DRAFT_KEY, id); } catch (e) {}
    } catch (e) {}
  }

  function load() {
    migrateLegacy();
    const currentId = localStorage.getItem(CURRENT_DRAFT_KEY);
    if (currentId && loadDraftFromStorage(currentId)) return;
    state.draftId = null;
    state.meta.date = new Date();
  }

  function listDrafts() {
    const drafts = readDrafts();
    return Object.values(drafts).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  function loadDraft(id) {
    if (id === state.draftId) return;
    persist();
    if (loadDraftFromStorage(id)) {
      applyStateToDom();
      render();
      if (state.mode === 'tufte') setMode('tufte');
      else if (state.mode !== 'markdown') source.focus();
    }
  }

  function newDraft(silent) {
    if (state.draftId) persist();
    state.draftId = null;
    state.published = null;
    clearImages();
    state.source = '';
    state.meta = {
      title: '', subtitle: '', date: new Date(), category: '', image: '',
      media: { type: 'livro', id: '', titulo: '', creator: '', ano: '', generos: '', publisher: '', album: '', capa: '', nota: '' },
      artigo: { capitulo: '', serie: '', numero: '', formato: 'colunas', capitular: true, continua: false },
    };
    applyStateToDom();
    render();
    persist();
    if (!silent) {
      toast('Novo rascunho criado');
      source.focus();
    }
  }

  function deleteDraft(id) {
    const drafts = readDrafts();
    delete drafts[id];
    writeDrafts(drafts);
    idbDeleteDraftImages(id);
    if (state.draftId === id) {
      state.draftId = null;
      const list = listDrafts();
      if (list.length) {
        loadDraftFromStorage(list[0].id);
        applyStateToDom();
        render();
      } else {
        newDraft(true);
      }
    }
  }

  function countWords(s) {
    const t = (s || '').replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t ? t.split(' ').length : 0;
  }

  function formatRelativeDate(iso) {
    if (!iso) return 'agora';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    if (hr < 24) return `há ${hr}h`;
    if (day < 7) return `há ${day} dia${day > 1 ? 's' : ''}`;
    return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  }

  function showDraftsModal() {
    renderDraftsList();
    $('#ed-drafts').hidden = false;
  }
  function hideDraftsModal() { $('#ed-drafts').hidden = true; }

  function renderDraftsList() {
    persist();
    const list = listDrafts();
    const ul = $('#ed-drafts-list');
    ul.innerHTML = list.map(d => {
      const title = d.meta && d.meta.title
        ? escapeHtml(d.meta.title)
        : '<em>Sem título</em>';
      const docLabel = d.doc === 'post' ? 'Post' : d.doc === 'media' ? 'Mídia' : d.doc === 'artigo' ? 'Artigo' : 'Nota';
      const updated = formatRelativeDate(d.updatedAt);
      const words = countWords(d.source || '');
      const isCurrent = d.id === state.draftId ? ' current' : '';
      return `
        <li class="ed-draft-item${isCurrent}" data-draft-id="${d.id}">
          <span class="ed-draft-type">${docLabel}</span>
          <div class="ed-draft-body">
            <p class="ed-draft-title">${title}</p>
            <p class="ed-draft-meta">
              <span class="ed-draft-date">${updated}</span>
              <span class="ed-draft-words">${words} palavra${words !== 1 ? 's' : ''}</span>
              ${d.published ? '<span class="ed-draft-published">publicado</span>' : ''}
            </p>
          </div>
          <button type="button" class="ed-draft-delete" data-delete-id="${d.id}" title="Apagar rascunho">×</button>
        </li>`;
    }).join('');

    ul.querySelectorAll('.ed-draft-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.ed-draft-delete')) return;
        loadDraft(item.dataset.draftId);
        hideDraftsModal();
      });
    });
    ul.querySelectorAll('.ed-draft-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        const drafts = readDrafts();
        const d = drafts[id];
        const title = (d && d.meta && d.meta.title) || 'sem título';
        if (!confirm(`Apagar rascunho "${title}"? Esta ação não pode ser desfeita.`)) return;
        deleteDraft(id);
        renderDraftsList();
      });
    });
  }

  function applyStateToDom() {
    source.value = state.source;
    $('#meta-title').value = state.meta.title || '';
    $('#meta-subtitle').value = state.meta.subtitle || '';
    $('#meta-date').value = formatDateForInput(state.meta.date);
    $('#meta-category').value = state.meta.category || '';
    $('#meta-image').value = state.meta.image || '';
    $('#meta-media-type').value = state.meta.media.type || 'livro';
    $('#meta-media-id').value = state.meta.media.id || '';
    $('#meta-media-titulo').value = state.meta.media.titulo || '';
    $('#meta-media-creator').value = state.meta.media.creator || '';
    $('#meta-media-ano').value = state.meta.media.ano || '';
    $('#meta-media-generos').value = state.meta.media.generos || '';
    $('#meta-media-publisher').value = state.meta.media.publisher || '';
    $('#meta-media-album').value = state.meta.media.album || '';
    $('#meta-media-capa').value = state.meta.media.capa || '';
    $('#meta-media-nota').value = state.meta.media.nota || '';
    const art = state.meta.artigo || { capitulo: '', serie: '', numero: '', formato: 'colunas', capitular: true, continua: false };
    $('#meta-art-capitulo').value = art.capitulo || '';
    $('#meta-art-serie').value = art.serie || '';
    $('#meta-art-numero').value = art.numero || '';
    $('#meta-art-formato').value = art.formato || 'colunas';
    $('#meta-art-capitular').checked = art.capitular !== false;
    $('#meta-art-continua').checked = !!art.continua;
    setDoc(state.doc);
    updateMediaTypeFields();
  }

  function formatDateForInput(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  // Sem imagens anexadas baixa só o .md; com imagens, um .zip já com a
  // estrutura do repositório (_notas/… + assets/images/AAAA/…): basta
  // descompactar na raiz e comitar.
  async function downloadMd() {
    const filename = generateFilename();
    const content = generateFullDocument();
    const used = usedImagePaths();
    if (!used.length) {
      saveBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), filename);
      toast(`Baixado: ${filename}`);
      return;
    }
    try {
      if (!window.JSZip) await loadScript(JSZIP_URL);
      const zip = new window.JSZip();
      zip.file(`${docFolder()}/${filename}`, content);
      used.forEach(p => zip.file(p, images[p].blob));
      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, filename.replace(/\.md$/, '') + '.zip');
      toast(`Baixado .zip com ${plural(used.length, 'imagem', 'imagens')}: descompacte na raiz do repositório`);
    } catch (e) {
      saveBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), filename);
      toast('Não deu pra montar o .zip; baixei só o .md');
    }
  }

  async function copyMd() {
    const content = generateFullDocument();
    try {
      await navigator.clipboard.writeText(content);
      toast('Markdown copiado pra área de transferência');
    } catch (e) {
      toast('Falha ao copiar — tente novamente');
    }
  }

  function confirmNew() {
    // Comportamento "Novo": cria novo rascunho preservando o atual
    newDraft();
  }

  // ===========================================================================
  // 13. Init
  // ===========================================================================

  function init() {
    load();
    // /editor/?doc=artigo abre direto no tipo pedido (novo rascunho se o atual for de outro tipo)
    try {
      const qd = new URLSearchParams(location.search).get('doc');
      if (qd && ['post', 'nota', 'media', 'artigo'].includes(qd) && qd !== state.doc) {
        if (state.draftId && (state.source || state.meta.title)) newDraft(true);
        state.doc = qd;
      }
    } catch (e) {}
    applyStateToDom();
    setupBindings();
    render();
    // Garantir que sempre exista um draft id pra autosave gravar
    if (!state.draftId) persist();
    if (state.mode === 'tufte') {
      setMode('tufte');
    } else {
      source.focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
