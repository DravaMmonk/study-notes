import { ISO_CSS } from './kit/iso-kit.js'

// Fieldnotes tokens for the anatomy kit: warm paper, night ink and blueprint. Every fill and stroke
// in a figure reads one of these, so a theme is only a token set.
const THEMES = `
.iso[data-theme="light"]{
  --anatomy-page:#fbfaf6;--anatomy-card:#fdfcf8;--anatomy-text:#5b5850;--anatomy-strong:#23221e;--anatomy-muted:#8f8b80;
  --anatomy-paper:#fdfcf8;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dedad0;--anatomy-shade-1:#e7e3da;--anatomy-shade-2:#efece4;--anatomy-shade-3:#f6f4ee;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#efebe2;
  --anatomy-hi:#2a2925;--anatomy-mid:#8d897e;--anatomy-lo:#b8b4a9;--anatomy-faint:#d9d5cb;--anatomy-lit:#000000;
  --anatomy-halo:#8a8270;--anatomy-halo-opacity:.3;--anatomy-dot:#3b3934;
}
.iso[data-theme="dark"]{
  --anatomy-page:#151513;--anatomy-card:#191917;--anatomy-text:#a8a59c;--anatomy-strong:#ecebe6;--anatomy-muted:#75726a;
  --anatomy-paper:#191917;--anatomy-face:#22221f;--anatomy-top:#232320;
  --anatomy-shade-0:#141412;--anatomy-shade-1:#181816;--anatomy-shade-2:#1b1b19;--anatomy-shade-3:#1f1f1c;
  --anatomy-lit-top:#2e2e2a;--anatomy-lit-shade:#252522;
  --anatomy-hi:#dcdad3;--anatomy-mid:#77746c;--anatomy-lo:#47453f;--anatomy-faint:#302f2b;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.85;--anatomy-dot:#ecebe6;
}
.iso[data-theme="blueprint"]{
  --anatomy-page:#16324f;--anatomy-card:#183757;--anatomy-text:#a9c3dc;--anatomy-strong:#eaf3fb;--anatomy-muted:#7d9cbb;
  --anatomy-paper:#183757;--anatomy-face:#1d4067;--anatomy-top:#1e4269;
  --anatomy-shade-0:#14304d;--anatomy-shade-1:#163452;--anatomy-shade-2:#183857;--anatomy-shade-3:#1a3b5d;
  --anatomy-lit-top:#25507c;--anatomy-lit-shade:#1f456d;
  --anatomy-hi:#e3eef9;--anatomy-mid:#7fa3c7;--anatomy-lo:#4f7499;--anatomy-faint:#2f5379;--anatomy-lit:#ffffff;
  --anatomy-halo:#0a1a2c;--anatomy-halo-opacity:.7;--anatomy-dot:#eaf3fb;
}
`

// Controls and the worked sum under a card, in the card's own mono voice.
const EXTRA = `
.iso-figure{margin:0}
.iso-plate{border-radius:2px}
.iso-legend{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.iso-caption{max-width:62ch}
.iso-plate-corner[data-corner="hint"],.iso-plate-corner[data-corner="title"]{max-width:46%;overflow:hidden;text-overflow:ellipsis}
.iso-stage{outline:none;touch-action:pan-y;cursor:crosshair}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.fx-neg>.iso-top{fill:var(--anatomy-lo)}
.fx-band{fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:.6px;vector-effect:non-scaling-stroke}
.fx-neg>.iso-shade{fill:var(--anatomy-mid)}
.fx-controls{display:flex;flex-wrap:wrap;gap:6px 18px;margin:2px 0 4px}
.fx-control{display:flex;align-items:center;gap:2px;font-family:var(--anatomy-mono);font-size:10.5px;letter-spacing:.04em}
.fx-control>span{margin-right:6px;color:var(--anatomy-muted);letter-spacing:.1em}
.fx-control button{min-height:26px;padding:0 8px;border:0;border-radius:2px;color:var(--anatomy-text);background:transparent;box-shadow:inset 0 0 0 1px var(--anatomy-faint);font:inherit;cursor:pointer;transition:background 140ms ease,color 140ms ease}
.fx-control button:hover{color:var(--anatomy-strong)}
.fx-control button[aria-pressed="true"]{color:var(--anatomy-card);background:var(--anatomy-hi);box-shadow:none}
.fx-control button:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:2px}
.fx-calc{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-family:var(--anatomy-mono);font-size:11px;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.fx-calc i{font-style:normal;color:var(--anatomy-muted)}
.fx-calc>b{color:var(--anatomy-strong);font-weight:500}
.fx-grid{display:inline-grid;grid-template-columns:repeat(3,2.2em);gap:1px;padding:1px;background:var(--anatomy-faint)}
.fx-grid b{padding:1px 0;text-align:center;font-weight:400;background:var(--anatomy-card)}
.fx-grid b[data-sign="-1"]{color:var(--anatomy-muted)}
.fx-grid b[data-sign="0"]{color:var(--anatomy-lo)}
@media (max-width:560px){.fx-controls{gap:6px 12px}.iso-plate{padding:38px 8px 58px}.iso-plate-corners{inset:14px 14px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
`

export const FIGURE_CSS = ISO_CSS + THEMES + EXTRA
