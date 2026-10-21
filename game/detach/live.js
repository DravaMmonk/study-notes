// Live part of the figure (appended to detach.js by build.mjs, after MARKUP, CSS, AXES, STROKE, SLIDE and ROUTES).
// One proof per loop, on a fixed timeline in seconds: pulses run from both premises to the die, the ram comes down
// and stamps B, the card rides into the goal and the lamp lights; then the card fades and a blank one takes its
// place. Offscreen the loop stops; under reduced motion the figure rests on the proved state.

const ease = (x) => x * x * (3 - 2 * x);
const span = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
const PERIOD = 9;
const T = { pulse: [0.6, 2.4], down: [2.4, 2.75], up: [2.95, 3.5], slide: [3.6, 4.9], fade: [7.6, 8.1], blank: [8.3, 8.8] };

// A point a share u of the way along a screen polyline.
function along(points, u) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = u * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}
const shift = (axis, by) => `translate(${(AXES[axis][0] * by).toFixed(2)} ${(AXES[axis][1] * by).toFixed(2)})`;

let styled = false;

export function mountDetach(host) {
  if (!styled) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    styled = true;
  }
  host.innerHTML = MARKUP;
  const root = host.firstElementChild;
  const ram = root.querySelector('[data-part="ram"]');
  const proof = root.querySelector('[data-part="proof"]');
  const stamp = root.querySelector('[data-part="stamp"]');
  const pulses = [...root.querySelectorAll('[data-pulse]')].map((el) => [el, ROUTES[el.dataset.pulse]]);
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { root.dataset.theme = document.documentElement.dataset.theme === 'paper' ? 'light' : 'dark'; };
  theme();
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function draw(t) {
    const run = (t - T.pulse[0]) / (T.pulse[1] - T.pulse[0]);
    for (const [el, route] of pulses) {
      const [x, y] = along(route, ease(Math.min(1, Math.max(0, run))));
      el.setAttribute('cx', x.toFixed(2));
      el.setAttribute('cy', y.toFixed(2));
      el.style.opacity = run > 0 && run < 1 ? Math.min(1, run * 8, (1 - run) * 8).toFixed(2) : '0';
    }
    const lit = span(t, T.pulse[0] - 0.2, T.pulse[0] + 0.2) * (1 - span(t, T.up[0], T.slide[1]));
    root.style.setProperty('--on', lit.toFixed(3));
    const press = span(t, T.down[0], T.down[1]) * (1 - span(t, T.up[0], T.up[1]));
    ram.setAttribute('transform', shift('z', -STROKE * press));
    stamp.style.opacity = t >= T.down[1] && t < T.blank[0] ? '1' : '0';
    proof.setAttribute('transform', shift('x', SLIDE * (t < T.blank[0] ? span(t, T.slide[0], T.slide[1]) : 0)));
    proof.style.opacity = (t < T.blank[0] ? 1 - span(t, T.fade[0], T.fade[1]) : span(t, T.blank[0], T.blank[1])).toFixed(3);
    const done = span(t, T.slide[1] - 0.15, T.slide[1] + 0.25) * (1 - span(t, T.fade[0], T.fade[1]));
    root.style.setProperty('--done', done.toFixed(3));
  }

  let frame = 0;
  let visible = false;
  let start = 0;
  const tick = (now) => {
    if (!start) start = now;
    draw(((now - start) / 1000) % PERIOD);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  };
  const run = () => {
    if (still.matches) { cancelAnimationFrame(frame); frame = 0; draw(6); return; }
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };
  const seen = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; run(); }, { rootMargin: '120px 0px' });
  seen.observe(root);
  still.addEventListener('change', run);
  draw(still.matches ? 6 : 0);

  return () => {
    cancelAnimationFrame(frame);
    seen.disconnect();
    themes.disconnect();
    still.removeEventListener('change', run);
    host.innerHTML = '';
  };
}
