const SHAPES = {
  resistor: (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M4 24h8l2-8 4 16 4-16 4 16 4-16 2 8h8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  capacitor: (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M4 24h16M28 24h16M20 14v20M28 14v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  ic: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="14" y="12" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M14 18H8M14 24H8M14 30H8M34 18h6M34 24h6M34 30h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  diode: (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M4 24h12M32 24h12M16 14l16 10-16 10V14zM32 14v20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  ),
  module: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="8" y="10" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="16" y="18" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="12" y="12" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M20 24h8M24 20v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
}

const CAT_MAP = {
  resistor: 'resistor', resistors: 'resistor',
  capacitor: 'capacitor', capacitors: 'capacitor',
  ic: 'ic', 'integrated circuit': 'ic', 'integrated circuits': 'ic',
  diode: 'diode', diodes: 'diode',
  module: 'module', modules: 'module',
}

export default function PartThumb({ category, size = 36 }) {
  const key = CAT_MAP[category?.toLowerCase()] ?? 'default'
  return (
    <div className="cellpart__thumb" style={{ width: size, height: size, color: 'var(--ink-3)', flexShrink: 0 }}>
      {SHAPES[key]}
    </div>
  )
}
