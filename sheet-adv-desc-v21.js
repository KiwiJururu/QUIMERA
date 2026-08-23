(() => {
  const D = {
    CON: [
      [
        ['Passiva', 'Você não sofre penalidades por lutar caído e tem maior facilidade para derrubar inimigos.'],
        ['Passiva', 'Enquanto estiver consciente, um alvo agarrado ou contido por você só consegue escapar usando uma ação inteira ou recebendo ajuda externa.'],
        ['Ativa', 'Seu aperto é difícil de desfazer: você resiste melhor a desarmes e mantém objetos, alvos ou superfícies firmes mesmo sob impactos, puxões ou interferências.']
      ],
      [
        ['Ativa', 'Avance em linha reta usando seu deslocamento. Durante o avanço, pode derrubar ou quebrar obstáculos e tem vantagem para derrubar alvos do seu tamanho ou uma categoria acima. Gastar mais ações aumenta a distância.'],
        ['Passiva', 'Sua flexibilidade facilita movimentos complexos, deslocamento em espaços apertados e tentativas de escapar de contenções.'],
        ['Passiva', 'Seu corpo é difícil de quebrar: você estanca hemorragias, recoloca articulações com mais facilidade e resiste melhor a fraturas, esmagamentos e outras lesões de integridade física.']
      ],
      [
        ['Passiva', 'Na primeira vez em que entrar em Morrendo na cena, você se estabiliza automaticamente. Também resiste ao primeiro aumento de ferimento.'],
        ['Ativa', 'Quando um ataque permitir revidar, você pode aceitar o golpe com dano reduzido em metade da sua CON para receber uma oportunidade de contra-ataque.'],
        ['Passiva', 'Seu organismo resiste melhor a efeitos físicos contínuos, como veneno, doença, exaustão e sangramento. O primeiro estágio é amenizado e demora mais para piorar.']
      ],
      [
        ['Passiva', 'Quanto pior seu Marco de Vida, melhor você funciona em testes físicos: +2 na segunda fase e +3 na terceira.'],
        ['Passiva', 'É mais difícil derrubar ou arremessar você. Se ainda assim for lançado, a distância é reduzida pela metade.'],
        ['Ativa', 'Ao ser alvo de um ataque, entre em Postura de Defesa até sua próxima ação principal. Você não pode correr ou se mover; o primeiro acerto recebido tem o dano reduzido pela CON ou perde os efeitos extras, à sua escolha.']
      ]
    ],
    FOR: [
      [
        ['Ativa', 'A potência de um ataque físico aumenta em 0,25x, mas inimigos têm mais facilidade para reagir ao golpe.'],
        ['Ativa', 'Antes de atacar, declare imprudência. Até o início do seu próximo turno, ataques contra você têm vantagem; em troca, seu ataque pode empurrar, derrubar, desarmar ou quebrar.'],
        ['Ativa', 'Quando um único golpe atinge vários alvos, você não perde força entre eles e aumenta a amplitude do ataque.']
      ],
      [
        ['Ativa', 'Ações feitas para quebrar ou avariar armas, armaduras, portas, coberturas e outros objetos têm eficácia maior.'],
        ['Ativa', 'Você pode reduzir pela metade o dano de um ataque corpo a corpo para espalhar o impacto, afastando ou desestabilizando quem estiver ao redor do alvo ou transmitindo a força por uma superfície próxima.'],
        ['Reativa', 'Ao aparar um ataque, você pode receber metade do dano para devolver a outra metade à arma inimiga. Se o ataque for desarmado, o dano devolvido atinge o agressor.']
      ],
      [
        ['Passiva', 'Você pode agarrar com uma mão. Ao acertar um ataque com as mãos, pode iniciar um agarrão como parte do mesmo ataque.'],
        ['Passiva', 'Você possui maior vantagem em disputas de força contra inimigos ou contra o ambiente.'],
        ['Passiva', 'Você arremessa objetos pesados com facilidade. Quando o objeto lançado é usado como arma, o impacto aumenta.']
      ],
      [
        ['Ativa', 'Gaste 2 ações para realizar uma ação física com extrema eficácia.'],
        ['Passiva', 'Quando você acerta um golpe crítico, ele também recebe a característica de atordoamento.'],
        ['Reativa', 'Enquanto realiza uma ação, antes de saber o resultado, você pode cancelá-la e transformá-la em um teste de esquiva. Se a esquiva for crítica, a troca conta como uma finta e o alvo fica desprevenido.']
      ]
    ],
    DES: [
      [
        ['Passiva', 'Você pode realizar ações enquanto se move sem receber desvantagem, mas seu deslocamento nessa ação é reduzido pela metade.'],
        ['Passiva', 'Você não sofre penalidade de locomoção por fazer uma acrobacia ou ação de atletismo. Tem vantagem extrema contra obstáculos médios e vantagem padrão contra obstáculos grandes.'],
        ['Passiva', 'Você não recebe desvantagem por realizar ações multitarefa.']
      ],
      [
        ['Passiva', 'Você pode tentar se esconder mesmo observado, desde que exista alguma cobertura. Cobertura mínima remove a penalidade de ambiente aberto; locais realmente favoráveis à furtividade também dão vantagem na ND.'],
        ['Passiva', 'Enquanto estiver no chão, você pode rastejar sem se expor. Ataques à distância não aplicam efeitos extras sem ângulo limpo, e inimigos corpo a corpo têm mais dificuldade para acertar você.'],
        ['Passiva', 'Você não perde Defesa por estar surpreso ou desatento contra ataques que ainda poderia evitar fisicamente.']
      ],
      [
        ['Ativa', 'Você ignora a desvantagem para atingir uma ferida do alvo. Pode reabrir uma ferida fechada ou piorar a gravidade de uma ferida já aberta.'],
        ['Ativa', 'Ao acertar um oponente, você pode fazer um ataque básico imediato contra outro alvo ao alcance ou o mesmo inimigo. Numa sequência criada por essa vantagem, a classificação do d20 só cai no último ataque.'],
        ['Passiva', 'Você não sofre penalidade ao usar Desarmar. Se acertar um contra-ataque, também pode usar Desarmar como parte da oportunidade.']
      ],
      [
        ['Passiva', 'Um raio de 2 metros ao seu redor vira terreno difícil para um alvo escolhido e pode gerar bônus de flanqueamento quando você luta ao lado de um aliado.'],
        ['Ativa', 'Antes de uma ação, você pode reduzir sua eficácia pela metade para receber vantagem na próxima reação, inclusive fora de combate.'],
        ['Ativa/Passiva', 'Antes de uma cena de combate, escolha um aliado como parceiro. Enquanto estiverem ao alcance de ataque um do outro, vocês compartilham ações extras e oportunidades recebidas por um dos dois.']
      ]
    ],
    INT: [
      [
        ['Passiva', 'Escolha um ambiente. Nele, você ignora desvantagens de terreno e pode usar características do local a seu favor para facilitar certos testes.'],
        ['Passiva', 'Escolha um tipo de ameaça. Contra esse tipo, você sempre conhece um comportamento típico e, uma vez por cena, pode explorar um ponto cego coerente.'],
        ['Passiva', 'Escolha uma classe de arma. Nos testes feitos com ela, você pode usar INT no lugar do atributo normalmente exigido, mantendo a proficiência correspondente.']
      ],
      [
        ['Ativa', 'Ao realizar uma ação que gaste PD, faça um teste de eficácia usando apenas d20. Dependendo do resultado, o custo de PD é reduzido pela metade ou removido.'],
        ['Ativa', 'Quando um inimigo repetir contra você uma manobra ou ataque que você já viu na cena, você pode esquivar sem rolar dados. Máximo de 2 vezes por cena.'],
        ['Passiva', 'Você lembra com precisão detalhes que viu ou ouviu uma vez e pode reconstruir mentalmente mapas, textos, rostos e cenas sem rolagem, desde que tenha tido tempo para observar.']
      ],
      [
        ['Passiva', 'Depois de investigar algo com dedicação, você entende como seus mecanismos ou comportamentos funcionam sem precisar de novos testes. O tempo depende da complexidade.'],
        ['Ativa', 'Faça um teste de visualização para calcular um evento que ocorreu ou pode ocorrer. Só funciona quando existem evidências que permitam esse cálculo.'],
        ['Ativa', 'Quando uma ação sua falhar, declare imediatamente uma alternativa simples que já estava preparada. A falha continua existindo, mas seu efeito é reduzido. Uma vez a cada 2 turnos.']
      ],
      [
        ['Passiva', 'Quando um efeito mental já conseguiu afetar você, ele demora mais para avançar para um estado mais grave. Não reduz a primeira aplicação do efeito.'],
        ['Passiva', 'Em uma cena de exploração, depois de fazer um teste para uma tarefa, você pode repetir a mesma ação sem rolar de novo. O resultado usado será sempre o último obtido.'],
        ['Passiva', 'Você tem vantagem em testes de estabilização e recuperação.']
      ]
    ],
    PER: [
      [
        ['Passiva', 'Você não sofre desvantagem por ser alvo de ataques múltiplos ou por estar flanqueado.'],
        ['Passiva', 'A perícia usada para iniciativa recebe +1 nível de dado. Em caso de empate na iniciativa, você fica na frente.'],
        ['Passiva', 'Em testes para prever ou adivinhar algo, role um d20 extra pela regra de RA e receba vantagem nesses mesmos testes.']
      ],
      [
        ['Ativa', 'Você foca totalmente em um alvo e tenta atingir um ponto importante, aplicando uma condição debilitante. Se voltar a atacar o mesmo alvo no turno seguinte, recebe bônus igual à Proficiência de PER; se errar, fica desprevenido até o próximo turno.'],
        ['Ativa', 'Você possui grande facilidade para copiar movimentos e ações que presenciou, recebendo vantagem alta para reproduzir exatamente o que viu.'],
        ['Passiva', 'Quando enfrenta apenas um inimigo ao seu alcance e não está flanqueado, se ele errar um ataque contra você, você recebe um contra-ataque imediato.']
      ],
      [
        ['Passiva', 'Pela audição, você consegue localizar alvos na área. Tem vantagem em testes focados em ouvir e pode localizar com precisão alvos fora do ambiente imediato.'],
        ['Passiva', 'Você não sofre penalidade em testes de visão por baixa visibilidade e recebe vantagem quando o ambiente está claro.'],
        ['Ativa', 'Durante uma cena, escolha um ser no seu campo de visão. Você recebe vantagem alta para encontrá-lo ou reagir a ele, mas sofre desvantagem comum contra o restante.']
      ],
      [
        ['Ativa', 'Gaste uma ação de movimento ou principal mirando. Seu próximo ataque à distância rola 2 dados e usa o melhor resultado. Mover-se mais do que um passo curto remove o bônus.'],
        ['Passiva', 'Você tem facilidade para encontrar sucata e materiais aproveitáveis durante testes de Percepção nas cenas.'],
        ['Passiva', 'Você reconhece caminhos seguros em ambientes por onde já passou e tem vantagem para encontrar a melhor rota ou pontos mais protegidos.']
      ]
    ],
    CAR: [
      [
        ['Passiva', 'Quando aparência importa, as pessoas começam a interação com mais paciência, curiosidade ou boa vontade, até que suas atitudes deem motivo para isso mudar.'],
        ['Passiva', 'Sua aparência causa desconforto. Ao entrar numa cena social, escolha ser ignorado ou temido. Um sucesso extremo em Intimidação também causa pavor até o fim da cena.'],
        ['Ativa', 'Prenda a atenção de um grupo pequeno. Enquanto mantiver o foco e não atacar nem for atacado, os afetados ficam em transe e deixam de perceber detalhes ao redor. Dano ou choque quebra o efeito.']
      ],
      [
        ['Ativa', 'Provoque um inimigo. Se ele falhar em resistir, fica Desmoralizado por 2 turnos; se resistir, fica Enfurecido por 2 turnos.'],
        ['Passiva', 'Você chama atenção com facilidade. Contra alvos que conseguem ver você, recebe vantagem em ações de distração; em sucesso, aliados recebem bônus de circunstância em Furtividade.'],
        ['Ativa', 'Ao esquivar de um ataque, se houver outro alvo adjacente ao alcance do golpe, você pode redirecionar o ataque para ele. O atacante não pode atingir a si mesmo.']
      ],
      [
        ['Ativa/Passiva', 'Você transmite calma. Em combate, pode conversar com um aliado para retirar um estado mental uma vez por alvo. Em exploração, tem mais facilidade para estabilizar mentalmente outras pessoas.'],
        ['Passiva', 'Você se expressa muito bem e consegue planejar rapidamente ações conjuntas com aliados sem precisar proclamar tudo em voz alta.'],
        ['Passiva', 'Você tem vantagem para entender pessoas, mensagens, desenhos e outros meios de comunicação.']
      ],
      [
        ['Passiva', 'Seu estilo de luta é performático. Em ações de luta, você pode usar CAR no lugar do atributo normalmente exigido, mantendo a proficiência. Narre como a performance faz isso funcionar.'],
        ['Passiva', 'Você recebe vantagem para mentir e para perceber mentiras.'],
        ['Ativa', 'Quando uma tentativa de persuasão ou negociação falhar, você pode transformar a recusa em uma contraproposta. Se o alvo estiver minimamente disposto a negociar, revela uma condição, preço ou concessão que o faria aceitar. Uma vez por alvo por cena.']
      ]
    ],
    ESP: [
      [
        ['Ativa', 'Use um poder ou Liberação acima do normal. Depois disso, você ganha Instabilidade: o próximo efeito espiritual contra você tem efeito maior.'],
        ['Ativa', 'Sacrifique metade da eficiência de um poder para aprimorar o acerto pela regra de RA.'],
        ['Passiva', 'Você pode fazer truques simples usando suas características mágicas. O nível e a variedade aumentam conforme sua Maestria de Espírito.']
      ],
      [
        ['Passiva', 'Você pode usar ESP no lugar do atributo padrão dos seus ataques. Também pode aplicar Canalização Forçada em ataques corpo a corpo, que passam a ter uma característica de dano mágico ou paranormal coerente.'],
        ['Passiva', 'Quanto mais sua Sanidade cai, mais sua essência se manifesta. Na segunda fase, testes de poderes recebem uma terceira perícia de nível 2; na terceira, ela passa para nível 4 e sua margem de acúmulo aumenta em +2.'],
        ['Ativa', 'Gaste 2 PD e faça um teste usando Espírito e perícias adequadas para tratar injúrias espirituais, interrompendo condições que afetam diretamente a alma.']
      ],
      [
        ['Ativa/Passiva', 'Sua presença espiritual intimida seres mundanos, muito mais fracos ou vulneráveis. Você pode reduzi-la ou intensificá-la para desestabilizar seres mais fortes, atrapalhar canalizações e até interromper habilidades quando fizer sentido.'],
        ['Ativa', 'Diminua o quanto seu espírito e poder podem ser percebidos. Você recebe vantagem em Furtividade e só pode ser sentido por habilidades específicas ou pelos cinco sentidos.'],
        ['Passiva', 'Você recebe resistência a dano espiritual e pode anular efeitos ou condições de baixo nível causados por habilidades que afetam o terreno.']
      ],
      [
        ['Passiva', 'Você resiste melhor a efeitos mentais contínuos, como medo, desespero, confusão ou compulsão. A primeira aplicação bem-sucedida nunca o quebra por completo e entra como um estado mais leve.'],
        ['Ativa', 'Você consegue acumular mais poder em um único ataque. Segurar um ataque por um turno conta como o dobro de carga e você sofre menos com penalidades de sobrecarga.'],
        ['Ativa', 'Faça um teste para entender o poder de um inimigo ou aliado. Se ele tiver familiaridade ou lógica parecida com seus poderes, você pode copiá-lo por d4+1 turnos. O mesmo poder só pode ser copiado uma vez por cena e você mantém no máximo dois copiados.']
      ]
    ],
    SORTE: [
      [
        ['Passiva', 'Sempre que dois dados mostrarem o mesmo valor, você recebe +2 adicional. Se três dados mostrarem o número 7, o resultado é dobrado.'],
        ['Ativa', 'Escolha um lado e jogue uma moeda. Se acertar, ganhe +1 de classificação em um dado escolhido; se errar, perca 1 classificação no seu maior dado.'],
        ['Ativa', 'Dobre todos os seus dados, mas os resultados ficam ocultos. Sem vê-los, você precisa escolher quais dados serão válidos.']
      ],
      [
        ['Ativa', 'Uma vez por cena, após um teste, troque o resultado de um dos seus dados pelo seu número da sorte atual. Depois da troca, o número da sorte passa a ser o valor substituído.'],
        ['Ativa', 'Seu próximo teste de um tipo escolhido usa 2d20 e fica com o menor. Na próxima rolagem do mesmo tipo, use 2d20 e fique com o maior. Só um tipo pode ficar armazenado por vez.'],
        ['Passiva', 'Ao conseguir um sucesso extremo, você pode guardá-lo: o teste atual vira sucesso normal e, depois, um sucesso normal do mesmo tipo pode virar extremo. Apenas um sucesso pode ficar guardado por vez.']
      ],
      [
        ['Ativa', 'Antes de um teste, declare a ativação. Sucessos viram extremos e falhas viram desastres. Máximo de 1 vez por cena.'],
        ['Passiva', 'Se você falhar por apenas 2 pontos, o teste conta como sucesso parcial. Ao receber um ataque, você também pode tomar apenas metade do dano.'],
        ['Ativa', 'Gaste 1 PD para refazer uma rolagem sua.']
      ],
      [
        ['Passiva', 'A partir da segunda falha consecutiva, role 1d20 extra e use o maior. A quantidade de d20 extras aumenta conforme as falhas consecutivas e volta ao normal quando você obtém um sucesso.'],
        ['Passiva', 'Depois de falhar 3 vezes seguidas na cena, inimigos passam a subestimar você. Você pode atravessar zonas de ameaça sem ser o foco e suas provocações funcionam melhor como isca. O efeito termina quando você acerta algo.'],
        ['Passiva', 'Ao conseguir um sucesso crítico, aliados que presenciarem a ação recebem +1 de classificação em um dado. Em caso de desastre, o efeito é invertido.']
      ]
    ]
  };

  function decorate() {
    const attrs = [...Q.attrs.map(item => item[0]), 'SORTE'];
    document.querySelectorAll('#advantages .advattr').forEach((attrEl, attrIndex) => {
      const attr = attrs[attrIndex];
      attrEl.querySelectorAll('.advgroup').forEach((groupEl, groupIndex) => {
        groupEl.querySelectorAll('.advitem').forEach((itemEl, itemIndex) => {
          if (itemEl.querySelector('.adv-desc-btn')) return;
          const info = D?.[attr]?.[groupIndex]?.[itemIndex];
          if (!info) return;
          const label = itemEl.querySelector('label');
          if (!label) return;

          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'adv-desc-btn';
          button.textContent = 'Ver descrição';
          label.appendChild(button);

          button.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            const current = itemEl.querySelector('.adv-desc-panel');
            if (current) {
              current.remove();
              button.textContent = 'Ver descrição';
              return;
            }
            const panel = document.createElement('div');
            panel.className = 'adv-desc-panel';
            panel.innerHTML = `<b>${info[0]}</b> — ${info[1]}`;
            itemEl.appendChild(panel);
            button.textContent = 'Fechar descrição';
          };
        });
      });
    });
  }

  const previousRenderAdvantages = renderAdvantages;
  renderAdvantages = function () {
    previousRenderAdvantages();
    decorate();
  };

  try { decorate(); } catch (error) { console.warn('[Quimera descrições]', error); }
})();
