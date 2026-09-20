# Grupo LFL Serviços — Landing Page

Site institucional e comercial, implementado a partir do Figma
(`LFL Serviços — Landing Page`, telas Desktop 1440 e Mobile 390).

## Estrutura

```
index.html        página única com todas as seções
css/styles.css    tokens de cor/tipografia e layout (mobile-first, breakpoint 960px)
js/main.js        menu mobile, links do WhatsApp e feedback do formulário
assets/img/       monograma (Figma) e fotos operacionais em JPEG (ver abaixo)
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

## Fotos

As fotos em `assets/img/` foram geradas no Higgsfield (modelo Soul 2.0) com
direção documental — luz natural, uniforme polo azul-marinho, ambientes
brasileiros reais (guarita, pátio, hospital, doca). Regra: cenas de gestão e
operação entre profissionais adultos — sem pacientes, idosos ou produtos de
limpeza, para não sugerir serviços que a LFL não oferece. Nomes:

- `foto-gestao-portaria.jpg` — hero
- `foto-supervisao-equipe.jpg` — Por que a LFL
- `servico-*.jpg` — uma por item da seção Serviços
- `foto-gestao-cliente.jpg` — Diferenciais
- `foto-recepcao-hospital.jpg` — card "Hospitais e clínicas" (Segmentos): controle de acesso na entrada de serviço
- `foto-apoio-hospitalar.jpg` — Experiência: supervisora orientando a equipe em corredor hospitalar
- `foto-visita-tecnica.jpg` — Como funciona
- `foto-guarita-entardecer.jpg` — fundo do CTA

Quando houver fotos reais da operação, basta substituir os arquivos mantendo
o nome e uma proporção próxima (4:3 para os itens de serviço e splits, 16:9
para banner e fundo do CTA).

## Fontes

Montserrat (500/600/700) e Inter (400/500/600) via Google Fonts, conforme o Figma.
