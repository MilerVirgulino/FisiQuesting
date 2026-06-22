# FisiQuest

Aplicacao web gamificada para resolucao de questoes de Fisica, inspirada em apps de aprendizado por XP, niveis e missoes propostas pelo professor.

## Decisões técnicas

- React + Vite para organizar telas, rotas protegidas, estados de autenticação e painéis.
- Firebase Authentication para cadastro, login, logout e sessão.
- Firestore para usuarios, questoes, missoes por turma, progresso e configuracao de gamificacao.
- `src/firebase-init.js` concentra toda a configuração Firebase.
- CSS mobile first em `src/styles/app.css`, com visual colorido de jogo/geek e referencias de laboratorio de Fisica.

JavaScript puro seria suficiente para uma prova de conceito pequena, mas a manutenção ficaria pior conforme o painel admin, estatísticas e quests crescessem.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha `.env` com as chaves do seu projeto Firebase.

URL padrão do Vite:

```txt
http://localhost:5173
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run deploy:hosting
```

## Deploy no Firebase Hosting

O deploy manual usa o projeto Firebase configurado em `.firebaserc`:

```bash
npm run deploy:hosting
```

O deploy automatico esta configurado em `.github/workflows/firebase-hosting-prod.yml`.
Quando houver push para a branch `prod`, o GitHub Actions roda `npm ci`, `npm run build` e publica o conteudo de `dist` no Firebase Hosting.

Comando de producao:

```bash
git push origin prod
```

Antes do primeiro deploy automatico, cadastre no GitHub estes secrets:

```txt
FIREBASE_SERVICE_ACCOUNT_FISIQUESTING
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL
```

`FIREBASE_SERVICE_ACCOUNT_FISIQUESTING` deve conter o JSON de uma service account com permissao de deploy no Firebase Hosting do projeto `fisiquesting`.
Os demais secrets sao os mesmos valores usados no `.env` local.

## Estrutura

```txt
src/
  components/
  pages/
  services/
  styles/
  utils/
  firebase-init.js
docs/
  ARQUITETURA_FIREBASE.md
firestore.rules
```

## Fluxo principal

1. O aluno se cadastra e fica pendente.
2. O professor define serie/turma e aprova o aluno no painel admin.
3. O professor cria uma missao semanal, seleciona as questoes e abre para uma turma.
4. O aluno ve apenas as missoes abertas para sua serie/turma.
5. A ordem das questoes e alternativas e embaralhada por aluno.
6. O painel admin mostra graficos basicos de desempenho por turma.

Leia [docs/ARQUITETURA_FIREBASE.md](docs/ARQUITETURA_FIREBASE.md) para o modelo Firestore, fluxo de aprovação, regras de segurança e próximos passos.
