import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useParts, useDispense } from '../api/parts'
import StockPill from '../components/StockPill'
import BinLabel from '../components/BinLabel'
import PartThumb from '../components/PartThumb'

function DispenseCell({ part }) {
  const [qty, setQty] = useState(1)
  const [state, setState] = useState(null) // null | 'ok' | 'err'
  const [errMsg, setErrMsg] = useState('')
  const dispense = useDispense()

  async function handleDispense(e) {
    e.stopPropagation()
    if (qty < 1 || qty > part.qty) return
    setState(null)
    try {
      await dispense.mutateAsync({ id: part.id, qty, actor: 'workbench' })
      setState('ok')
      setQty(1)
      setTimeout(() => setState(null), 2000)
    } catch (err) {
      setState('err')
      setErrMsg(err.message ?? 'Failed')
      setTimeout(() => setState(null), 3000)
    }
  }

  if (part.qty === 0) {
    return <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>out of stock</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
      <input
        type="number"
        min={1}
        max={part.qty}
        value={qty}
        onChange={e => setQty(Math.max(1, Math.min(part.qty, Number(e.target.value) || 1)))}
        className="search__input"
        style={{ width: 52, textAlign: 'center' }}
      />
      <button
        className="btn btn--rust btn--xs"
        onClick={handleDispense}
        disabled={dispense.isPending}
        title={`Dispense ${qty} ${part.unit}`}
      >
        {dispense.isPending ? '…' : '−'}
      </button>
      {state === 'ok' && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--olive)' }}>✓</span>
      )}
      {state === 'err' && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--rust)' }} title={errMsg}>!</span>
      )}
    </div>
  )
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [low, setLow] = useState(searchParams.get('low') === 'true')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1))

  const filters = {
    q:        searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    bin:      searchParams.get('bin') ?? '',
    low,
    page,
    size: 50,
  }

  const { data, isLoading, error } = useParts(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.ceil(total / 50)

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setPage(1)
    setSearchParams(next)
  }

  const categories = [...new Set(items.map(p => p.category).filter(Boolean))].sort()
  const activeQ = searchParams.get('q') ?? ''

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Inventory</h1>
          {activeQ && (
            <div className="page__sub">
              Results for "{activeQ}" · {total} found
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!activeQ && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{total} parts</span>}
          <Link to="/parts/new" className="btn btn--rust btn--sm">+ Add Part</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="drop"
          value={searchParams.get('category') ?? ''}
          onChange={e => setFilter('category', e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          className="search__input"
          placeholder="Filter by bin…"
          style={{ width: 140 }}
          value={searchParams.get('bin') ?? ''}
          onChange={e => setFilter('bin', e.target.value)}
        />

        <button
          className={`btn btn--sm ${low ? 'btn--rust' : 'btn--ghost'}`}
          onClick={() => {
            const next = !low
            setLow(next)
            setFilter('low', next ? 'true' : '')
          }}
        >
          Low stock only
        </button>

        {activeQ && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setFilter('q', ''); navigate('/inventory') }}>
            ✕ Clear search
          </button>
        )}
      </div>

      {error && <div className="chip chip--rust" style={{ marginBottom: 12 }}>{error.message}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Part</th>
            <th>Category</th>
            <th>Package</th>
            <th>Bin</th>
            <th>Stock</th>
            <th>Dispense</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j}>
                  <div style={{ height: 14, background: 'var(--paper-3)', borderRadius: 2, opacity: 0.6 }} />
                </td>
              ))}
            </tr>
          ))}
          {!isLoading && items.map(p => (
            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/parts/${p.id}`)}>
              <td>
                <div className="cellpart">
                  <PartThumb category={p.category} size={32} />
                  <div>
                    <div className="cellpart__name">{p.name}</div>
                    {p.pn && <div className="cellpart__pn">{p.pn}</div>}
                  </div>
                </div>
              </td>
              <td>{p.category ? <span className="chip chip--ghost">{p.category}</span> : '—'}</td>
              <td>{p.package  ? <span className="chip chip--ink">{p.package}</span>  : '—'}</td>
              <td><BinLabel id={p.bin_id} /></td>
              <td><StockPill qty={p.qty} unit={p.unit} minQty={p.min_qty} /></td>
              <td><DispenseCell part={p} /></td>
            </tr>
          ))}
          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                {activeQ ? `No parts match "${activeQ}"` : 'No parts found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button className="btn btn--ghost btn--sm" disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); setFilter('page', p) }}>
            Prev
          </button>
          <span className="mono" style={{ fontSize: 12 }}>Page {page} of {pageCount}</span>
          <button className="btn btn--ghost btn--sm" disabled={page >= pageCount}
            onClick={() => { const p = page + 1; setPage(p); setFilter('page', p) }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
