# Automotiva Express — site cinematográfico

Site one-page com narrativa por scroll (estilo Logitech / Iron Man / Amaro.fy) para a
**Automotiva Express Service**, oficina **Bosch Car Service** em Buritis, Belo Horizonte.

**Stack:** HTML + CSS + JavaScript puro · **GSAP 3.12.5 + ScrollTrigger** · **Lenis 1.1.14**
(bibliotecas já vendorizadas em `js/vendor/`, sem dependência de CDN).

A ideia central da marca: **“Padrão de concessionária, sem preço de concessionária”** — uma
máquina anti-ansiedade que ataca a dor nº 1 das avaliações (orçamento-surpresa) com
transparência radical: nada é feito sem você aprovar o preço antes, e tudo tem garantia.

---

## Como rodar localmente

O herói usa um `<canvas>` que carrega uma sequência de imagens (frames). Por isso **precisa
ser servido por HTTP** — abrir o `index.html` por `file://` não carrega os frames.

```bash
cd automotiva-express-site
python3 -m http.server 8000
# abra http://localhost:8000
```

(ou qualquer servidor estático: `npx serve`, Live Server do VS Code, etc.)

---

## Estrutura

```
automotiva-express-site/
├── index.html                 # estrutura + conteúdo de todas as seções
├── css/style.css              # sistema de design "Engenharia Cinematográfica"
├── js/
│   ├── main.js                # GSAP/ScrollTrigger/Lenis, canvas, montagem das peças  ← CONFIG aqui
│   └── vendor/                # gsap.min.js, ScrollTrigger.min.js, lenis.min.js
├── assets/
│   ├── logo-automotiva.png    # logo do cliente
│   ├── bosch-car-service.png  # selo Bosch Car Service
│   └── frames/                # f_001.jpg … f_072.jpg  ← FRAMES PLACEHOLDER (trocar)
├── tools/
│   └── make_placeholder_frames.py   # gera os frames placeholder
├── README.md
└── CLAUDE_CODE_PROMPT.md      # prompt p/ o Claude Code finalizar (gerar assets no Higgsfield)
```

---

## O que já está pronto ✅

- Herói cinematográfico com **canvas scroll-video** (frames amarrados ao scroll, com easing).
- **Assinatura:** peças mecânicas (pistão, vela, parafuso, disco de freio, chave) que **voam e se
  encaixam** conforme você rola, enquanto o **traço da marca** (swoosh) se desenha e as
  **engrenagens** giram — tudo controlado por scroll.
- Seções: barra de confiança, **A Promessa** (ataca a dor do orçamento-surpresa), **Serviços**
  (scroll horizontal com os 3 pilares e todos os serviços reais), **Como Funciona** (linha de
  torque que se desenha em 4 etapas), **Por que Bosch**, **Avaliações** (4,3★), **FAQ**
  (quebra-objeções) e **Contato** com formulário que abre o **WhatsApp já preenchido**.
- Logo + selo Bosch integrados; **responsivo** (mobile vira swipe nativo + menu drawer);
  **acessível** (`prefers-reduced-motion`, foco visível, funciona sem JS).

---

## O que falta personalizar ⚠️

Procure no código os pontos marcados. Os textos a confirmar com o cliente estão com
`data-flag` no HTML e um `*` visível.

1. **WhatsApp (crítico).** Em `js/main.js`, no topo, troque `CONFIG.WHATSAPP` pelo número real
   (formato internacional só com dígitos, ex.: `5531999999999`). O formulário e os botões de
   orçamento dependem disso.

2. **Frames reais do herói.** Os 72 frames em `assets/frames/` são **placeholder** (atmosfera
   gerada por Python). Troque pela sequência cinematográfica real gerada no **Higgsfield** —
   veja o passo a passo em **`CLAUDE_CODE_PROMPT.md`**. Ao trocar, ajuste `CONFIG.FRAME_COUNT`
   em `js/main.js` para a nova quantidade.

3. **Avaliações reais.** Em `index.html`, na seção `#avaliacoes` (bloco marcado
   `data-placeholder-reviews`), substitua os cards pelos depoimentos **reais do Google**. O
   primeiro card já usa o teor de uma avaliação real positiva; os outros estão marcados
   “Substituir por avaliação real”.

4. **Confirmar com o cliente** (itens com `*` / `data-flag`):
   - **Anos de mercado** (“+15 anos” na barra de confiança) — confirmar o número real.
   - **Horário** (“Seg a sex · 8h às 18h”) — o site antigo e o Google divergem; confirmar.
   - **Garantia** — texto sobre manter a garantia de fábrica e prazo da garantia dos serviços.

5. **Imagem social (`og-image.jpg`).** O HTML referencia `assets/og-image.jpg` (preview ao
   compartilhar no WhatsApp/redes). Gerar — instruções no `CLAUDE_CODE_PROMPT.md`.

---

## Deploy

É um site estático: sobe em qualquer hospedagem (Netlify, Vercel, Cloudflare Pages, Hostinger,
ou a própria hospedagem atual). Basta enviar a pasta inteira. Sem build, sem servidor.

> Dica de performance: depois de colocar os frames reais, confirme que o conjunto todo fica
> abaixo de ~8–15 MB (40–120 KB por frame) para o herói carregar rápido.
