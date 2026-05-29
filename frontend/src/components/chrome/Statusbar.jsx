import { useHealth } from '../../api/system'

export default function Statusbar() {
  const { data: health } = useHealth()
  const alive = health?.db === 'ok'

  return (
    <div className="statusbar">
      <span>
        <span className={`statusbar__dot${alive ? '' : ' statusbar__dot--rust'}`} />
        182.70.254.11:1880
      </span>
      <span>{alive ? 'db ok' : 'db err'}</span>
      {health?.low_stock_count > 0 && (
        <span style={{ color: 'var(--rust-2)' }}>{health.low_stock_count} low stock</span>
      )}
      <span style={{ marginLeft: 'auto' }}>{new Date().toLocaleTimeString()}</span>
    </div>
  )
}
