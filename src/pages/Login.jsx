import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../translations.js'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

export default function Login({ onLogin, lang, setLang }) {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', nameEn: '', password: '', branch: 'الناصرية', role: 'staff' })
  const [loginForm, setLoginForm] = useState({ name: '', password: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const tr = t[lang]

  async function handleLogin() {
    if (loginForm.name === 'Bandar' && loginForm.password === 'bronti2024') {
      return onLogin({ id: 'owner-1', name: 'Bandar', name_en: 'Bandar', role: 'owner', branch: 'all', approved: true })
    }
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').eq('name', loginForm.name).eq('password', loginForm.password).single()
    setLoading(false)
    if (error || !data) return setMsg(tr.wrongCredentials)
    if (!data.approved) return setMsg(tr.pendingApproval)
    onLogin(data)
  }

  async function handleRegister() {
    if (!form.name || !form.password) return setMsg(tr.enterNamePassword)
    setLoading(true)
    const { error } = await supabase.from('users').insert([{ name: form.name, name_en: form.nameEn, password: form.password, branch: form.branch, role: 'staff', approved: false }])
    setLoading(false)
    if (error) return setMsg(tr.registerError)
    setMsg(tr.requestSent)
    setIsRegister(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--purple)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--purple)' }}>BRONTI OS</div>
          <div style={{ color: 'var(--gold)', fontSize: 14, marginTop: 4 }}>{tr.systemName}</div>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ marginTop: 12, background: 'var(--purple)', color: 'white', border: 'none', padding: '4px 14px', borderRadius: 16, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}>
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>
        {!isRegister ? (
          <>
            <input placeholder={tr.username} value={loginForm.name} onChange={e => setLoginForm({...loginForm, name: e.target.value})} style={inputStyle} />
            <input placeholder={tr.password} type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} style={inputStyle} />
            <button onClick={handleLogin} disabled={loading} style={btnStyle}>{loading ? tr.loggingIn : tr.loginBtn}</button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ color: '#888', fontSize: 13 }}>{tr.noAccount} </span>
              <span onClick={() => { setIsRegister(true); setMsg('') }} style={{ color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>{tr.registerNow}</span>
            </div>
          </>
        ) : (
          <>
            <input placeholder={tr.nameAr} value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
            <input placeholder={tr.nameEn} value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} style={inputStyle} />
            <input placeholder={tr.password} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
            <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} style={inputStyle}>
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
            <button onClick={handleRegister} disabled={loading} style={btnStyle}>{loading ? tr.sending : tr.sendRequest}</button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span onClick={() => { setIsRegister(false); setMsg('') }} style={{ color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>{tr.backToLogin}</span>
            </div>
          </>
        )}
        {msg && <div style={{ marginTop: 16, color: 'var(--danger)', textAlign: 'center', fontSize: 13 }}>{msg}</div>}
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '12px 16px', marginBottom: 12, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', display: 'block' }
const btnStyle = { width: '100%', padding: '12px', background: 'var(--purple)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 16, cursor: 'pointer', marginTop: 4 }
