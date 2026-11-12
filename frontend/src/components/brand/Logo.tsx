import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
  size?: number
}

/**
 * A11YSCAPE mark: an observation lens (eye) wrapped in an orbital ring with a
 * segmented aperture, suggesting scanning and measurement.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="A11YSCAPE"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="a11y-lens" x1="10" y1="14" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67E8F9" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#22D3EE" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8B7CF6" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="a11y-core" cx="0.35" cy="0.3" r="0.9">
          <stop stopColor="#67E8F9" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="#0A0F1D" stroke="#1A2540" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="20.5" stroke="url(#a11y-lens)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 5" />
      <path
        d="M13 32c5.6-7.9 12.1-11.8 19-11.8S45.4 24.1 51 32c-5.6 7.9-12.1 11.8-19 11.8S18.6 39.9 13 32Z"
        stroke="url(#a11y-lens)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="8" stroke="#8B7CF6" strokeOpacity="0.55" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="4.2" fill="url(#a11y-core)" />
      <circle cx="32" cy="32" r="1.6" fill="#EAFBFF" />
      <path d="M32 4.5v4M32 55.5v4M4.5 32h4M55.5 32h4" stroke="#22D3EE" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, showWordmark = true, size = 36 }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-none tracking-[0.19em] text-ink">
            A11YSCAPE
          </p>
          <p className="mt-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.15em] text-ink-faint">
            Intelligence Observatory
          </p>
        </div>
      ) : null}
    </div>
  )
}
