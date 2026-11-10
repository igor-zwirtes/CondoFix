# CondoFix

Sistema web para gestão de solicitações de manutenção em condomínios. O projeto é composto por uma API REST, uma aplicação web e um banco de dados PostgreSQL.

## Tecnologias

- **Frontend:** React 19, React Router e Axios, inicializado com Create React App.
- **Backend:** Node.js 22, Express 5, PostgreSQL (`pg`), autenticação JWT e senhas com `bcryptjs`.
- **Banco de dados:** PostgreSQL 17; esquema, dados iniciais, funções, views, triggers e constraints definidos em SQL.
- **Infraestrutura local:** Docker Compose.
- **Testes:** Jest e Supertest na API; React Testing Library no frontend.

## Pré-requisitos

- Docker com o plugin Docker Compose.
- Node.js 22 ou superior e npm.
- Git, para clonar o repositório.

## Inicialização

Na raiz do repositório, crie o arquivo de ambiente que o serviço da API usa:

```bash
cp backend/.env.example backend/.env
```

Inicie o PostgreSQL e a API:

```bash
docker compose up --build -d
```

O Compose aguarda o banco ficar saudável antes de iniciar a API. Na primeira inicialização, os arquivos SQL de `database/` são executados automaticamente e criam o esquema e os dados iniciais. A API fica disponível em `http://localhost:3333`; verifique a conexão com o banco em `http://localhost:3333/api/health`.

Em outro terminal, instale as dependências e inicie o frontend:

```bash
cd frontend
npm ci
npm start
```

O frontend abre em `http://localhost:3000` e envia requisições para a API em `http://localhost:3333`.

Para encerrar os serviços sem apagar os dados persistidos:

```bash
docker compose down
```

O banco usa o volume `postgres_data`. Para reinicializar os dados, remova esse volume conscientemente com `docker compose down -v`; essa operação apaga os dados locais do banco.

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env`. As variáveis usadas pela API são:

| Variável | Descrição | Valor local do exemplo |
|---|---|---|
| `NODE_ENV` | Ambiente de execução. | `development` |
| `PORT` | Porta em que a API escuta dentro do container. | `3000` |
| `DB_HOST` | Host do PostgreSQL. No Compose, use o nome do serviço. | `postgres` |
| `DB_PORT` | Porta do PostgreSQL. | `5432` |
| `DB_NAME` | Banco da aplicação. | `manutencao` |
| `DB_USER` | Usuário do PostgreSQL. | `manutencao_user` |
| `DB_PASSWORD` | Senha do PostgreSQL. | `dev_password` |
| `JWT_SECRET` | Chave usada para assinar tokens JWT. | `chave_secreta` |
| `JWT_EXPIRES_IN` | Validade do token JWT. | `1d` |
| `FRONTEND_URL` | Origem permitida pelo CORS para o frontend. | `http://localhost:3000` |

Os valores do exemplo são apenas para desenvolvimento local; use credenciais fortes e próprias em outros ambientes. O `compose.yaml` mapeia a porta `3333` do host para a porta `3000` do container, correspondente ao `PORT` padrão.

## Testes e build

Os testes da API executam em Node.js. Para prepará-los, mantenha o PostgreSQL do Compose em execução e instale as dependências:

```bash
docker compose up -d postgres
cd backend
npm ci
npm test
```

`npm test` prepara o banco `condofix_test` e executa a suíte Jest em sequência. O script recria esse banco de testes a cada execução; não use `condofix_test` para armazenar dados importantes. Para executar os testes novamente ao detectar alterações:

```bash
npm run test:watch
```

Para testar o frontend:

```bash
cd frontend
npm test
```

O runner do Create React App inicia em modo interativo. Em execução de CI, rode `CI=true npm test -- --watchAll=false`.

Para gerar a versão de produção do frontend:

```bash
cd frontend
npm run build
```

## Estrutura do repositório

```text
.
├── backend/
│   ├── scripts/       # Preparação do banco de testes e utilitários
│   ├── src/
│   │   ├── config/    # Configuração do PostgreSQL
│   │   ├── middlewares/
│   │   ├── routes/    # Rotas da API
│   │   └── services/
│   └── tests/         # Testes de integração da API
├── database/          # Scripts SQL de schema, seed e objetos do banco
├── docs/              # Esquema relacional e diagramas PlantUML
├── frontend/
│   ├── public/
│   └── src/
│       ├── pages/     # Telas organizadas por área/funcionalidade
│       ├── routes/
│       └── services/  # Cliente HTTP da API
└── compose.yaml       # PostgreSQL e API para desenvolvimento local
```
