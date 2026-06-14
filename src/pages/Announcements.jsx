import React, { useState } from 'react'

const defaultAnnouncements = [
  { id: 1, title: 'تنبيه مهم', body: 'يرجى الالتزام بمواعيد الدوام الصباحي اعتباراً من هذا الأسبوع.', author: 'بندر', date: '2026-06-14', priority: 'عالي', branch: 'الكل' },
  { id: 2, title: 'تحديث إجراءات التنظيف', body: 'تم تحديث بروتوكول تنظيف الماكينات — يرجى مراجعة الدليل الجديد.', author: 'بندر', date: '2026-06-13', priority: 'متوسط', branch: 'الكل' },
  { id: 3, title: 'اجتماع أسبوعي', body: 'سيُعقد الاجتماع الأسبوعي يوم الاثنين الساعة 10 صباحاً.', author: 'بندر', date: '2026-06-12', priority: 'منخفض', branch: 'الناصرية' },
]

const priorityColor = { 'عالي': 'var(--danger)', 'متوسط': 'var(--gold)', 'منخفض': 'var(--olive)' }
const priorityBg = { 'عالي': '#fce4ec', 'متوسط': '#fff8e1', 'منخفض': '#e8f5e9' }

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useState(defaultAnnouncements)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', priority: 'متوسط', branch: 'الكل' })

  const branches = ['الكل', 'الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

  const myAnnouncements = user.role === 'owner'
    ? announcements
    : announcements.filter(a => a.branch === 'الكل' || a.branch === user.branch)

  function addAnnouncement() {
    if (!form.title || !form.body) return
    setAnnouncements([{
      ...form, id: Date.now(),
      author: user.name,
      date: new Date().toISOString().split('T')[0]
    }, ...announcements])
    setForm({ title: '', body: '', priority: 'متوسط', branch: 'الكل' })
    setShowAdd(false)
  }

  function deleteAnnouncement(id) {
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>التوجيهات والملاحظات</h2>
        {user.role === 'owner' && (
          <button onClick={() => setShowAdd(!showAdd)} style={{
            padding: '8px 20px', borderRadius: 20, background: 'var(--purple)',
            color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
          }}>+ توجيه جديد</button>
        )}
      </div>

      {showAdd && user.role === 'owner' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>توجيه جديد</h3>
          <input placeholder="العنوان" value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
          <textarea placeholder="محتوى التوجيه..." value={form.body}
            onChange={e => setForm({...form, body: e.target.value})}
            rows={4} style={{...inputStyle, resize: 'vertical'}} />
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{...inputStyle, flex: 1}}>
              {['عالي', 'متوسط', 'منخفض'].map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} style={{...inputStyle, flex: 1}}>
              {branches.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <button onClick={addAnnouncement} style={{
            background: 'var(--purple)', color: 'white', border: 'none',
            padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 14
          }}>نشر التوجيه</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {myAnnouncements.map(a => (
          <div key={a.id} style={{
            background: 'white', borderRadius: 12, padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRight: `4px solid ${priorityColor[a.priority]}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--purple)' }}>{a.title}</span>
                  <span style={{
                    background: priorityBg[a.priority], color: priorityColor[a.priority],
                    padding: '2px 10px', borderRadius: 12, fontSize: 12
                  }}>{a.priority}</span>
                  {a.branch !== 'الكل' && (
                    <span style={{ background: '#f0f0f0', color: '#666', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
                      {a.branch}
                    </span>
                  )}
                </div>
                <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>{a.body}</p>
                <div style={{ fontSize: 12, color: '#aaa' }}>
                  {a.author} — {a.date}
                </div>
              </div>
              {user.role === 'owner' && (
                <button onClick={() => deleteAnnouncement(a.id)} style={{
                  background: 'none', border: 'none', color: '#ccc',
                  cursor: 'pointer', fontSize: 18, marginRight: 8
                }}>×</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', marginBottom: 10,
  border: '1px solid #ddd', borderRadius: 8,
  fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', display: 'block'
}
