export default function FootballIcon({ className }: { className?: string }) {
  const laceYs = [16, 23.5, 31, 38.5, 46];

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fb-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef0f2" />
          <stop offset="55%" stopColor="#c7ccd2" />
          <stop offset="100%" stopColor="#8d939b" />
        </linearGradient>
        <radialGradient id="fb-leather" cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#c8623f" />
          <stop offset="55%" stopColor="#93331d" />
          <stop offset="100%" stopColor="#5c1c10" />
        </radialGradient>
        <clipPath id="fb-inner-clip">
          <rect x="7" y="7" width="50" height="50" rx="10" />
        </clipPath>
      </defs>

      {/* Metallic bezel */}
      <rect x="2" y="2" width="60" height="60" rx="13" fill="url(#fb-metal)" stroke="#767c85" strokeWidth="1.5" />

      {/* Football face */}
      <rect x="7" y="7" width="50" height="50" rx="10" fill="url(#fb-leather)" />

      <g clipPath="url(#fb-inner-clip)">
        {/* Glossy highlight */}
        <ellipse cx="20" cy="18" rx="14" ry="10" fill="#ffffff" opacity="0.18" />

        {/* Panel seams */}
        <path d="M 21 5 Q 15 32 21 59" stroke="#3a0f08" strokeWidth="1.1" fill="none" opacity="0.55" />
        <path d="M 43 5 Q 49 32 43 59" stroke="#3a0f08" strokeWidth="1.1" fill="none" opacity="0.55" />

        {/* Lace panel */}
        <rect x="27" y="10" width="10" height="44" rx="5" fill="#f2e9d8" />
        <line x1="32" y1="11" x2="32" y2="53" stroke="#3a2415" strokeWidth="1.1" />

        {/* Laces */}
        {laceYs.map((y) => (
          <rect
            key={y}
            x="25.5"
            y={y - 1.4}
            width="13"
            height="2.8"
            rx="1.4"
            fill="#f2e9d8"
            stroke="#3a2415"
            strokeWidth="0.6"
          />
        ))}
      </g>
    </svg>
  );
}
