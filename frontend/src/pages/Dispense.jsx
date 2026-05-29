import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePart, useDispense } from '../api/parts'
import StockPill from '../components/StockPill'

export default function Dispense() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: part, isLoading, error: partError } = usePart(id)
  const dispense = useDispense()
  const [qty, setQty] = useState(1)
  const [actor, setActor] = useState('workbench')
  const [err, setErr] = useState(null)

  if (isLoading) return <div style={{ padding: 24 }}><span className="washi">Loading…</span></div>
  if (partError) return <div className="chip chip--rust">{partError.message}</div>

  const qtyNum = Number(qty)
  const overStock = qtyNum > part.qty

  async function handleDispense(e) {
    e.preventDefault()
    setErr(null)
    if (overStock) return
    try {
      await dispense.mutateAsync({ id, qty: qtyNum, actor })
      navigate(`/parts/${id}`)
    } catch (e) {
      setErr(e.message ?? 'Dispense failed')
    }
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div className="page__head">
        <Link to={`/parts/${id}`} className="btn btn--ghost btn--sm">← Back</Link>
        <h1 className="page__title" style={{ flex: 1, margin: '0 10px' }}>Dispense</h1>
      </div>

      <div className="card">
        <div className="card__head">
          <span className="card__title">{part.name}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span className="fnote">Current Stock</span>
            <div style={{ marginTop: 4 }}>
              <StockPill qty={part.qty} unit={part.unit} minQty={part.min_qty} />
            </div>
          </div>

          {err && <div className="chip chip--rust">{err}</div>}

          <form onSubmit={handleDispense} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span className="fnote">Quantity to dispense</span>
              <input type="number" className="search__input" style={{ width: '100%', marginTop: 4 }}
                min={1} max={part.qty} required
                value={qty} onChange={e => setQty(e.target.value)} />
              {overStock && (
                <div className="chip chip--rust" style={{ marginTop: 6 }}>
                  Insufficient stock ({part.qty} available)
                </div>
              )}
            </div>
            <div>
              <span className="fnote">Actor</span>
              <input type="text" className="search__input" style={{ width: '100%', marginTop: 4 }}
                value={actor} onChange={e => setActor(e.target.value)} />
            </div>
            <button className="btn btn--rust" type="submit"
              disabled={dispense.isPending || overStock || qtyNum <= 0}>
              {dispense.isPending ? 'Dispensing…' : 'Confirm Dispense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
