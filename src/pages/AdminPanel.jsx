import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const roles = ['staff', 'manager', 'owner']

export default function AdminPanel({ lang }) {
  const tr = t[lang]
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', name_en: '', password: '', branch: 'الناصرية', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [editUser, setEditUser] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || []); setLoading(false)
  }

  async function saveUser() {
    if (!form.name || !form.password) return
    setSaving(true)
    if (editUser) {
      await supabase.from('users').update({ name: form.name, name_en: form.name_en, password: form.password, branch: form.branch, role: form.role, approved: true }).eq('id', editUser.id)
    } else {
      await supabase.from('users').insert([{ name: form.name, name_en: form.name_en, password: form.password, branch: form.branch, role: form.role, approved: true }])
    }
    setSaving(false)
    setShowForm(false)
    setEditUser(null)
    setForm({ name: '', name_en: '', password: '', branch: 'الناصرية', role: 'staff' })
    fetchUsers()
  }

  async function deleteUser(id) {
    if (!window.confirm(lang === 'ar' ? 'حذف هذا المستخدم؟' : 'Delete this user?')) return
    await supabase.from('users').delete().eq('id', id); fetchUsers()
  }

  async function approveUser(id) { await supabase.from('users').update({ approved: true }).eq('id', id); fetchUsers() }

  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  const roleLabel = (r) => ({ staff: lang === 'ar' ? 'موظف' : 'Staff', manager: lang === 'ar' ? 'مدير' : 'Manager', owner: lang === 'ar' ? 'مالك' : 'Owner' }[r] || r)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{tr.adminTitle}</h2>
        <button onClick={() => { setShowForm(true); setEditUser(null); setForm({ name: '', name_en: '', password: '', branch: 'الناصرية', role: 'staff' }) }} style={solidBtn}>
          {lang === 'ar' ? '+ إضافة مستخدم' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>{editUser ? (lang === 'ar' ? 'تعديل مستخدم' : 'Edit User') : (lang === 'ar' ? 'مستخدم جديد' : 'New User')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>{lang === 'ar' ? 'الاسم بالعربي *' : 'Arabic Name *'}</div>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>{lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}</div>
              <input value={form.name_en} onChange={e => setForm(p => ({...p, name_en: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>{lang === 'ar' ? 'كلمة المرور *' : 'Password *'}</div>
              <input type="text" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>{lang === 'ar' ? 'الفرع' : 'Branch'}</div>
              <select value={form.branch} onChange={e => setForm(p => ({...p, branch: e.target.value}))} style={inputStyle}>
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>{lang === 'ar' ? 'الدور' : 'Role'}</div>
              <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} style={inputStyle}>
                {roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={saveUser} disabled={saving} style={solidBtn}>{saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? '💾 حفظ' : '💾 Save')}</button>
            <button onClick={() => { setShowForm(false); setEditUser(null) }} style={outlineBtn}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 16 }}>{tr.pendingRequests} ({pending.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(u => (
              <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRight: '4px solid var(--danger)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 15 }}>{u.name} {u.name_en ? `/ ${u.name_en}` : ''}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>📍 {u.branch} — {roleLabel(u.role)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveUser(u.id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}>{tr.approve}</button>
                  <button onClick={() => deleteUser(u.id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}>{tr.reject}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ color: 'var(--success)', marginBottom: 16, fontSize: 16 }}>{tr.activeStaff} ({approved.length})</h3>
        {loading ? <div style={{ color: '#aaa', fontSize: 14 }}>{tr.loading}</div> : approved.length === 0 ? <div style={{ color: '#aaa', fontSize: 14 }}>{tr.noStaffYet}</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {approved.map(u => (
              <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRight: '4px solid var(--success)' }}>
                <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 15, marginBottom: 4 }}>{u.name} {u.name_en ? `/ ${u.name_en}` : ''}</div>
                <div style={{ fontSize: 13, color: '#888' }}>📍 {u.branch}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{u.role === 'owner' ? '👑' : u.role === 'manager' ? '🔑' : '👤'} {roleLabel(u.role)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => { setEditUser(u); setForm({ name: u.name, name_en: u.name_en || '', password: u.password || '', branch: u.branch, role: u.role }); setShowForm(true) }} style={{ background: 'none', border: '1px solid var(--purple)', color: 'var(--purple)', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12 }}>✏️</button>
                  {u.role !== 'owner' && <button onClick={() => deleteUser(u.id)} style={{ background: 'none', border: '1px solid #eee', color: '#aaa', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12 }}>{tr.delete}</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }
const labelStyle = { fontSize: 12, color: '#888', marginBottom: 4 }
