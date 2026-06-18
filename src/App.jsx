import React, { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Announcements from './pages/Announcements.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Sales from './pages/Sales.jsx'
import Waste from './pages/Waste.jsx'
import KPI from './pages/KPI.jsx'
import { t } from './translations.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [lang, setLang] = useState('ar')

  if (!user) return <Login onLogin={setUser} lang={lang} setLang={setLang} />

  const tr = t[lang]

  const navItems = [
    { key: 'dashboard', label: tr.dashboard },
    { key: 'sales', label: tr.sales },
    { key: 'waste', label: tr.waste },
    { key: 'tasks', label: tr.tasks },
    { key: 'kpi', label: tr.kpi },
    { key: 'announcements', label: tr.announcements },
    ...(user.role === 'owner' ? [{ key: 'admin', label: tr.admin }] : [])
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{
            background: 'rgba(255,255,255,0.15)', color: 'white',
            border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
          }}>{lang === 'ar' ? 'EN' : 'ع'}</button>
          <button onClick={() => setUser(null)} style={{
            background: 'transparent', color: '#ccc',
            border: '1px solid #ccc', padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal'
          }}>{tr.logout}</button>
        </div>
      </nav>
      <main style={{ padding: 24 }}>
        {page === 'dashboard' && <Dashboard user={user} lang={lang} />}
        {page === 'sales' && <Sales user={user} lang={lang} />}
        {page === 'waste' && <Waste user={user} lang={lang} />}
        {page === 'kpi' && <KPI user={user} lang={lang} />}
        {page === 'tasks' && <Tasks user={user} lang={lang} />}
        {page === 'announcements' && <Announcements user={user} lang={lang} />}
        {page === 'admin' && user.role === 'owner' && <AdminPanel lang={lang} />}
      </main>
    </div>
  )
}
