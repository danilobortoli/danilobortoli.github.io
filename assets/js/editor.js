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
    doc: 'post',          // 'post' | 'nota' | 'media'
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
        titulo: '',
        creator: '',
        ano: '',
        generos: '',
        publisher: '',
        album: '',
        capa: '',
        nota: '',
      },
    },
    savedAt: null,
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
  function preprocessMarkdown(md) {
    if (!md) return '';

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

    // Kramdown footnote syntax → Tufte sidenotes
    const fnDefs = {};
    md = md.replace(/^\[\^([^\]]+)\]:[ \t]+(.*(?:\n[ \t]+.*)*)/gm, (_, name, body) => {
      fnDefs[name] = body.replace(/\n[ \t]+/g, '\n').trim();
      return '';
    });
    let snCounter = 0;
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
      return `<label for="${id}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="${id}" class="margin-toggle"/><span class="sidenote">${content}</span>`;
    });

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

    if (state.mode !== 'tufte') {
      previewContent.innerHTML = renderedHtml;
    }
    updatePreviewMeta();
    updateMediaPreview();
    updateStatusBar();
    updateFilenameDisplay();
  }

  function updatePreviewMeta() {
    const m = state.meta;
    const hasHero = state.doc === 'post' && !!m.image;
    htmlEl.setAttribute('data-has-hero', hasHero ? 'true' : 'false');

    const hero = $('#ed-preview-hero');
    if (hasHero) {
      hero.hidden = false;
      $('#ed-preview-hero-image').style.backgroundImage = `url("${m.image}")`;
      $('#ed-preview-categories').textContent = m.category ? m.category.toUpperCase() : '';
      $('#ed-preview-hero-title').textContent = m.title || 'Sem título';
      $('#ed-preview-hero-subtitle').textContent = m.subtitle || '';
      $('#ed-preview-hero-meta').textContent = formatDate(m.date) + ' · ' + readingTime(state.source) + ' min de leitura';
    } else {
      hero.hidden = true;
    }

    const header = $('#ed-preview-header');
    if (state.doc === 'post' && hasHero) {
      header.hidden = true;
    } else {
      header.hidden = false;
      $('#ed-preview-eyebrow').textContent = state.doc === 'post' ? (m.category || '') : '';
      $('#ed-preview-title').textContent = m.title || (state.doc === 'nota' ? '' : 'Sem título');
      $('#ed-preview-subtitle').textContent = state.doc === 'post' ? (m.subtitle || '') : '';
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

    const fields = [];
    if (m.creator) fields.push(`<div class="media-review-field"><dt>${labels.creator}</dt><dd>${escapeHtml(m.creator)}</dd></div>`);
    if (m.type === 'canção' && m.album) fields.push(`<div class="media-review-field"><dt>Álbum</dt><dd>${escapeHtml(m.album)}</dd></div>`);
    if (m.type === 'livro' && m.publisher) fields.push(`<div class="media-review-field"><dt>Editora</dt><dd>${escapeHtml(m.publisher)}</dd></div>`);
    if (m.ano) fields.push(`<div class="media-review-field"><dt>Ano</dt><dd>${escapeHtml(m.ano)}</dd></div>`);
    if (m.generos) fields.push(`<div class="media-review-field"><dt>Gêneros</dt><dd>${escapeHtml(m.generos)}</dd></div>`);

    const ratingHtml = m.nota ? `
      <div class="media-review-rating">
        <span class="media-review-rating-value">${escapeHtml(m.nota)}</span>
        <span class="media-review-rating-max">/10</span>
        <div class="media-review-rating-bar">
          <div class="media-review-rating-fill" style="width: ${parseFloat(m.nota || 0) * 10}%"></div>
        </div>
      </div>` : '';

    const cover = m.capa
      ? `<img src="${escapeAttr(m.capa)}" alt="Capa" class="media-review-img"/>`
      : `<div class="media-review-img media-review-placeholder"></div>`;

    aside.hidden = false;
    aside.className = 'media-review media-review--marginalia';
    aside.innerHTML = `
      <div class="media-review-cover">${cover}</div>
      <div class="media-review-info">
        <span class="media-review-type">${m.type ? capitalize(m.type) : ''}</span>
        <h3 class="media-review-title">${escapeHtml(m.titulo || '')}</h3>
        <dl class="media-review-meta">${fields.join('')}</dl>
        ${ratingHtml}
      </div>`;
  }

  function updateStatusBar() {
    const md = state.source || '';
    const text = md.replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    $('#ed-status-words').textContent = words + ' palavras';
    $('#ed-status-reading').textContent = readingTime(md) + ' min';
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
    } else {
      if (m.title) lines.push(`title: ${yamlString(m.title)}`);
      lines.push(`date: ${dateTimeISO(d)}`);
      if (state.doc === 'media') {
        const md = m.media;
        lines.push('media:');
        if (md.type) lines.push(`  type: ${md.type}`);
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
    image:   () => {
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

    figure: () => {
      const src = prompt('URL da imagem:');
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

    fullwidth: () => {
      const src = prompt('URL da imagem (full-width):');
      if (!src) return;
      const alt = prompt('Texto alternativo:') || '';
      const caption = prompt('Legenda (opcional):') || '';
      const args = [`src="${src.replace(/"/g, '\\"')}"`, `alt="${alt.replace(/"/g, '\\"')}"`];
      if (caption) args.push(`caption="${caption.replace(/"/g, '\\"')}"`);
      insertBlock(`{% include fullwidth.html ${args.join(' ')} %}`);
    },
  };

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

    turndown.addRule('fullwidthFigure', {
      filter: (n) => n.tagName === 'FIGURE' && n.classList && n.classList.contains('fullwidth'),
      replacement: (content, node) => {
        const img = node.querySelector('img');
        const cap = node.querySelector('figcaption');
        if (!img) return content;
        const args = [`src="${img.getAttribute('src') || ''}"`, `alt="${(img.getAttribute('alt') || '').replace(/"/g, '\\"')}"`];
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
        const args = [`src="${img.getAttribute('src') || ''}"`, `alt="${(img.getAttribute('alt') || '').replace(/"/g, '\\"')}"`];
        if (cap && cap.textContent.trim()) {
          args.push(`caption="${cap.textContent.replace(/"/g, '\\"').trim()}"`);
          args.push(`id="fig-${Math.random().toString(36).slice(2, 7)}"`);
        }
        return `\n\n{% include figure.html ${args.join(' ')} %}\n\n`;
      },
    });
  }

  function htmlToMarkdown(htmlIn) {
    initTurndown();
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
    if (doc === 'media') updateMediaCreatorLabel();
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
      previewContent.setAttribute('data-placeholder', 'Comece a escrever no design Tufte…');
      previewContent.addEventListener('input', scheduleTufteSync);
      previewContent.focus();
    } else {
      render();
      if (mode === 'markdown' || mode === 'split') {
        source.focus();
      }
    }
  }

  function updateMediaCreatorLabel() {
    const t = state.meta.media.type;
    const labelMap = { livro: 'Autor', filme: 'Diretor', série: 'Criador', álbum: 'Artista', canção: 'Artista' };
    const label = $('[data-creator-label]');
    if (label) label.textContent = labelMap[t] || 'Autor';
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
    bindMeta('#meta-media-type', (v) => { state.meta.media.type = v; updateMediaCreatorLabel(); });
    bindMeta('#meta-media-titulo', (v) => state.meta.media.titulo = v);
    bindMeta('#meta-media-creator', (v) => state.meta.media.creator = v);
    bindMeta('#meta-media-ano', (v) => state.meta.media.ano = v);
    bindMeta('#meta-media-generos', (v) => state.meta.media.generos = v);
    bindMeta('#meta-media-publisher', (v) => state.meta.media.publisher = v);
    bindMeta('#meta-media-album', (v) => state.meta.media.album = v);
    bindMeta('#meta-media-capa', (v) => state.meta.media.capa = v);
    bindMeta('#meta-media-nota', (v) => state.meta.media.nota = v);

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
    else if (e.key === '?' && !isTyping(e.target)) {
      e.preventDefault();
      $('#ed-help').hidden = !$('#ed-help').hidden;
    } else if (e.key === 'Escape') {
      $('#ed-help').hidden = true;
      hideDraftsModal();
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
    { label: 'Imagem', hint: 'image', cmd: 'image' },
    { label: 'Newthought', hint: 'small-caps', cmd: 'newthought' },
    { label: 'Sidenote', hint: 'numerada', cmd: 'sidenote' },
    { label: 'Marginnote', hint: 'livre', cmd: 'marginnote' },
    { label: 'Epígrafo', hint: 'epigraph', cmd: 'epigraph' },
    { label: 'Figura', hint: 'figure', cmd: 'figure' },
    { label: 'Figura full-width', hint: 'fullwidth', cmd: 'fullwidth' },
  ];

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
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(i =>
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
        type: 'livro', titulo: '', creator: '', ano: '', generos: '', publisher: '', album: '', capa: '', nota: '',
        ...((d.meta && d.meta.media) || {}),
      },
    };
    try { localStorage.setItem(CURRENT_DRAFT_KEY, id); } catch (e) {}
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
    state.source = '';
    state.meta = {
      title: '', subtitle: '', date: new Date(), category: '', image: '',
      media: { type: 'livro', titulo: '', creator: '', ano: '', generos: '', publisher: '', album: '', capa: '', nota: '' },
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
      const docLabel = d.doc === 'post' ? 'Post' : d.doc === 'media' ? 'Mídia' : 'Nota';
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
    $('#meta-media-titulo').value = state.meta.media.titulo || '';
    $('#meta-media-creator').value = state.meta.media.creator || '';
    $('#meta-media-ano').value = state.meta.media.ano || '';
    $('#meta-media-generos').value = state.meta.media.generos || '';
    $('#meta-media-publisher').value = state.meta.media.publisher || '';
    $('#meta-media-album').value = state.meta.media.album || '';
    $('#meta-media-capa').value = state.meta.media.capa || '';
    $('#meta-media-nota').value = state.meta.media.nota || '';
    setDoc(state.doc);
    updateMediaCreatorLabel();
  }

  function formatDateForInput(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function downloadMd() {
    const filename = generateFilename();
    const content = generateFullDocument();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    toast(`Baixado: ${filename}`);
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
