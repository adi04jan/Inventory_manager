import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreatePart } from '../api/parts'

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

export default function AddPart() {
  const navigate = useNavigate()
  const createPart = useCreatePart()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Name is required'
    if (form.qty !== undefined && (isNaN(Number(form.qty)) || Number(form.qty) < 0)) errs.qty = 'Must be >= 0'
    if (form.min_qty !== undefined && (isNaN(Number(form.min_qty)) || Number(form.min_qty) < 0)) errs.min_qty = 'Must be >= 0'
    return errs
  }

  function set(key, value) {
    setForm(d => ({ ...d, [key]: value }))
    if (errors[key]) setErrors(e => { const next = { ...e }; delete next[key]; return next })
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
