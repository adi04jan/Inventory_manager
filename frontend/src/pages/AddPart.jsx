import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreatePart } from '../api/parts'
import { useAISuggest } from '../api/ai'

const FIELDS = [
  { key: 'name',         label: 'Name *',       type: 'text',   required: true, full: true },
  { key: 'category',     label: 'Category',      type: 'text' },
  { key: 'package',      label: 'Package',       type: 'text' },
  { key: 'pn',           label: 'Part Number',   type: 'text' },
  { key: 'manufacturer', label: 'Manufacturer',  type: 'text' },
  { key: 'description',  label: 'Description',   type: 'text',   full: true },
  { key: 'voltage',      label: 'Voltage',       type: 'text' },
  { key: 'bin_id',       label: 'Bin ID',        type: 'text' },
  { key: 'qty',          label: 'Qty',           type: 'number' },
  { key: 'min_qty',      label: 'Min Qty',       type: 'number' },
  { key: 'unit',         label: 'Unit',          type: 'text' },
  { key: 'cost',         label: 'Cost',          type: 'number', step: 0.01 },
]

const AI_FIELDS = ['name', 'manufacturer', 'description', 'category', 'package', 'unit']

export default function AddPart() {
  const navigate = useNavigate()
  const createPart = useCreatePart()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [debouncedPn, setDebouncedPn] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPn(form.pn?.trim() ?? ''), 800)
    return () => clearTimeout(t)
  }, [form.pn])

  const suggest = useAISuggest(debouncedPn)
  const suggestions = suggest.data ?? {}
  const pending = AI_FIELDS.filter(k => suggestions[k] && suggestions[k] !== form[k])

  function set(key, value) {
    setForm(d => ({ ...d, [key]: value }))
    if (errors[key]) setErrors(e => { const next = { ...e }; delete next[key]; return next })
  }

  function acceptAll() {
    pending.forEach(k => set(k, suggestions[k]))
  }

  function validate() {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Name is required'
    if (form.qty !== undefined && (isNaN(Number(form.qty)) || Number(form.qty) < 0)) errs.qty = 'Must be >= 0'
    if (form.min_qty !== undefined && (isNaN(Number(form.min_qty)) || Number(form.min_qty) < 0)) errs.min_qty = 'Must be >= 0'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const data = { ...form }
    if (data.qty !== undefined && data.qty !== '')          data.qty     = Number(data.qty)
    if (data.min_qty !== undefined && data.min_qty !== '')  data.min_qty = Number(data.min_qty)
    if (data.cost !== undefined && data.cost !== '')        data.cost    = Number(data.cost)
    try {
      const part = await createPart.mutateAsync(data)
      navigate(`/parts/${part.id}`)
    } catch (err) {
      setErrors({ _: err.message ?? 'Failed to create part' })
    }
  }

  return (
    <div>
      <div className="page__head">
        <Link to="/inventory" className="btn btn--ghost btn--sm">← Back</Link>
        <h1 className="page__title" style={{ flex: 1, margin: '0 10px' }}>Add Part</h1>
      </div>

      {errors._ && <div className="chip chip--rust" style={{ marginBottom: 14 }}>{errors._}</div>}

      {/* AI suggestion strip */}
      {suggest.isFetching && (
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '.08em' }}>
          ✦ looking up {debouncedPn}…
        </div>
      )}
      {!suggest.isFetching && pending.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          marginBottom: 10, padding: '8px 10px',
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderLeft: '3px solid var(--rust)',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.08em', marginRight: 4 }}>
            ✦ AI
          </span>
          {pending.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => set(k, suggestions[k])}
              className="chip"
              title={`Accept: ${suggestions[k]}`}
              style={{ cursor: 'pointer', background: 'var(--paper-2)', border: '1px solid var(--rule)', padding: '2px 7px' }}
            >
              <span style={{ color: 'var(--ink-3)', marginRight: 3 }}>{k}</span>
              <span style={{ color: 'var(--ink)' }}>{suggestions[k].length > 28 ? suggestions[k].slice(0, 27) + '…' : suggestions[k]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={acceptAll}
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 'auto' }}
          >
            Accept all
          </button>
        </div>
      )}

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
              <span className="fnote">{f.label}</span>
              <input
                type={f.type}
                className="search__input"
                style={{ width: '100%', borderColor: errors[f.key] ? 'var(--rust)' : undefined }}
                step={f.step}
                value={form[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
              />
              {errors[f.key] && (
                <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 2 }}>{errors[f.key]}</div>
              )}
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn btn--rust" type="submit" disabled={createPart.isPending}>
              {createPart.isPending ? 'Creating…' : 'Create Part'}
            </button>
            <Link to="/inventory" className="btn btn--ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
