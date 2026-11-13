// Live part of the figure (appended to shear.js by build.mjs, after the 3D runtime, model.js, DATA, DECK, MARKUP and
// CSS). The table follows the tour (model.js) when nobody points at it; a pointer over the figure takes the turntable
// and turns the rack to face the pointer, with the grid sheared.

let styled = false;

export function mountShear(host) {
  if (!styled) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    styled = true;
  }
  host.innerHTML = MARKUP;
  const root = host.firstElementChild;
  const stage = root.querySelector('.sh-stage');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { root.dataset.theme = document.documentElement.dataset.theme === 'paper' ? 'light' : 'dark'; };
  theme();
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const controller = TURN.mount(stage, DATA, {});
  // At rest (and under reduced motion) the grid stands sheared, square to the viewer.
  let clock = 3;
  let now = tourAt(clock);
  let target = now;
  let pointing = false;
  let visible = false;
  let frame = 0;
  let last = 0;
  let drawn = null;

  const paint = () => {
    if (drawn && Math.abs(now.turn - drawn.turn) < 1e-3 && Math.abs(now.k - drawn.k) < 1e-5) return;
    controller.set(pose(now.turn, now.k));
    drawn = { ...now };
  };

  function tick(time) {
    const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60;
    last = time;
    if (!pointing) {
      clock += dt;
      target = tourAt(clock);
    }
    const f = 1 - Math.exp(-dt / (pointing ? 0.16 : 0.05));
    now = { turn: now.turn + (target.turn - now.turn) * f, k: now.k + (target.k - now.k) * f };
    paint();
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // The pointer's angle about the turntable's axis, unwrapped next to the table's own; the grid stays sheared.
  const take = (event) => {
    if (still.matches) return;
    // The rack faces +y at rest, so it faces the pointer a quarter turn back from the pointer's angle.
    const raw = controller.angleAt(event.clientX, event.clientY, DECK, 'table') - 90;
    target = { turn: raw + 360 * Math.round((now.turn - raw) / 360), k: KMAX };
    pointing = true;
    run();
  };
  // Back to the tour with the grid sheared, on the lap nearest the table's angle.
  const leave = () => {
    if (!pointing) return;
    pointing = false;
    clock = PERIOD * Math.round(now.turn / 360) + 3;
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
