import React, { useState } from 'react'

const defaultTasks = [
  { id: 1, titleAr: 'تنظيف ماكينة الإسبريسو', titleEn: 'Clean espresso machine', branch: 'الناصرية', assignee: 'الفريق', done: false, priority: 'عالي' },
  { id: 2, titleAr: 'جرد المخزون اليومي', titleEn: 'Daily inventory check', branch: 'النخيل', assignee: 'الفريق', done: false, priority: 'متوسط' },
  { id: 3, titleAr: 'تدريب الموظف الجديد', titleEn: 'Train new staff member', branch: 'الربوة', assignee: 'المدير', done: true, priority: 'عالي' },
  { id: 4, titleAr: 'فحص درجات حرارة الثلاجات', titleEn: 'Check refrigerator temperatures', branch: 'الفرع الرابع', assignee: 'الفريق', done: false, priority: 'عالي' },
  { id: 5, titleAr: 'تنظيف واجهة المحل', titleEn: 'Clean storefront', branch: 'الفرع الخامس', assignee: 'الفريق', done: false, priority: 'منخفض' },
]

const branches = ['الكل', 'الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']
const priorities = ['عالي', 'متوسط', 'منخفض']
const priorityColor = { 'عالي': 'var(--danger)', 'متوسط': 'var(--gold)', 'منخفض': 'var(--olive)' }

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState(defaultTasks)
  const [filter, setFilter] = useState('الكل')
  const [lang, setLang] = useState('ar')
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ titleAr: '', titleEn: '', branch: 'الناصرية', assignee: '', priority: 'متوسط' })

  const filtered = filter === 'الكل' ? tasks : tasks.filter(t => t.branch === filter)
  const myTasks = user.role === 'owner' ? filtered : filtered.filter(t => t.branch === user.branch)

  function toggleDone(id) {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function addTask() {
    if (!newTask.titleAr) return
    setTasks([...tasks, { ...newTask, id: Date.now(), done: false }])
    setNewTask({ titleAr: '', titleEn: '', branch: 'الناصرية', assignee: '', priority: 'متوسط' })
    setShowAdd(false)
  }

  const done = myTasks.filter(t => t.done).length
  const total = myTasks.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>المهام</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{
            padding: '6px 16px', borderRadius: 20, background: 'white',
            color: 'var(--purple)', border: '1px solid var(--purple)',
            cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
          }}>{lang === 'ar' ? 'English' : 'عربي'}</button>
          {user.role === 'owner' && (
            <button onClick={() => setShowAdd(!showAdd)} style={{
              padding: '6px 16px', borderRadius: 20, background: 'var(--purple)',
              color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13
            }}>+ إضافة مهمة</button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#666' }}>الإنجاز الإجمالي</span>
          <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{done}/{total} مهمة</span>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: 8, height: 10 }}>
          <div style={{
            width: total > 0 ? `${Math.round(done/total*100)}%` : '0%',
            height: '100%', background: 'var(--success)', borderRadius: 8, transition: 'width 0.5s'
          }} />
        </div>
      </div>

      {/* Add Task Form */}
      {showAdd && user.role === 'owner' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>مهمة جديدة</h3>
          <input placeholder="اسم المهمة بالعربي" value={newTask.titleAr}
            onChange={e => setNewTask({...newTask, titleAr: e.target.value})} style={inputStyle} />
          <input placeholder="Task name in English" value={newTask.titleEn}
            onChange={e => setNewTask({...newTask, titleEn: e.target.value})} style={inputStyle} />
          <input placeholder="المسؤول" value={newTask.assignee}
            onChange={e => setNewTask({...newTask, assignee: e.target.value})} style={inputStyle} />
          <select value={newTask.branch} onChange={e => setNewTask({...newTask, branch: e.target.value})} style={inputStyle}>
            {branches.filter(b => b !== 'الكل').map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} style={inputStyle}>
            {priorities.map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={addTask} style={{
            background: 'var(--purple)', color: 'white', border: 'none',
            padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 14
          }}>حفظ المهمة</button>
        </div>
      )}

      {/* Branch Filter */}
      {user.role === 'owner' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {branches.map(b => (
            <button key={b} onClick={() => setFilter(b)} style={{
              padding: '6px 14px', borderRadius: 20, fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer',
              background: filter === b ? 'var(--purple)' : 'white',
              color: filter === b ? 'white' : 'var(--purple)',
              border: '1px solid var(--purple)'
            }}>{b}</button>
          ))}
        </div>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {myTasks.map(t => (
          <div key={t.id} style={{
            background: 'white', borderRadius: 12, padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            opacity: t.done ? 0.6 : 1,
            borderRight: `4px solid ${priorityColor[t.priority]}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)}
                style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--purple)' }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  textDecoration: t.done ? 'line-through' : 'none',
                  color: t.done ? '#aaa' : '#333'
                }}>
                  {lang === 'ar' ? t.titleAr : (t.titleEn || t.titleAr)}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>📍 {t.branch}</span>
                  <span>👤 {t.assignee}</span>
                  <span style={{ color: priorityColor[t.priority] }}>● {t.priority}</span>
                </div>
              </div>
              {t.done && <span style={{ color: 'var(--success)', fontSize: 20 }}>✓</span>}
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
