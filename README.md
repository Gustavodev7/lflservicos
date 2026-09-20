# Grupo LFL Serviços — Landing Page

Site institucional e comercial, implementado a partir do Figma
(`LFL Serviços — Landing Page`, telas Desktop 1440 e Mobile 390).

## Estrutura

```
index.html        página única com todas as seções
css/styles.css    tokens de cor/tipografia e layout (mobile-first, breakpoint 960px)
js/main.js        menu mobile, links do WhatsApp e feedback do formulário
assets/img/       fotos e monograma exportados do Figma
assets/icons/     ícones SVG exportados do Figma
```

Sem build: é só abrir `index.html` no navegador ou servir a pasta com qualquer
servidor estático (ex.: `npx serve .`).

## Antes de publicar

1. **WhatsApp** — em `js/main.js`, troque `WHATSAPP_NUMBER` pelo número comercial
   (formato internacional, só dígitos: `55` + DDD + número). Todos os botões
   "Falar pelo WhatsApp" e o botão flutuante usam esse valor.
2. **Formulário de contato** — hoje só valida e mostra a mensagem
   "Obrigado pelo contato. Nossa equipe falará com você em breve." A função
   `submitLead(data)` em `js/main.js` é o ponto de integração com e-mail/CRM
   (Formspree, EmailJS, endpoint próprio etc.).
3. **Política de Privacidade / Termos de Uso** — os links do rodapé apontam
   para `#`; crie as páginas e ajuste os `href`.
4. **Instagram** — os links usam `https://instagram.com/lflservicos`; confirme o
   handle.

## Fontes

Montserrat (500/600/700) e Inter (400/500/600) via Google Fonts, conforme o Figma.
