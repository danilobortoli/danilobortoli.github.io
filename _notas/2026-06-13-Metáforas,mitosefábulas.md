---
title: "Metáforas, mitos e fábulas"
date: 2026-06-13 17:21:00 -0300
---
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">last one <a href="https://t.co/utFCuOxULT">pic.twitter.com/utFCuOxULT</a></p>&mdash; Rhys (@RhysSullivan) <a href="https://x.com/RhysSullivan/status/2065665447043997878?ref_src=twsrc%5Etfw">June 13, 2026</a></blockquote> <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script> 

Depois de escrever [mais um de seus textos](https://darioamodei.com/post/policy-on-the-ai-exponential) em seu *blog* e pedir mais regulamentação à indústria de inteligência artificial, Dario Amodei teve, enfim, o que queria: mais regulação. Não em cima dos competidores ou, ainda, contra competidores *especificamente estrangeiros* - penso aqui no mercado chinês, mas contra a própria Anthropic.

Ontem a empresa divulgou que recebeu da Casa Branca ofício de lavra do Secretário de Comércio, Howard Lutnick, dirigido ao CEO, Dario Amodei, escrita em conjunto com funcionários do *Bureau of Industry and Security*, o BIS. Em suma, a missiva comunicava diretiva que proíbe a comercialização e uso do Fable 5 e Mythos, os LLMs mais "potentes" da Anthopic, por estrangeiros, incluindo aí os próprios funcionários da Anthropic que não são nativos norte-americanos. Na prática, para garantir compliance, a empresa desativou o acesso aos modelos a qualquer pessoa no mundo inteiro.

Citando apenas preocupações do governo estadunidense acerca de "segurança nacional", isso foi o quanto informado pela empresa:

> The US government, citing national security authorities, has issued an export control directive to suspend all access to Fable 5 and Mythos 5 by any foreign national, whether inside or outside the United States, including foreign national Anthropic employees. The net effect of this order is that we must abruptly disable Fable 5 and Mythos 5 for all our customers to ensure compliance. Access to all other Anthropic models will not be affected.
> 
> We received the directive from the government today at 5:21pm (ET). The letter did not provide specific details of its national security concern. Our understanding is that the government believes it has become aware of a method of bypassing, or “jailbreaking” Fable 5. We reviewed a demonstration of this specific technique being used to identify a small number of previously known, minor vulnerabilities. These vulnerabilities all appear relatively simple, and we have found that other publicly-available models are able to discover them as well without requiring a bypass.

O mais importante aqui é que a preocupação do governo de Donald Trump repousaria na suspeita de que seria possível realizar o *jailbreak* do modelo ofertado a consumidores, o Fable 5, utilizando-o para atividades potencialmente maliciosas.

Agora, basicamente, prova-se do próprio veneno:

> We are complying with the government’s legal directive and are removing access to Fable 5 and Mythos 5 for all users. However, we disagree that the finding of a narrow potential jailbreak should be cause for recalling a commercial model deployed to hundreds of millions of people. If this standard was applied across the industry, we believe it would essentially halt all new model deployments for all frontier model providers.
> 
> As we have stated publicly, we believe the government should have the ability to block unsafe deployments, as part of a statutory process that is transparent, fair, clear, and grounded in technical facts.

Mas justificam a discordância ao final: "This action does not adhere to those principles."

Não é a primeira investida do governo de Trump contra a Anthropic, que a classificou mais cedo nesse ano como uma *supply-chain risk* (vide para tanto [aqui](https://danilobortoli.github.io/notas/2026-02-28-18-32/)).

Pelo que o próprio laboratório de IA comenta, o ofício nem a diretiva dão um embasamento jurídico específico para a magnitude da decisão, ato que seria facilmente contestável, dizem. Contudo, a decisão do governo federal utiliza a *Export Control Reform Act* de 2018 e as *Export Administration Regulations* (*EAR*), que confereria amplos poderes ao Estado para controlar a exportação e transferência de itens militares, de duplo uso e os comerciais. O ECRA, enfim:

> “closes gaps in our export controls that could permit transfers of cutting-edge technology like artificial intelligence and advanced semiconductors to potential adversaries such as Beijing.”[^1]

O BIS já tinha, em janeiro de 2025, delimitado a possibilidade de controle de exportação de modelos de inteligência artificial de ponta, tal como o Claude e, agora, o Mythos e o Fable 5. São, na prática, classificados como ECCN 4E091, o que exigiria licenças específicas para modelos _closed source_ - fechados, portanto - e que são treinados com mais de 10²⁶ operações computacionais.[^2]

Pelas más línguas que correm por aí, teria sido a Amazon a alertar o Departamento de Comércio sobre a possibilidade de *jailbreak* dos modelos.

Enquanto isso, a Anthropic - com alguma razão - reclama da desproporcionalidade da medida e há [quem diga](https://www.lawfaremedia.org/article/trump-s-illegal-ai-chip-export-controls--and-who-can-challenge-them) que tal controle governamental sobre a iniciativa privada - especialmente os poderes conferidos pelo ECRA - são ilegais e inconstitucionais.

Também enquanto isso, acredito que a lição a ser aprendida - no momento em que a legalidade dos atos do Departamento de Comércio nessa corrida da IA *a la* Guerra Fria são alvo de escrutínio - é que a estratégia de _marketing_ de Amodei saiu pela culatra. Espalhar aos quatro ventos como o seu modelo *closed source* é extramamente perigoso e seu uso ao consumidor comum não pode ser autorizado, em qualquer outro marco histórico, seria risível, mas tinha, por razões inexplicáveis, ganhado ares apocalípticos. Finalmente, os rumos são corrigidos.

[^1]: Vide: Center for Strategic & International Studies, [*Understanding U.S. Allies’ Current Legal Authority to Implement AI and Semiconductor Export Controls*](https://www.csis.org/analysis/understanding-us-allies-current-legal-authority-implement-ai-and-semiconductor-export). [↩︎](#fnref1)
    
[^2]: Visto em: "The Rule implements this vision by: (1) creating new controls on the most advanced AI model weights (new ECCN 4E091), (2) updating controls on advanced computing integrated circuits (ACICs, updated ECCNs 3A090.a, 4A090.a, and related .z commodities, software, and technology), and (3) updating security requirements for storing and building ACICs and covered AI model weights outside the United States." ([*AI Models, Chips, and Data Centers Targeted by Expansive US Export Control Rule*](https://www.lexology.com/library/detail.aspx?g=b8d249ca-4d3f-45bb-b239-9866c8434ebd)) 
