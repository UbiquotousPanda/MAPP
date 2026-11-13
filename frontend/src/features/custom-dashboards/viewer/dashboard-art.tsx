import art from '@/ui/Tile/Tile.module.css';

export const EXECUTIVE_ART = (
  <>
    {[24, 56, 88, 120].map((x, i) => (
      <rect
        key={x}
        x={x}
        y={[40, 24, 48, 30][i]}
        width="20"
        height={88 - ([40, 24, 48, 30][i] ?? 0)}
        rx="3"
        className={i % 2 === 0 ? art.fill : art.fillMid}
      />
    ))}
    <rect x="156" y="24" width="44" height="10" rx="4" className={art.fill} />
    <rect x="156" y="42" width="32" height="8" rx="4" className={art.soft} />
    <rect x="156" y="62" width="44" height="10" rx="4" className={art.fillFaint} />
    <rect x="156" y="80" width="28" height="8" rx="4" className={art.soft} />
  </>
);

export const REGIONAL_ART = (
  <>
    <path
      d="M60 18a22 22 0 0 1 22 22c0 16-22 38-22 38S38 56 38 40a22 22 0 0 1 22-22z"
      className={art.fill}
    />
    <circle cx="60" cy="40" r="8" className={art.soft} />
    {[20, 40, 60].map((y, i) => (
      <g key={y}>
        <rect x="104" y={y} width={[90, 64, 40][i]} height="10" rx="4" className={art.fillMid} />
        <rect x="104" y={y + 12} width="28" height="4" rx="2" className={art.soft} />
      </g>
    ))}
  </>
);

/** Any dashboard of the person's or their team's: a layout of a bar chart, a line and a figure. */
export const CUSTOM_ART = (
  <>
    <rect x="20" y="12" width="84" height="76" rx="6" className={art.soft} />
    {[32, 48, 64, 80].map((x, i) => (
      <rect
        key={x}
        x={x}
        y={[52, 36, 60, 28][i]}
        width="10"
        height={80 - ([52, 36, 60, 28][i] ?? 0)}
        rx="2"
        className={art.fill}
      />
    ))}
    <rect x="114" y="12" width="86" height="34" rx="6" className={art.soft} />
    <path d="M124 38 L144 28 L162 32 L190 20" className={art.stroke} />
    <rect x="114" y="54" width="86" height="34" rx="6" className={art.soft} />
    <rect x="124" y="64" width="40" height="8" rx="4" className={art.fill} />
    <rect x="124" y="76" width="26" height="4" rx="2" className={art.fillFaint} />
  </>
);
