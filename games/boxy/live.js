// Live part of the hub figure (appended to boxy.js by build.mjs, after the 3D runtime, DATA, TOUR, ANGLES, MARKUP and
// CSS). The head follows TOUR when nobody points at it and looks at the pointer when someone does. A read cell lights
// up while the head faces it, and the lamp glows while the head spins round with the sum.

const ease = (x) => x * x * (3 - 2 * x);
const PERIOD = TOUR[TOUR.length - 1][0];
const LAP = TOUR[TOUR.length - 1][1] - TOUR[0][1];
const SPIN = TOUR[TOUR.length - 3][0];
// The tour's head angle at time t; each loop ends a whole turn past where it began, so the angle keeps counting.
const tourAt = (t) => {
  const loop = Math.floor(t / PERIOD);
  const s = t - loop * PERIOD;
  let i = 1;
  while (i < TOUR.length - 1 && s > TOUR[i][0]) i++;
  const [t0, a0] = TOUR[i - 1];
  const [t1, a1] = TOUR[i];
  return loop * LAP + a0 + (a1 - a0) * ease(Math.min(1, (s - t0) / (t1 - t0)));
};
const gap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

let styled = false;

export function mountBoxy(host) {
  if (!styled) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    styled = true;
  }
  host.innerHTML = MARKUP;
  const root = host.firstElementChild;
  const stage = root.querySelector('.bx-stage');
  const cells = ['above', 'left'].map((name) => [root.querySelector(`[data-cell="${name}"]`), ANGLES[name]]);
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { root.dataset.theme = document.documentElement.dataset.theme === 'paper' ? 'light' : 'dark'; };
  theme();
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const controller = TURN.mount(stage, DATA, {});
  let angle = ANGLES.viewer;
  let target = angle;
  let clock = 0;
  let pointing = false;
  let visible = false;
  let frame = 0;
  let last = 0;
  let drawn = null;

  const paint = () => {
    if (drawn !== null && Math.abs(angle - drawn) < 1e-3) return;
    controller.set({ head: angle });
    drawn = angle;
    for (const [el, at] of cells) el.style.setProperty('--on', (1 - ease(Math.min(1, gap(angle, at) / 35))).toFixed(3));
    root.toggleAttribute('data-sum', !pointing && clock % PERIOD > SPIN - 0.2);
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (!pointing) {
      clock += dt;
      target = tourAt(clock);
    }
    angle += (target - angle) * (1 - Math.exp(-dt / (pointing ? 0.16 : 0.06)));
    paint();
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // The pointer's angle about the neck on the table, unwrapped next to the current angle.
  const look = (event) => {
    if (still.matches) return;
    const raw = controller.angleAt(event.clientX, event.clientY, 0, 'head') - 90;
    target = raw + 360 * Math.round((angle - raw) / 360);
    pointing = true;
    run();
  };
  // Back to the tour from its start (looking at the viewer), on the lap nearest the current angle.
  const leave = () => {
    if (!pointing) return;
    pointing = false;
    clock = PERIOD * Math.round((angle - ANGLES.viewer) / LAP);
  };
  host.addEventListener('pointermove', look);
  host.addEventListener('pointerleave', leave);

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '80px 0px' });
  io.observe(stage);
  paint();

  return () => {
    if (frame) cancelAnimationFrame(frame);
    io.disconnect();
    themes.disconnect();
    host.removeEventListener('pointermove', look);
    host.removeEventListener('pointerleave', leave);
    controller.destroy();
  };
}
