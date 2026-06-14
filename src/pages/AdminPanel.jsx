import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function approveUser(id) {
    await supabase.from('users').update({ approved: true }).eq('id', id)
    fetchUsers()
  }

  async function deleteUser(id) {
    await supabase.from('users').delete().eq('id', id)
    fetchUsers()
  }

  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  return (
    <div>
      <h2 style={{ color: 'var(--purple)', fontSize: 22, marginBottom: 24 }}>لوحة الإدارة</h2>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 16 }}>
          طلبات التسجيل المعلقة ({pending.length})
        </h3>
        {loading ? (
          <div style={{ color: '#aaa', fontSize: 14 }}>جاري التحميل...</div>
        ) : pending.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 14 }}>لا توجد طلبات معلقة</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(u => (
              <div key={u.id} style={{
                background: 'white', borderRadius: 12, padding: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderRight: '4px solid var(--danger)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 15 }}>
                    {u.name} {u.name_en ? `/ ${u.name_en}` : ''}
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                    📍 {u.branch} — {u.role === 'owner' ? 'مالك' : 'موظف'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveUser(u.id)} style={{
                    background: 'var(--success)', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
                  }}>✓ قبول</button>
                  <button onClick={() => deleteUser(u.id)} style={{
                    background: 'var(--danger)', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
                  }}>✕ رفض</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ color: 'var(--success)', marginBottom: 16, fontSize: 16 }}>
          الموظفون النشطون ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 14 }}>لا يوجد موظفون مسجلون بعد</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {approved.map(u => (
              <div key={u.id} style={{
                background: 'white', borderRadius: 12, padding: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderRight: '4px solid var(--success)'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 15, marginBottom: 4 }}>
                  {u.name} {u.name_en ? `/ ${u.name_en}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>📍 {u.branch}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                  {u.role === 'owner' ? '👑 مالك' : '👤 موظف'}
                </div>
                {u.role !== 'owner' && (
                  <button onClick={() => deleteUser(u.id)} style={{
                    marginTop: 12, background: 'none', border: '1px solid #eee',
                    color: '#aaa', padding: '4px 12px', borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12
                  }}>حذف</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
