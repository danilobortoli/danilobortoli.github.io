---
title: "Elementos de Mecânica"
subtitle: "ilustrados por figuras das máquinas mais simples"
date: 2026-09-10
capitulo: "Capítulo Terceiro"
serie: "Exemplos do arquivo"
numero: 1
formato: colunas
capitular: true
continua: true
---

<span class="newthought">Seja um plano</span> erguido por uma das pontas até fazer com o horizonte o ângulo $\theta$, e sobre ele pouse uma esfera de massa $m$. O peso $mg$ atua sempre para o centro da Terra; mas o plano resiste apenas à parte dele que comprime diretamente a superfície, e o restante impele a esfera ao longo da rampa.[^1]

<figure class="art-fig">
<svg viewBox="0 0 460 200" role="img" aria-labelledby="fig1-t"><title id="fig1-t">Esfera sobre um plano inclinado, com o peso decomposto</title>
  <rect x="20" y="170" width="420" height="9" fill="url(#art-solo)"/>
  <line x1="20" y1="170" x2="440" y2="170" class="art-tinta" stroke-width="1.2"/>
  <polygon points="90,170 370,170 370,30" fill="url(#art-madeira)" filter="url(#art-traco)"/>
  <polygon points="90,170 370,170 370,30" class="art-tinta" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M120 170 A30 30 0 0 0 116.8 156.6" class="art-tinta" stroke-width="0.8"/>
  <text x="124" y="166" class="art-rotulo">θ</text>
  <use href="#art-bola" x="210.2" y="38.5" width="56" height="56"/>
  <circle cx="238.2" cy="66.5" r="1.4" fill="#2a2521"/>
  <line x1="210.2" y1="80.5" x2="238.2" y2="136.5" class="art-tinta art-tracejada" stroke-width="0.7"/>
  <line x1="266.2" y1="122.5" x2="238.2" y2="136.5" class="art-tinta art-tracejada" stroke-width="0.7"/>
  <line x1="238.2" y1="66.5" x2="210.2" y2="80.5" class="art-tinta" stroke-width="1.1" marker-end="url(#art-seta)"/>
  <line x1="238.2" y1="66.5" x2="266.2" y2="122.5" class="art-tinta" stroke-width="1.1" marker-end="url(#art-seta)"/>
  <line x1="238.2" y1="66.5" x2="238.2" y2="136.5" class="art-tinta" stroke-width="1.1" marker-end="url(#art-seta)"/>
  <text x="152.2" y="70.5" class="art-rotulo">mg sen θ</text>
  <text x="272.2" y="124.5" class="art-rotulo">mg cos θ</text>
  <text x="244.2" y="140.5" class="art-rotulo">mg</text>
  <line x1="410" y1="30" x2="410" y2="170" class="art-tinta" stroke-width="0.8" marker-start="url(#art-cota-i)" marker-end="url(#art-cota-f)"/>
  <line x1="374" y1="30" x2="416" y2="30" class="art-tinta" stroke-width="0.5"/>
  <text x="416" y="104" class="art-rotulo">h</text>
</svg>
<figcaption><span class="art-fig-num">Fig. 1.</span> A esfera no ponto em que o seu peso se divide: uma parte ao longo do plano, outra contra a madeira.</figcaption>
</figure>

A figura mostra a esfera no ponto em que o seu peso é assim dividido. A parte $mg\,\mathrm{sen}\,\theta$ jaz ao longo do plano e por si só produz movimento; a parte $mg\cos\theta$ é inteiramente sustentada pela madeira. Se a esfera rola sem escorregar, uma porção da força motriz se gasta em fazê-la girar, e a descida se encontra proceder com a aceleração

$$ a = \tfrac{5}{7}\, g\, \mathrm{sen}\,\theta, $$

que é menor do que a de um corpo que deslizasse livremente sobre um plano sem atrito, ainda que independente do tamanho e do peso da esfera.

## Da alavanca

Uma barra que repousa sobre um apoio e carrega pesos nas duas pontas está em repouso quando os pesos estão entre si na razão inversa das suas distâncias ao apoio. Assim, na Fig. 2, o peso maior, por estar mais perto do apoio, equilibra o menor colocado mais longe; e a regra é

$$ W_1\, a = W_2\, b. $$

<figure class="art-fig">
<svg viewBox="0 0 420 200" role="img" aria-labelledby="fig2-t"><title id="fig2-t">Dois pesos em equilíbrio sobre uma alavanca</title>
  <rect x="20" y="160" width="380" height="9" fill="url(#art-solo)"/>
  <line x1="20" y1="160" x2="400" y2="160" class="art-tinta" stroke-width="1.2"/>
  <polygon points="196,160 234,160 215,122" fill="url(#art-hachura)"/>
  <polygon points="196,160 234,160 215,122" class="art-tinta" stroke-width="1.1" stroke-linejoin="round"/>
  <rect x="40" y="116" width="350" height="7" fill="url(#art-madeira)"/>
  <rect x="40" y="116" width="350" height="7" class="art-tinta" stroke-width="1"/>
  <use href="#art-peso" x="80" y="57" width="60" height="60"/>
  <use href="#art-peso" x="319" y="75" width="42" height="42"/>
  <text x="103" y="50" class="art-rotulo">W<tspan baseline-shift="sub" font-size="8">1</tspan></text>
  <text x="334" y="68" class="art-rotulo">W<tspan baseline-shift="sub" font-size="8">2</tspan></text>
  <line x1="110" y1="128" x2="110" y2="186" class="art-tinta" stroke-width="0.5"/>
  <line x1="215" y1="128" x2="215" y2="186" class="art-tinta" stroke-width="0.5"/>
  <line x1="340" y1="128" x2="340" y2="186" class="art-tinta" stroke-width="0.5"/>
  <line x1="112" y1="182" x2="213" y2="182" class="art-tinta" stroke-width="0.8" marker-start="url(#art-cota-i)" marker-end="url(#art-cota-f)"/>
  <line x1="217" y1="182" x2="338" y2="182" class="art-tinta" stroke-width="0.8" marker-start="url(#art-cota-i)" marker-end="url(#art-cota-f)"/>
  <text x="160" y="196" class="art-rotulo">a</text>
  <text x="276" y="196" class="art-rotulo">b</text>
</svg>
<figcaption><span class="art-fig-num">Fig. 2.</span> Dois pesos em equilíbrio sobre uma alavanca.</figcaption>
</figure>

## Da tábua dos momentos

Convém ao leitor ter à mão, para os pesos de uso corrente, o momento de cada um a distâncias redondas do apoio. A tabela abaixo foi computada com o produto simples $W \times d$, em unidades arbitrárias, e serve apenas de exercício.[^2]

| Peso | 1 | 2 | 3 | 4 |
|:-----|--:|--:|--:|--:|
| 1 | 1 | 2 | 3 | 4 |
| 2 | 2 | 4 | 6 | 8 |
| 3 | 3 | 6 | 9 | 12 |
| 5 | 5 | 10 | 15 | 20 |

{% include ornamento-artigo.html %}

<figure class="art-plate">
<header class="art-plate-head">
<p class="art-plate-num">Prancha I</p>
<p class="art-plate-title">O telescópio astronômico de Kepler</p>
<p class="art-plate-sub">o curso dos raios traçado através de duas lentes convexas</p>
</header>
<svg viewBox="0 0 900 250" role="img" aria-labelledby="pr1-t"><title id="pr1-t">Traçado de raios através da objetiva e da ocular de um telescópio de Kepler</title>
  <line x1="30" y1="120" x2="870" y2="120" class="art-tinta art-pontilhada" stroke-width="0.8"/>
    <polyline points="40,66 150,66 520,120 640,137.5 860,137.5" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,84 150,84 520,120 640,131.7 860,131.7" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,102 150,102 520,120 640,125.8 860,125.8" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,120 150,120 520,120 640,120.0 860,120.0" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,138 150,138 520,120 640,114.2 860,114.2" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,156 150,156 520,120 640,108.3 860,108.3" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,174 150,174 520,120 640,102.5 860,102.5" class="art-tinta" stroke-width="0.7"/>
  <polyline points="40,72.6 150,66 520,97.8 640,108.1 860,148.8" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,90.6 150,84 520,97.8 640,102.3 860,143.0" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,108.6 150,102 520,97.8 640,96.4 860,137.1" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,126.6 150,120 520,97.8 640,90.6 860,131.3" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,144.6 150,138 520,97.8 640,84.8 860,125.5" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,162.6 150,156 520,97.8 640,78.9 860,119.6" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <polyline points="40,180.6 150,174 520,97.8 640,73.1 860,113.8" class="art-tinta art-tracejada" stroke-width="0.6"/>
  <path d="M150 46 C 172 82,172 158,150 194 C 128 158,128 82,150 46 z" fill="url(#art-hachura)"/>
  <path d="M150 46 C 172 82,172 158,150 194 C 128 158,128 82,150 46 z" class="art-tinta" stroke-width="1.1"/>
  <path d="M640 88 C 651 104,651 136,640 152 C 629 136,629 104,640 88 z" fill="url(#art-hachura)"/>
  <path d="M640 88 C 651 104,651 136,640 152 C 629 136,629 104,640 88 z" class="art-tinta" stroke-width="1.1"/>
  <circle cx="520" cy="120" r="1.8" fill="#2a2521"/>
  <circle cx="799" cy="120" r="1.8" fill="#2a2521"/>
  <g transform="translate(833 120)">
    <path d="M-22 0 C -10 -14, 10 -14, 22 0 C 10 14, -10 14, -22 0 z" class="art-tinta" stroke-width="1"/>
    <circle cx="-6" cy="0" r="7" fill="url(#art-hachura-fina)" class="art-tinta" stroke-width="0.8"/>
    <circle cx="-6" cy="0" r="2.6" fill="#2a2521"/>
  </g>
  <text x="146" y="36" class="art-rotulo">A</text>
  <text x="517" y="138" class="art-rotulo">F</text>
  <text x="636" y="80" class="art-rotulo">B</text>
  <text x="795" y="138" class="art-rotulo">O</text>
  <line x1="40" y1="222" x2="90" y2="222" class="art-tinta" stroke-width="0.8"/>
  <text x="98" y="225" class="art-miudo art-rotulo">raios de uma estrela sobre o eixo</text>
  <line x1="40" y1="238" x2="90" y2="238" class="art-tinta art-tracejada" stroke-width="0.8"/>
  <text x="98" y="241" class="art-miudo art-rotulo">raios de uma estrela a dois graus dele</text>
</svg>
</figure>

## Do telescópio

A objetiva $A$ recebe os raios de uma estrela quase paralelos e os reúne no seu foco $F$. Os raios de uma segunda estrela, inclinados em relação aos da primeira, são levados a um foco um pouco acima ou abaixo de $F$, de modo que no plano focal se forma uma pequena imagem invertida do campo.

A ocular $B$ está posta à sua própria distância focal além desse plano. Ela devolve cada pincel ao paralelismo, mas os pincéis agora divergem uns dos outros mais abruptamente do que as próprias estrelas; todos eles atravessam a pequena abertura em $O$, onde se coloca a pupila do observador.

## Da composição

Nenhum traço destas figuras foi desenhado à mão livre. As hachuras, os veios da madeira, a esfera sombreada a traço e as setas de cota são padrões e símbolos de uma pequena biblioteca de gravura em SVG, definida uma vez por página; cada figura é um `<svg>` escrito diretamente no texto, que os invoca por nome. Mudar uma coordenada move a esfera, as setas e os rótulos juntos, e os rótulos são compostos na fonte da própria página.

[^1]: A demonstração remonta a Galileu, *Discorsi*, terceira jornada; o valor de $\tfrac{5}{7}$ para a esfera maciça vem do seu momento de inércia, $\tfrac{2}{5} m r^2$.
[^2]: As tábuas dos periódicos antigos eram calculadas na composição; aqui a tabela é escrita à mão em markdown, mas nada impede gerá-la por script.
