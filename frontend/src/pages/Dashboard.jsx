import { useParts } from '../api/parts'
import { useHealth } from '../api/system'

export default function Dashboard() {
  const { data: parts, isLoading, error } = useParts({ size: 200 })
  const { data: health } = useHealth()

  if (isLoading) return <div className="page__head"><span className="washi">Loading…</span></div>
  if (error) return <div className="page__head"><span className="chip chip--rust">{error.message}</span></div>

  const items = parts?.items ?? []
  const totalUnits = items.reduce((s, p) => s + (p.qty ?? 0), 0)
  const lowItems = items.filter(p => p.qty <= p.min_qty)

  const byCategory = {}
  for (const p of items) {
    const cat = p.category ?? 'Uncategorised'
    byCategory[cat] = (byCategory[cat] ?? 0) + 1
  }
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCount = catEntries[0]?.[1] ?? 1

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <div className="page__sub">Workshop Parts Ledger</div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__bar" />
          <div className="stat__label">Distinct Parts</div>
          <div className="stat__value">{items.length}</div>
        </div>
        <div className="stat">
          <div className="stat__bar" />
          <div className="stat__label">Total Units</div>
          <div className="stat__value">{totalUnits.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat__bar" />
          <div className="stat__label">Low / Out</div>
          <div className="stat__value" style={{ color: lowItems.length > 0 ? 'var(--rust)' : undefined }}>
            {lowItems.length}
          </div>
        </div>
        <div className="stat">
          <div className="stat__bar" />
          <div className="stat__label">Active BOMs</div>
          <div className="stat__value">0</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="card__head">
            <span className="card__title">Inventory by Category</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catEntries.map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 100, fontSize: 12, color: 'var(--ink-2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat}
                </span>
                <div className="progress" style={{ flex: 1 }}>
                  <div className="progress__fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 11, width: 24, textAlign: 'right', color: 'var(--ink-3)', flexShrink: 0 }}>
                  {count}
                </span>
              </div>
            ))}
            {catEntries.length === 0 && (
              <p style={{ color: 'var(--ink-3)', margin: 0, fontStyle: 'italic' }}>No data</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <span className="card__title">Low Stock</span>
          </div>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Part</th>
                <th>Bin</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {lowItems.slice(0, 8).map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                  <td>{p.bin_id ? <span className="bin bin--tape">{p.bin_id}</span> : '—'}</td>
                  <td>
                    <span className="stockpill stockpill--low">
                      <span className="stockpill__n">{p.qty}</span>
                      {p.unit && <span className="stockpill__u">{p.unit}</span>}
                    </span>
                  </td>
                </tr>
              ))}
              {lowItems.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                    All parts well-stocked
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
