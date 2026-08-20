# Nosso Rolê (Polenca Eats)

App do casal para descobrir, planejar e guardar os lugares que vocês exploram juntos — com lista de lugares, roleta de sorteio, memórias das visitas e conquistas.

## Rodando localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   `npm install`
2. Copie `.env.example` para `.env` e preencha `FIREBASE_PROJECT_ID` com o ID do seu projeto Firebase.
3. Rode o app em modo desenvolvimento:
   `npm run dev`

## Build de produção

```
npm run build
npm run start
```

## Segurança

- As regras de acesso ao banco de dados ficam em `firestore.rules` — publique-as no Console do Firebase (Firestore Database > Regras) sempre que alterar este arquivo.
- O `apiKey` em `firebase-applet-config.json` é o identificador público do app no Firebase (não é segredo), mas restrinja os **domínios autorizados** em Authentication > Settings > Authorized domains, e considere ativar o **Firebase App Check** para proteger a API contra bots.
- O endpoint `/api/overpass` (usado na aba Explorar) já exige login para ser usado e tem limite de requisições — veja `server.ts`.
