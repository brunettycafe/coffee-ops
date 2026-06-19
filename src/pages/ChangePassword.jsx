import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

export default function ChangePassword({ user, lang }) {
  const tr = t[lang]
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  async function handleChange() {
    setMsg({ text: '', type: '' })
    if (!form.current || !form.newPass || !form.confirm) {
      return setMsg({ text: lang === 'ar' ? 'أكمل جميع الحقول' : 'Fill all fields', type: 'error' })
    }
    if (form.newPass !== form.confirm) {
      return setMsg({ text: lang === 'ar' ? 'كلمة المرور الجديدة غير متطابقة' : 'Passwords do not match', type: 'error' })
    }
    if (form.newPass.length < 6) {
      return setMsg({ text: lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', type: 'error' })
    }

    setLoading(true)
    const { data, error } = await supabase.from('users').select('id').eq('id', user.id).eq('password', form.current).single()
    if (error || !data) {
      setLoading(false)
      return setMsg({ text: lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect', type: 'error' })
    }

    await supabase.from('users').update({ password: form.newPass }).eq('id', user.id)
    setLoading(false)
    setForm({ current: '', newPass: '', confirm: '' })
    setMsg({ text: lang === 'ar' ? '✅ تم تغيير كلمة المرور بنجاح' : '✅ Password changed successfully', type: 'success' })
  }

  return (
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ color: 'var(--purple)', fontSize: 22, marginBottom: 24 }}>
        🔑 {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
      </h2>

      <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</div>
          <input type="password" value={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</div>
          <input type="password" value={form.newPass} onChange={e => setForm(p => ({ ...p, newPass: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>{lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</div>
          <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} style={inputStyle} />
        </div>

        {msg.text && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 14, background: msg.type === 'success' ? '#e8f5e9' : '#fce4ec', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {msg.text}
          </div>
        )}

        <button onClick={handleChange} disabled={loading} style={{ width: '100%', padding: '12px', background: 'var(--purple)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 15, fontWeight: 600 }}>
          {loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? '💾 حفظ كلمة المرور' : '💾 Save Password')}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: 13, color: '#666', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }
