export default function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress" style={{ flex: 1 }}>
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="mono" style={{ fontSize: 11, minWidth: 32 }}>{pct}%</span>
    </div>
  )
}
