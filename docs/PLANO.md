# Connex: plano de produto e técnico

> Versão 1, 05/11/2026. Ponto de partida: protótipo v0 salvo na tag `v0-prototipo`.

## 1. A ideia em uma frase

Connex é o crachá inteligente de quem vai a eventos: você mostra um QR (no celular ou impresso no crachá), a outra pessoa escaneia e as duas ficam conectadas com redes sociais, skills, carteira Solana e o contexto de onde e como se conheceram. Depois, você pergunta "preciso de um dev web" e o Connex procura dentro das pessoas que você conheceu.

## 2. Caminho crítico (o que trava o celular)

O prêmio depende de o app estar **publicado na Solana dApp Store**. A submissão tem etapas lentas que não dependem de código:

| Etapa | Quem | Tempo | Observação |
|---|---|---|---|
| Criar conta no Publisher Portal e fazer **KYC** (pessoa física) | você | dias | Sem KYC aprovado não dá para cadastrar o app. **Começar hoje.** |
| Carteira nova, só para publicar o Connex, com um pouco de SOL | você | minutos | Ela assina todas as versões futuras. Perdeu a carteira, perdeu o app. Guardar a seed offline. |
| Site público HTTPS com **termos de uso** e **política de privacidade** | eu | horas | Links quebrados são motivo comum de rejeição. |
| APK assinado (arm64-v8a), ícone 512×512 sem transparência, banner 1200×600, 4 a 8 screenshots | eu | 1 dia | Gerado com `npx solana-mobile webshell`. |
| Revisão da Solana Mobile | eles | 2 a 5 dias úteis | Atualizações de APK costumam levar menos. |

**Vantagem importante:** o APK é uma "casca" que abre o nosso site. Depois de aprovado, quase toda melhoria vai ao ar só com deploy na web, sem nova revisão. Então a estratégia é **submeter cedo um MVP sólido** e continuar evoluindo pela web durante o evento.

### Mudança recente na documentação

O post do IslandDAO fala em PWA ou TWA. A documentação atual da Solana Mobile recomenda o **WebView shell do CLI oficial** (`solana-mobile webshell init/build`) em vez do Bubblewrap/TWA, porque os navegadores passaram a bloquear o acesso à rede local que o Mobile Wallet Adapter usa, e a conexão de carteira falha silenciosamente dentro de TWAs. O shell trata os intents de carteira de forma nativa e não precisa de `assetlinks.json`. Requisito: `@solana-mobile/wallet-standard-mobile` ≥ 0.5.1.

Na prática, o Connex continua sendo uma **PWA** (instalável pelo Chrome, funciona como site), e o APK da loja é essa PWA dentro do shell. Atende à preferência dos organizadores e mantém a carteira funcionando.

## 3. Já existe? Análise de mercado

| Categoria | Exemplos | O que fazem bem | O que falta |
|---|---|---|---|
| Cartão de visita digital | Popl, Blinq, HiHello, Linq | Perfil com QR/NFC, salvar contato | Não guardam o contexto do encontro, não têm pagamento, são Web2 |
| Networking de evento (vendido ao organizador) | Brella, Grip, Swapcard, Whova | Matchmaking e agenda dentro de um evento | A rede pertence ao organizador e morre quando o evento acaba |
| CRM pessoal e busca com IA | Mesh (antigo Clay), Dex, Happenstance | Lembrar pessoas e buscar a rede em linguagem natural | Importam de LinkedIn e e-mail; não capturam o encontro presencial |
| Web3 | Sleek (cartão NFC com wallet, já usado em Solana Hacker Houses), POAP (prova de presença), projetos de hackathon como o PoN (ETHGlobal 2022) | Identidade e provas on-chain | Sleek vive de vender cartão físico; POAP prova presença, não conexão |

**Conclusão honesta:** nenhuma peça isolada é inédita. Cartão digital é um mercado lotado, e busca na rede com IA já existe. O que eu não encontrei em nenhum produto é a combinação de:

1. **Prova de encontro presencial:** a conexão só vira "verificada" se a pessoa escaneou um QR que muda a cada poucos segundos, ou seja, estava na sua frente.
2. **Memória com contexto:** evento, data, nota (texto ou voz) e skills, pesquisáveis depois.
3. **Pagamento nativo:** gorjeta e divisão de conta em SOL ou USDC, sem copiar endereço.
4. **Nativo da Seeker:** nome `.skr`, Seed Vault e selo de dono de Seeker.

O ponto realmente diferente é o item 1 levado adiante: um **grafo de confiança verificado presencialmente**. Endossos de skill só valem de quem te conheceu ao vivo, o que é difícil de falsificar com bots. Esse é o argumento para os jurados.

## 4. Stack recomendada

Tudo em **uma conta Cloudflare gratuita**, sem Supabase:

| Camada | Escolha | Motivo |
|---|---|---|
| App | React 18 + TypeScript + Vite, PWA (`vite-plugin-pwa`) | Você já conhece React; TypeScript evita uma classe inteira de bugs |
| Estilo | Tailwind CSS com tokens de design próprios | Rápido de iterar e consistente |
| Hospedagem | Cloudflare Workers com Static Assets | Arquivos estáticos são grátis e ilimitados; só a API conta no limite diário |
| API | Hono no Worker, validação com Zod | Leve, tipado, feito para Workers |
| Banco | Cloudflare D1 (SQLite) com FTS5 para busca textual | Não "dorme" como o Supabase gratuito, que pausa após 7 dias sem uso |
| IA | Workers AI (embeddings multilíngues e transcrição de voz) e Vectorize na fase 2 | No mesmo plano gratuito; chave nenhuma no navegador |
| Carteira | `@solana/wallet-adapter-react` + `@solana-mobile/wallet-standard-mobile` | Caminho oficial para MWA na web: Seed Vault, Phantom, Solflare |
| Login | Sign In With Solana (SIWS) | Sem senha; a assinatura prova que a carteira é sua |
| Android | `solana-mobile webshell` | Recomendação atual da Solana Mobile |

### Uma conta Cloudflare nova ou a sua atual?

**Recomendo criar uma conta Cloudflare nova, só para o Connex.** Os limites do plano gratuito valem para a conta inteira:

- Workers: 100 mil requisições por dia. Se estourar, **todos** os Workers da conta passam a falhar até 00:00 UTC. Sites estáticos sem Functions continuam no ar.
- D1: 5 milhões de linhas lidas e 100 mil escritas por dia. Desde 01/09/2026 as consultas falham quando passa do limite.
- Workers AI: 10 mil "neurons" por dia.

Conta rápida: 300 pessoas no evento × 200 chamadas de API por dia dão 60 mil requisições. Cabe, mas um bug de polling ou um pico pode chegar perto. Com conta separada, o pior cenário derruba o Connex e não os seus outros sites. Custa zero e ainda facilita passar o projeto para um sócio no futuro.

Domínio: dá para começar em `connex.<sua-conta>.workers.dev` (HTTPS grátis). Um domínio próprio (~US$ 10 por ano) é melhor para a loja e para o crachá impresso, mas não bloqueia nada.

## 5. Segurança

Você não precisa ser especialista; o desenho é que protege. Os princípios:

1. **O Connex nunca encosta em dinheiro nem em chave privada.** Toda transferência é montada pelo app e assinada na carteira do usuário (Seed Vault, Phantom). Mesmo que o nosso servidor fosse invadido, ninguém conseguiria mover fundos de ninguém.
2. **A carteira de recebimento é provada, não digitada.** O endereço do perfil é o mesmo que assinou o login. Ninguém consegue colocar um endereço de terceiro no perfil.
3. **O QR não carrega o endereço da carteira, só o link do perfil.** Se alguém colar um QR falso por cima de um crachá, a vítima cai num perfil Connex com outro nome e outra foto, e vê isso antes de pagar. A tela de pagamento mostra nome, `.skr`, foto e o endereço abreviado, e a carteira mostra o destino de novo.
4. **Nenhuma chave no navegador.** O protótipo atual coloca a chave do Gemini dentro do JavaScript (`VITE_GEMINI_API_KEY`), e o build em `dist/` contém essa chave. No Connex novo, todo segredo fica em `wrangler secret` no Worker.
5. **Autorização em toda consulta.** O erro mais comum em apps assim é um usuário ler a conexão de outro trocando um ID na URL. Toda query filtra pelo usuário da sessão, e cada rota tem teste disso.
6. **Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`**, nonce de login de uso único com validade de 5 minutos, e a mensagem do SIWS confere o domínio.
7. **Limite de taxa** (binding de rate limiting do Workers) em login, scan e busca. Ele também protege a cota gratuita.
8. **Dependências fixadas** com lockfile. Em dezembro de 2024 duas versões do `@solana/web3.js` publicadas no npm roubavam chaves; versão fixada e lockfile evitam pegar uma versão maliciosa nova sem perceber.
9. **Privacidade (LGPD).** Quem conheceu quem é dado pessoal sensível: fica **fora da blockchain** e privado por padrão. Cada pessoa vê só as próprias conexões e notas. Exportar e apagar a conta funcionam de verdade.

## 6. O que fica on-chain e o que não fica

| Fica on-chain | Fica fora (no D1, privado) |
|---|---|
| Pagamentos em SOL e USDC (transações normais da Solana) | Lista de conexões, notas, contexto dos encontros |
| Identidade: carteira, nome `.skr` ou `.sol`, selo de dono de Seeker | Perfil (o usuário escolhe o que é público) |
| Fase 2, opcional e com consentimento dos dois: atestado de conexão via Solana Attestation Service | Busca e embeddings |

Colocar o grafo de contatos numa blockchain pública seria um problema de privacidade, não uma vantagem. Blockchain onde ela agrega: dinheiro, identidade e provas que o próprio usuário quer tornar públicas.

USDC na Solana: o mint fica fixo no código (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) e nunca vem de parâmetro externo.

## 7. Funcionalidades por fase

### Fase 1: MVP para submeter na loja

- **Perfil:** foto, nome, headline, empresa e projeto, links (X, GitHub, LinkedIn, Instagram, Telegram, site), skills, e campos "procuro" e "ofereço".
- **QR do perfil:** dinâmico no app (muda a cada 30 segundos, prova presença) e estático para imprimir no crachá.
- **Página pública do perfil:** abre com a câmera normal do celular, mesmo sem o app, com botões "salvar contato" (vCard) e "abrir no Connex". É o que faz o app se espalhar no evento.
- **Escanear e conectar:** câmera no app; o evento atual é anexado automaticamente, com nota rápida.
- **Minhas conexões:** agrupadas por evento, com busca por nome, skill e nota.
- **Eventos:** criar, entrar por código ou QR, lista opcional de "quem está aqui".
- **Login com carteira** via MWA: Seed Vault, Phantom, Solflare.
- **Pagar ou dar gorjeta** em SOL ou USDC, com QR Solana Pay para quem usa outra carteira.
- **PWA instalável**, páginas de termos e privacidade, APK pelo `webshell`.

### Fase 2: durante o evento, só com deploy na web

- **Segundo cérebro:** "preciso de um dev web que entenda DePIN" busca nas suas conexões (FTS5 com expansão da consulta por IA, depois embeddings com Vectorize).
- **Skills do GitHub:** informa o usuário e o Connex lê as linguagens e os repositórios públicos.
- **Nota de voz:** grava 15 segundos depois de conectar; a IA transcreve e extrai "combinamos de..." como lembrete.
- **Selo Seeker** (posse do Seeker Genesis Token) e exibição do nome `.skr`.
- **Dividir conta:** cria uma cobrança, cada pessoa paga a sua parte e o app confirma on-chain pela referência do Solana Pay.
- **Crachá imprimível** em PDF para organizadores, com QR em lote.

### Fase 3: o que é visionário

- **Grafo de confiança presencial:** endossos de skill só de conexões verificadas ao vivo.
- **Matchmaking no evento:** "3 pessoas aqui procuram dev Rust, e você oferece Rust" (opt-in).
- **Apresentação calorosa:** pedir intro por uma conexão em comum, com consentimento dos dois lados.
- **Atestado on-chain da conexão (SAS):** quando os dois querem tornar público ("nos conhecemos no IslandDAO").
- **NFC:** gravar o link do perfil em adesivo ou crachá (Web NFC no Chrome Android).
- **Follow-up inteligente:** "faz 2 semanas que você conheceu a Ana e não falou com ela".

## 8. Identidade visual (proposta)

Direção recomendada, **"Signal"**: escura, precisa, high-tech sem cair no clichê neon.

| Token | Cor | Uso |
|---|---|---|
| `ink` | `#07090F` | Fundo |
| `surface` | `#0F131C` | Cartões |
| `line` | `#222939` | Bordas |
| `text` | `#E9EDF5` | Texto principal |
| `muted` | `#8A93A8` | Texto secundário |
| `volt` | `#C6FF3D` | Cor de marca, ações principais, QR |
| `violet` | `#7B61FF` | Destaques, gradientes, estados de IA |

- **Tipografia:** Space Grotesk (títulos), Inter (interface), JetBrains Mono (endereços, handles, códigos). Fontes empacotadas no app para funcionar offline.
- **Logo:** o "X" de Connex formado por dois arcos que se encontram, um aperto de mãos abstrato. O mesmo símbolo vira o ícone do app (fundo `ink`, sem transparência, como a loja exige).
- **Linguagem visual:** grade fina de pontos ao fundo, cantos de 20px, vidro fosco só em sobreposições, movimento curto e com propósito (o QR "pulsa" quando é renovado).

Antes de codar a interface, mostro uma prancha com esta e mais duas direções, com logo e um cartão de perfil em cada, para você escolher.

## 9. Roteiro

| Quando | O quê |
|---|---|
| Hoje | Você: KYC no portal, carteira de publisher, conta Cloudflare nova. Eu: prancha de identidade e esqueleto do projeto novo (app, Worker, D1, PWA). |
| Dia 1 | Login com carteira, perfil, QR e página pública |
| Dia 2 | Scan, conexões, eventos |
| Dia 3 | Pagamentos SOL e USDC, termos, privacidade, ícones, screenshots, APK. **Submeter.** |
| Dias 4 em diante | Fase 2 pela web durante a revisão e o evento |

Ajusto as datas quando soubermos o prazo real do IslandDAO.

## 10. Organização do repositório (nova)

```
/                   app React (Vite) e configuração
src/                interface
worker/             API (Hono), rotas, autenticação
migrations/         esquema do D1
public/             manifest, ícones, termos e privacidade
android/            gerado pelo webshell (keystore NUNCA no git)
docs/               este plano e decisões
```

O código do protótipo continua acessível na tag `v0-prototipo`.

## Fontes

- [Solana Mobile: publicar um web app ou PWA](https://docs.solanamobile.com/dapp-store/publishing-a-web-app)
- [Solana Mobile: CLI webshell](https://docs.solanamobile.com/cli/webshell)
- [Solana Mobile: Local Network Access e MWA](https://docs.solanamobile.com/recipes/mobile-wallet-adapter/local-network-access)
- [Solana Mobile: submeter um app novo](https://docs.solanamobile.com/dapp-publishing/submit-new-app)
- [Solana Mobile: diretrizes da página da loja](https://docs.solanamobile.com/dapp-store/listing-page-guidelines)
- [Solana Mobile: MWA para web](https://docs.solanamobile.com/get-started/web/apps)
- [Solana Mobile: domínios .skr](https://docs.solanamobile.com/solana-mobile-stack/skr-domain)
- [Solana Attestation Service](https://attest.solana.com/)
- [Cloudflare: D1 passa a bloquear consultas acima do limite gratuito (01/09/2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Sleek, cartão NFC Web3 (Hypebeast)](https://hypebeast.com/2023/8/sleek-nft-web3-business-card)
- [PoN, cartão de visita Web3 (ETHGlobal)](https://ethglobal.com/showcase/pon-web3-digital-business-card-10v5s)
- [Mesh, antigo Clay](https://me.sh/stories/mesh)
- [Happenstance: ferramentas de networking com IA](https://happenstance.ai/guides/best-ai-networking-tools)
