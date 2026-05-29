import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBins, useBin } from '../api/bins'
import BinLabel from '../components/BinLabel'

export default function BinMap() {
  const { data: bins, isLoading, error } = useBins()
  const [selected, setSelected] = useState(null)
  const { data: binDetail } = useBin(selected)

  if (isLoading) return <div style={{ padding: 24 }}><span className="washi">Loading…</span></div>
  if (error) return <div className="chip chip--rust">{error.message}</div>

  const grouped = {}
  for (const b of (bins ?? [])) {
    const cab = b.id.includes('-') ? b.id.split('-')[0] : b.id[0] ?? '?'
    if (!grouped[cab]) grouped[cab] = []
    grouped[cab].push(b)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 280px' : '1fr', gap: 18 }}>
      <div>
        <div className="page__head">
          <h1 className="page__title">Bin Map</h1>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {(bins ?? []).length} bins
          </span>
        </div>

        {Object.entries(grouped).sort().map(([cab, cabBins]) => (
          <div key={cab} className="card" style={{ marginBottom: 14 }}>
            <div className="card__head">
              <span className="card__title mono">Cabinet {cab}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cabBins.length} bins</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {cabBins.map(b => (
                <button key={b.id}
                  onClick={() => setSelected(b.id === selected ? null : b.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    outline: b.id === selected ? '2px solid var(--rust)' : 'none',
                    outlineOffset: 2,
                  }}>
                  <div style={{ textAlign: 'center' }}>
                    <BinLabel id={b.id} />
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                      {b.part_count ?? 0}p
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div>
          <div className="page__head" style={{ marginBottom: 14 }}>
            <div>
              <div className="mono cap" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Bin</div>
              <h2 style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: 18 }}>{selected}</h2>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="card">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {!binDetail && (
                  <tr><td colSpan={2} style={{ color: 'var(--ink-3)' }}>Loading…</td></tr>
                )}
                {binDetail && (binDetail.parts ?? []).map(p => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/parts/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 600 }}>
                        {p.name}
                      </Link>
                      {p.part_number && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.part_number}</div>
                      )}
                    </td>
                    <td>
                      <span className={`stockpill ${p.qty <= p.min_qty ? 'stockpill--low' : 'stockpill--ok'}`}>
                        <span className="stockpill__n">{p.qty}</span>
                        {p.unit && <span className="stockpill__u">{p.unit}</span>}
                      </span>
                    </td>
                  </tr>
                ))}
                {binDetail && (binDetail.parts ?? []).length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Empty bin</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
