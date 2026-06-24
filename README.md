# Organizze

Painel financeiro mensal feito com Next.js, React, TypeScript e Firebase. Ele registra salário, gastos e compras planejadas, calcula automaticamente o saldo livre e mantém cada mês separado.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem configuração adicional, os dados ficam salvos no navegador.

## Conectar ao Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Adicione um aplicativo Web ao projeto.
3. Em **Authentication > Sign-in method**, habilite o provedor **Google** e escolha um e-mail de suporte.
4. Crie um banco em **Firestore Database**.
5. Copie `.env.example` para `.env.local` e preencha as credenciais do aplicativo Web.
6. Publique as regras presentes em `firebase.rules` no Firestore.
7. Reinicie `npm run dev`.

Com o Firebase conectado, os dados são guardados em `users/{uid}/months/{ano-mês}` e vinculados à conta Google. Assim, o mesmo painel pode ser acessado em dispositivos diferentes. Se já existia uma sessão anônima da versão anterior, o primeiro login com Google vincula a conta e preserva seu identificador e seus dados.

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: compilação de produção
- `npm run lint`: validação de qualidade do código
- `npm run typecheck`: validação do TypeScript
- `npm run check`: executa todas as validações usadas antes do deploy

## Publicar na Vercel

1. Importe o repositório GitHub no painel da Vercel.
2. Mantenha o preset **Next.js** e os comandos detectados automaticamente.
3. Em **Settings > Environment Variables**, cadastre as seis variáveis listadas em `.env.example` para os ambientes desejados.
4. Faça o primeiro deploy e copie o domínio final fornecido pela Vercel.
5. No Firebase, abra **Authentication > Settings > Authorized domains** e adicione somente o domínio, sem `https://` e sem caminho.

O arquivo `.env.local` nunca deve ser enviado ao GitHub. As variáveis `NEXT_PUBLIC_*` do Firebase são incorporadas ao aplicativo Web durante o build; a segurança dos dados depende do login e das regras do Firestore presentes em `firebase.rules`.

Os previews da Vercel recebem domínios diferentes. Para testar login Google em um preview, esse domínio específico também precisa estar autorizado no Firebase.
