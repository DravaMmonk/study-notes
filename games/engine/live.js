// Live part of the figure (appended to engine.js by build.mjs, after the 3D runtime, model.js, DATA, MARKUP and CSS).
// The crank turns once a term when nobody points at it; a pointer over the figure takes the crank and turns it, and
// every group follows from the crank alone (model.js pose). The column being added into lights its digits.

const TURN_S = 2.6;
const DRIVE_S = 2.1;
const smooth = (x) => x * x * (3 - 2 * x);
// The tour's crank position at time t: one eased turn a term, then a rest.
const tourAt = (t) => {
  const n = Math.floor(t / TURN_S);
  return n + smooth(Math.min(1, (t - n * TURN_S) / DRIVE_S));
};

let styled = false;

export function mountEngine(host) {
  if (!styled) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    styled = true;
  }
  host.innerHTML = MARKUP;
  const root = host.firstElementChild;
  const stage = root.querySelector('.eg-stage');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { root.dataset.theme = document.documentElement.dataset.theme === 'paper' ? 'light' : 'dark'; };
  theme();
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const controller = TURN.mount(stage, DATA, {});
  // At rest (and under reduced motion) the engine shows 4 = 2², halfway through a cycle's first terms.
  let crank = 2;
  let target = crank;
  let clock = 2 * TURN_S;
  let pointing = false;
  let visible = false;
  let frame = 0;
  let last = 0;
  let drawn = null;

  const paint = () => {
    if (drawn !== null && Math.abs(crank - drawn) < 1e-5) return;
    controller.set(pose(crank));
    drawn = crank;
    const col = adding(crank);
    if (col) root.dataset.adding = col;
    else delete root.dataset.adding;
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (!pointing) {
      clock += dt;
      target = tourAt(clock);
    }
    crank += (target - crank) * (1 - Math.exp(-dt / (pointing ? 0.18 : 0.05)));
    paint();
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // The pointer's angle about the crank, unwrapped next to the crank's own, in turns.
  const take = (event) => {
    if (still.matches) return;
    const raw = controller.angleAt(event.clientX, event.clientY, CRANK_Z, 'crank') / 360;
    target = raw + Math.round(crank - raw);
    pointing = true;
    run();
  };
  // Back to the tour from the nearest whole term.
  const leave = () => {
    if (!pointing) return;
    pointing = false;
    clock = Math.round(crank) * TURN_S;
  };
  host.addEventListener('pointermove', take);
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
    host.removeEventListener('pointermove', take);
    host.removeEventListener('pointerleave', leave);
    controller.destroy();
  };
}
