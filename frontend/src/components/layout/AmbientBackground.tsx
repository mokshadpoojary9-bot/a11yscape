/**
 * Purely decorative depth layer: slow aurora blooms, a faint measurement grid
 * and film grain. It carries no data and is hidden from assistive technology.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -left-[18rem] -top-[24rem] size-[44rem] rounded-full bg-[radial-gradient(closest-side,rgba(63,109,255,0.20),rgba(34,211,238,0.06),transparent_74%)] blur-2xl animate-drift" />
      <div
        className="absolute -right-[16rem] top-[8%] size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(139,124,246,0.18),rgba(63,109,255,0.05),transparent_72%)] blur-2xl animate-drift"
        style={{ animationDelay: '-8s' }}
      />
      <div
        className="absolute bottom-[-20rem] left-[28%] size-[40rem] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.10),transparent_70%)] blur-2xl animate-drift"
        style={{ animationDelay: '-15s' }}
      />

      <div className="absolute inset-0 shell-grid opacity-[0.5] [mask-image:radial-gradient(ellipse_at_50%_-10%,black,transparent_72%)]" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />
      <div className="grain absolute inset-0" />
    </div>
  )
}
