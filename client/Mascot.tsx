import { useEffect, useId, useRef, useState } from 'react';

/** Decorative companion. Pointer updates are bounded and never rerender the workspace. */
export function Mascot({ className }: { className: string }) {
  const root = useRef<SVGSVGElement>(null);
  const gradient = useId().replaceAll(':', '');
  const [squished, setSquished] = useState(false);
  const squishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(squishTimer.current), []);
  const squish = () => {
    clearTimeout(squishTimer.current);
    setSquished(true);
    squishTimer.current = setTimeout(() => setSquished(false), 850);
  };
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const layers = [...node.querySelectorAll('[data-comet-layer]')].map(layer =>
      [...layer.querySelectorAll('[data-orbit]')].map(orbit => ({
        trails: [...orbit.querySelectorAll('path')], head: orbit.querySelector('circle')!,
      })));
    let frame = 0;
    let visible = false;
    let last = -Infinity;
    // Project tilted orbital planes, drawing the far half behind the body.
    const point = (angle: number, orbit: number) => {
      const tilt = [1.12, .98, 1.22][orbit];
      const turn = [-.35, .95, -1.15][orbit];
      const x = 105 * Math.cos(angle);
      const y = 105 * Math.sin(angle) * Math.cos(tilt);
      const z = 105 * Math.sin(angle) * Math.sin(tilt);
      const perspective = 1 + z / 700;
      return { x: 120 + (x * Math.cos(turn) - y * Math.sin(turn)) * perspective,
        y: 126 + (x * Math.sin(turn) + y * Math.cos(turn)) * perspective, z };
    };
    const draw = (time: number) => {
      for (let orbit = 0; orbit < 3; orbit++) {
        const direction = orbit === 1 ? -1 : 1;
        const angle = time * [.00085, -.00067, .00074][orbit] + orbit * 2.1;
        for (let segment = 0; segment < 14; segment++) {
          const a = point(angle - direction * (14 - segment) * .09, orbit);
          const b = point(angle - direction * (13 - segment) * .09, orbit);
          const front = (a.z + b.z) / 2 >= 0;
          for (let layer = 0; layer < 2; layer++) {
            layers[layer][orbit].trails[segment].setAttribute('d',
              front === Boolean(layer) ? `M${a.x},${a.y}L${b.x},${b.y}` : '');
          }
        }
        const head = point(angle, orbit);
        for (let layer = 0; layer < 2; layer++) {
          const circle = layers[layer][orbit].head;
          circle.setAttribute('cx', String(head.x));
          circle.setAttribute('cy', String(head.y));
          circle.setAttribute('r', String(5 + (head.z + 105) / 210));
          circle.style.visibility = (head.z >= 0) === Boolean(layer) ? 'visible' : 'hidden';
        }
      }
    };
    const tick = (time: number) => {
      if (time - last >= 32) { draw(time); last = time; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (reduced.matches) draw(0);
      else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(node);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    draw(0);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const reset = () => {
      node.style.setProperty('--look-x', '0px');
      node.style.setProperty('--look-y', '0px');
      node.style.setProperty('--body-x', '0px');
      node.style.setProperty('--body-y', '0px');
      node.style.setProperty('--turn', '0deg');
      node.dataset.facing = 'front';
    };
    const update = () => {
      frame = 0;
      if (!pointer || reduced.matches || document.hidden) { reset(); return; }
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < 0 || box.top > window.innerHeight) return;
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const dx = pointer.x - centerX;
      const dy = pointer.y - centerY;
      const x = clamp(dx / Math.max(40, dx < 0 ? centerX : window.innerWidth - centerX));
      const y = clamp(dy / Math.max(80, dy < 0 ? centerY : window.innerHeight - centerY));
      node.style.setProperty('--look-x', `${x * 30}px`);
      node.style.setProperty('--look-y', `${y * 13}px`);
      node.style.setProperty('--body-x', `${x * 5}px`);
      node.style.setProperty('--body-y', `${y * 3}px`);
      node.style.setProperty('--turn', `${x * 9}deg`);
      node.dataset.facing = Math.abs(x) < .18 ? 'front' : x < 0 ? 'left' : 'right';
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const rest = () => { pointer = null; schedule(); };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', rest);
    window.addEventListener('blur', rest);
    window.addEventListener('resize', rest);
    document.addEventListener('visibilitychange', rest);
    reduced.addEventListener('change', rest);
    reset();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', rest);
      window.removeEventListener('blur', rest);
      window.removeEventListener('resize', rest);
      document.removeEventListener('visibilitychange', rest);
      reduced.removeEventListener('change', rest);
    };
  }, []);

  const comets = (layer: string) => <g data-comet-layer={layer}>
    {['#418af2', '#6d8fff', '#68cfff'].map((color, orbit) => <g key={color} data-orbit={orbit}>
      {Array.from({ length: 14 }, (_, segment) => <path key={segment} fill="none" stroke={color}
        strokeLinecap="round" strokeWidth={2 + segment * .38} opacity={.08 + segment * .065}/>)}
      <circle fill={color}/>
    </g>)}
  </g>;
  return <button type="button" className="mascot-button" aria-label="Squish Ledgerly mascot" title="Click to squish" onClick={squish}>
  <svg ref={root} className={className + ' interactive-mascot'} viewBox="0 0 240 240" aria-hidden="true" data-facing="front" data-squished={squished}>
    <defs>
      <radialGradient id={gradient} cx="65%" cy="25%" r="85%">
        <stop offset="0" stopColor="#fff"/><stop offset=".78" stopColor="#fff"/><stop offset="1" stopColor="#edf0f5"/>
      </radialGradient>
    </defs>
    {comets('back')}
    <g className="mascot-body">
      <g className="mascot-squash">
      <ellipse cx="120" cy="132" rx="77" ry="79" fill="#d7d9df"/>
      <ellipse cx="120" cy="123" rx="77" ry="77" fill={`url(#${gradient})`}/>
      <g className="mascot-face" fill="#08090b">
        <g className="mascot-eyes">
          <rect x="87" y="82" width="24" height="48" rx="12"/>
          <rect x="133" y="82" width="24" height="48" rx="12"/>
        </g>
        <g className="mascot-squint" fill="none" stroke="#08090b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="m88 91 17 13-17 13m63-26-17 13 17 13m-39 16h16"/>
        </g>
      </g>
      </g>
    </g>
    {comets('front')}
  </svg></button>;
}
