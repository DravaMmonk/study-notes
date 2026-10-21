// Live part of the figure (appended to stick.js by build.mjs, after MARKUP, CSS, AXES, DEPTH, REST, MOVES, TIMES,
// PERIOD, CLOSE, CASE_TOP and ABOVE_STICK). Each sort follows its keyframes; where it is decides which layer paints
// it: its compartment's slot while it is down in the case (the dividers in front hide its foot), the air above
// everything while it travels, and the stick's layer once it is over the stick (the lip hides its foot), sorted by
// depth inside a layer. Offscreen the loop stops; under reduced motion the figure rests on the finished line.

const ease = (x) => x * x * (3 - 2 * x);
const span = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));

// A sort's offset [dx, dy, dz] at time t, eased between keyframes.
function offsetAt(frames, t) {
  if (t <= frames[0][0]) return frames[0].slice(1);
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const f = ease((t - frames[i - 1][0]) / (frames[i][0] - frames[i - 1][0]));
      return [1, 2, 3].map((j) => frames[i - 1][j] + (frames[i][j] - frames[i - 1][j]) * f);
    }
  }
  return frames[frames.length - 1].slice(1);
}
const screen = ([dx, dy, dz]) => [0, 1].map((j) => AXES.x[j] * dx + AXES.y[j] * dy + AXES.z[j] * dz);

let styled = false;

export function mountStick(host) {
  if (!styled) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    styled = true;
  }
  host.innerHTML = MARKUP;
  const root = host.firstElementChild;
  const slot = (name) => root.querySelector(`[data-slot="${name}"]`);
  const stick = slot('stick');
  const air = slot('air');
  const sorts = [...root.querySelectorAll('[data-sort]')].map((el) => {
    const id = el.dataset.sort;
    const frames = MOVES[id];
    const reach = frames.reduce((most, f) => Math.max(most, f[2]), 0); // dy when it stands over the stick
    return { el, id, frames, reach, home: slot(`case-${id}`) };
  });
  const knee = root.querySelector('[data-part="knee"]');
  const tense = root.querySelector('[data-mark="tense"]');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { root.dataset.theme = document.documentElement.dataset.theme === 'paper' ? 'light' : 'dark'; };
  theme();
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function draw(t) {
    const placed = { stick: [], air: [] };
    for (const s of sorts) {
      const [dx, dy, dz] = offsetAt(s.frames, t);
      const [sx, sy] = screen([dx, dy, dz]);
      s.el.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      const overStick = s.reach > 0 && dy > s.reach - 0.01;
      const layer = overStick ? stick : dz > CASE_TOP ? air : s.home;
      const depth = DEPTH.x * (REST[s.id][0] + dx) + DEPTH.y * (REST[s.id][1] + dy);
      if (layer === s.home) { if (s.el.parentNode !== layer) layer.append(s.el); } else placed[layer === air ? 'air' : 'stick'].push([depth, s.el]);
    }
    for (const [name, layer] of [['stick', stick], ['air', air]]) {
      const list = placed[name].sort((a, b) => a[0] - b[0]).map(([, el]) => el);
      if (list.some((el, i) => layer.children[i] !== el) || layer.children.length !== list.length) layer.replaceChildren(...list);
    }
    const close = span(t, ...TIMES.close) * (1 - span(t, ...TIMES.open));
    knee.setAttribute('transform', `translate(${(AXES.x[0] * CLOSE * close).toFixed(2)} ${(AXES.x[1] * CLOSE * close).toFixed(2)})`);
    root.style.setProperty('--done', close.toFixed(3));
    const no = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - TIMES.refuse[0]) / (TIMES.refuse[1] - TIMES.refuse[0]))));
    tense.style.setProperty('--no', no.toFixed(3));
  }

  let frame = 0;
  let visible = false;
  let start = 0;
  const RESTED = (TIMES.close[1] + TIMES.open[0]) / 2;
  const tick = (now) => {
    if (!start) start = now;
    draw(((now - start) / 1000) % PERIOD);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  };
  const run = () => {
    if (still.matches) { cancelAnimationFrame(frame); frame = 0; draw(RESTED); return; }
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };
  const seen = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; run(); }, { rootMargin: '120px 0px' });
  seen.observe(root);
  still.addEventListener('change', run);
  draw(still.matches ? RESTED : 0);

  return () => {
    cancelAnimationFrame(frame);
    seen.disconnect();
    themes.disconnect();
    still.removeEventListener('change', run);
    host.innerHTML = '';
  };
}
