import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHealth } from '../../api/system'

export default function Topbar() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: health } = useHealth()

  function handleSearch(e) {
    if (e.key === 'Enter') {
      const q = e.target.value.trim()
      navigate(`/inventory${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    }
  }

  const alive = health?.db === 'ok'

  return (
    <>
      <div className="brand">
        <div className="brand__mark">B</div>
        <div>
          <div className="brand__name">BINDEX</div>
          <div className="brand__sub">PARTS LEDGER</div>
        </div>
      </div>
      <div className="topbar">
        <div className="search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search parts, bins…"
            defaultValue={params.get('q') ?? ''}
            onKeyDown={handleSearch}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: alive ? 'var(--olive)' : 'var(--rust)',
          }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {alive ? 'online' : 'offline'}
          </span>
        </div>
      </div>
    </>
  )
}
