/** Paths for the "Hold" mark, shared with the generated icons: two brackets (client, freelancer) holding the funds. */
export const MARK = {
  left: "M40 20 A30 30 0 0 0 40 80",
  right: "M60 20 A30 30 0 0 1 60 80",
  stroke: 13,
  funds: { x: 40, y: 40, size: 20 },
};

/** TrustPay mark. Brackets follow `currentColor`; the held square is always signal red. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={MARK.left} fill="none" stroke="currentColor" strokeWidth={MARK.stroke} strokeLinecap="round" />
      <path d={MARK.right} fill="none" stroke="currentColor" strokeWidth={MARK.stroke} strokeLinecap="round" />
      <rect x={MARK.funds.x} y={MARK.funds.y} width={MARK.funds.size} height={MARK.funds.size} fill="var(--color-red)" />
    </svg>
  );
}
