/**
 * Escritório — editor de documentos jurídicos
 * ===========================================
 * Editor markdown com preview em folha A4, campos por tipo de documento
 * (petição, recurso, parecer, proposta, genérico), endereçamento automático,
 * exportação .md com front matter e PDF via impressão do navegador.
 *
 * Tudo é client-side: rascunhos e caderno de clientes vivem no localStorage.
 * Estilo das peças calibrado pelo modelo real do Danilo (endereçamento sóbrio,
 * abertura direta, fecho "Termos em que…", assinaturas múltiplas).
 */
(function () {
  'use strict';

  // ===========================================================================
  // 1. Esquema dos tipos de documento
  // ===========================================================================

  const ASSINATURA_PADRAO = 'Danilo Ferreira Bortoli\nOAB/SP 409.024';

  const JUIZOS = [
    'Juízo de Direito',
    'Juízo Federal',
    'Juízo do Trabalho',
    'Juizado Especial Cível',
    'Juizado Especial Federal',
  ];

  const MODALIDADES = [
    'Honorários fixos',
    'Honorários de êxito',
    'Misto (fixo + êxito)',
    'Por hora',
  ];

  // Linha compartilhada de fecho/assinatura — anexada a todos os tipos.
  function assinaturaRow(fechoDefault) {
    return [
      { id: 'fecho', label: 'Fecho', placeholder: 'Termos em que…', default: fechoDefault, grow: 1 },
      { id: 'local', label: 'Local', default: 'Marília' },
      { id: 'assinaturas', label: 'Assinaturas (nome e OAB, um por linha)', type: 'textarea', default: ASSINATURA_PADRAO, grow: 1 },
    ];
  }

  const DOC_TYPES = {
    peticao: {
      label: 'Petição',
      rows: [
        [
          { id: 'cliente', label: 'Cliente (parte representada)', grow: 1, list: 'esc-clientes-list' },
          { id: 'parteContraria', label: 'Parte contrária', grow: 1 },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'juizo', label: 'Juízo', type: 'select', options: JUIZOS },
          { id: 'vara', label: 'Vara / órgão', placeholder: '3ª Vara Cível' },
          { id: 'comarca', label: 'Comarca / Subseção Judiciária', placeholder: 'Marília', grow: 1 },
          { id: 'processo', label: 'Nº do processo', placeholder: '0000000-00.0000.0.00.0000', grow: 1 },
        ],
        [
          { id: 'acao', label: 'Ação / classe', placeholder: 'Ação indenizatória', grow: 1 },
          { id: 'tituloPeca', label: 'Título da peça', placeholder: 'Retomada do feito e julgamento dos EDs', grow: 2 },
          { id: 'valorCausa', label: 'Valor da causa', placeholder: 'R$ 0,00' },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'PET-2026-001' },
        ],
        [
          { id: 'qualificacao', label: 'Qualificação do cliente (para inicial)', type: 'textarea', placeholder: 'nacionalidade, estado civil, profissão, CPF, endereço…', grow: 1 },
          { id: 'enderecamentoCustom', label: 'Endereçamento personalizado (substitui o automático)', type: 'textarea', grow: 1 },
        ],
        assinaturaRow('Termos em que pede deferimento.'),
      ],
    },

    recurso: {
      label: 'Recurso',
      rows: [
        [
          { id: 'cliente', label: 'Cliente (recorrente)', grow: 1, list: 'esc-clientes-list' },
          { id: 'parteContraria', label: 'Parte contrária (recorrida)', grow: 1 },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'relator', label: 'Relator(a) — nome e cargo', placeholder: 'Desembargador Federal Wilson Alves de Souza', grow: 1 },
          { id: 'orgao', label: 'Câmara / Turma', placeholder: '3ª Turma' },
          { id: 'tribunal', label: 'Tribunal', placeholder: 'Tribunal Regional Federal da 1ª Região', grow: 1 },
        ],
        [
          { id: 'classe', label: 'Classe recursal', placeholder: 'Apelação Cível' },
          { id: 'processo', label: 'Nº do processo', placeholder: '0000000-00.0000.0.00.0000', grow: 1 },
          { id: 'acao', label: 'Ação de origem', placeholder: 'Ação indenizatória', grow: 1 },
          { id: 'tituloPeca', label: 'Título da peça', placeholder: 'Razões de apelação', grow: 1 },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'REC-2026-001' },
        ],
        [
          { id: 'enderecamentoCustom', label: 'Endereçamento personalizado (substitui o automático)', type: 'textarea', grow: 1 },
        ],
        assinaturaRow('Termos em que pede provimento.'),
      ],
    },

    parecer: {
      label: 'Parecer',
      rows: [
        [
          { id: 'consulente', label: 'Consulente', grow: 1, list: 'esc-clientes-list' },
          { id: 'referencia', label: 'Nº do parecer', placeholder: '14/2026' },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'objeto', label: 'Objeto da consulta', grow: 2 },
          { id: 'processoRelacionado', label: 'Processo relacionado (opcional)', grow: 1 },
        ],
        [
          { id: 'ementa', label: 'Ementa', type: 'textarea', placeholder: 'Síntese das conclusões, em frases curtas separadas por ponto.', grow: 1 },
        ],
        assinaturaRow('É o parecer.'),
      ],
    },

    proposta: {
      label: 'Proposta',
      rows: [
        [
          { id: 'destinatario', label: 'Destinatário', grow: 1, list: 'esc-clientes-list' },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'PROP-2026-001' },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'objeto', label: 'Objeto da atuação', placeholder: 'Defesa em ação de…', grow: 2 },
          { id: 'modalidade', label: 'Modalidade', type: 'select', options: MODALIDADES },
          { id: 'valor', label: 'Valor', placeholder: 'R$ 0,00' },
        ],
        [
          { id: 'condicoes', label: 'Condições de pagamento', type: 'textarea', placeholder: 'Entrada de…, parcelas de…', grow: 1 },
          { id: 'validade', label: 'Validade da proposta', placeholder: '30 dias' },
        ],
        assinaturaRow(''),
      ],
    },

    generico: {
      label: 'Documento',
      rows: [
        [
          { id: 'titulo', label: 'Título do documento', placeholder: 'Notificação extrajudicial', grow: 1 },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'destinatario', label: 'Destinatário (opcional)', grow: 1, list: 'esc-clientes-list' },
          { id: 'assunto', label: 'Referência / assunto (opcional)', grow: 1 },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'DOC-2026-001' },
        ],
        assinaturaRow(''),
      ],
    },
  };

  const TEMPLATES = {
    peticao: '## I — O CASO\n\n1 …\n\n## II — O DIREITO\n\n2 …\n\n## III — PEDIDOS\n\n3 Requer-se:\n\n(i) …;\n\n(ii) ….\n',
    recurso: '## I — O CASO\n\n1 …\n\n## II — AS RAZÕES\n\n2 …\n\n## III — PEDIDOS\n\n3 Requer-se:\n\n(i) …;\n\n(ii) ….\n',
    parecer: '## I — A CONSULTA\n\n1 …\n\n## II — A ANÁLISE\n\n2 …\n\n## III — A CONCLUSÃO\n\n3 …\n',
    proposta: '## ESCOPO DA ATUAÇÃO\n\n…\n\n## HONORÁRIOS\n\nAs condições de honorários constam do quadro-resumo ao final desta proposta.\n\n## CONDIÇÕES GERAIS\n\n…\n',
    generico: '',
  };

  // ===========================================================================
  // 2. Estado + helpers
  // ===========================================================================

  const state = {
    draftId: null,
    doc: 'peticao',        // chave de DOC_TYPES
    mode: 'split',         // 'markdown' | 'split' | 'pagina'
    source: '',
    fields: {},            // valores planos {fieldId: string} — compartilhados entre tipos
    savedAt: null,
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const htmlEl = document.documentElement;
  const source = $('#ed-source');
  const sheet = $('#esc-sheet');

  const pad2 = (n) => String(n).padStart(2, '0');
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

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

  function fieldDefs(doc) {
    return (DOC_TYPES[doc] || DOC_TYPES.peticao).rows.flat();
  }

  function f(id) {
    return (state.fields[id] || '').trim();
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function docDate() {
    const v = f('data');
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + 'T12:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  function dateExtenso() {
    const d = docDate();
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  }

  marked.setOptions({ gfm: true, breaks: false, headerIds: false });

  // ===========================================================================
  // 3. Formulário de campos (gerado do esquema)
  // ===========================================================================

  function applyDefaults() {
    fieldDefs(state.doc).forEach((def) => {
      if (state.fields[def.id] === undefined) {
        if (def.type === 'date') state.fields[def.id] = todayISO();
        else if (def.type === 'select') state.fields[def.id] = def.default || (def.options && def.options[0]) || '';
        else state.fields[def.id] = def.default || '';
      }
    });
    // Fecho acompanha o tipo enquanto o usuário não o personalizar.
    const fechoDef = fieldDefs(state.doc).find((d) => d.id === 'fecho');
    if (fechoDef && FECHO_DEFAULTS.has(state.fields.fecho || '')) {
      state.fields.fecho = fechoDef.default || '';
    }
  }

  const FECHO_DEFAULTS = new Set(['', 'Termos em que pede deferimento.', 'Termos em que pede provimento.', 'É o parecer.']);

  function renderMetaForm() {
    const wrap = $('#esc-meta');
    const rows = (DOC_TYPES[state.doc] || DOC_TYPES.peticao).rows;
    wrap.innerHTML = rows.map((row) => {
      const cells = row.map((def) => {
        const growClass = def.grow === 2 ? ' ed-meta-grow ed-meta-grow-2' : (def.grow ? ' ed-meta-grow' : '');
        let control;
        const val = escapeAttr(state.fields[def.id] || '');
        if (def.type === 'select') {
          const opts = (def.options || []).map((o) =>
            `<option value="${escapeAttr(o)}"${(state.fields[def.id] || '') === o ? ' selected' : ''}>${escapeHtml(o)}</option>`).join('');
          control = `<select data-field="${def.id}">${opts}</select>`;
        } else if (def.type === 'textarea') {
          control = `<textarea data-field="${def.id}" rows="2" placeholder="${escapeAttr(def.placeholder || '')}">${escapeHtml(state.fields[def.id] || '')}</textarea>`;
        } else if (def.type === 'date') {
          control = `<input type="date" data-field="${def.id}" value="${val}"/>`;
        } else {
          const list = def.list ? ` list="${def.list}"` : '';
          control = `<input type="text" data-field="${def.id}" value="${val}" placeholder="${escapeAttr(def.placeholder || '')}"${list}/>`;
        }
        return `<label class="${growClass.trim()}"><span>${escapeHtml(def.label)}</span>${control}</label>`;
      }).join('');
      return `<div class="ed-meta-row">${cells}</div>`;
    }).join('');

    $$('[data-field]', wrap).forEach((el) => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        state.fields[el.dataset.field] = el.value;
        if (el.dataset.field === 'cliente' || el.dataset.field === 'consulente') maybeFillQualificacao();
        render();
        autosave();
      });
    });
  }

  // ===========================================================================
  // 4. Endereçamento automático + blocos protocolares
  // ===========================================================================

  function buildEnderecamento() {
    const custom = f('enderecamentoCustom');
    if (custom) return custom;

    if (state.doc === 'peticao') {
      const comarca = f('comarca');
      const vara = f('vara');
      if (!comarca && !vara) return '';
      const juizo = f('juizo') || 'Juízo de Direito';
      const varaPart = vara ? `da ${vara} ` : '';
      switch (juizo) {
        case 'Juízo Federal':
          return `Ao Juízo Federal ${varaPart}da Subseção Judiciária de ${comarca}`;
        case 'Juízo do Trabalho':
          return vara
            ? `Ao Juízo da ${vara} de ${comarca}`
            : `Ao Juízo do Trabalho de ${comarca}`;
        case 'Juizado Especial Cível':
          return `Ao Juízo do Juizado Especial Cível ${varaPart}da Comarca de ${comarca}`;
        case 'Juizado Especial Federal':
          return `Ao Juízo do Juizado Especial Federal ${varaPart}da Subseção Judiciária de ${comarca}`;
        default:
          return `Ao Juízo de Direito ${varaPart}da Comarca de ${comarca}`;
      }
    }

    if (state.doc === 'recurso') {
      const tribunal = f('tribunal');
      if (!tribunal) return '';
      const orgao = f('orgao');
      const relator = f('relator');
      const classe = f('classe');
      const processo = f('processo');
      const classeRef = classe ? `da ${classe}${processo ? ` nº ${processo}` : ''}` : (processo ? `do processo nº ${processo}` : 'do recurso');
      const perante = orgao ? `, perante a ${orgao} do ${tribunal}` : `, perante o ${tribunal}`;
      if (relator) return `Ao ${relator}, Relator(a) ${classeRef}${perante}`;
      return `Ao(À) Relator(a) ${classeRef}${perante}`;
    }

    return '';
  }

  // "APELAÇÃO CÍVEL Nº 0006442-71.2006.4.01.3600 · AÇÃO INDENIZATÓRIA"
  function buildRefLine() {
    const parts = [];
    if (state.doc === 'peticao') {
      const acao = f('acao');
      const processo = f('processo');
      if (acao) parts.push(acao + (processo ? ` nº ${processo}` : ''));
      else if (processo) parts.push(`Processo nº ${processo}`);
    } else if (state.doc === 'recurso') {
      const classe = f('classe');
      const processo = f('processo');
      if (classe) parts.push(classe + (processo ? ` nº ${processo}` : ''));
      else if (processo) parts.push(`Processo nº ${processo}`);
      if (f('acao')) parts.push(f('acao'));
    }
    return parts.join(' · ');
  }

  function timbreHtml() {
    return `<header class="esc-timbre">
      <span class="esc-timbre-nome">Danilo Ferreira Bortoli</span>
      <span class="esc-timbre-sub">Advocacia · OAB/SP 409.024 · Marília, São Paulo</span>
    </header>`;
  }

  function assinaturaHtml() {
    const out = [];
    const fecho = f('fecho');
    if (fecho) out.push(`<p class="esc-fecho">${escapeHtml(fecho)}</p>`);
    const local = f('local');
    if (local) out.push(`<p class="esc-local-data">${escapeHtml(local)}, ${dateExtenso()}.</p>`);
    const linhas = (state.fields.assinaturas || '').split('\n').map((l) => l.trim());
    if (linhas.some(Boolean)) {
      const html = linhas.map((l) => {
        if (!l) return '<span class="esc-assin-gap"></span>';
        if (/^oab/i.test(l)) return `<span class="esc-assin-oab">${escapeHtml(l)}</span>`;
        return `<span class="esc-assin-nome">${escapeHtml(l)}</span>`;
      }).join('');
      out.push(`<div class="esc-assinaturas">${html}</div>`);
    }
    return out.join('');
  }

  function quadroHonorariosHtml() {
    const rows = [];
    if (f('modalidade')) rows.push(['Modalidade', f('modalidade')]);
    if (f('valor')) rows.push(['Valor', f('valor')]);
    if (f('condicoes')) rows.push(['Condições de pagamento', f('condicoes')]);
    if (f('validade')) rows.push(['Validade da proposta', f('validade')]);
    if (!rows.length) return '';
    return `<table class="esc-quadro"><caption>Quadro-resumo dos honorários</caption><tbody>` +
      rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('') +
      '</tbody></table>';
  }

  // ===========================================================================
  // 5. Render da folha A4
  // ===========================================================================

  function render() {
    const out = [timbreHtml()];
    const doc = state.doc;

    if (doc === 'peticao' || doc === 'recurso') {
      const end = buildEnderecamento();
      if (end) out.push(`<p class="esc-enderecamento">${escapeHtml(end)}</p>`);
      const ref = buildRefLine();
      if (ref) out.push(`<p class="esc-ref">${escapeHtml(ref)}</p>`);
      if (f('tituloPeca')) out.push(`<p class="esc-titulo-peca">${escapeHtml(f('tituloPeca'))}</p>`);
    }

    if (doc === 'parecer') {
      out.push(`<h1 class="esc-doc-title">Parecer${f('referencia') ? ` nº ${escapeHtml(f('referencia'))}` : ''}</h1>`);
      const dl = [];
      if (f('consulente')) dl.push(['Consulente', f('consulente')]);
      if (f('processoRelacionado')) dl.push(['Processo', f('processoRelacionado')]);
      if (f('objeto')) dl.push(['Objeto', f('objeto')]);
      if (dl.length) {
        out.push('<dl class="esc-parecer-meta">' +
          dl.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('') + '</dl>');
      }
      if (f('ementa')) {
        out.push(`<div class="esc-ementa"><span class="esc-ementa-label">Ementa</span><p>${escapeHtml(f('ementa'))}</p></div>`);
      }
    }

    if (doc === 'proposta') {
      out.push('<h1 class="esc-doc-title">Proposta de honorários advocatícios</h1>');
      if (f('destinatario')) out.push(`<p class="esc-destinatario">Ao(À): ${escapeHtml(f('destinatario'))}</p>`);
      if (f('objeto')) out.push(`<p class="esc-ref">Ref.: ${escapeHtml(f('objeto'))}</p>`);
    }

    if (doc === 'generico') {
      if (f('titulo')) out.push(`<h1 class="esc-doc-title">${escapeHtml(f('titulo'))}</h1>`);
      if (f('destinatario')) out.push(`<p class="esc-destinatario">Ao(À): ${escapeHtml(f('destinatario'))}</p>`);
      if (f('assunto')) out.push(`<p class="esc-ref">Ref.: ${escapeHtml(f('assunto'))}</p>`);
    }

    let bodyHtml = '';
    try { bodyHtml = marked.parse(state.source || ''); }
    catch (e) { bodyHtml = `<p style="color:var(--color-accent)">Erro ao renderizar: ${escapeHtml(e.message)}</p>`; }
    out.push(`<div class="esc-body">${bodyHtml}</div>`);

    if (doc === 'proposta') out.push(quadroHonorariosHtml());
    if (doc === 'peticao' && f('valorCausa')) {
      out.push(`<p class="esc-valor-causa">Dá-se à causa o valor de ${escapeHtml(f('valorCausa'))}.</p>`);
    }
    out.push(assinaturaHtml());

    sheet.innerHTML = out.join('');
    updateStatusBar();
  }

  function updateStatusBar() {
    const text = (state.source || '').replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    $('#ed-status-words').textContent = words + ' palavras';
    $('#ed-status-filename').textContent = generateFilename();
  }

  // ===========================================================================
  // 6. Front matter + arquivo
  // ===========================================================================

  function slugify(str) {
    return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function generateFilename() {
    const base = f('referencia') || f('cliente') || f('consulente') || f('destinatario') || f('titulo') || 'documento';
    return `${f('data') || todayISO()}-${state.doc}-${slugify(base) || 'documento'}.md`;
  }

  function yamlString(s) {
    if (s == null || s === '') return '';
    if (/[:#&*!|>%@`{}\[\],]|^["'-]|^\s|\s$|\n/.test(String(s))) {
      return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return String(s);
  }

  function generateFrontmatter() {
    const lines = ['---', `tipo: ${state.doc}`];
    fieldDefs(state.doc).forEach((def) => {
      const v = f(def.id);
      if (v && def.id !== 'enderecamentoCustom') lines.push(`${def.id}: ${yamlString(v)}`);
    });
    const end = buildEnderecamento();
    if (end) lines.push(`enderecamento: ${yamlString(end)}`);
    lines.push('---', '');
    return lines.join('\n');
  }

  function generateFullDocument() {
    return generateFrontmatter() + (state.source || '');
  }

  function downloadMd() {
    saveClienteAtual();
    const filename = generateFilename();
    const blob = new Blob([generateFullDocument()], { type: 'text/markdown;charset=utf-8' });
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
    try {
      await navigator.clipboard.writeText(generateFullDocument());
      toast('Markdown copiado pra área de transferência');
    } catch (e) {
      toast('Falha ao copiar — tente novamente');
    }
  }

  function exportPdf() {
    saveClienteAtual();
    persist();
    const prev = document.title;
    document.title = generateFilename().replace(/\.md$/, '');
    window.print();
    document.title = prev;
  }

  // ===========================================================================
  // 7. Caderno de clientes (localStorage)
  // ===========================================================================

  const CLIENTES_KEY = 'escritorio:clientes:v1';

  function readClientes() {
    try {
      const raw = localStorage.getItem(CLIENTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveClienteAtual() {
    const nome = f('cliente') || f('consulente');
    if (!nome) return;
    const clientes = readClientes();
    const qual = f('qualificacao');
    if (qual || !clientes[nome]) {
      clientes[nome] = qual || clientes[nome] || '';
      try { localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes)); } catch (e) {}
      updateClientesDatalist();
    }
  }

  function maybeFillQualificacao() {
    const nome = f('cliente');
    if (!nome || f('qualificacao')) return;
    const clientes = readClientes();
    if (clientes[nome]) {
      state.fields.qualificacao = clientes[nome];
      const el = $('[data-field="qualificacao"]');
      if (el) el.value = clientes[nome];
      toast('Qualificação preenchida do caderno de clientes');
    }
  }

  function updateClientesDatalist() {
    const dl = $('#esc-clientes-list');
    if (!dl) return;
    dl.innerHTML = Object.keys(readClientes()).sort()
      .map((n) => `<option value="${escapeAttr(n)}"></option>`).join('');
  }

  // ===========================================================================
  // 8. Comandos do toolbar
  // ===========================================================================

  function insertText(before, after, placeholder) {
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
    const value = text.replace('$1', sel);
    const before = t.value.slice(0, start);
    const after = t.value.slice(end);
    const needsLineBefore = before.length > 0 && !before.endsWith('\n\n') && !before.endsWith('\n');
    const needsLineAfter = after.length > 0 && !after.startsWith('\n');
    const padded = (needsLineBefore ? '\n\n' : (before.endsWith('\n') && !before.endsWith('\n\n') ? '\n' : '')) + value + (needsLineAfter ? '\n\n' : '\n');
    t.value = before + padded + after;
    const cursorPos = before.length + padded.length - (needsLineAfter ? 2 : 1);
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
    t.value = lineBefore + prefix + lineCurrent + sel + after;
    t.selectionStart = lineBefore.length + prefix.length + lineCurrent.length;
    t.selectionEnd = t.selectionStart + sel.length;
    t.focus();
    state.source = t.value;
    render();
    autosave();
  }

  // Parágrafo de abertura no estilo do modelo: direto, sem "vem respeitosamente".
  function aberturaText() {
    const cliente = f('cliente') || '[CLIENTE]';
    const contraria = f('parteContraria') || '[PARTE CONTRÁRIA]';
    if (state.doc === 'recurso') {
      const classe = (f('classe') || 'recurso').toLowerCase();
      const acao = (f('acao') || 'ação').toLowerCase();
      return `${cliente}, nos autos da ${acao} que move contra ${contraria}, interpõe a presente ${classe} contra a decisão de fls. […], pelas razões seguintes.`;
    }
    const processo = f('processo');
    if (processo) {
      const acao = (f('acao') || 'ação').toLowerCase();
      return `${cliente}, nos autos da ${acao} que move contra ${contraria}, requer […], pelos fundamentos seguintes.`;
    }
    const qual = f('qualificacao');
    const acao = f('acao') || '[AÇÃO]';
    return `${cliente}${qual ? `, ${qual},` : ','} propõe a presente ${acao.toLowerCase()} em face de ${contraria}, pelos fundamentos seguintes.`;
  }

  const cmds = {
    bold:   () => insertText('**', '**', 'texto'),
    italic: () => insertText('*', '*', 'texto'),
    h2:     () => lineWrap('## ', 'I — SEÇÃO'),
    h3:     () => lineWrap('### ', 'Subseção'),
    link:   () => {
      const url = prompt('URL do link:');
      if (url === null || url === '') return;
      insertText('[', `](${url})`, 'texto');
    },
    ul:     () => lineWrap('- ', 'item'),
    ol:     () => lineWrap('1. ', 'item'),
    quote:  () => lineWrap('> ', 'citação'),
    hr:     () => insertBlock('---'),

    abertura: () => insertBlock(aberturaText()),

    jurisprudencia: () => {
      const trecho = prompt('Trecho citado (ementa ou passagem):');
      if (!trecho) return;
      const ref = prompt('Referência (ex.: ADI 7.582/DF, Rel. Min. Gilmar Mendes, Plenário, j. 18/12/2025):') || '';
      let block = `> "${trecho}"`;
      if (ref) block += `\n\n<p class="esc-fonte">${ref}</p>`;
      insertBlock(block);
    },

    dispositivo: () => {
      const texto = prompt('Texto do dispositivo (ex.: Art. 11. Verificada a existência…):');
      if (!texto) return;
      const ref = prompt('Diploma (ex.: Lei nº 14.701, de 20/10/2023):') || '';
      let block = `> "${texto}"`;
      if (ref) block += `\n\n<p class="esc-fonte">${ref}</p>`;
      insertBlock(block);
    },

    pedidos: () => insertBlock('Requer-se:\n\n(i) …;\n\n(ii) …;\n\n(iii) ….'),
  };

  // ===========================================================================
  // 9. Modos + troca de tipo
  // ===========================================================================

  function setDoc(doc, opts) {
    const prevDoc = state.doc;
    const prevTemplate = TEMPLATES[prevDoc] || '';
    state.doc = doc;
    htmlEl.setAttribute('data-doc', doc);
    $$('[data-segmented="doc"] button').forEach(b => b.classList.toggle('active', b.dataset.doc === doc));
    applyDefaults();
    // Corpo intocado (vazio ou template puro do tipo anterior) acompanha o novo tipo.
    if (!(opts && opts.keepSource)) {
      const src = (state.source || '').trim();
      if (src === '' || src === prevTemplate.trim()) {
        state.source = TEMPLATES[doc] || '';
        source.value = state.source;
      }
    }
    renderMetaForm();
    render();
    autosave();
  }

  function setMode(mode) {
    state.mode = mode;
    htmlEl.setAttribute('data-mode', mode);
    $$('[data-segmented="mode"] button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    render();
    if (mode !== 'pagina') source.focus();
  }

  // ===========================================================================
  // 10. Bindings + atalhos
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

    $$('.ed-toolbar button[data-cmd]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = cmds[b.dataset.cmd];
        if (cmd) cmd();
      });
    });

    $('#ed-action-download').addEventListener('click', downloadMd);
    $('#ed-action-pdf').addEventListener('click', exportPdf);
    $('#ed-action-copy').addEventListener('click', copyMd);
    $('#ed-action-new').addEventListener('click', () => newDraft());
    $('#ed-action-help').addEventListener('click', () => $('#ed-help').hidden = false);
    $('#ed-help-close').addEventListener('click', () => $('#ed-help').hidden = true);
    $('#ed-help').addEventListener('click', (e) => { if (e.target.id === 'ed-help') $('#ed-help').hidden = true; });

    $('#ed-action-drafts').addEventListener('click', showDraftsModal);
    $('#ed-drafts-close').addEventListener('click', hideDraftsModal);
    $('#ed-drafts').addEventListener('click', (e) => { if (e.target.id === 'ed-drafts') hideDraftsModal(); });
    $('#ed-drafts-new').addEventListener('click', () => { newDraft(); hideDraftsModal(); });
    $('#ed-drafts-wipe').addEventListener('click', wipeAll);

    document.addEventListener('keydown', handleKeydown);
    source.addEventListener('keydown', handleSourceKeydown);
  }

  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && !e.shiftKey && key === 'b') { e.preventDefault(); cmds.bold(); }
    else if (mod && !e.shiftKey && key === 'i') { e.preventDefault(); cmds.italic(); }
    else if (mod && !e.shiftKey && key === 'k') { e.preventDefault(); cmds.link(); }
    else if (mod && !e.shiftKey && key === 's') { e.preventDefault(); downloadMd(); }
    else if (mod && !e.shiftKey && key === 'p') { e.preventDefault(); exportPdf(); }
    else if (mod && e.shiftKey && key === 'c') { e.preventDefault(); copyMd(); }
    else if (mod && e.shiftKey && key === 'p') { e.preventDefault(); setMode('split'); }
    else if (mod && e.shiftKey && key === 'm') { e.preventDefault(); setMode('markdown'); }
    else if (mod && e.shiftKey && key === 'a') { e.preventDefault(); setMode('pagina'); }
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
      if (/^\s*$/.test(lineSoFar)) setTimeout(showSlashMenu, 0);
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
        if (/\d+\.\s/.test(m[2])) next = '\n' + m[1] + (parseInt(m[2]) + 1) + '. ';
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
    { label: 'Abertura (dos campos)', hint: 'parágrafo inicial', cmd: 'abertura' },
    { label: 'Seção', hint: '## I — SEÇÃO', cmd: 'h2' },
    { label: 'Subseção', hint: '###', cmd: 'h3' },
    { label: 'Citação longa', hint: 'recuada', cmd: 'quote' },
    { label: 'Jurisprudência', hint: 'trecho + referência', cmd: 'jurisprudencia' },
    { label: 'Dispositivo legal', hint: 'art. + diploma', cmd: 'dispositivo' },
    { label: 'Pedidos', hint: '(i), (ii)…', cmd: 'pedidos' },
    { label: 'Lista', hint: 'bullet', cmd: 'ul' },
    { label: 'Lista numerada', hint: '1.', cmd: 'ol' },
    { label: 'Régua', hint: '---', cmd: 'hr' },
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
    const left = rect.left + coords.left;
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
  // 12. Persistência / rascunhos
  // ===========================================================================

  const DRAFTS_KEY = 'escritorio:drafts:v1';
  const CURRENT_DRAFT_KEY = 'escritorio:current-draft:v1';

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

  function persist() {
    if (!state.draftId) state.draftId = newDraftId();
    const drafts = readDrafts();
    const existing = drafts[state.draftId];
    const now = new Date().toISOString();
    drafts[state.draftId] = {
      id: state.draftId,
      doc: state.doc,
      source: state.source,
      fields: { ...state.fields },
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now,
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
    const d = readDrafts()[id];
    if (!d) return false;
    state.draftId = id;
    state.doc = DOC_TYPES[d.doc] ? d.doc : 'peticao';
    state.source = d.source || '';
    state.fields = { ...(d.fields || {}) };
    try { localStorage.setItem(CURRENT_DRAFT_KEY, id); } catch (e) {}
    return true;
  }

  function load() {
    const currentId = localStorage.getItem(CURRENT_DRAFT_KEY);
    if (currentId && loadDraftFromStorage(currentId)) return;
    state.draftId = null;
    state.fields = {};
    state.source = TEMPLATES.peticao;
  }

  function listDrafts() {
    return Object.values(readDrafts()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  function loadDraft(id) {
    if (id === state.draftId) return;
    persist();
    if (loadDraftFromStorage(id)) {
      applyStateToDom();
      render();
    }
  }

  function newDraft(silent) {
    if (state.draftId) persist();
    state.draftId = null;
    state.fields = {};
    state.source = TEMPLATES[state.doc] || '';
    applyStateToDom();
    render();
    persist();
    if (!silent) {
      toast('Novo documento criado');
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

  function wipeAll() {
    if (!confirm('Apagar TODOS os rascunhos e o caderno de clientes deste navegador? Esta ação não pode ser desfeita.')) return;
    try {
      localStorage.removeItem(DRAFTS_KEY);
      localStorage.removeItem(CURRENT_DRAFT_KEY);
      localStorage.removeItem(CLIENTES_KEY);
    } catch (e) {}
    state.draftId = null;
    updateClientesDatalist();
    newDraft(true);
    renderDraftsList();
    toast('Tudo apagado deste navegador');
  }

  function countWords(s) {
    const t = (s || '').replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t ? t.split(' ').length : 0;
  }

  function formatRelativeDate(iso) {
    if (!iso) return 'agora';
    const d = new Date(iso);
    const now = new Date();
    const min = Math.floor((now - d) / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    if (hr < 24) return `há ${hr}h`;
    if (day < 7) return `há ${day} dia${day > 1 ? 's' : ''}`;
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  function draftTitle(d) {
    const fl = d.fields || {};
    return fl.referencia || fl.tituloPeca || fl.cliente || fl.consulente || fl.destinatario || fl.titulo || '';
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
      const title = draftTitle(d) ? escapeHtml(draftTitle(d)) : '<em>Sem identificação</em>';
      const docLabel = (DOC_TYPES[d.doc] || {}).label || d.doc;
      const updated = formatRelativeDate(d.updatedAt);
      const words = countWords(d.source || '');
      const isCurrent = d.id === state.draftId ? ' current' : '';
      return `
        <li class="ed-draft-item${isCurrent}" data-draft-id="${d.id}">
          <span class="ed-draft-type">${escapeHtml(docLabel)}</span>
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
        const d = readDrafts()[id];
        const title = (d && draftTitle(d)) || 'sem identificação';
        if (!confirm(`Apagar rascunho "${title}"? Esta ação não pode ser desfeita.`)) return;
        deleteDraft(id);
        renderDraftsList();
      });
    });
  }

  function applyStateToDom() {
    source.value = state.source;
    setDoc(state.doc, { keepSource: true });
  }

  // ===========================================================================
  // 13. Init
  // ===========================================================================

  function init() {
    load();
    applyStateToDom();
    setupBindings();
    updateClientesDatalist();
    render();
    if (!state.draftId) persist();
    if (state.mode !== 'pagina') source.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
