/** Hand-drawn 48×48 SVG icons for the builder items (castle shop and the builder's bag). */
const bg = (a: string, b: string) =>
  `<defs><radialGradient id="g"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="48" height="48" fill="url(#g)"/>`;

const ICONS: Record<string, string> = {
  // Spark Staff: a crooked staff with a crackling blue spark.
  spark_staff: bg('#1a2a5a', '#070c20')
    + '<path d="M14 42 L30 12" stroke="#8a5a2a" stroke-width="4" stroke-linecap="round"/>'
    + '<path d="M30 12 Q34 6 38 10 Q35 13 30 12 Z" fill="#c8a060"/>'
    + '<circle cx="34" cy="9" r="5" fill="#9ad8ff" opacity=".85"/><circle cx="34" cy="9" r="2.5" fill="#ffffff"/>'
    + '<path d="M40 4 L37 9 L42 9 L38 15" stroke="#d8f0ff" stroke-width="1.6" fill="none"/>',
  // Stoneskin Scroll: a rolled scroll with a grey stone seal.
  stone_scroll: bg('#4a4436', '#18140c')
    + '<rect x="10" y="14" width="28" height="20" rx="3" fill="#e8dcb0" stroke="#6a5a30" stroke-width="1.5"/>'
    + '<ellipse cx="10" cy="24" rx="3.5" ry="10" fill="#d0c090" stroke="#6a5a30" stroke-width="1.2"/><ellipse cx="38" cy="24" rx="3.5" ry="10" fill="#d0c090" stroke="#6a5a30" stroke-width="1.2"/>'
    + '<path d="M16 20 h14 M16 24 h12 M16 28 h10" stroke="#8a7a50" stroke-width="1.4"/>'
    + '<circle cx="31" cy="30" r="6" fill="#8a8a88" stroke="#3a3a38" stroke-width="1.5"/><path d="M28 30 h6 M31 27 v6" stroke="#d8d8d0" stroke-width="1.4"/>',
  // Mason's Rune: a glowing green rune stone with a hammer mark.
  mason_rune: bg('#1e3a24', '#08140a')
    + '<path d="M12 36 L16 12 L32 8 L38 30 L24 40 Z" fill="#6a7a70" stroke="#2a3a2e" stroke-width="2"/>'
    + '<path d="M19 18 L31 16 M25 17 L25 33 M20 30 L30 28" stroke="#80ff90" stroke-width="2.5" stroke-linecap="round"/>'
    + '<circle cx="25" cy="24" r="12" fill="none" stroke="#80ff90" stroke-width="1" opacity=".4"/>',
  // Storm Orb: a dark orb with lightning inside.
  storm_orb: bg('#2a1e5a', '#0a0820')
    + '<circle cx="24" cy="24" r="14" fill="#3a3a8a" stroke="#c8d0ff" stroke-width="1.8"/>'
    + '<circle cx="19" cy="19" r="4" fill="#ffffff" opacity=".35"/>'
    + '<path d="M26 12 L19 25 L25 25 L20 37 L31 21 L25 21 Z" fill="#ffe860" stroke="#fff8c0" stroke-width="1"/>',
  // Rhythm Engine: a brass horn with sound waves.
  rhythm_engine: bg('#4a3a12', '#1a1206')
    + '<path d="M8 28 L20 24 L36 12 L36 36 L20 28 Z" fill="#e0b040" stroke="#5a3a10" stroke-width="1.5"/>'
    + '<rect x="6" y="24" width="6" height="8" rx="1.5" fill="#8a5a18"/>'
    + '<path d="M40 16 Q44 24 40 32 M43 12 Q49 24 43 36" stroke="#ffe090" stroke-width="2" fill="none" stroke-linecap="round"/>',
  // Thunder Drums: a war drum with crossed sticks.
  thunder_drums: bg('#5a1e14', '#200806')
    + '<ellipse cx="24" cy="18" rx="13" ry="5" fill="#e8d0a0" stroke="#5a2a10" stroke-width="1.5"/>'
    + '<path d="M11 18 V32 Q24 40 37 32 V18" fill="#a0402a" stroke="#5a2a10" stroke-width="1.5"/>'
    + '<path d="M13 22 L22 34 L27 22 L35 32" stroke="#e8c060" stroke-width="1.5" fill="none"/>'
    + '<path d="M14 6 L28 16 M34 6 L20 16" stroke="#6a4020" stroke-width="2.5" stroke-linecap="round"/>',
  // Fury Shard: a red crystal shard (double damage).
  fury_shard: bg('#5a1020', '#200408')
    + '<path d="M24 5 L33 20 L27 43 L18 30 L15 16 Z" fill="#e04050" stroke="#ffc0c8" stroke-width="1.5"/>'
    + '<path d="M24 5 L23 26 L27 43 M15 16 L23 26 L33 20" stroke="#ffd0d8" stroke-width=".8" fill="none" opacity=".7"/>'
    + '<text x="38" y="42" font-size="11" font-family="Georgia" font-weight="bold" fill="#fff0a0">2×</text>',
  // Rage Heart: a burning heart (quadruple damage).
  rage_heart: bg('#6a2a08', '#200a02')
    + '<path d="M24 40 L10 24 Q6 14 15 11 Q21 10 24 16 Q27 10 33 11 Q42 14 38 24 Z" fill="#ff6020" stroke="#ffd080" stroke-width="1.5"/>'
    + '<path d="M18 20 Q24 30 24 16 Q26 26 30 20" stroke="#ffe090" stroke-width="1.5" fill="none"/>'
    + '<text x="35" y="44" font-size="11" font-family="Georgia" font-weight="bold" fill="#fff0a0">4×</text>',
};

export function itemIcon(id: string): string {
  const body = ICONS[id] ?? bg('#333', '#111');
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${body}</svg>`)}`;
}
