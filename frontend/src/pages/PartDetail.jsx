import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePart, usePartEvents, useUpdatePart, useAddStock, useDeletePart } from '../api/parts'
import StockPill from '../components/StockPill'
import BinLabel from '../components/BinLabel'
import PartThumb from '../components/PartThumb'

export default function PartDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [evPage, setEvPage] = useState(1)
  const [addQty, setAddQty] = useState('')
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [addErr, setAddErr] = useState(null)
  const [editErr, setEditErr] = useState(null)

  const { data: part, isLoading, error } = usePart(id)
  const { data: events } = usePartEvents(id, evPage)
  const updatePart = useUpdatePart()
  const addStock = useAddStock()
  const deletePart = useDeletePart()

  if (isLoading) return <div style={{ padding: 24 }}><span className="washi">Loading…</span></div>
  if (error) {
    if (error.status === 404) { navigate('/inventory'); return null }
    return <div className="chip chip--rust">{error.message}</div>
  }

  async function handleAddStock(e) {
    e.preventDefault()
    setAddErr(null)
    if (!addQty || Number(addQty) <= 0) return
    try {
      await addStock.mutateAsync({ id, qty: Number(addQty) })
      setAddQty('')
    } catch (err) {
      setAddErr(err.message ?? 'Failed')
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditErr(null)
    try {
      await updatePart.mutateAsync({ id, ...editData })
      setEditing(false)
      setEditData({})
    } catch (err) {
      setEditErr(err.message ?? 'Failed to save')
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${part.name}"? This cannot be undone.`)) return
    await deletePart.mutateAsync(id)
    navigate('/inventory')
  }

  const editFields = [
    ['name',         'Name',         'text'],
    ['pn',           'Part Number',  'text'],
    ['description',  'Description',  'text'],
    ['voltage',      'Voltage',      'text'],
    ['bin_id',       'Bin ID',       'text'],
    ['min_qty',      'Min Qty',      'number'],
    ['cost',         'Cost',         'number'],
  ]

  return (
    <div>
      <div className="page__head">
        <Link to="/inventory" className="btn btn--ghost btn--sm">← Back</Link>
        <h1 className="page__title" style={{ flex: 1, margin: '0 10px' }}>{part.name}</h1>
        <Link to={`/parts/${id}/dispense`} className="btn btn--rust btn--sm">Dispense</Link>
        <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(e => !e); setEditData({}) }}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button className="btn btn--ghost btn--sm" style={{ color: 'var(--rust)' }} onClick={handleDelete}>
          Delete
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <PartThumb category={part.category} size={56} />
            <div>
              <div className="mono cap" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{part.category ?? 'No category'}</div>
              <div className="display" style={{ fontSize: 20 }}>{part.name}</div>
              {part.pn && (
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{part.pn}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {part.category     && <span className="chip chip--ghost">{part.category}</span>}
            {part.package      && <span className="chip chip--ink">{part.package}</span>}
            {part.manufacturer && <span className="chip chip--ghost">{part.manufacturer}</span>}
          </div>
        </div>

        <div className="card">
          <div className="card__head"><span className="card__title">Stock</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StockPill qty={part.qty} unit={part.unit} minQty={part.min_qty} />
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Min: {part.min_qty} {part.unit}</div>
            {part.cost != null && (
              <div className="mono" style={{ fontSize: 12 }}>Cost: {part.cost}</div>
            )}
            <BinLabel id={part.bin_id} />

            <form onSubmit={handleAddStock} style={{ borderTop: '1px solid var(--rule)', paddingTop: 10, display: 'flex', gap: 8 }}>
              <input type="number" className="search__input" style={{ width: 72 }}
                placeholder="Qty" min="1"
                value={addQty} onChange={e => setAddQty(e.target.value)} />
              <button className="btn btn--ghost btn--sm" type="submit" disabled={addStock.isPending}>
                {addStock.isPending ? '…' : '+ Stock'}
              </button>
            </form>
            {addErr && <div className="chip chip--rust" style={{ fontSize: 11 }}>{addErr}</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', marginBottom: 14 }}>
        {['overview', 'events'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn--sm ${tab === t ? 'btn--ink' : 'btn--ghost'}`}
            style={{ borderRadius: 0 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          {editing ? (
            <form onSubmit={handleSaveEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {editFields.map(([field, label, type]) => (
                <div key={field}>
                  <span className="fnote">{label}</span>
                  <input type={type} className="search__input" style={{ width: '100%' }}
                    defaultValue={part[field] ?? ''}
                    onChange={e => setEditData(d => ({ ...d, [field]: type === 'number' ? Number(e.target.value) || undefined : e.target.value || undefined }))} />
                </div>
              ))}
              {editErr && <div className="chip chip--rust" style={{ gridColumn: '1/-1' }}>{editErr}</div>}
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                <button className="btn btn--rust btn--sm" type="submit" disabled={updatePart.isPending}>
                  {updatePart.isPending ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {part.description && <p style={{ margin: 0 }}>{part.description}</p>}
              {part.voltage && (
                <div>
                  <span className="fnote">Voltage</span>
                  <p className="mono" style={{ margin: 0 }}>{part.voltage}</p>
                </div>
              )}
              {!part.description && !part.voltage && (
                <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>No description — click Edit to add one.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="card">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Kind</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(events?.items ?? []).map(ev => (
                <tr key={ev.id}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(ev.ts).toLocaleString()}
                  </td>
                  <td>
                    <span className={`chip chip--${ev.kind === 'dispense' ? 'rust' : 'olive'}`}>{ev.kind}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{ev.note}</td>
                </tr>
              ))}
              {(events?.items ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No events yet</td>
                </tr>
              )}
            </tbody>
          </table>
          {(events?.total ?? 0) > 20 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn--ghost btn--sm" disabled={evPage <= 1} onClick={() => setEvPage(p => p - 1)}>Prev</button>
              <button className="btn btn--ghost btn--sm" disabled={evPage * 20 >= events.total} onClick={() => setEvPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
