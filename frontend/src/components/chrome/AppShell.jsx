import Topbar from './Topbar'
import Sidenav from './Sidenav'
import Statusbar from './Statusbar'

export default function AppShell({ children }) {
  return (
    <div className="app">
      <div className="app__top">
        <Topbar />
      </div>
      <Sidenav />
      <main className="main">{children}</main>
      <Statusbar />
    </div>
  )
}
