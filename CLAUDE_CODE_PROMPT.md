# Prompt para o Claude Code — finalizar o site da Automotiva Express

> **Como usar:** abra este projeto no **Claude Code** e cole o bloco abaixo (ou aponte o Claude
> Code para este arquivo). Ele assume que você tem uma conta **Higgsfield** com créditos e o
> **FFmpeg** instalado na máquina.

---

## CONTEXTO (cole isto no Claude Code)

```
Você está finalizando um site one-page já construído e funcionando: uma landing cinematográfica
para a "Automotiva Express", oficina Bosch Car Service em Buritis, Belo Horizonte.

Stack: HTML + CSS + JS puro, com GSAP + ScrollTrigger + Lenis vendorizados em js/vendor/.
O herói usa um <canvas> que toca uma SEQUÊNCIA DE FRAMES (imagens .jpg) amarrada ao scroll.
Hoje os frames em assets/frames/ (f_001.jpg … f_072.jpg) são PLACEHOLDER. Sua missão principal
é substituí-los por uma sequência CINEMATOGRÁFICA REAL gerada no Higgsfield, e fazer os
ajustes finais de conteúdo. Leia o README.md antes de começar.

Regras: trabalhe de forma incremental e barata. Antes de cada geração paga use get_cost:true e
gere com count:1. Não invente conteúdo do cliente — o que faltar, deixe marcado e me avise.
```

---

## PASSO 1 — Conectar o Higgsfield (MCP)

No terminal do Claude Code:

```bash
claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp --scope user
```

Depois, dentro do Claude Code, rode `/mcp` e autentique o Higgsfield no navegador.
Valide a conexão e os créditos:

- chame a ferramenta **`balance`** (confirma plano + créditos disponíveis);
- chame **`models_explore`** com `type:'image'` e depois `type:'video'` para confirmar os
  nomes/parâmetros atuais dos modelos (eles mudam). Os usados abaixo são a referência;
  ajuste se o catálogo retornar nomes diferentes.

---

## PASSO 2 — Gerar a sequência do herói (o item mais importante)

A direção de arte do herói é **fotográfica e cinematográfica** (NÃO render 3D/CGI plastificado):
uma câmera deslizando lentamente sobre peças mecânicas / um cofre de motor, em luz baixa, com
acentos sutis de **vermelho** e **azul-frio**, aço escovado e grafite, grão de filme leve.
O movimento tem que ser **um dolly contínuo, suave e sem cortes** (o scroll é que "reproduz" o vídeo).

### 2.1 — Imagem base (frame inicial do vídeo)

Use **`generate_image`** com o modelo **`nano_banana_2`**, **4K**, **aspect 16:9**.
Prompt (em inglês — rende melhor):

```
Photographic cinematic shot inside a dark professional automotive workshop. A modern car
engine bay and precision mechanical parts — pistons, gears, a brake disc, spark plugs, copper
wiring — arranged on a clean matte graphite workbench. Shot on a 50mm lens at f/2.0, shallow
depth of field, dramatic low-key lighting with a single soft key light, subtle red and cool-blue
rim accents, brushed steel and graphite textures, faint volumetric haze, fine film grain.
Photoreal, ultra detailed, premium, cinematic. No text, no logos, no people, no watermarks.
```

Negative / evitar: `3D render, CGI, plastic, cartoon, waxy, oversaturated, text, logo, people`.

Gere `count:1`. Se gostar, guarde o `job_id` (será a `start_image` do vídeo). Se não, itere o
prompt — é barato em imagem.

### 2.2 — Animar (imagem → vídeo)

Use **`generate_video`** com o modelo **`kling3_0`**, passando `start_image` = o `job_id` da
imagem aprovada, **aspect 16:9**, duração ~5s. Prompt:

```
Slow continuous cinematic dolly-in across the mechanical parts. Extremely smooth and steady
camera, no cuts, subtle parallax and gentle focus pull, faint drifting volumetric light,
photoreal, cinematic, 24fps feel.
```

> A meta é movimento **lento e contínuo**, sem corte e sem "pulo" — porque o scroll vai mapear
> o tempo do vídeo. Se o resultado tiver corte/cena trocando, regenere com ênfase em
> "one continuous shot, no cuts".

### 2.3 — Upscale + baixar

Opcional mas recomendado: **`upscale_video`** no resultado para ganhar nitidez. Depois baixe o
`.mp4` final para a raiz do projeto (ex.: `hero.mp4`).

### 2.4 — Extrair os frames (FFmpeg) e plugar no site

Defina a **quantidade de frames** (sugestão: **120** para desktop — equilíbrio entre fluidez e
peso). Calcule o fps como `frames ÷ duração_do_vídeo`. Ex.: 120 frames / 5s = `fps=24`.

```bash
# limpa os placeholders antes de extrair
rm -f assets/frames/f_*.jpg

# extrai ~120 frames, redimensiona p/ largura 1280 (altura automática), boa compressão
ffmpeg -i hero.mp4 -vf "fps=24,scale=1280:-1" -q:v 4 assets/frames/f_%03d.jpg

# confira quantos saíram
ls assets/frames | wc -l
```

Agora **atualize `CONFIG.FRAME_COUNT`** em `js/main.js` para o número exato de frames gerados
(ex.: 120). Sirva o site (`python3 -m http.server`) e role o herói para validar: a cena deve
"reproduzir" suavemente conforme o scroll, e as peças/swoosh/engrenagens animam por cima.

> **Peso:** mire 40–120 KB por frame; o conjunto todo idealmente < 8–15 MB. Se ficar pesado,
> reduza para ~90–100 frames ou aumente a compressão (`-q:v 6`).

### 2.5 — (Opcional) Versão mobile mais leve

Para telas pequenas, gere uma sequência 9:16 mais curta (60–80 frames) em `assets/frames-mobile/`
e troque o caminho por `matchMedia`. Em `js/main.js`, dentro de `CONFIG`, dá para fazer:

```js
const isMobile = window.matchMedia('(max-width: 860px)').matches;
const CONFIG = {
  WHATSAPP: '55SEUNUMERO',
  FRAME_COUNT: isMobile ? 72 : 120,
  framePath: (i) => `assets/${isMobile ? 'frames-mobile' : 'frames'}/f_${String(i).padStart(3,'0')}.jpg`,
};
```

Se preferir simplicidade, pode manter só a sequência desktop (funciona bem no mobile também).

---

## PASSO 3 — (Opcional) Segundo momento cinematográfico

O guia de design sugere **1–2 momentos cinematográficos no máximo**. Se quiser um segundo
"respiro" visual no meio da página (ex.: antes de "Por que Bosch"), gere um clipe curto de um
**motor "explodido" remontando** (peças se separando e voltando), mesma direção de arte, e
adicione uma segunda seção `<canvas>` reaproveitando a mesma lógica de scroll-frames do herói.
**Não obrigatório** — a assinatura das peças em SVG já entrega a sensação de "peças se formando".

---

## PASSO 4 — Imagem social (Open Graph)

O `index.html` referencia `assets/og-image.jpg` (preview ao compartilhar no WhatsApp/redes).
Gere com **`generate_image`** (`nano_banana_2`) uma imagem **1200×630** no mesmo clima do herói,
e se quiser sobreponha o título "Padrão de concessionária. Sem preço de concessionária." num
editor. Salve como `assets/og-image.jpg`.

---

## PASSO 5 — (Opcional) Logo com fundo transparente

A logo e o selo Bosch vieram com **fundo branco**, por isso o header/rodapé usam um "chip"
branco. Se quiser um header mais limpo, rode **`remove_background`** na `logo-automotiva.png`,
salve a versão transparente e ajuste o CSS do `.hd__chip` (remover o fundo branco). Cosmético.

---

## PASSO 6 — Finalização de conteúdo (sem isto o site não vai ao ar)

1. **WhatsApp:** em `js/main.js`, troque `CONFIG.WHATSAPP` pelo número real (só dígitos, formato
   internacional, ex.: `5531999999999`).
2. **Avaliações reais:** em `index.html`, seção `#avaliacoes` (`data-placeholder-reviews`),
   substitua os cards pelos depoimentos reais do Google. Mantenha 3–4 curtos e específicos.
3. **Confirmar com o cliente** os itens marcados com `*` / `data-flag`: anos de mercado,
   horário de funcionamento e o texto exato de garantia. Corrija no HTML.
4. **Performance:** rode o Lighthouse (ou DevTools) e confirme que o herói carrega rápido
   (peso dos frames sob controle, imagens com `loading="lazy"` já aplicado nos selos grandes).
5. **Teste mobile real** (DevTools responsivo + um celular): herói, menu, swipe de serviços,
   e o envio do formulário abrindo o WhatsApp já preenchido.
6. **Deploy:** é estático — suba a pasta inteira em Netlify / Vercel / Cloudflare Pages /
   Hostinger (ou na hospedagem atual). Sem build.

---

### Checklist final

- [ ] Higgsfield conectado e com créditos (`balance`)
- [ ] Frames reais do herói em `assets/frames/` + `CONFIG.FRAME_COUNT` atualizado
- [ ] (opcional) sequência mobile / segundo momento cinematográfico
- [ ] `assets/og-image.jpg` gerada
- [ ] `CONFIG.WHATSAPP` com o número real
- [ ] Avaliações reais no lugar dos placeholders
- [ ] Anos / horário / garantia confirmados com o cliente
- [ ] Lighthouse ok + teste em celular
- [ ] Deploy estático no ar
