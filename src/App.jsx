import React, { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Announcements from './pages/Announcements.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Sales from './pages/Sales.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')

  if (!user) return <Login onLogin={setUser} />

  const navItems = [
    { key: 'dashboard', label: 'الرئيسية' },
    { key: 'sales', label: 'المبيعات' },
    { key: 'tasks', label: 'المهام' },
    { key: 'announcements', label: 'التوجيهات' },
    ...(user.role === 'owner' ? [{ key: 'admin', label: 'الإدارة' }] : [])
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        background: 'var(--purple)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 20 }}>BRONTI OS</span>
        <div style={{ display: 'flex', gap: 16 }}>
          {navItems.map(({ key, label }) => (
            <button key={key} onClick={() => setPage(key)} style={{
              background: page === key ? 'var(--gold)' : 'transparent',
              color: 'white', border: 'none', padding: '8px 16px',
              borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal',
              fontSize: 14
            }}>{label}</button>
          ))}
        </div>
        <button onClick={() => setUser(null)} style={{
          background: 'transparent', color: '#ccc',
          border: '1px solid #ccc', padding: '6px 12px',
          borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal'
        }}>خروج</button>
      </nav>
      <main style={{ padding: 24 }}>
        {page === 'dashboard' && <Dashboard user={user} />}
        {page === 'sales' && <Sales user={user} />}
        {page === 'tasks' && <Tasks user={user} />}
        {page === 'announcements' && <Announcements user={user} />}
        {page === 'admin' && user.role === 'owner' && <AdminPanel />}
      </main>
    </div>
  )
}
