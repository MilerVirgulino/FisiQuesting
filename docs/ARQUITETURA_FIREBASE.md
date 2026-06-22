# FisioQuest: arquitetura atual

## Decisoes tecnicas

Usei React com Vite porque a aplicacao tem sessao, aprovacao, rotas protegidas, missoes por turma, embaralhamento de questoes, painel do professor e analytics. JavaScript puro funcionaria para um prototipo menor, mas ficaria caro de manter.

Firebase fica isolado em `src/firebase-init.js`, usando variaveis `VITE_FIREBASE_*`. Componentes renderizam UI, services falam com Firebase e utils cuidam de regras locais como nivel e embaralhamento.

O XP ainda e calculado no cliente para manter o prototipo simples. Em producao, a correcao e a pontuacao devem ir para Cloud Functions.

## Estrutura

```txt
src/
  components/        UI reutilizavel e rotas protegidas.
  pages/             Login, pendencia, dashboard, missoes e admin.
  services/          Auth, questoes, missoes, progresso e admin.
  styles/            CSS mobile first com visual gamificado.
  utils/             Nivel, data e embaralhamento deterministico.
  firebase-init.js   Inicializacao do Firebase Auth e Firestore.
docs/
  ARQUITETURA_FIREBASE.md
firestore.rules
```

## Modelo Firestore

### `users/{uid}`

```js
{
  name: "Ana",
  email: "ana@email.com",
  role: "student", // student | admin
  status: "pending", // pending | approved | rejected
  grade: "1 ano",
  className: "A",
  totalXp: 0,
  coins: 0,
  ownedAvatarItems: ["eyes1_commum"],
  streak: 0,
  bestStreak: 0,
  solvedCount: 0,
  correctCount: 0,
  avatar: {
    kind: "chibi",
    base: "chibi_body",
    hair: "hair_none",
    shirts: "shirt_none",
    eyes: "eyes_none",
    mouths: "mouth_none",
    accessories: "accessories_none",
    pants: "pants_none",
    pets: "pets_none",
    level: 1,
    attack: 10,
    defense: 8,
    speed: 6,
    hp: 10,
    power: 10,
    energy: 10,
    wins: 0,
    losses: 0
  },
  createdAt,
  updatedAt
}
```

### `questions/{questionId}`

```js
{
  statement: "Um corpo...",
  alternatives: ["A", "B", "C", "D"],
  correctIndex: 2,
  explanation: "Pela segunda lei de Newton...",
  area: "Mecanica",
  difficulty: "facil",
  xp: 10,
  active: true,
  createdAt,
  updatedAt
}
```

### `weeklyMissions/{missionId}`

```js
{
  title: "Missao semanal: Cinematica",
  description: "Resolva a sequencia preparada para sua turma.",
  targetGrade: "1 ano",
  targetClass: "A",
  questionIds: ["questionA", "questionB"],
  status: "open", // open | closed
  rewardXp: 50,
  rewardCoins: 100,
  startsAt: "2026-06-17",
  endsAt: "2026-06-24",
  createdAt,
  updatedAt
}
```

### `userProgress/{uid_yyyy-mm-dd}`

```js
{
  userId: "uid",
  dateKey: "2026-06-17",
  missionIds: {
    "missionA": true
  },
  solved: 5,
  correct: 4,
  xpEarned: 40,
  currentCombo: 3,
  bestCombo: 3,
  areas: {
    "Mecanica": 2,
    "Optica": 3
  },
  updatedAt
}
```

### `missionAttempts/{uid_missionId}`

O app grava uma tentativa consolidada ao finalizar a missao, em vez de escrever no Firestore a cada questao.

```js
{
  userId: "uid",
  missionId: "missionA",
  dateKey: "2026-06-17",
  solved: 20,
  correct: 16,
  questionXp: 160,
  bonusXp: 50,
  xpEarned: 210,
  rewardCoins: 100,
  coinsEarned: 80,
  coinsLost: 20,
  missed: 4,
  completed: true,
  answers: [
    {
      questionId: "questionA",
      order: 0,
      selectedIndex: 1,
      correct: true,
      xpEarned: 10,
      area: "Mecanica",
      difficulty: "facil"
    }
  ],
  submittedAt
}
```

## Fluxo de turma e missao

1. Aluno se cadastra e fica `pending`.
2. Professor define `grade` e `className` no painel admin.
3. Professor aprova o aluno.
4. Professor cria uma missao semanal em `weeklyMissions`, escolhe turma e seleciona questoes.
5. Aluno ve apenas missoes abertas da propria serie/turma.
6. Ao iniciar, a ordem das questoes e das alternativas e embaralhada com seed baseada em `uid + missionId`.
7. As respostas ficam locais durante a missao.
8. Ao finalizar, o app grava `missionAttempts`, atualiza `userProgress` e atualiza os totais do usuario em uma unica transacao.
9. Se o usuario tiver avatar, a conclusao da missao libera pontos para distribuir em ataque, defesa, velocidade e HP.
10. A missao semanal pode conceder moedas. O professor define o maximo em `rewardCoins`; cada erro reduz a recompensa proporcionalmente.

## Painel do professor

O painel admin mostra informacoes que nao aparecem para alunos:

- alunos por turma;
- respostas totais por turma;
- taxa de acerto por turma;
- XP medio por turma;
- abertura/fechamento de missoes semanais;
- selecao manual das questoes de cada missao.

## Avatar chibi e batalha

O avatar atual e um chibi cabecao personalizavel renderizado em `src/components/AvatarPreview.jsx`, sem spritesheet e sem recorte automatico. Modelos PNG em `assets/egg-templates/` servem apenas como referencia externa; os itens finais sao criados na oficina de pixel art e carregados do Firebase.

A lista exibida pelo app vem das colecoes `avatarItems` e `customAccessoryRequests` publicados. Precos e categorias dos itens aprovados ficam no Firebase; no documento do usuario ficam `coins`, `ownedAvatarItems` e a selecao atual do avatar.

O avatar usa atributos simples:

- `power`: sobe com acertos;
- `defense`: sobe com tentativas e erros corrigidos;
- `energy`: sobe ao concluir missoes;
- `attack`, `speed` e `hp`: atributos usados pelo sistema novo de batalha;
- `level`: sobe ao completar missoes;
- `wins` e `losses`: reservado para duelos futuros.

O caminho recomendado para duelos e usar batalhas assincronas entre alunos da mesma turma. A forca final pode combinar atributos do avatar, acertos recentes e bonus por area da Fisica, mas a resolucao da batalha deve ir para Cloud Functions para evitar manipulacao no cliente.

## Regras de seguranca

`firestore.rules` permite:

- usuario criar apenas o proprio perfil como estudante pendente;
- admin aprovar/rejeitar usuarios e alterar turma;
- estudante aprovado ler apenas missoes abertas da propria turma;
- admin criar/editar/fechar missoes;
- estudante aprovado registrar o proprio progresso;
- estudante aprovado criar uma tentativa consolidada de missao;
- admin ler dados agregaveis de usuarios.

## Proximos passos

- Cloud Function para validar tentativa consolidada e conceder XP com seguranca.
- Cloud Function para resolver batalhas entre avatares.
- Graficos por area da Fisica e dificuldade.
- Importacao de questoes por CSV.
- Escopo multi-professor por escola/turma.
- Exportacao de relatorio para o professor.

## Avaliacao

Nota atual: 8.5/10.

Pontos fortes: separacao clara por camadas, missao por turma, painel do professor, embaralhamento por aluno, regras ajustadas e UI mais gamificada.

Limites atuais: XP ainda calculado no cliente, bonus de missao ainda nao e concedido automaticamente e os graficos usam dados resumidos dos usuarios em vez de uma agregacao dedicada.
