/* ============================================================================
   AUTOMOTIVA EXPRESS · main.js
   GSAP + ScrollTrigger + Lenis · canvas scroll-video · montagem de peças (SVG)
   ----------------------------------------------------------------------------
   >>> CONFIG: preencha o número de WhatsApp e ajuste FRAME_COUNT se trocar os frames.
   ========================================================================== */

const CONFIG = {
  // TODO: número de WhatsApp da oficina, formato internacional, só dígitos.
  // Ex.: 55 (Brasil) + 31 (DDD) + número  ->  '5531999999999'
  WHATSAPP: '5531000000000',          // <<< PLACEHOLDER — TROCAR
  FRAME_COUNT: 269,                    // filme v2 cinematográfico: T1'(emblema)->T2->plano-sequência(motor sai do cofre e explode)->T4', upscale 2K + grade, 1600x900 @11fps
  framePath: (i) => `assets/frames/f_${String(i).padStart(3, '0')}.jpg`,
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = !!window.gsap;
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------------------------------------------------------------------------
   1) ENGRENAGENS — gera o path de uma engrenagem (centrada em 0,0)
--------------------------------------------------------------------------- */
function gearPath(teeth, rOut, rIn) {
  const step = (Math.PI * 2) / teeth;
  const tip = step * 0.36;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rIn, a],
      [rOut, a + step * 0.5 - tip / 2],
      [rOut, a + step * 0.5 + tip / 2],
      [rIn, a + step],
    ];
    pts.forEach(([r, ang], idx) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      d += (i === 0 && idx === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
  }
  return d + 'Z';
}

function buildGear(group, { teeth, rOut, rIn, hub = 0, bore = 0 }) {
  if (!group) return;
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', gearPath(teeth, rOut, rIn));
  group.appendChild(path);
  if (hub) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', hub); c.setAttribute('class', 'hub');
    group.appendChild(c);
  }
  if (bore) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', bore); c.setAttribute('class', 'bore');
    group.appendChild(c);
  }
}

function buildAllGears() {
  buildGear(document.getElementById('loaderGear'), { teeth: 10, rOut: 44, rIn: 32, hub: 15 });
  document.querySelectorAll('.svc__glyph-gear').forEach((g) =>
    buildGear(g, { teeth: 12, rOut: 34, rIn: 24, hub: 11 }));
  document.querySelectorAll('.proc__node-gear').forEach((g) =>
    buildGear(g, { teeth: 9, rOut: 17, rIn: 11, hub: 6 }));
}

/* ---------------------------------------------------------------------------
   2) UTILIDADES de UI (rodam sempre, mesmo sem animação)
--------------------------------------------------------------------------- */
function setYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function initMenu(lenis) {
  const hd = document.getElementById('hd');
  const burger = document.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = hd.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
  }
  // âncoras com scroll suave + fecha menu
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      hd.classList.remove('menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.scrollTo(target, { offset: -68 });
      else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
}

function initForm() {
  const form = document.getElementById('waForm');
  if (!form) return;
  const v = (id) => (document.getElementById(id)?.value || '').trim();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = v('fNome');
    if (!nome) { document.getElementById('fNome')?.focus(); return; }
    const lines = ['Olá! Vim pelo site da Automotiva Express e gostaria de um orçamento.', ''];
    lines.push('Nome: ' + nome);
    if (v('fCarro')) lines.push('Veículo: ' + v('fCarro'));
    if (v('fTel')) lines.push('Telefone: ' + v('fTel'));
    lines.push('Serviço: ' + v('fServico'));
    if (v('fMsg')) lines.push('Detalhes: ' + v('fMsg'));
    if (CONFIG.WHATSAPP === '5531000000000')
      console.warn('[Automotiva] Defina CONFIG.WHATSAPP em js/main.js com o número real.');
    const url = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}

/* barra de seleção do herói (configurador): monta a mensagem e abre o WhatsApp já preenchido */
function initHeroBar() {
  const bar = document.getElementById('heroBar');
  if (!bar) return;
  bar.addEventListener('submit', (e) => {
    e.preventDefault();
    const serv = document.getElementById('hbServico')?.value || '';
    const veic = (document.getElementById('hbVeiculo')?.value || '').trim();
    const lines = ['Olá! Vim pelo site da Automotiva Express e gostaria de um orçamento.', ''];
    if (serv) lines.push('Serviço: ' + serv);
    if (veic) lines.push('Veículo: ' + veic);
    if (CONFIG.WHATSAPP === '5531000000000')
      console.warn('[Automotiva] Defina CONFIG.WHATSAPP em js/main.js com o número real.');
    const url = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}

/* ---------------------------------------------------------------------------
   3) CANVAS — herói scroll-video (sequência de frames)
--------------------------------------------------------------------------- */
const canvas = document.getElementById('heroCanvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
const FRAME_COUNT = CONFIG.FRAME_COUNT;
const frames = new Array(FRAME_COUNT);
const frameReady = new Array(FRAME_COUNT).fill(false);
const frameDecoded = new Array(FRAME_COUNT).fill(false);
let readyUpTo = -1;                 // maior índice contíguo já carregado a partir de 0
let cw = 0, ch = 0, eased = 0, lastPainted = -1;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.clientWidth; ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintFrame(eased);
}

function isReady(img) { return img && img.naturalWidth > 0; }

function drawCover(img) {
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // cover
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

/* Desenha o frame CONTÍNUO "f" misturando o frame inteiro com o próximo
   (cross-dissolve por alpha). Isso transforma os ~154 estados discretos em
   movimento contínuo — acaba o efeito "flipbook". */
function paintFrame(f) {
  if (!ctx || cw === 0) return;
  const top = readyUpTo >= 0 ? readyUpTo : 0;
  f = Math.max(0, Math.min(top, f));
  const i0 = Math.floor(f);
  const i1 = Math.min(top, i0 + 1);
  const t = f - i0;
  const a = frames[i0], b = frames[i1];
  ctx.globalAlpha = 1;
  if (isReady(a)) drawCover(a);
  else if (isReady(b)) drawCover(b);
  if (t > 0.001 && i1 !== i0 && isReady(a) && isReady(b)) {
    ctx.globalAlpha = t;            // mistura o próximo frame por cima
    drawCover(b);
    ctx.globalAlpha = 1;
  }
}

/* Pré-decodifica uma janela à frente para não dar "hitch" de decode no scroll. */
function ensureDecoded(center) {
  const lo = Math.max(0, center - 2);
  const hi = Math.min(readyUpTo, center + 8);
  for (let i = lo; i <= hi; i++) {
    const img = frames[i];
    if (img && frameReady[i] && !frameDecoded[i] && img.decode) {
      frameDecoded[i] = true;
      img.decode().catch(() => {});
    }
  }
}

/* ---- carga em STREAMING: inicia com poucos frames e streama o resto ----
   Remove o "refém de ~10MB": o herói começa assim que os primeiros frames
   chegam; o restante entra em segundo plano, em ordem, com concorrência limitada. */
let onBootReady = null, bootDone = false;
const BOOT_FRAMES = Math.min(18, FRAME_COUNT);

function markLoaded(i) {
  frameReady[i] = true;
  while (frameReady[readyUpTo + 1]) readyUpTo++;
  const p = Math.min(100, Math.round(((readyUpTo + 1) / BOOT_FRAMES) * 100));
  const fill = document.getElementById('loaderFill');
  const pct = document.getElementById('loaderPct');
  if (fill) fill.style.width = p + '%';
  if (pct) pct.textContent = p + '%';
  if (!bootDone && readyUpTo + 1 >= BOOT_FRAMES) {
    bootDone = true;
    if (onBootReady) onBootReady();
  }
}

function loadFrame(i) {
  return new Promise((resolve) => {
    if (frames[i]) return resolve();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { markLoaded(i); resolve(); };
    img.onerror = () => { markLoaded(i); resolve(); };
    img.src = CONFIG.framePath(i + 1);
    frames[i] = img;
  });
}

function streamFrames(onBoot) {
  onBootReady = onBoot;
  let next = 0;
  const CONC = 6;
  const worker = async () => {
    while (next < FRAME_COUNT) { const i = next++; await loadFrame(i); }
  };
  for (let k = 0; k < CONC; k++) worker();
  // rede de segurança: garante o boot mesmo se a carga travar
  setTimeout(() => { if (!bootDone) { bootDone = true; if (onBootReady) onBootReady(); } }, 9000);
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('is-done');
}

/* ---------------------------------------------------------------------------
   4) MODO REDUZIDO — sem scroll-video, sem animação (acessível / sem JS pesado)
--------------------------------------------------------------------------- */
function initReduced() {
  initMenu(null);
  // carrega só um frame (meio do filme) para dar atmosfera ao herói
  if (canvas && ctx) {
    const img = new Image();
    img.onload = () => { frames[0] = img; frameReady[0] = true; readyUpTo = 0; eased = 0; resizeCanvas(); };
    img.src = CONFIG.framePath(Math.round(FRAME_COUNT / 2));
    window.addEventListener('resize', resizeCanvas);
  }
  hideLoader();
}

/* ---------------------------------------------------------------------------
   5) SITE COMPLETO — Lenis + ScrollTrigger + timelines
--------------------------------------------------------------------------- */
function initSite() {
  hideLoader();
  if (!hasGSAP) { resizeCanvas(); return; }

  gsap.registerPlugin(ScrollTrigger);

  /* --- Lenis smooth scroll + integração com o ticker do GSAP --- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // (re)liga menu com o lenis disponível para scroll suave
  initMenu(lenis);

  /* --- canvas + ATOS: um só ScrollTrigger no #film comanda o scrub do filme
         e o crossfade do texto. O texto troca por faixa de scroll (efeito Iron Man). --- */
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const rig = document.getElementById('rig');
  const scrollHint = document.getElementById('scrollHint');
  const scrimL = document.getElementById('scrimL');
  const scrimB = document.getElementById('scrimB');

  /* --- easings + util --- */
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInCubic = (x) => x * x * x;
  const easeOutBack = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const smooth = (x, a, b) => { const t = clamp01((x - a) / ((b - a) || 1)); return t * t * (3 - 2 * t); };

  /* --- divide título/frase em LINHAS (máscara) + PALAVRAS (.rw), preservando <em>/<strong> --- */
  function appendWords(text, parent, words) {
    text.split(/(\s+)/).forEach((p) => {
      if (p === '') return;
      if (/^\s+$/.test(p)) { parent.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'rw rv'; w.textContent = p;
      parent.appendChild(w); words.push(w);
    });
  }
  function splitToWords(el) {
    const lines = [[]];
    el.childNodes.forEach((node) => {
      if (node.nodeName === 'BR') { lines.push([]); return; }
      lines[lines.length - 1].push(node);
    });
    el.textContent = '';
    const words = [];
    lines.forEach((nodes) => {
      const line = document.createElement('span');
      line.className = 'rl';
      nodes.forEach((node) => {
        if (node.nodeType === 3) appendWords(node.textContent, line, words);
        else {
          const wrap = document.createElement(node.nodeName.toLowerCase());
          appendWords(node.textContent, wrap, words);
          line.appendChild(wrap);
        }
      });
      el.appendChild(line);
    });
    return words;
  }

  /* --- monta as camadas animáveis de cada ato, em ordem visual (DOM) --- */
  function buildAct(el) {
    const sel = '.eyebrow, .hero__title, .hero__sub, .hero__bar, .hero__secondary, .act__statement, .act__cta';
    const layers = [];
    el.querySelectorAll(sel).forEach((node) => {
      if (node.matches('.hero__title, .act__statement')) {
        splitToWords(node).forEach((w) => layers.push({ el: w, masked: true }));
      } else {
        node.classList.add('rv');
        layers.push({ el: node, masked: false });
      }
    });
    return { el, s: parseFloat(el.dataset.start) || 0, e: parseFloat(el.dataset.end) || 1, layers, isFirst: el.id === 'act1', far: false };
  }

  const acts = gsap.utils.toArray('.act').map(buildAct);
  const STAG = 0.05;        // atraso de entrada por camada (fração de banda)
  const ENTER_DUR = 0.30;   // duração da entrada de uma camada (fração de banda)
  const EXIT_AT = 0.72;     // início da saída (fração de banda)
  const EXIT_DUR = 0.28;
  let introT = 0;           // 0..1 — entrada temporal do ato 1 na carga
  let curProgress = 0, curScroll = 0;

  function applyLayer(layer, eIn, eOut) {
    const inC = easeOutCubic(eIn), outC = easeInCubic(eOut);
    const el = layer.el;
    el.style.opacity = clamp01(inC * (1 - outC)).toFixed(3);
    if (layer.masked) {
      const y = (1 - easeOutBack(eIn)) * 1.12 - outC * 0.5;          // em — sobe da máscara (overshoot), sai por cima
      el.style.transform = 'translate3d(0,' + y.toFixed(3) + 'em,0)';
    } else {
      const y = (1 - inC) * 26 - outC * 22;                          // px
      const sc = (0.965 + 0.035 * inC).toFixed(4);
      const blur = (eIn < 0.99 || eOut > 0.01) ? (1 - inC) * 9 + outC * 7 : 0;
      el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + sc + ')';
      el.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
    }
  }

  function paintActs(progress, scrollProgress) {
    const sp = scrollProgress == null ? progress : scrollProgress;
    acts.forEach((act) => {
      const band = (progress - act.s) / ((act.e - act.s) || 1);
      if (band < -0.12 || band > 1.12) {              // fora da faixa: esconde e pula
        if (!act.far) { act.el.style.opacity = '0'; act.el.style.pointerEvents = 'none'; act.el.setAttribute('aria-hidden', 'true'); act.far = true; }
        return;
      }
      act.far = false;
      act.el.style.opacity = '1';
      const n = act.layers.length;
      act.layers.forEach((layer, k) => {
        const eIn = act.isFirst
          ? clamp01((introT - k * 0.06) / 0.55)        // ato 1: entrada temporal (carga), escalonada
          : clamp01((band - k * STAG) / ENTER_DUR);    // demais: entrada pelo scroll
        const eOut = clamp01((band - EXIT_AT - (n - 1 - k) * 0.015) / EXIT_DUR);  // saída escalonada reversa
        applyLayer(layer, eIn, eOut);
      });
      const active = band > 0.05 && band < 0.95;
      act.el.style.pointerEvents = active ? 'auto' : 'none';
      act.el.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    // scrims adaptativos: esquerdo enfraquece após o ato 1; inferior sobe nos beats do motor
    if (scrimL) scrimL.style.opacity = (1 - smooth(progress, 0.18, 0.30) * 0.82).toFixed(3);
    if (scrimB) scrimB.style.opacity = smooth(progress, 0.20, 0.30).toFixed(3);
    // HUD + dica somem na abertura
    const open = clamp01(1 - sp / 0.30);
    if (rig) rig.style.opacity = (0.5 * open).toFixed(3);
    if (scrollHint) scrollHint.style.opacity = open.toFixed(3);
  }

  /* RITMO por beat: remapeia o progresso do scroll -> progresso do filme, para
     alguns beats "respirarem" (ganhar mais scroll). Pontos [scroll, frame], interp
     linear monotônica. Identidade por ora; afinado contra o filme final. */
  const PACING = [[0, 0], [1, 1]];
  function paceFrameProgress(p) {
    for (let i = 1; i < PACING.length; i++) {
      const [p0, f0] = PACING[i - 1], [p1, f1] = PACING[i];
      if (p <= p1) return f0 + (f1 - f0) * ((p - p0) / ((p1 - p0) || 1));
    }
    return 1;
  }

  let frameTarget = 0;
  ScrollTrigger.create({
    trigger: '#film', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => {
      const fp = paceFrameProgress(self.progress);   // progresso no espaço do FILME
      frameTarget = fp * (FRAME_COUNT - 1);
      curProgress = fp; curScroll = self.progress;
      paintActs(fp, self.progress);
    },
  });
  paintActs(0, 0);                                    // estado inicial: ato 1 visível antes do scroll

  /* Loop de render: UMA suavização normalizada por tempo (consistente em 60/120Hz,
     sem rubber-banding) + repaint a cada tick enquanto há movimento + pré-decode. */
  const TAU = 0.09;                                   // s — "peso" do follow cinematográfico
  let lastTickT = -1;
  gsap.ticker.add(() => {
    const now = gsap.ticker.time;
    const dt = lastTickT < 0 ? 1 / 60 : Math.min(0.05, now - lastTickT);
    lastTickT = now;
    eased += (frameTarget - eased) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(frameTarget - eased) < 0.0015) eased = frameTarget;
    if (Math.abs(eased - lastPainted) > 0.0025) {
      paintFrame(eased);
      const idx = Math.round(eased);
      if (idx !== ensureDecoded._last) { ensureDecoded(idx); ensureDecoded._last = idx; }
      lastPainted = eased;
    }
  });

  /* --- engrenagens girando (idle) — serviços e processo --- */
  gsap.to('.svc__glyph-gear', { rotation: 360, transformOrigin: '50% 50%', ease: 'none', duration: 22, repeat: -1 });
  gsap.to('.proc__node-gear', { rotation: 360, transformOrigin: '50% 50%', ease: 'none', duration: 13, repeat: -1 });

  /* --- ATO 1: entrada na carga via introT (mesma linguagem de revelação em camadas) + selo --- */
  const introObj = { v: 0 };
  gsap.to(introObj, {
    v: 1, duration: 1.2, ease: 'none', delay: 0.12,
    onUpdate() { introT = introObj.v; paintActs(curProgress, curScroll); },
  });
  gsap.from('.hero__seal', { opacity: 0, scale: 0.9, duration: 0.7, ease: 'power2.out', delay: 0.5 });

  /* --- REVEALS de seção --- */
  const revealEls = gsap.utils.toArray('[data-reveal]');
  gsap.set(revealEls, { opacity: 0, y: 26 });
  ScrollTrigger.batch(revealEls, {
    start: 'top 88%', once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', overwrite: true }),
  });

  /* --- SERVIÇOS: scroll horizontal no desktop / swipe nativo no mobile --- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const track = document.getElementById('svcTrack');
    const vp = document.getElementById('svcViewport');
    if (!track || !vp) return;
    const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#svcViewport', start: 'center center', end: () => '+=' + dist(),
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });
    return () => { tween.kill(); gsap.set(track, { x: 0 }); };
  });

  /* --- COMO FUNCIONA: linha de torque desenha + nós acendem --- */
  const procPath = document.getElementById('procPath');
  if (procPath) {
    const L = procPath.getTotalLength();
    procPath.style.strokeDasharray = L;
    procPath.style.strokeDashoffset = L;
    gsap.to(procPath, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.proc__timeline', start: 'top 65%', end: 'bottom 75%', scrub: true },
    });
  }
  gsap.utils.toArray('.proc__step').forEach((step) => {
    ScrollTrigger.create({
      trigger: step, start: 'top 68%', end: 'bottom 60%',
      onToggle: (self) => step.classList.toggle('is-on', self.isActive),
    });
  });

  /* --- Parallax sutil no selo Bosch --- */
  gsap.to('.bosch__seal img', {
    yPercent: -8, ease: 'none',
    scrollTrigger: { trigger: '.bosch', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* --- header: estado "scrolled" --- */
  const hd = document.getElementById('hd');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => hd.classList.toggle('is-scrolled', self.scroll() > 40),
  });

  /* --- recalibra quando as fontes carregarem --- */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------------------------------------------------------------------------
   BOOT
--------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  buildAllGears();
  setYear();
  initForm();
  initHeroBar();

  if (reduceMotion || !hasGSAP) {
    initReduced();
    return;
  }

  // gira a engrenagem do loader durante o carregamento
  gsap.to('#loaderGear', { rotation: 360, transformOrigin: '50% 50%', ease: 'none', duration: 4, repeat: -1 });

  // carga em streaming: inicia o herói assim que os primeiros frames chegam
  // (streamFrames tem sua própria rede de segurança de 9s)
  streamFrames(initSite);
});
