# Refinamento cinematográfico do filme-herói — Automotiva Express

**Data:** 2026-06-27 · **Escopo:** somente o herói (#film) · **Mobile:** ignorado por ora · **Teto de crédito Higgsfield:** ~200cr (saldo 464,75).

## Contexto / problema

O herói é um *scroll-film*: sequência de 154 JPGs (`assets/frames/f_001..154.jpg`, 1440×810) scrubbada por UMA ScrollTrigger sobre `#film` (520vh), com 3 "atos" de texto em crossfade via `paintActs()`. A arquitetura é boa, mas a execução fica longe de "comercial premium" em pontos confirmados pela análise:

1. **Corte car→motor** (meta 1): a "transição" é um crossfade de 0,3s entre o cofre (T2) e um exploded gerado à parte (preto) — é um **corte de cena**, não plano contínuo.
2. **Flipbook** (metas 2,5): o canvas só repinta quando o índice **inteiro** muda e nunca mistura frames adjacentes → 154 estados discretos em 520vh. Suavização tripla (Lenis 0.1 + scrub + lerp 0.18 não-normalizado) → rubber-banding, feel diferente em 60/120Hz.
3. **Texto barato** (meta 3): `paintActs` anima só opacity + 16px translateY; o intro bonito roda uma vez e é descartado no scroll.
4. **Texto não-responsivo** (meta 4): 3 atos fixos à esquerda em todo beat/tela; no exploded o texto cai sobre o motor. Sem modelo cena→âncora→safe-zone.
5. **Marca** (meta 6): A1 tem grade **sem emblema**; o VW aparece ~frame 60. Conformar a cabeça do filme, mantendo o Golf.
6. **Carga**: 154 frames (~10,6MB) bloqueiam a página inteira atrás do loader.

## Decisões do usuário
Escopo = só herói · **Full-send criativo, teto ~200cr** · Fidelidade máxima (via 1080p + upscale 4K, não 4K nativo) · Mobile ignorado por ora · Executar autônomo até concluir.

## Design

### A) Regeneração de vídeo — cirúrgica, gated, ~185cr
Reaproveita T1 (push-in) e T2 (capô→cofre) que já estão bons; gasta no que está quebrado (o corte) e no emblema.

| Passo | Ação | Modelo | Custo |
|---|---|---|---|
| Emblema | inpaint do VW na grade do A1; re-render da **T1** a partir dele | edit + `kling3_0` | ~3 + 7,5 |
| **Plano-sequência** | UM plano contínuo: o motor **sobe do cofre e abre no exploded**; `start`=cofre (último frame T2), `end`=exploded, ~10s, dolly lento + DoF — **substitui o corte** | `cinematic_studio_3_0` 1080p | 50 |
| Re-rolls | 2 tentativas de folga p/ o plano-sequência (gated por `get_cost`) | idem | ~100 |
| Assentar | re-encadeia T4 do novo exploded (ou reaproveita) | reuse/`kling3_0` | 0–7,5 |
| Acabar | stitch → **upscale 4K-pro do filme inteiro (1×)** + grade local | `bytedance_video_upscale` | 24 |

**Total ≈ 185cr** (margem ~15 sob o teto). **Disciplina:** gerar o plano-sequência **primeiro como teste**; se emplacar, finalizar; se não convergir na folga, **fallback = transição estilizada em código** (mask-wipe + bloom de exposição sobre o corte atual) e parar de gastar. `get_cost` antes de cada render pago; parar se saldo projetado < ~40cr.

### B) Motor de renderização — só código, 0cr
- **Blend de frames adjacentes**: `floor(eased)` em alpha cheio + `ceil(eased)` em alpha=`frac`; repinta todo tick enquanto há movimento → movimento contínuo (acaba o flipbook).
- **Uma suavização normalizada por tempo**: `eased += (target-eased)*(1-exp(-dt/τ))` via delta do `gsap.ticker`; remover o gate de inteiro e a lerp 0.18. Feel igual em 60/120Hz.
- **Pré-decode** (`createImageBitmap`/`decode()`) de uma janela de frames à frente.
- **Carga em streaming**: `<link rel=preload>` no frame 1, iniciar com ~15–20 frames, streamar o resto por posição de scroll; *gate só do scrub*, não da página. (Necessário pois o source 4K-upscaled gera frames maiores.)
- **Ritmo variável por tomada**: mapeamento progress→frame não-linear (alocação de scroll por beat) — beats-chave (capô, motor subindo) "respiram".

### C) Texto premium — só código, 0cr (metas 3,4)
- **Modelo de âncora por cena** + safe-zones: cada ato com âncora/offset por beat → texto **acompanha o assunto e nunca o cobre** (beat1 esquerda, beat2 inferior-esq, beat3 faixa inferior, beat4 terço inferior). **Scrim adaptativo** por progresso (wash esquerdo → placa inferior).
- **Revelações em camadas** (dirigidas por progresso, não one-shot): máscara/clip por linha, `blur(8→0)`, `scale .96→1`, stagger por palavra no H1, deriva **com a câmera**, easing com leve overshoot.
- **4º ato + CTA compacto fixo** no beat 0.74–1.0 (hoje mudo); reaproveita handler do `#heroBar` — sem inventar conteúdo do cliente.

### D) Acabamento (meta 5)
Upscale 4K + grade local: parar o crop/upscale de 12% (`build_film_frames.py`), grão sutil, bloom em highlights, DoF/vinheta leve, motion-blur opcional — calibrado ao design LIGHT, sem exagero.

## Fora de escopo
Seções abaixo do herói (coesão de página) e mobile. Conteúdo de cliente (WhatsApp/reviews/horário/anos/og) segue placeholder — não inventar.

## Ordem de execução
1. **Código motor** (B) → validar contra frames atuais (headless desktop).
2. **Código texto** (C) → mecanismo (valores de timing afinados depois do vídeo).
3. **Regeneração de vídeo** (A) gated → rebuild frames + `FRAME_COUNT`.
4. **Afinar** bandas/âncoras de texto ao novo filme; **grade/upscale** (D).
5. **Validação final** headless + auditoria de saldo + atualizar memória.

## Verificação
Headless Chrome desktop com screenshots por beat + na costura, antes/depois; contact-sheet de cada tomada antes do stitch; auditoria `get_cost`/`balance` mantendo gasto ≤200cr; conferir ausência de erros JS, scrub contínuo (sem flipbook), texto fora do assunto, freeze final.

## Riscos / mitigação
- **Plano-sequência pode não convergir** (IA deforma mecânica): teste único antes de comprometer; fallback em código pronto.
- **Payload do filme maior** (4K-upscaled): streaming + janela de pré-decode obrigatórios antes de subir frames.
- **Drift de cor/identidade entre tomadas**: grade uniforme + upscale no filme final unificam o look; revisar contact-sheet.
- **Não inventar conteúdo de cliente**: todo texto novo usa linguagem de marca/processo já aprovada.
