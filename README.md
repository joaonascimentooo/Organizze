<p align="center">
  <img src="./app/icon.svg" alt="Organizze logo" width="96" height="96" />
</p>

<h1 align="center">Organizze</h1>

<p align="center">
  Planeje compras, acompanhe gastos e entenda quanto do seu salario ainda esta realmente livre.
</p>

<p align="center">
  <a href="https://organizze-seven.vercel.app">Acessar app</a>
  -
  <a href="#funcionalidades">Funcionalidades</a>
  -
  <a href="#executando-localmente">Rodar localmente</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111?style=for-the-badge&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-ffca28?style=for-the-badge&logo=firebase&logoColor=111" />
</p>

## O que e

**Organizze** e uma aplicacao web de financas pessoais feita para responder uma pergunta simples: **posso comprar isso agora sem baguncar meu mes?**

Em vez de mostrar apenas uma lista de gastos, o Organizze combina salario, vale-alimentacao, despesas, compras planejadas e parcelamentos em uma visao mensal clara. Voce consegue simular compras antes de decidir, reservar apenas a parcela do mes e transformar um planejamento em gasto real quando a compra acontecer.

## Por que usar

- Veja o saldo livre depois dos gastos e planos do mes
- Planeje compras parceladas sem comprometer o valor total de uma vez
- Separe despesas pagas com salario e vale-alimentacao
- Navegue entre meses mantendo o contexto selecionado
- Use no computador ou celular com tema claro e escuro
- Sincronize os dados com login Google e Cloud Firestore

## Funcionalidades

### Painel mensal

- Resumo de salario, vale-alimentacao, gastos, compras planejadas e saldo livre
- Indicador visual de comprometimento do salario
- Navegacao entre meses passados e futuros
- Mes selecionado persistente ao trocar de pagina

### Gastos

- Cadastro de despesas por descricao, valor, categoria, data e origem do pagamento
- Edicao e exclusao de gastos registrados
- Filtros por categoria
- Ordenacao por data, maior valor ou menor valor
- Separacao entre salario e vale-alimentacao

### Planejamento de compras

- Cadastro de produtos por link, nome, valor, categoria e imagem
- Busca de previa automatica do produto
- Upload de imagem propria
- Compras para este mes ou para o futuro
- Parcelamento com calculo automatico do valor mensal
- Edicao completa das compras planejadas
- Conversao de planejamento em gasto realizado com parcelas lancadas nos meses corretos

### Experiencia

- Tema claro e escuro com preferencia salva no navegador
- Interface responsiva para desktop e mobile
- Modo local sem Firebase
- Login com Google
- Sincronizacao em tempo real com Firestore

## Tecnologias

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Motion](https://motion.dev/)

## Paginas

| Rota | Descricao |
| --- | --- |
| `/` | Painel financeiro do mes |
| `/gastos` | Historico e filtros de despesas |
| `/planejamento` | Lista de compras planejadas |
| `/configuracoes` | Conta, renda recorrente, tema e dados do mes |

## Executando localmente

Requisitos:

- Node.js 22
- npm 10+

```bash
git clone https://github.com/joaonascimentooo/Organizze.git
cd Organizze
npm ci
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Sem Firebase configurado, o app funciona em modo local e salva os dados apenas no navegador.

## Configurando Firebase

Copie `.env.example` para `.env.local` e preencha as variaveis do seu aplicativo Web no Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

No Firebase:

- Habilite o provedor **Google** em Authentication
- Crie o Cloud Firestore
- Publique as regras de seguranca em [`firebase.rules`](./firebase.rules)

Os dados sao organizados por usuario:

```text
users/{userId}/months/{ano-mes}
users/{userId}/preferences/{document}
users/{userId}/productImages/{imageId}
```

As imagens de produtos sao compactadas e salvas no Firestore. Nao e necessario ativar Firebase Storage.

## Scripts

```bash
npm run dev        # Servidor de desenvolvimento
npm run lint       # Analise estatica
npm run typecheck  # Validacao TypeScript
npm run build      # Build de producao
npm run check      # Executa lint, typecheck e build
```

## Estrutura

```text
app/                 Paginas, layout, estilos e API routes
hooks/               Estado financeiro e sincronizacao
lib/                 Firebase, tipos e utilitarios
firebase.rules       Regras de seguranca do Firestore
.github/workflows/   Validacoes automatizadas
```

## Seguranca

O arquivo `.env.local` e ignorado pelo Git e nao deve ser versionado.

As regras do Firestore validam o usuario autenticado antes de permitir leitura ou escrita, garantindo que cada conta acesse apenas os proprios dados.

## Status

Organizze esta em desenvolvimento ativo. A base atual ja cobre o fluxo principal de controle mensal, planejamento de compras e sincronizacao na nuvem.
