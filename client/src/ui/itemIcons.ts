/** Hand-drawn 48×48 SVG icons for the builder items (castle shop and the builder's bag). */
const bg = (a: string, b: string) =>
  `<defs><radialGradient id="g"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="48" height="48" fill="url(#g)"/>`;

const ICONS: Record<string, string> = {
  war_horn: bg('#6a2a18', '#2a0e08')
    + '<path d="M9 30 Q14 14 34 10 L38 8 L40 16 L36 16 Q22 20 17 33 Z" fill="#e8c060" stroke="#5a3a10" stroke-width="1.5"/>'
    + '<path d="M36 9 L41 7 L42 18 L37 16 Z" fill="#fff0b0" stroke="#5a3a10" stroke-width="1.2"/>'
    + '<path d="M17 24 L22 28 M22 19 L27 23" stroke="#8a5a18" stroke-width="2"/>'
    + '<ellipse cx="13" cy="33" rx="5" ry="3" fill="#8a5a18"/>'
    + '<path d="M10 40 h6 M20 41 h4 M28 39 h6" stroke="#ffd860" stroke-width="2" stroke-linecap="round"/>',
  aegis: bg('#1e3a6a', '#081428')
    + '<path d="M24 6 L39 11 Q39 30 24 42 Q9 30 9 11 Z" fill="#5a8ae0" stroke="#d8e8ff" stroke-width="2"/>'
    + '<path d="M24 12 L24 36 M15 20 L33 20" stroke="#ffe080" stroke-width="4" stroke-linecap="round"/>',
  chalice: bg('#1e4a22', '#08180a')
    + '<path d="M13 9 H35 Q35 24 24 26 Q13 24 13 9 Z" fill="#e0c060" stroke="#5a4010" stroke-width="1.5"/>'
    + '<path d="M15 12 H33 Q32 20 24 22 Q16 20 15 12 Z" fill="#50d860"/>'
    + '<path d="M22 26 h4 v8 h-4 Z" fill="#c8a040"/><path d="M15 39 Q24 32 33 39 Z" fill="#e0c060" stroke="#5a4010" stroke-width="1.5"/>'
    + '<circle cx="19" cy="15" r="1.6" fill="#c8ffc8"/><circle cx="27" cy="17" r="1.2" fill="#c8ffc8"/>',
  boots: bg('#4a3a22', '#18120a')
    + '<path d="M16 8 H27 V26 L38 31 Q41 33 40 37 H14 Z" fill="#9a6a3a" stroke="#3a2410" stroke-width="1.5"/>'
    + '<path d="M14 37 H40 V40 H14 Z" fill="#3a2410"/><path d="M16 12 H27" stroke="#d8b070" stroke-width="2"/>'
    + '<path d="M28 12 Q38 6 44 9 Q38 11 36 14 Q41 14 43 17 Q36 18 30 17 Z" fill="#f0f0ff" stroke="#8a8ab0" stroke-width="1"/>',
  crossbow: bg('#3a3a2a', '#12120a')
    + '<path d="M8 18 Q24 6 40 18" fill="none" stroke="#c8a060" stroke-width="3.5" stroke-linecap="round"/>'
    + '<path d="M8 18 L24 22 L40 18" fill="none" stroke="#f0f0e0" stroke-width="1.2"/>'
    + '<path d="M24 12 V42" stroke="#7a4a20" stroke-width="5" stroke-linecap="round"/>'
    + '<path d="M24 4 L21 10 H27 Z" fill="#d8e0f0"/><path d="M24 9 V22" stroke="#d8e0f0" stroke-width="1.6"/>',
  hammer: bg('#4a3a2a', '#14100a')
    + '<path d="M14 40 L32 18" stroke="#8a5a2a" stroke-width="5" stroke-linecap="round"/>'
    + '<path d="M22 12 L34 6 L42 20 L30 26 Z" fill="#a8b0c0" stroke="#40444c" stroke-width="1.5"/>'
    + '<path d="M24 13 L33 9" stroke="#e8eef8" stroke-width="1.5"/>'
    + '<path d="M8 36 l3 -3 M6 30 l4 0 M12 42 l0 -4" stroke="#ffd860" stroke-width="2" stroke-linecap="round"/>',
  spyglass: bg('#2a2a4a', '#0a0a1a')
    + '<path d="M8 34 L36 14" stroke="#c8a040" stroke-width="7" stroke-linecap="round"/>'
    + '<path d="M8 34 L20 25.5" stroke="#7a5a20" stroke-width="5" stroke-linecap="round"/>'
    + '<circle cx="38" cy="12.5" r="4.5" fill="#a8d8ff" stroke="#e8c060" stroke-width="2"/>'
    + '<circle cx="36.5" cy="11" r="1.4" fill="#fff"/>',
  flare: bg('#5a1a10', '#1a0604')
    + '<path d="M24 4 Q32 14 28 22 Q34 20 34 28 Q34 40 24 42 Q14 40 14 28 Q14 20 20 22 Q16 14 24 4 Z" fill="#ff8030"/>'
    + '<path d="M24 16 Q29 24 27 30 Q30 30 30 34 Q29 40 24 40 Q19 40 18 34 Q18 30 21 30 Q19 24 24 16 Z" fill="#ffd860"/>'
    + '<circle cx="24" cy="35" r="3" fill="#fff8d0"/>',
};

export function itemIcon(id: string): string {
  const body = ICONS[id] ?? bg('#333', '#111');
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${body}</svg>`)}`;
}
