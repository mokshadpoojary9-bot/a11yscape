/**
 * Decorative "observation lens" for the overview hero. Concentric orbital
 * rings, a sweeping scan arm and calibration ticks evoke an instrument.
 * It encodes no scan data and is hidden from assistive technology.
 */
export function OrbitVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[380px] select-none"
    >
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.20),rgba(63,109,255,0.10)_38%,transparent_68%)] blur-2xl" />

      {/* Outer calibration ring */}
      <div className="orbital-ring inset-[2%] border-line-strong/60" />
      <div className="orbital-ring inset-[2%] animate-scan-slow">
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-glow-cyan" />
        <span className="absolute bottom-[12%] right-[6%] size-1 rounded-full bg-violet-soft/80 shadow-glow-violet" />
      </div>

      {/* Dashed orbital path */}
      <div className="orbital-ring inset-[13%] border-dashed border-violet/25" />
      <div
        className="orbital-ring inset-[13%] animate-scan-slow"
        style={{ animationDelay: '-9s', animationDirection: 'reverse' }}
      >
        <span className="absolute left-[10%] top-[18%] size-1.5 rounded-full bg-violet-soft shadow-glow-violet" />
        <span className="absolute bottom-[6%] right-[24%] size-1 rounded-full bg-cyan-soft/80" />
      </div>

      {/* Sweeping scan arm */}
      <div className="absolute inset-[2%] animate-scan-slow">
        <div className="orbit-scan absolute inset-0 animate-sweep" />
      </div>

      {/* Mid ring */}
      <div className="orbital-ring inset-[26%] border-cyan/25 bg-cyan/[0.015]" />
      <div className="orbital-ring inset-[26%] animate-pulse-ring border-cyan/20" />

      {/* Lens core */}
      <div className="absolute inset-[36%] rounded-full border border-cyan/30 bg-[radial-gradient(circle_at_38%_30%,rgba(103,232,249,0.35),rgba(10,15,29,0.92)_58%,rgba(5,8,16,0.98))] shadow-[0_0_70px_-12px_rgba(34,211,238,0.55),inset_0_1px_0_rgba(255,255,255,0.16)]">
        <div className="absolute inset-[16%] rounded-full border border-violet/30" />
        <div className="absolute inset-[34%] rounded-full bg-gradient-to-br from-cyan-soft via-cyan to-electric shadow-[0_0_28px_rgba(34,211,238,0.75)]" />
        <div className="absolute inset-[46%] rounded-full bg-midnight-950/90" />
        <span className="absolute left-[30%] top-[24%] size-2 rounded-full bg-white/70 blur-[1px]" />
      </div>

      {/* Instrument labels */}
      <span className="absolute left-1/2 top-[-2%] -translate-x-1/2 rounded-full border border-line bg-midnight-950/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-soft/90 backdrop-blur-sm">
        WCAG 2.2
      </span>
      <span className="absolute bottom-[6%] left-[2%] rounded-full border border-line bg-midnight-950/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-violet-soft/90 backdrop-blur-sm">
        axe-core
      </span>
      <span className="absolute right-[-1%] top-[46%] rounded-full border border-line bg-midnight-950/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted backdrop-blur-sm">
        R engine
      </span>
    </div>
  )
}
