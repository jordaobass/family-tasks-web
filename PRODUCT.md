# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Adultos da casa** — os únicos com login. Usam pelo celular, em pé, no meio de outra coisa:
conferem o dia, criam tarefa, olham o progresso das crianças. Um deles é o organizador —
quem configura, convida e mantém. É dele que depende a família continuar usando.

**Crianças, de 3 a 12 anos, na mesma casa e no mesmo aparelho.** São perfis criados por um
adulto. Escolhem quem são por toque e concluem tarefas tocando no cartão. **Convivem no
painel uma criança que ainda não lê e outra já alfabetizada** — restrição confirmada pelo
dono e a mais dura do produto: a interface tem de funcionar sem leitura sem infantilizar quem
já lê.

**Adolescentes** podem existir como membros com acesso próprio. Quem decide é o responsável
da família: ele informa a idade de cada membro e liga ou desliga o login, vinculando um
e-mail. Um membro com login vê e conclui o próprio quadro — não administra a família.

## Product Purpose

Ser o **dashboard da casa inteira** numa tela fixa: o que precisa ser feito hoje, quem fez o
quê, o que vem na agenda, o que falta comprar. Tarefas com pontos são o módulo que existe
hoje; agenda e compras são módulos do mesmo painel, não produtos separados.

Sucesso é a família **ainda usar na quarta semana** — medido por criança que concluiu tarefa
nos últimos 7 dias. O produto depende de um adulto configurador: se ele cansa, a família
inteira sai.

## Positioning

**O painel que fica na parede da cozinha, em português.** A tela compartilhada é o produto;
o celular é acessório. O que um concorrente não copia de graça é a posição física na casa e o
saldo de pontos acumulado da criança — custo de troca emocional, não técnico.

Direção escolhida pelo dono em 22/08/2026, entre "app de tarefas que também roda em tablet" e
"dashboard da família inteira": venceu o dashboard. Consequência registrada: **o quadro de
tarefas divide espaço com os outros módulos desde o começo**, não ocupa a tela sozinho.

## Operating Context

- **Aparelho fixo e compartilhado**: iPad, tablet Android ou qualquer touchscreen, ligado o
  dia todo, na cozinha. Lido de longe, de pé, de relance, por quem passa.
- **Toque é o único gesto** no painel. Não há mouse, não há arrastar.
- **O dia vira à meia-noite** com o aparelho ligado: o quadro se renova sozinho, sem toque.
- **Celular do adulto** é a segunda superfície, para gestão e acompanhamento.
- **Convite entra por WhatsApp** — é onde a família brasileira combina as coisas.
- Wi-fi doméstico oscila. Painel que mostra tela branca perde a briga com a geladeira.

## Capabilities and Constraints

- **Quem pode logar é decisão do responsável da família**, membro a membro: ele informa a
  idade e vincula um e-mail para liberar o acesso. O padrão é criança sem conta; adolescente
  com acesso é escolha consciente de um adulto, registrada.
  **Consequência a não esquecer:** enquanto criança não tinha conta, a LGPD art. 14 era
  verdadeira por impossibilidade. Agora ela depende de fluxo e registro — o consentimento do
  responsável precisa ser específico, em destaque e **gravado com quem, qual conta e quando**.
- **Um membro com login não é um adulto.** Vê e conclui o próprio quadro; não gere a família,
  não convida, não edita tarefa recorrente, não mexe em pontos, não vê dados de outro membro.
- **Multi-família** é o próximo passo: cadastro de adulto, criação de família, convite de
  outro adulto, cadastro de filhos. Desenho em `../docs/design-multi-familia.md`.
- **Sessão do adulto dura no mínimo 30 dias** sem pedir login de novo. A credencial do painel
  é outro mecanismo: **não expira por tempo**, só por desparear.
- **Ações destrutivas ficam atrás de PIN parental** na interface do painel — e, nas regras do
  banco, o aparelho pareado simplesmente não tem permissão para elas.
- Modelo de dados: templates recorrentes + **um documento por dia**, com histórico
  preservado. Estatística, sequência e recompensa dependem disso.
- **Idioma: português do Brasil**, sem previsão de outro.
- Ainda não existem: recompensas resgatáveis, lista de compras, notificações, cobrança. O
  calendário existe como maquete e não funciona.

## Brand Commitments

**"Tarefas da Família" é nome de trabalho, não compromisso** (confirmado em 22/08/2026). Não
amarrar identidade visual ao nome atual; antes de vender para famílias desconhecidas, o nome
precisa de um exercício próprio.

Nenhuma outra restrição de marca foi declarada: sem paleta obrigatória, sem tipografia
herdada, sem logo existente. O visual atual do app é evidência do que existe, não compromisso.

## Evidence on Hand

- **Uma família real em produção**, migrada e verificada em 22/08/2026: 4 membros, 17 tarefas
  recorrentes, 3 dias de histórico, 21 conclusões, placar de 110 e 130 pontos. É a família do
  próprio dono.
- `../docs/analise-tecnica-fable.md` e `../docs/analise-monetizacao-fable.md` — análise de
  produto e panorama competitivo com números de terceiros, alguns marcados como estimativa.
- `../docs/design-modulo-dados.md` e `../docs/design-multi-familia.md` — decisões técnicas.

**Não existe, e não pode ser inventado:** nenhum usuário fora da família do dono, nenhum
depoimento, nenhuma métrica de retenção, nenhum preço praticado, nenhum cliente pagante.

## Product Principles

1. **A tela é mobília, não app.** Se não dá para entender de relance, atravessando a cozinha,
   não serve — por mais bonito que fique no monitor de quem desenhou.
2. **Quem não lê tem que conseguir sozinho.** Ícone, cor e som carregam o significado; texto é
   reforço. E isso não pode transformar a tela numa coisa de bebê para quem já lê.
3. **Conta de menor é exceção deliberada, nunca padrão.** O caminho fácil é o perfil sem
   conta; dar login a um menor exige um adulto decidir, com consentimento registrado. Nenhuma
   ação destrutiva fica ao alcance de um toque, com ou sem login.
4. **Estado que o usuário vê é estado que existe.** Nada de placar, conclusão ou conexão que
   pareça verdadeiro na tela e não esteja gravado. Configuração faltando esconde o caminho,
   não leva a um erro.
5. **O adulto organizador é o ponto único de falha.** Toda decisão que aumenta o trabalho de
   manutenção dele custa a família inteira.

## Accessibility & Inclusion

- **Letramento misto no mesmo aparelho** é requisito, não caso de borda: pré-alfabetizada e
  alfabetizada usando o mesmo painel.
- **Alvos de toque para dedo de criança**: 60 px ou mais no painel; nunca abaixo dos 44 px em
  qualquer superfície.
- **Leitura à distância**, de pé, com luz de cozinha — contraste e tamanho não são detalhe.
- **`prefers-reduced-motion` respeitado**, e zoom nunca travado: bloquear tela é papel do modo
  quiosque do aparelho, não do site.
- Sem áudio obrigatório: o som celebra, nunca informa sozinho.
