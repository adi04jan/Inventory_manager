import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',          label: 'Dashboard', icon: 'grid' },
  { to: '/inventory', label: 'Inventory', icon: 'list' },
  { to: '/bins',      label: 'Bins',      icon: 'bin'  },
  { to: '/parts/new', label: 'Add Part',  icon: 'plus' },
]

function Icon({ name }) {
  const icons = {
    grid: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    list: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 4h9M4 8h9M4 12h9M2 4h.01M2 8h.01M2 12h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    bin: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="5" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 5l3-4h8l3 4" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    plus: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  }
  return icons[name] ?? null
}

export default function Sidenav() {
  return (
    <nav className="sidenav">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `navitem${isActive ? ' is-active' : ''}`}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
