# Organizze

Aplicação web de finanças pessoais para acompanhar salário, gastos e compras planejadas mês a mês. O Organizze transforma essas informações em uma visão simples do orçamento, mostrando quanto já foi gasto, quanto está reservado e qual é o saldo realmente livre.

## Funcionalidades

- Dashboard mensal com resumo completo do orçamento
- Registro do salário de cada mês
- Controle separado do vale-alimentação
- Cadastro e exclusão de gastos por categoria e data
- Escolha entre salário e vale-alimentação como origem do pagamento
- Planejamento de compras antes de comprometer o salário
- Conversão de uma compra planejada em gasto realizado
- Cálculo automático do saldo disponível
- Navegação independente entre dashboard, gastos e planejamento
- Login com conta Google
- Sincronização em tempo real com o Cloud Firestore
- Interface responsiva para computador e celular

## Tecnologias

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Motion](https://motion.dev/)

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Dashboard e visão geral do mês |
| `/gastos` | Histórico completo de gastos |
| `/planejamento` | Compras e valores planejados |

## Executando localmente

Requisitos: Node.js 22 e npm.

```bash
git clone https://github.com/joaonascimentooo/Organizze.git
cd Organizze
npm ci
```

Copie `.env.example` para `.env.local` e preencha as configurações do seu aplicativo Web no Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Depois, inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Configuração do Firebase

No Firebase Authentication, habilite o provedor **Google**. No Cloud Firestore, publique as regras presentes em [`firebase.rules`](./firebase.rules). Elas garantem que cada usuário tenha acesso apenas aos próprios dados e às miniaturas dos seus produtos. Não é necessário ativar o Firebase Storage: imagens escolhidas pelo usuário são compactadas e guardadas em documentos separados no Firestore.

Os documentos são organizados pelo caminho:

```text
users/{userId}/months/{ano-mês}
```

Sem as variáveis do Firebase, a aplicação funciona em modo local e mantém os dados apenas no navegador.

## Scripts

```bash
npm run dev        # Servidor de desenvolvimento
npm run lint       # Análise estática
npm run typecheck  # Validação do TypeScript
npm run build      # Build de produção
npm run check      # Executa todas as validações acima
```

## Estrutura principal

```text
app/                 Páginas, layout e estilos
hooks/               Estado financeiro e sincronização
lib/                 Firebase, tipos e utilitários
.github/workflows/   Validação automática no GitHub
firebase.rules       Regras de segurança do Firestore
```

## Segurança

O arquivo `.env.local` é ignorado pelo Git e nunca deve ser versionado. As regras do Firestore validam a identidade autenticada antes de permitir qualquer leitura ou gravação.
