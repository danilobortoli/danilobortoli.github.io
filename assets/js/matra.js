/**
 * MATRA — editor de documentos institucionais
 * ===========================================
 * Variante do Escritório para a OSCIP MATRA — Marília Transparente:
 * pedidos de acesso à informação (LAI), recursos LAI, representações,
 * ofícios, atas de diretoria e documentos livres.
 *
 * Mesma mecânica do escritorio.js (markdown + folha A4, rascunhos locais,
 * PDF via Paged.js), com timbre, acento e fórmulas da MATRA. As partes
 * obrigatórias do pedido LAI (apresentação e os três parágrafos de
 * fechamento) saem prontas dos campos — o corpo fica para a
 * contextualização e as solicitações.
 *
 * Tudo é client-side: rascunhos e caderno de órgãos vivem no localStorage.
 */
(function () {
  'use strict';

  // ===========================================================================
  // 1. Dados institucionais + esquema dos tipos de documento
  // ===========================================================================

  // Dados da OSCIP. Edite aqui quando mudar presidência, sede ou contato.
  const MATRA = {
    nome: 'OSCIP MATRA – Marília Transparente',
    sigla: 'MATRA',
    cnpj: '08.462.288/0001-28',
    sede: 'Avenida Carlos Gomes, 167, sala 41, Edifício JB, Centro, Marília-SP',
    presidente: 'Hildebrando de Azevedo Souza',
  };

  // Rodapé impresso em todo documento. Campo vazio = omitido.
  const RODAPE = {
    endereco: 'Av. Carlos Gomes, 167, sala 41 · Ed. JB · Centro · Marília-SP',
    site: 'matra.org.br',
    email: '',
  };

  // Logo oficial (PNG transparente). Se não carregar, o timbre cai no
  // logotipo tipográfico. Uma versão vetorial pode entrar antes na lista.
  const LOGO_CANDIDATOS = [
    '/assets/images/matra/logo-matra.png',
  ];
  let logoUrl = '';

  const ASSINATURA_PADRAO = `${MATRA.presidente}\nPresidente`;

  const APRESENTACAO_LAI =
    'A OSCIP MATRA – Marília Transparente, organização da sociedade civil de interesse público, ' +
    'no exercício de sua missão de fiscalização da gestão pública e com fundamento no artigo 5º, ' +
    'inciso XXXIII, da Constituição Federal, bem como na Lei Federal nº 12.527/2011 (Lei de Acesso ' +
    'à Informação), vem, respeitosamente, à presença de Vossa Senhoria, requerer ';

  // Os três parágrafos de fechamento obrigatórios de todo pedido LAI da MATRA.
  const FECHAMENTO_LAI = [
    'Em observância à Lei de Acesso à Informação, solicitamos que as informações sejam prestadas no prazo legal de 20 dias.',
    'Em observância ao art. 8º, §3º da Lei nº 12.527/2011, ao Decreto Federal nº 8.777/2016 (Política de Dados Abertos do ' +
      'Poder Executivo Federal), à Parceria para Governo Aberto (Open Government Partnership - OGP) da qual o Brasil é ' +
      'signatário desde 2011, e aos princípios estabelecidos na Carta Internacional de Dados Abertos (International Open ' +
      'Data Charter), requer-se que as informações sejam disponibilizadas em formato aberto, estruturado e legível por ' +
      'máquina (como CSV, JSON ou XML), possibilitando o livre reuso e cruzamento com outras bases de dados.',
    'Na eventualidade de não ser possível fornecer alguma das informações solicitadas, requeremos a apresentação do ' +
      'fundamento legal específico que justifica a negativa, conforme previsto na Lei de Acesso à Informação.',
  ];

  // Destinatários de representação: linha de endereçamento + fundamento da
  // legitimidade, que a "Abertura" usa.
  const DESTINOS_REPRESENTACAO = [
    {
      label: 'Ao Ministério Público do Estado de São Paulo — Promotoria de Justiça de Marília',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, da Constituição Federal, no art. 6º da Lei nº 7.347/1985 e no art. 14 da Lei nº 8.429/1992',
    },
    {
      label: 'Ao Ministério Público Federal — Procuradoria da República no Município de Marília',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, da Constituição Federal, no art. 6º da Lei nº 7.347/1985 e no art. 14 da Lei nº 8.429/1992',
    },
    {
      label: 'Ao Tribunal de Contas do Estado de São Paulo',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, e no art. 74, § 2º, c/c o art. 75, da Constituição Federal',
    },
    {
      label: 'Ao Tribunal de Contas da União',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, e no art. 74, § 2º, da Constituição Federal',
    },
    {
      label: 'À Câmara Municipal de Marília',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, da Constituição Federal',
    },
    {
      label: 'À Controladoria-Geral da União',
      fundamento: 'no art. 5º, inciso XXXIV, alínea “a”, da Constituição Federal e no art. 14 da Lei nº 8.429/1992',
    },
  ];

  // Órgãos frequentes — sugestões do campo de órgão (somadas ao caderno).
  const ORGAOS_SUGERIDOS = [
    'Prefeitura Municipal de Marília',
    'Câmara Municipal de Marília',
    'DAEM — Departamento de Água e Esgoto de Marília',
    'EMDURB — Empresa Municipal de Mobilidade Urbana de Marília',
  ];

  // Linha compartilhada de fecho/assinatura.
  function assinaturaRow(fechoDefault, opts) {
    const row = [
      { id: 'fecho', label: 'Fecho', placeholder: 'Atenciosamente,', default: fechoDefault, grow: 1 },
    ];
    if (!(opts && opts.semLocal)) row.push({ id: 'local', label: 'Local', default: 'Marília' });
    row.push({ id: 'assinaturas', label: 'Assinaturas (nome e cargo; linha em branco separa signatários)', type: 'textarea', default: ASSINATURA_PADRAO, grow: 1 });
    return row;
  }

  const DOC_TYPES = {
    lai: {
      label: 'Pedido LAI',
      rows: [
        [
          { id: 'orgao', label: 'Órgão destinatário (uma linha por nível)', type: 'textarea', placeholder: 'Secretaria Municipal da Saúde\nPrefeitura Municipal de Marília', grow: 2, list: 'mt-orgaos-list' },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'ac', label: 'A/C (opcional)', placeholder: 'Serviço de Informações ao Cidadão – e-SIC', grow: 1 },
          { id: 'endereco', label: 'Endereço (opcional)', placeholder: 'Rua…, nº…, Centro', grow: 1 },
          { id: 'cidade', label: 'Cidade / UF', default: 'Marília, São Paulo' },
        ],
        [
          { id: 'assunto', label: 'Ref.: tema do pedido', placeholder: 'contratos de manutenção da frota municipal', grow: 2 },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'LAI-2026-001' },
        ],
        [
          { id: 'objeto', label: 'Objeto — completa a apresentação: “…vem requerer ___”', type: 'textarea', placeholder: 'informações de interesse coletivo relativas a…', grow: 1 },
        ],
        assinaturaRow('Atenciosamente,', { semLocal: false }),
      ],
    },

    recursoLai: {
      label: 'Recurso LAI',
      rows: [
        [
          { id: 'orgao', label: 'Autoridade / órgão destinatário', placeholder: 'Ao Secretário Municipal de…', grow: 2, list: 'mt-orgaos-list' },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'instancia', label: 'Instância', type: 'select', options: ['1ª instância (art. 15 da LAI)', '2ª instância', 'Instância final / Comissão Mista', '—'] },
          { id: 'protocolo', label: 'Protocolo do pedido', placeholder: '2026.000123', grow: 1 },
          { id: 'dataPedido', label: 'Pedido em', placeholder: 'dd/mm/aaaa' },
          { id: 'dataResposta', label: 'Resposta em', placeholder: 'dd/mm/aaaa' },
        ],
        [
          { id: 'assunto', label: 'Objeto do pedido original', placeholder: 'contratos de manutenção da frota municipal', grow: 2 },
          { id: 'motivo', label: 'Motivo do recurso', type: 'select', options: ['Negativa de acesso', 'Resposta incompleta', 'Ausência de resposta no prazo', 'Ausência de fundamentação da negativa', 'Formato não aberto'] },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'RLAI-2026-001' },
        ],
        assinaturaRow('Termos em que pede provimento.'),
      ],
    },

    representacao: {
      label: 'Representação',
      rows: [
        [
          { id: 'destino', label: 'Destinatário', type: 'select', options: DESTINOS_REPRESENTACAO.map((d) => d.label), grow: 2 },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'representado', label: 'Representado(s)', placeholder: 'Município de Marília e/ou agente público…', grow: 1 },
          { id: 'objeto', label: 'Objeto', placeholder: 'Irregularidades no Pregão Eletrônico nº…', grow: 2 },
        ],
        [
          { id: 'procedimento', label: 'Procedimento relacionado (opcional)', placeholder: 'Inquérito Civil nº… / TC-…', grow: 1 },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'REP-2026-001' },
        ],
        [
          { id: 'enderecamentoCustom', label: 'Endereçamento personalizado (substitui o automático)', type: 'textarea', grow: 1 },
        ],
        assinaturaRow('Termos em que pede deferimento.'),
      ],
    },

    oficio: {
      label: 'Ofício',
      rows: [
        [
          { id: 'numero', label: 'Ofício nº', placeholder: '012/2026' },
          { id: 'data', label: 'Data', type: 'date' },
          { id: 'local', label: 'Local', default: 'Marília' },
        ],
        [
          { id: 'destinatario', label: 'Destinatário (tratamento, nome, cargo, órgão, endereço — um por linha)', type: 'textarea', placeholder: 'Ao Senhor\nFulano de Tal\nSecretário Municipal de…\nPrefeitura Municipal de Marília', grow: 2 },
          { id: 'vocativo', label: 'Vocativo', placeholder: 'Senhor Secretário,', grow: 1 },
        ],
        [
          { id: 'assunto', label: 'Assunto', placeholder: 'Solicitação de reunião sobre…', grow: 2 },
        ],
        [
          { id: 'fecho', label: 'Fecho', placeholder: 'Atenciosamente,', default: 'Atenciosamente,', grow: 1 },
          { id: 'assinaturas', label: 'Assinaturas (nome e cargo; linha em branco separa signatários)', type: 'textarea', default: ASSINATURA_PADRAO, grow: 1 },
        ],
      ],
    },

    ata: {
      label: 'Ata',
      rows: [
        [
          { id: 'numero', label: 'Ata nº', placeholder: '23/2026' },
          { id: 'data', label: 'Data da reunião', type: 'date' },
          { id: 'hora', label: 'Início', default: '07h30' },
          { id: 'tipoReuniao', label: 'Reunião', type: 'select', options: ['ordinária', 'extraordinária'] },
        ],
        [
          { id: 'mandato', label: 'Mandato', default: 'TRIÊNIO NOVEMBRO/2024 – OUTUBRO/2027', grow: 1 },
          { id: 'modalidade', label: 'Participação', type: 'select', options: ['presencial e via videoconferência', 'presencial', 'remota, via videoconferência'] },
          { id: 'secretario', label: 'Quem lavra a ata', default: 'Walter Freitas' },
        ],
        [
          { id: 'assinaturas', label: 'Assinaturas (nome e cargo; linha em branco separa signatários)', type: 'textarea', default: `${MATRA.presidente}\nPresidente\n\nWalter Freitas\nSecretário ad hoc`, grow: 1 },
        ],
      ],
    },

    generico: {
      label: 'Documento',
      rows: [
        [
          { id: 'titulo', label: 'Título do documento', placeholder: 'Nota pública', grow: 1 },
          { id: 'data', label: 'Data', type: 'date' },
        ],
        [
          { id: 'destinatario', label: 'Destinatário (opcional)', grow: 1 },
          { id: 'assunto', label: 'Referência / assunto (opcional)', grow: 1 },
          { id: 'referencia', label: 'Ref. interna', placeholder: 'DOC-2026-001' },
        ],
        assinaturaRow(''),
      ],
    },
  };

  const TEMPLATES = {
    lai: '[Contextualização: fatos, processos, reportagens e normas que motivam o pedido, com datas e fontes.]\n\n' +
      'Diante do exposto, a OSCIP MATRA requer o fornecimento das seguintes informações:\n\n(i) …;\n\n(ii) …;\n\n(iii) ….\n',
    recursoLai: '## I — O PEDIDO E A RESPOSTA\n\n1 …\n\n## II — AS RAZÕES DO RECURSO\n\n2 …\n\n## III — O PEDIDO\n\n' +
      '3 Requer-se o conhecimento e o provimento deste recurso, para que sejam fornecidas, no prazo legal, as informações solicitadas:\n\n(i) …;\n\n(ii) ….\n',
    representacao: '## I — OS FATOS\n\n1 …\n\n## II — O DIREITO\n\n2 …\n\n## III — OS PEDIDOS\n\n3 Diante do exposto, a OSCIP MATRA requer:\n\n' +
      '(i) o recebimento desta representação e a instauração do procedimento cabível;\n\n(ii) …;\n\n' +
      '(iii) a comunicação à MATRA das providências adotadas.\n\n## IV — DOCUMENTOS\n\n- Doc. 1 — Estatuto social e ata de eleição da diretoria;\n- Doc. 2 — ….\n',
    oficio: '…\n',
    ata: 'LEITURA DA ATA: foi lida e aprovada a ata da reunião anterior, sem ressalvas.\n\n' +
      '**ASSUNTOS JURÍDICOS – [TEMA]:** …. Deliberações: (i) …; (ii) ….\n\n' +
      '**ASSUNTOS GERAIS – [TEMA]:** …. Deliberações: (i) ….\n',
    generico: '',
  };

  const FECHO_DEFAULTS = new Set(['', 'Atenciosamente,', 'Termos em que pede provimento.', 'Termos em que pede deferimento.']);

  // ===========================================================================
  // 2. Estado + helpers
  // ===========================================================================

  const state = {
    draftId: null,
    doc: 'lai',            // chave de DOC_TYPES
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
    return (DOC_TYPES[doc] || DOC_TYPES.lai).rows.flat();
  }

  function f(id) {
    return (state.fields[id] || '').trim();
  }

  function lines(id) {
    return (state.fields[id] || '').split('\n').map((l) => l.trim()).filter(Boolean);
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

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  function dateExtenso(comDiaSemana) {
    const d = docDate();
    const base = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    return comDiaSemana ? `${DIAS_SEMANA[d.getDay()]}, ${base}` : base;
  }

  // Lacuna ainda não preenchida: aparece destacada na tela (não na impressão).
  function pendente(txt) {
    return `<span class="mt-pendente">${escapeHtml(txt)}</span>`;
  }

  function stripEndPunct(s) {
    return String(s || '').trim().replace(/[.,;:]+$/, '');
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
      } else if (def.type === 'select' && def.options && !def.options.includes(state.fields[def.id])) {
        // Campo compartilhado entre tipos com valor que não existe neste select.
        state.fields[def.id] = def.options[0] || '';
      }
    });
    // Fecho acompanha o tipo enquanto o usuário não o personalizar.
    const fechoDef = fieldDefs(state.doc).find((d) => d.id === 'fecho');
    if (fechoDef && FECHO_DEFAULTS.has(state.fields.fecho || '')) {
      state.fields.fecho = fechoDef.default || '';
    }
  }

  function renderMetaForm() {
    const wrap = $('#esc-meta');
    const rows = (DOC_TYPES[state.doc] || DOC_TYPES.lai).rows;
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
        if (el.dataset.field === 'orgao') maybeFillEndereco();
        render();
        autosave();
      });
    });
  }

  // ===========================================================================
  // 4. Blocos protocolares
  // ===========================================================================

  function timbreHtml() {
    const marca = logoUrl
      ? `<img class="mt-timbre-logo" src="${escapeAttr(logoUrl)}" alt="MATRA — Marília Transparente"/>`
      : '<span class="mt-timbre-sigla">MATRA</span>';
    return `<header class="esc-timbre mt-timbre">
      <span class="mt-timbre-marca">${marca}</span>
      <span class="mt-timbre-id">
        <span class="mt-timbre-nome">Marília Transparente</span>
        <span class="esc-timbre-sub">OSCIP · CNPJ ${escapeHtml(MATRA.cnpj)}</span>
      </span>
    </header>`;
  }

  function rodapeHtml() {
    const parts = [RODAPE.endereco, RODAPE.site, RODAPE.email].filter(Boolean).map(escapeHtml);
    if (!parts.length) return '';
    const inner = parts.map((p) => `<span>${p}</span>`)
      .join('<span class="esc-rodape-sep">·</span>');
    return `<footer class="esc-rodape mt-rodape">${inner}</footer>`;
  }

  // Notas em estilo sidenote (Tufte): sintaxe inline ^[texto da nota].
  function renderSidenotes(md) {
    let n = 0;
    return (md || '').replace(/\^\[((?:[^\[\]]|\[[^\]]*\])*)\]/g, function (_m, txt) {
      n++;
      const clean = escapeHtml(txt.trim());
      return '<span class="esc-sn">' +
        '<span class="esc-sn-ref">' + n + '</span>' +
        '<span class="esc-sn-note"><span class="esc-sn-num">' + n + '</span>' + clean + '</span>' +
        '</span>';
    });
  }

  // Signatários: blocos separados por linha em branco; em cada bloco, a
  // primeira linha é o nome e as demais, cargo/inscrição.
  function signatarios() {
    return (state.fields.assinaturas || '').split(/\n\s*\n/)
      .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
      .filter((b) => b.length);
  }

  function signatariosHtml(comLinha) {
    const blocos = signatarios();
    if (!blocos.length) return '';
    const html = blocos.map((b) =>
      '<div class="mt-signatario">' +
        (comLinha ? '<span class="esc-assin-linha"></span>' : '') +
        `<span class="esc-assin-nome">${escapeHtml(b[0])}</span>` +
        b.slice(1).map((l) => `<span class="esc-assin-oab">${escapeHtml(l)}</span>`).join('') +
      '</div>').join('');
    return `<div class="esc-assinaturas mt-assinaturas">${html}</div>`;
  }

  // Fecho padrão: fecho, local/data (salvo quando a data já vai no topo),
  // entidade e signatários — num bloco que não se parte na paginação.
  function closingHtml(opts) {
    const out = [];
    const fecho = f('fecho');
    if (fecho) out.push(`<p class="esc-fecho">${escapeHtml(fecho)}</p>`);
    if (!(opts && opts.semData)) {
      const local = f('local');
      if (local) out.push(`<p class="esc-local-data">${escapeHtml(local)}, ${dateExtenso()}.</p>`);
    }
    out.push(`<p class="mt-entidade">${escapeHtml(MATRA.nome)}</p>`);
    out.push(signatariosHtml(false));
    return `<div class="esc-closing">${out.join('')}</div>`;
  }

  function metaDl(pares) {
    const dl = pares.filter(([, v]) => v);
    if (!dl.length) return '';
    return '<dl class="esc-parecer-meta">' +
      dl.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('') + '</dl>';
  }

  // ---- Pedido LAI ----------------------------------------------------------

  function laiRefTexto() {
    const tema = stripEndPunct(f('assunto'));
    if (!tema) return '';
    return /^pedido de acesso/i.test(tema) ? tema : `Pedido de acesso à informação – ${tema}`;
  }

  function laiTopoHtml() {
    const out = [];
    const local = f('local') || 'Marília';
    out.push(`<p class="esc-local-data mt-data-topo">${escapeHtml(local)}, ${dateExtenso(true)}.</p>`);

    const dest = ['À'].concat(lines('orgao'));
    if (f('ac')) dest.push(`(A/C: ${stripEndPunct(f('ac'))})`);
    if (f('endereco')) dest.push(f('endereco'));
    if (f('cidade')) dest.push(f('cidade'));
    const destHtml = dest.length > 1
      ? dest.map(escapeHtml).join('<br>')
      : 'À<br>' + pendente('[órgão destinatário]');
    out.push(`<p class="mt-destinatario">${destHtml}</p>`);

    const ref = laiRefTexto();
    out.push(`<p class="mt-ref"><span class="mt-ref-label">Ref.</span> ${ref ? escapeHtml(ref) : pendente('Pedido de acesso à informação – [tema]')}</p>`);

    out.push('<p class="mt-vocativo">Prezado(a),</p>');
    const objeto = stripEndPunct(f('objeto'));
    out.push(`<p class="mt-apresentacao">${escapeHtml(APRESENTACAO_LAI)}` +
      `${objeto ? escapeHtml(objeto) : pendente('[descrição sintética do objeto do pedido]')}.</p>`);
    return out.join('');
  }

  function laiFechamentoHtml() {
    return '<div class="mt-fixos">' +
      FECHAMENTO_LAI.map((p) => `<p>${escapeHtml(p)}</p>`).join('') + '</div>';
  }

  // ---- Representação -------------------------------------------------------

  function destinoRepresentacao() {
    const label = f('destino');
    return DESTINOS_REPRESENTACAO.find((d) => d.label === label) || DESTINOS_REPRESENTACAO[0];
  }

  function buildEnderecamento() {
    const custom = f('enderecamentoCustom');
    if (custom) return custom;
    if (state.doc === 'representacao') return destinoRepresentacao().label;
    if (state.doc === 'recursoLai') return f('orgao');
    return '';
  }

  // ---- Ata -----------------------------------------------------------------

  function ataTituloHtml() {
    const num = f('numero') ? `Nº ${f('numero')}` : 'NR';
    const tipo = (f('tipoReuniao') || 'ordinária').toUpperCase();
    const mandato = f('mandato');
    const partes = [`ATA ${num}`];
    if (mandato) partes.push(mandato);
    partes.push(`REUNIÃO ${tipo} DE DIRETORIA DA OSCIP MATRA – MARÍLIA TRANSPARENTE`);
    return `<h1 class="mt-ata-titulo">${escapeHtml(partes.join(' – '))}</h1>`;
  }

  function ataAberturaHtml() {
    const d = docDate();
    const hora = f('hora') ? `, às ${f('hora')}` : '';
    const tipo = f('tipoReuniao') || 'ordinária';
    const modalidade = f('modalidade') || 'presencial e via videoconferência';
    return `<p class="mt-ata-abertura">Ao ${d.getDate()}º dia do mês de ${MESES[d.getMonth()]} de ${d.getFullYear()}${escapeHtml(hora)}, ` +
      `teve início a reunião ${escapeHtml(tipo)} da Organização da Sociedade Civil de Interesse Público Marília Transparente – OSCIP MATRA, ` +
      `com sede na ${escapeHtml(MATRA.sede)}, com a participação dos membros de forma ${escapeHtml(modalidade)}.</p>`;
  }

  function ataClosingHtml() {
    const quem = f('secretario');
    const lavratura = quem
      ? `Eu, ${escapeHtml(quem)}, na ausência de membros secretários, lavrei a presente ata que, lida e achada conforme, será assinada por quem de direito.`
      : 'Lavrou-se a presente ata que, lida e achada conforme, será assinada por quem de direito.';
    return '<div class="esc-closing mt-ata-closing">' +
      '<p class="mt-ata-fecho">Nada mais havendo a ser tratado, o Presidente agradeceu a presença de todos e deu por encerrada a reunião. ' +
      `${lavratura}</p>` +
      `<p class="esc-local-data">Marília, ${dateExtenso()}.</p>` +
      signatariosHtml(true) +
      '</div>';
  }

  // ===========================================================================
  // 5. Render da folha A4
  // ===========================================================================

  function render() {
    const out = [timbreHtml()];
    const doc = state.doc;

    if (doc === 'lai') out.push(laiTopoHtml());

    if (doc === 'recursoLai') {
      const end = buildEnderecamento();
      out.push(`<p class="esc-enderecamento">${end ? escapeHtml(end) : pendente('[autoridade destinatária]')}</p>`);
      out.push('<h1 class="esc-doc-title">Recurso em pedido de acesso à informação</h1>');
      out.push(metaDl([
        ['Pedido', f('protocolo') ? `nº ${f('protocolo')}${f('dataPedido') ? `, de ${f('dataPedido')}` : ''}` : ''],
        ['Objeto', f('assunto')],
        ['Resposta', f('dataResposta')],
        ['Motivo', f('motivo')],
        ['Instância', f('instancia') === '—' ? '' : f('instancia')],
      ]));
    }

    if (doc === 'representacao') {
      out.push(`<p class="esc-enderecamento">${escapeHtml(buildEnderecamento())}</p>`);
      out.push('<h1 class="esc-doc-title">Representação</h1>');
      out.push(metaDl([
        ['Representante', MATRA.nome],
        ['Representado', f('representado')],
        ['Objeto', f('objeto')],
        ['Procedimento', f('procedimento')],
      ]));
    }

    if (doc === 'oficio') {
      out.push('<div class="mt-oficio-cab">' +
        `<p class="mt-oficio-num">Ofício${f('numero') ? ` nº ${escapeHtml(f('numero'))}` : ''} – ${MATRA.sigla}</p>` +
        `<p class="esc-local-data mt-data-topo">${escapeHtml(f('local') || 'Marília')}, ${dateExtenso()}.</p>` +
        '</div>');
      const dest = lines('destinatario');
      if (dest.length) out.push(`<p class="mt-destinatario">${dest.map(escapeHtml).join('<br>')}</p>`);
      if (f('assunto')) out.push(`<p class="mt-ref"><span class="mt-ref-label">Assunto</span> ${escapeHtml(stripEndPunct(f('assunto')))}.</p>`);
      if (f('vocativo')) out.push(`<p class="mt-vocativo">${escapeHtml(f('vocativo'))}</p>`);
    }

    if (doc === 'ata') {
      out.push(ataTituloHtml());
      out.push(ataAberturaHtml());
    }

    if (doc === 'generico') {
      if (f('titulo')) out.push(`<h1 class="esc-doc-title">${escapeHtml(f('titulo'))}</h1>`);
      if (f('destinatario')) out.push(`<p class="esc-destinatario">Ao(À): ${escapeHtml(f('destinatario'))}</p>`);
      if (f('assunto')) out.push(`<p class="esc-ref">Ref.: ${escapeHtml(f('assunto'))}</p>`);
    }

    let bodyHtml = '';
    try { bodyHtml = marked.parse(renderSidenotes(state.source || '')); }
    catch (e) { bodyHtml = `<p style="color:var(--color-accent)">Erro ao renderizar: ${escapeHtml(e.message)}</p>`; }
    const hasNotes = bodyHtml.indexOf('esc-sn-note') !== -1;
    out.push(`<div class="esc-body${hasNotes ? ' esc-has-notes' : ''}">${bodyHtml}</div>`);

    if (doc === 'lai') out.push(laiFechamentoHtml());

    if (doc === 'ata') out.push(ataClosingHtml());
    else out.push(closingHtml({ semData: doc === 'lai' || doc === 'oficio' }));
    out.push(rodapeHtml());

    sheet.innerHTML = out.join('');
    updateStatusBar();
  }

  function updateStatusBar() {
    const text = (state.source || '').replace(/[`*#>_\[\]\(\)\-\!]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    $('#ed-status-words').textContent = words + ' palavras';
    $('#ed-status-filename').textContent = generateFilename();
  }

  // Procura o logo oficial nos caminhos previstos; achou, redesenha o timbre.
  function detectLogo() {
    const base = (document.querySelector('link[href*="matra.css"]') || {}).href || '';
    const root = base.replace(/\/assets\/css\/matra\.css.*$/, '');
    let i = 0;
    const tryNext = () => {
      if (i >= LOGO_CANDIDATOS.length) return;
      const url = root + LOGO_CANDIDATOS[i++];
      const img = new Image();
      img.onload = () => { logoUrl = url; render(); };
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
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
    const base = f('referencia') || f('numero') || f('assunto') || f('representado') || f('titulo') || 'documento';
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
    saveOrgaoAtual();
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

  // URLs de recursos (mesma origem do app), derivadas dos <link>/<script>
  // já presentes, para funcionar tanto em / quanto em subcaminho.
  function printAssetUrls() {
    const links = $$('link[rel="stylesheet"]').map((l) => l.href);
    const escritorioHref = links.find((h) => /escritorio\.css(\?|$)/.test(h)) || '';
    const printCss = escritorioHref.replace(/escritorio\.css.*$/, 'escritorio-print.css');
    const css = links.filter((h) => /(tokens|editor|escritorio|matra)\.css/.test(h) && !/escritorio-print/.test(h));
    if (printCss) css.push(printCss);
    const selfSrc = $$('script').map((s) => s.src).find((src) => /matra\.js(\?|$)/.test(src)) || '';
    const paged = selfSrc.replace(/js\/matra\.js.*$/, 'js/vendor/paged.polyfill.min.js');
    return { css: css, paged: paged };
  }

  /**
   * Exporta PDF paginando a folha com o Paged.js dentro de um iframe oculto.
   *
   * Paged.js quebra o documento em páginas A4 reais com margem consistente em
   * TODAS as páginas e numeração de folha — o que o CSS de impressão puro não
   * faz. Ele também dispensa os cabeçalhos/rodapés automáticos do navegador.
   * Se o Paged.js não carregar ou falhar, cai no caminho simples (folha única
   * com @page do escritorio.css), que ao menos entrega documentos curtos.
   */
  function exportPdf() {
    saveOrgaoAtual();
    persist();

    // Feedback imediato: paginar com o Paged.js leva um instante e o diálogo
    // de impressão não abre na hora — sem sinal, o botão parece travado.
    const pdfBtn = document.getElementById('ed-action-pdf');
    let btnRestored = false;
    const restoreBtn = () => {
      if (btnRestored || !pdfBtn) return;
      btnRestored = true;
      pdfBtn.disabled = false;
      pdfBtn.textContent = pdfBtn.dataset.pdfLabel || 'Exportar PDF';
    };
    if (pdfBtn) {
      pdfBtn.dataset.pdfLabel = pdfBtn.textContent;
      pdfBtn.disabled = true;
      pdfBtn.textContent = 'Gerando PDF…';
      setTimeout(restoreBtn, 12000); // seguro: nunca deixa o botão preso
    }

    const content = sheet.innerHTML; // só o interior da folha, sem o wrapper
    const assets = printAssetUrls();

    const old = document.getElementById('esc-print-frame');
    if (old) old.remove();

    const frame = document.createElement('iframe');
    frame.id = 'esc-print-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(frame);

    const fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open();
    // PagedConfig.auto=false: o Paged.js NÃO deve paginar o body sozinho —
    // chamamos Previewer.preview() manualmente. Sem isto, ele gera uma
    // primeira página fantasma a partir do próprio body do iframe.
    fdoc.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<scr' + 'ipt>window.PagedConfig={auto:false};</scr' + 'ipt></head><body></body></html>');
    fdoc.close();
    fdoc.title = generateFilename().replace(/\.md$/, '');

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      restoreBtn();
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        window.print();
      }
      setTimeout(() => frame.remove(), 60000);
    };

    const waitFontsThenPrint = () => {
      const fr = (fdoc.fonts && fdoc.fonts.ready) ? fdoc.fonts.ready : Promise.resolve();
      fr.then(() => setTimeout(doPrint, 120)).catch(doPrint);
    };

    // Caminho de reserva: imprime a folha inteira com o @page do escritorio.css.
    let fellBack = false;
    const fallbackSimplePrint = () => {
      if (printed || fellBack) return;
      fellBack = true;
      fdoc.documentElement.classList.remove('esc-hide-folio');
      fdoc.body.className = 'esc-print-root';
      fdoc.body.innerHTML = '';
      fdoc.head.innerHTML = '<meta charset="utf-8">';
      let pending = assets.css.length;
      const ready = () => { if (--pending <= 0) waitFontsThenPrint(); };
      if (!pending) waitFontsThenPrint();
      assets.css.forEach((href) => {
        const c = fdoc.createElement('link');
        c.rel = 'stylesheet';
        c.href = href;
        c.onload = c.onerror = ready;
        fdoc.head.appendChild(c);
      });
      fdoc.body.innerHTML = '<article class="esc-sheet">' + content + '</article>';
      setTimeout(doPrint, 2500);
    };

    const script = fdoc.createElement('script');
    script.src = assets.paged;
    script.onload = () => {
      try {
        const P = frame.contentWindow.Paged;
        if (!P || !P.Previewer) return fallbackSimplePrint();
        new P.Previewer().preview(content, assets.css, fdoc.body).then(() => {
          const total = fdoc.querySelectorAll('.pagedjs_page').length;
          if (total === 0) return fallbackSimplePrint();
          if (total <= 1) fdoc.documentElement.classList.add('esc-hide-folio');
          waitFontsThenPrint();
        }).catch(fallbackSimplePrint);
      } catch (e) {
        fallbackSimplePrint();
      }
    };
    script.onerror = fallbackSimplePrint;
    fdoc.head.appendChild(script);

    // Rede de segurança: se em 9s nada paginou nem imprimiu, usa o reserva.
    setTimeout(() => {
      if (!printed && !fellBack && !fdoc.querySelector('.pagedjs_page')) fallbackSimplePrint();
    }, 9000);
  }

  // ===========================================================================
  // 7. Caderno de órgãos (localStorage): órgão → endereço
  // ===========================================================================

  const ORGAOS_KEY = 'matra:orgaos:v1';

  function readOrgaos() {
    try {
      const raw = localStorage.getItem(ORGAOS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveOrgaoAtual() {
    const nome = f('orgao');
    if (!nome) return;
    const orgaos = readOrgaos();
    const end = f('endereco');
    if (end || !(nome in orgaos)) {
      orgaos[nome] = end || orgaos[nome] || '';
      try { localStorage.setItem(ORGAOS_KEY, JSON.stringify(orgaos)); } catch (e) {}
      updateOrgaosDatalist();
    }
  }

  function maybeFillEndereco() {
    const nome = f('orgao');
    if (!nome || f('endereco') || state.doc !== 'lai') return;
    const orgaos = readOrgaos();
    if (orgaos[nome]) {
      state.fields.endereco = orgaos[nome];
      const el = $('[data-field="endereco"]');
      if (el) el.value = orgaos[nome];
      toast('Endereço preenchido do caderno de órgãos');
    }
  }

  function updateOrgaosDatalist() {
    const dl = $('#mt-orgaos-list');
    if (!dl) return;
    const nomes = new Set(ORGAOS_SUGERIDOS.concat(Object.keys(readOrgaos())));
    dl.innerHTML = Array.from(nomes).sort()
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

  // Parágrafos de abertura gerados dos campos — inseridos no texto, editáveis.
  const QUALIFICACAO_MATRA =
    `a ${MATRA.nome}, organização da sociedade civil de interesse público, inscrita no CNPJ sob o nº ${MATRA.cnpj}, ` +
    `com sede na ${MATRA.sede}, neste ato representada por seu Presidente, ${MATRA.presidente}`;

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function aberturaText() {
    if (state.doc === 'representacao') {
      const repr = f('representado') || '[REPRESENTADO]';
      return `${capitalize(QUALIFICACAO_MATRA)}, vem, com fundamento ${destinoRepresentacao().fundamento}, ` +
        `apresentar REPRESENTAÇÃO em face de ${repr}, pelos fatos e fundamentos a seguir expostos.`;
    }
    if (state.doc === 'recursoLai') {
      const prot = f('protocolo') ? `nº ${f('protocolo')}` : 'nº [PROTOCOLO]';
      const em = f('dataPedido') ? `, protocolado em ${f('dataPedido')}` : '';
      const resp = f('dataResposta') ? ` comunicada em ${f('dataResposta')}` : '';
      const motivo = (f('motivo') || '').toLowerCase();
      const contra = /ausência de resposta/.test(motivo)
        ? 'em razão da ausência de resposta no prazo legal (art. 11, § 1º)'
        : `contra a resposta${resp}`;
      return `${capitalize(QUALIFICACAO_MATRA)}, nos autos do Pedido de Acesso à Informação ${prot}${em}, vem, com fundamento ` +
        `no art. 15 da Lei Federal nº 12.527/2011, interpor RECURSO ${contra}, pelas razões seguintes.`;
    }
    if (state.doc === 'oficio') {
      return `${capitalize(QUALIFICACAO_MATRA)}, vem, por meio deste, …`;
    }
    return capitalize(QUALIFICACAO_MATRA) + ', …';
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

    solicitacoes: () => insertBlock(state.doc === 'lai'
      ? 'Diante do exposto, a OSCIP MATRA requer o fornecimento das seguintes informações:\n\n(i) …;\n\n(ii) …;\n\n(iii) ….'
      : 'Diante do exposto, a OSCIP MATRA requer:\n\n(i) …;\n\n(ii) …;\n\n(iii) ….'),

    reportagem: () => {
      const veiculo = prompt('Veículo (ex.: Jornal da Manhã):');
      if (!veiculo) return;
      const titulo = prompt('Título da reportagem:') || '[título]';
      const data = prompt('Data (ex.: 12 de setembro de 2026):') || '[data]';
      insertBlock(`Reportagens noticiaram que …, conforme divulgado pelo ${veiculo} sob o título “${titulo}”, em ${data}.`);
    },

    processo: () => {
      const num = prompt('Número do processo:');
      if (!num) return;
      const orgao = prompt('Vara / tribunal (ex.: 2ª Vara da Fazenda Pública de Marília):') || '[vara/tribunal]';
      insertBlock(`Tramita perante a ${orgao} a [tipo de ação] nº ${num}, proposta por [parte] contra [parte], visando […]. Em [data] (fl. […]), o Juízo determinou […].`);
    },

    pauta: () => insertBlock('**ASSUNTOS JURÍDICOS – TEMA:** …. Deliberações: (i) …; (ii) ….'),

    jurisprudencia: () => {
      const trecho = prompt('Trecho citado (ementa ou passagem):');
      if (!trecho) return;
      const ref = prompt('Referência (ex.: TCE-SP, TC-001234.989.24, Pleno, j. 18/12/2025):') || '';
      let block = `> "${trecho}"`;
      if (ref) block += `\n\n<p class="esc-fonte">${ref}</p>`;
      insertBlock(block);
    },

    dispositivo: () => {
      const texto = prompt('Texto do dispositivo (ex.: Art. 11. O órgão ou entidade pública deverá autorizar…):');
      if (!texto) return;
      const ref = prompt('Diploma (ex.: Lei nº 12.527, de 18/11/2011):') || '';
      let block = `> "${texto}"`;
      if (ref) block += `\n\n<p class="esc-fonte">${ref}</p>`;
      insertBlock(block);
    },

    nota: () => insertText('^[', ']', 'texto da nota'),
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

  // showFor: tipos de documento em que o bloco faz sentido (omitido = todos).
  const SLASH_ITEMS = [
    { label: 'Abertura (dos campos)', hint: 'qualificação da MATRA', cmd: 'abertura', showFor: ['representacao', 'recursoLai', 'oficio', 'generico'] },
    { label: 'Solicitações', hint: '(i), (ii)…', cmd: 'solicitacoes', showFor: ['lai', 'representacao', 'recursoLai', 'oficio', 'generico'] },
    { label: 'Fato noticiado', hint: 'veículo, título, data', cmd: 'reportagem', showFor: ['lai', 'representacao', 'recursoLai', 'oficio', 'generico'] },
    { label: 'Processo judicial', hint: 'nº, vara, decisão', cmd: 'processo', showFor: ['lai', 'representacao', 'recursoLai', 'oficio', 'generico'] },
    { label: 'Assunto da ata', hint: 'RÓTULO: … Deliberações', cmd: 'pauta', showFor: ['ata'] },
    { label: 'Seção', hint: '## I — SEÇÃO', cmd: 'h2' },
    { label: 'Subseção', hint: '###', cmd: 'h3' },
    { label: 'Citação longa', hint: 'recuada', cmd: 'quote' },
    { label: 'Nota lateral', hint: 'sidenote — ^[texto]', cmd: 'nota' },
    { label: 'Jurisprudência', hint: 'trecho + referência', cmd: 'jurisprudencia' },
    { label: 'Dispositivo legal', hint: 'art. + diploma', cmd: 'dispositivo' },
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
    const items = SLASH_ITEMS.filter(i => !i.showFor || i.showFor.includes(state.doc));
    const q = getSlashQuery().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
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

  const DRAFTS_KEY = 'matra:drafts:v1';
  const CURRENT_DRAFT_KEY = 'matra:current-draft:v1';

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
    state.doc = DOC_TYPES[d.doc] ? d.doc : 'lai';
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
    state.source = TEMPLATES.lai;
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
    if (!confirm('Apagar TODOS os rascunhos e o caderno de órgãos deste navegador? Esta ação não pode ser desfeita.')) return;
    try {
      localStorage.removeItem(DRAFTS_KEY);
      localStorage.removeItem(CURRENT_DRAFT_KEY);
      localStorage.removeItem(ORGAOS_KEY);
    } catch (e) {}
    state.draftId = null;
    updateOrgaosDatalist();
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
    return fl.referencia || fl.numero || fl.assunto || fl.representado || fl.titulo || '';
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
    updateOrgaosDatalist();
    render();
    detectLogo();
    if (!state.draftId) persist();
    if (state.mode !== 'pagina') source.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
