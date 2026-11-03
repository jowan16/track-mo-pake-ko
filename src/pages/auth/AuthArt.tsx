import type { ReactNode } from 'react'

/** Moves its children up and down slowly. Turned off when the visitor prefers less motion. */
function Float({ dy, dur, animate, children }: { dy: number; dur: number; animate: boolean; children: ReactNode }) {
  return (
    <g>
      {animate && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; 0 ${dy}; 0 0`}
          keyTimes="0; 0.5; 1"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
      )}
      {children}
    </g>
  )
}

const C = 2 * Math.PI * 36 // donut length

/**
 * Decorative picture for the log in pages: a spending chart, a donut of categories,
 * a piggy bank and coins, with two small "budget on track" and "saved" tags.
 */
export function AuthArt({ animate }: { animate?: boolean }) {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const on = animate ?? !reduce

  const bars = [50, 80, 62, 110, 90, 140]
  const tops = bars.map((h, i) => ({ x: 62 + i * 36, y: 256 - h }))

  return (
    <svg viewBox="0 0 560 360" className="h-auto w-full max-w-[560px]" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="art-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="art-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="art-pig" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* dashboard card */}
      <rect x="20" y="40" width="360" height="250" rx="22" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
      <circle cx="52" cy="76" r="9" fill="#34d399" />
      <rect x="68" y="70" width="90" height="12" rx="6" fill="rgba(255,255,255,0.55)" />
      <rect x="296" y="70" width="64" height="12" rx="6" fill="rgba(255,255,255,0.2)" />

      {/* bars */}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={50 + i * 36}
          y={256 - h}
          width="24"
          height={h}
          rx="6"
          fill={i === bars.length - 1 ? '#34d399' : 'url(#art-bar)'}
          opacity={i === bars.length - 1 ? 1 : 0.85}
        />
      ))}
      <polyline
        points={tops.map((p) => `${p.x},${p.y - 8}`).join(' ')}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {tops.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y - 8} r="4" fill="#ffffff" />
      ))}

      {/* donut of categories */}
      <g transform="rotate(-90 318 176)" fill="none" strokeWidth="14">
        <circle cx="318" cy="176" r="36" stroke="rgba(255,255,255,0.12)" />
        <circle cx="318" cy="176" r="36" stroke="#2dd4bf" strokeDasharray={`${C * 0.45} ${C}`} strokeDashoffset="0" />
        <circle cx="318" cy="176" r="36" stroke="#fbbf24" strokeDasharray={`${C * 0.3} ${C}`} strokeDashoffset={-C * 0.45} />
        <circle cx="318" cy="176" r="36" stroke="#60a5fa" strokeDasharray={`${C * 0.25} ${C}`} strokeDashoffset={-C * 0.75} />
      </g>
      <text x="318" y="183" textAnchor="middle" fontSize="20" fontWeight="700" fill="#ffffff" fontFamily="Inter, Arial, sans-serif">₱</text>
      <rect x="284" y="232" width="68" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="284" y="248" width="48" height="8" rx="4" fill="rgba(255,255,255,0.2)" />

      {/* "Saved" tag */}
      <Float dy={-6} dur={5} animate={on}>
        <rect x="236" y="20" width="148" height="34" rx="17" fill="#ffffff" />
        <circle cx="256" cy="37" r="10" fill="#f59e0b" />
        <text x="256" y="41.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="Inter, Arial, sans-serif">₱</text>
        <text x="274" y="42" fontSize="13" fontWeight="600" fill="#0f3d36" fontFamily="Inter, Arial, sans-serif">Saved ₱2,000</text>
      </Float>

      {/* "Budget on track" tag */}
      <Float dy={6} dur={6} animate={on}>
        <rect x="60" y="274" width="172" height="34" rx="17" fill="#ffffff" />
        <circle cx="80" cy="291" r="10" fill="#10b981" />
        <path d="M75.5 291.2 l3.2 3.2 l5.8 -6" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="98" y="296" fontSize="13" fontWeight="600" fill="#0f3d36" fontFamily="Inter, Arial, sans-serif">Budget on track</text>
      </Float>

      {/* piggy bank with a falling coin */}
      <Float dy={-5} dur={4.5} animate={on}>
        <circle cx="478" cy="50" r="14" fill="url(#art-gold)" stroke="#b45309" strokeWidth="1.5" />
        <text x="478" y="55.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#92400e" fontFamily="Inter, Arial, sans-serif">₱</text>

        <path d="M424 120 q-18 -4 -12 -24" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
        <rect x="446" y="150" width="15" height="24" rx="6" fill="#d97706" />
        <rect x="492" y="150" width="15" height="24" rx="6" fill="#d97706" />
        <ellipse cx="476" cy="122" rx="56" ry="42" fill="url(#art-pig)" />
        <polygon points="436,100 448,76 466,96" fill="#f59e0b" />
        <ellipse cx="528" cy="128" rx="16" ry="12" fill="#f59e0b" />
        <circle cx="523" cy="128" r="2.4" fill="#92400e" />
        <circle cx="533" cy="128" r="2.4" fill="#92400e" />
        <circle cx="506" cy="108" r="4.5" fill="#7c2d12" />
        <rect x="462" y="84" width="30" height="7" rx="3.5" fill="#b45309" />
      </Float>

      {/* coin stack */}
      <g>
        <ellipse cx="470" cy="334" rx="46" ry="14" fill="#b45309" />
        <ellipse cx="470" cy="326" rx="46" ry="14" fill="url(#art-gold)" />
        <ellipse cx="470" cy="318" rx="46" ry="14" fill="#b45309" />
        <ellipse cx="470" cy="310" rx="46" ry="14" fill="url(#art-gold)" />
        <ellipse cx="470" cy="302" rx="46" ry="14" fill="#b45309" />
        <ellipse cx="470" cy="294" rx="46" ry="14" fill="url(#art-gold)" />
        <text x="470" y="300" textAnchor="middle" fontSize="18" fontWeight="700" fill="#92400e" fontFamily="Inter, Arial, sans-serif">₱</text>
      </g>

      {/* sparkles */}
      <g fill="#ffffff" opacity="0.7">
        <circle cx="414" cy="200" r="2.5" />
        <circle cx="548" cy="220" r="2" />
        <circle cx="30" cy="330" r="2.5" />
        <circle cx="398" cy="262" r="2" />
      </g>
      <g stroke="#5eead4" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M540 84 v10 M535 89 h10" />
        <path d="M20 14 v10 M15 19 h10" />
      </g>
    </svg>
  )
}