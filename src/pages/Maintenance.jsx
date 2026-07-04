import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const priorities = ['عاجل', 'متوسط', 'منخفض']
const priorityColor = { 'عاجل': 'var(--danger)', 'متوسط': 'var(--gold)', 'منخفض': 'var(--olive)' }
const statuses = ['جديد', 'قيد التنفيذ', 'مكتمل']
const statusColor = { 'جديد': 'var(--danger)', 'قيد التنفيذ': 'var(--gold)', 'مكتمل': 'var(--success)' }

const emptyForm = { title: '', description: '', branch: '', priority: 'متوسط' }

export default function Maintenance({ user, lang }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('الكل')
  const [filterBranch, setFilterBranch] = useState('الكل')
  const fileInputRef = useRef(null)

  const isOwner = user.role === 'owner'
  const isManager = isOwner || user.role === 'مدير تشغيل' || user.role === 'مدير فرع'

  useEffect(() => { fetchRequests() }, [])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  // ضغط الصورة قبل الرفع
  function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1280
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async function submitRequest() {
    if (!form.title) { alert('اكتب عنوان العطل') ; return }
    setSaving(true)
    let photo_url = null
    if (photoFile) {
      const blob = await compressImage(photoFile)
      const path = `maintenance/${Date.now()}_${user.id}.jpg`
      const { error: upErr } = await supabase.storage.from('task-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }
    await supabase.from('maintenance_requests').insert([{
      title: form.title,
      description: form.description,
      branch: form.branch || user.branch || branches[0],
      priority: form.priority,
      status: 'جديد',
      photo_url,
      created_by: user.id,
      created_by_name: user.name
    }])
    setForm(emptyForm); setPhotoFile(null); setShowForm(false); setSaving(false)
    fetchRequests()
  }

  async function updateStatus(req, newStatus) {
    await supabase.from('maintenance_requests').update({
      status: newStatus,
      resolved_at: newStatus === 'مكتمل' ? new Date().toISOString() : null
    }).eq('id', req.id)
    fetchRequests()
  }

  async function deleteRequest(id) {
    if (!window.confirm('حذف هذا الطلب؟')) return
    await supabase.from('maintenance_requests').delete().eq('id', id)
    fetchRequests()
  }

  const visible = requests.filter(r => {
    if (!isOwner && user.role !== 'مدير تشغيل' && r.branch !== user.branch) return false
    if (filterStatus !== 'الكل' && r.status !== filterStatus) return false
    if ((isOwner || user.role === 'مدير تشغيل') && filterBranch !== 'الكل' && r.branch !== filterBranch) return false
    return true
  })

  const openCount = requests.filter(r => r.status !== 'مكتمل').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>🔧 طلبات الصيانة</h2>
        <button onClick={() => { setShowForm(f => !f); setForm({ ...emptyForm, branch: user.branch || branches[0] }); setPhotoFile(null) }} style={solidBtn}>{showForm ? 'إغلاق' : '+ طلب صيانة'}</button>
      </div>
      <div style={{ color: 'var(--gold)', fontSize: 13, marginBottom: 16 }}>🔴 {openCount} طلب مفتوح</div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>طلب صيانة جديد</h3>
          <input placeholder="عنوان العطل * (مثال: مكينة الإسبريسو تسرب ماء)" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
          <textarea placeholder="تفاصيل إضافية (اختياري)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
              {priorities.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={e => setPhotoFile(e.target.files[0] || null)} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} style={{ ...outlineBtn, width: '100%', marginBottom: 12, textAlign: 'right' }}>
            {photoFile ? '✅ تم إرفاق صورة — اضغط للتغيير' : '📷 إرفاق صورة العطل (اختياري)'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitRequest} disabled={saving} style={solidBtn}>{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            <button onClick={() => setShowForm(false)} style={outlineBtn}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['الكل', ...statuses].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '6px 16px', borderRadius: 20, fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer',
            background: filterStatus === s ? 'var(--purple)' : 'white',
            color: filterStatus === s ? 'white' : 'var(--purple)',
            border: '1px solid var(--purple)', fontWeight: filterStatus === s ? 700 : 400
          }}>{s}</button>
        ))}
      </div>

      {(isOwner || user.role === 'مدير تشغيل') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['الكل', ...branches].map(b => (
            <button key={b} onClick={() => setFilterBranch(b)} style={{
              padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer',
              background: filterBranch === b ? 'var(--gold)' : 'white',
              color: filterBranch === b ? 'white' : 'var(--gold)',
              border: '1px solid var(--gold)'
            }}>{b}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>جاري التحميل...</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>لا توجد طلبات صيانة</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(r => (
            <div key={r.id} style={{
              background: 'white', borderRadius: 12, padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRight: `4px solid ${statusColor[r.status] || '#ddd'}`,
              opacity: r.status === 'مكتمل' ? 0.7 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>{r.title}</div>
                  {r.description && <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{r.description}</div>}
                  <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>📍 {r.branch}</span>
                    <span>👤 {r.created_by_name || '—'}</span>
                    <span>🕐 {new Date(r.created_at).toLocaleDateString('ar-SA')} {new Date(r.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: priorityColor[r.priority] }}>● {r.priority}</span>
                    <span style={{ color: statusColor[r.status], fontWeight: 700 }}>{r.status === 'جديد' ? '🔴' : r.status === 'قيد التنفيذ' ? '🟡' : '🟢'} {r.status}</span>
                    {r.photo_url && <a href={r.photo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--purple)', fontWeight: 700, textDecoration: 'none' }}>📷 عرض الصورة</a>}
                  </div>
                </div>
                {isOwner && (
                  <button onClick={() => deleteRequest(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                )}
              </div>
              {isManager && r.status !== 'مكتمل' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {r.status === 'جديد' && <button onClick={() => updateStatus(r, 'قيد التنفيذ')} style={{ ...smallBtn, background: 'var(--gold)' }}>▶ بدء التنفيذ</button>}
                  <button onClick={() => updateStatus(r, 'مكتمل')} style={{ ...smallBtn, background: 'var(--success)' }}>✓ إغلاق الطلب</button>
                </div>
              )}
              {isManager && r.status === 'مكتمل' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => updateStatus(r, 'جديد')} style={{ ...smallBtn, background: '#999' }}>↩ إعادة فتح</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', display: 'block', boxSizing: 'border-box' }
const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const smallBtn = { padding: '6px 16px', borderRadius: 16, color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12, fontWeight: 700 }
