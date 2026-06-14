import React, { useState } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', nameEn: '', password: '', branch: 'الناصرية', role: 'staff' })
  const [loginForm, setLoginForm] = useState({ name: '', password: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', loginForm.name)
      .eq('password', loginForm.password)
      .single()
    setLoading(false)
    if (error || !data) return setMsg('اسم المستخدم أو كلمة المرور غير صحيحة')
    if (!data.approved) return setMsg('حسابك قيد المراجعة — انتظر موافقة المالك')
    onLogin(data)
  }

  async function handleRegister() {
    if (!form.name || !form.password) return setMsg('أدخل الاسم وكلمة المرور')
    setLoading(true)
    const { error } = await supabase.from('users').insert([{
      name: form.name, name_en: form.nameEn,
      password: form.password, branch: form.branch,
      role: 'staff', approved: false
    }])
    setLoading(false)
    if (error) return setMsg('حدث خطأ — حاول مرة أخرى')
    setMsg('تم إرسال طلب التسجيل — انتظر موافقة المالك')
    setIsRegister(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--purple)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--purple)' }}>BRONTI OS</div>
          <div style={{ color: 'var(--gold)', fontSize: 14, marginTop: 4 }}>نظام إدارة برونتي كافيه</div>
        </div>
        {!isRegister ? (
          <>
            <input placeholder="الاسم" value={loginForm.name}
              onChange={e => setLoginForm({...loginForm, name: e.target.value})} style={inputStyle} />
            <input placeholder="كلمة المرور" type="password" value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})} style={inputStyle} />
            <button onClick={handleLogin} disabled={loading} style={btnStyle}>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ color: '#888', fontSize: 13 }}>ماعندك حساب؟ </span>
              <span onClick={() => { setIsRegister(true); setMsg('') }}
                style={{ color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>سجل الآن</span>
            </div>
          </>
        ) : (
          <>
            <input placeholder="الاسم بالعربي" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
            <input placeholder="الاسم بالإنجليزي" value={form.nameEn}
              onChange={e => setForm({...form, nameEn: e.target.value})} style={inputStyle} />
            <input placeholder="كلمة المرور" type="password" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
            <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} style={inputStyle}>
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
            <button onClick={handleRegister} disabled={loading} style={btnStyle}>
              {loading ? 'جاري الإرسال...' : 'إرسال طلب التسجيل'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span onClick={() => { setIsRegister(false); setMsg('') }}
                style={{ color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>رجوع لتسجيل الدخول</span>
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
