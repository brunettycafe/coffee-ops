import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const BASE_BRANCHES = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

const CLOSED_STATUSES = ['مكتمل', 'مغلق', 'completed', 'closed', 'done']
function isClosed(status) {
  if (status == null) return false
  const s = String(status).trim()
  return CLOSED_STATUSES.includes(s) || CLOSED_STATUSES.includes(s.toLowerCase())
}

// عاجل/عالي = أحمر، متوسط = برتقالي، منخفض = رمادي
function priorityColor(p) {
  if (p === 'عاجل' || p === 'عالي') return 'var(--danger)'
  if (p === 'متوسط') return '#f57c00'
  return '#999'
}
const priorityRank = { 'عاجل': 3, 'عالي': 3, 'متوسط': 2, 'منخفض': 1 }

export default function Alerts({ user, lang }) {
  const today = riyadhToday()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [issues, setIssues] = useState([])
  const [resolvedToday, setResolvedToday] = useState(0)
  const [taskAlerts, setTaskAlerts] = useState([])
  const [filterPriority, setFilterPriority] = useState('الكل')
  const [filterBranch, setFilterBranch] = useState('الكل')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setError(null)
    try {
      // الأعطال
      const issuesRes = await supabase.from('maintenance_requests')
        .select('id, title, branch, priority, status, created_by_name, created_at, resolved_at')
      if (issuesRes.error) throw new Error(`فشل تحميل جدول: maintenance_requests — ${issuesRes.error.message}`)
      const allIssues = issuesRes.data || []
      const openIssues = allIssues.filter(i => !isClosed(i.status))
      // تم الحل اليوم
      const resolved = allIssues.filter(i => i.resolved_at && String(i.resolved_at).slice(0, 10) === today).length

      // مهام اليوم فقط
      const tasksRes = await supabase.from('tasks')
        .select('id, title_ar, title_en, branch, priority, shift')
        .eq('date', today)
      if (tasksRes.error) throw new Error(`فشل تحميل جدول: tasks — ${tasksRes.error.message}`)
      const todayTasks = tasksRes.data || []

      // إنجاز مهام اليوم
      const ids = todayTasks.map(t => t.id)
      let completed = new Set()
      if (ids.length > 0) {
        const compRes = await supabase.from('task_completions').select('task_id').in('task_id', ids)
        if (compRes.error) throw new Error(`فشل تحميل جدول: task_completions — ${compRes.error.message}`)
        completed = new Set((compRes.data || []).map(c => c.task_id))
      }
      // المهام غير المنجزة ذات الأولوية عالي أو متوسط فقط
      const undoneImportant = todayTasks
        .filter(t => !completed.has(t.id))
        .filter(t => t.priority === 'عالي' || t.priority === 'متوسط')

      setIssues(openIssues)
      setResolvedToday(resolved)
      setTaskAlerts(undoneImportant)
    } catch (e) {
      setError(e.message || 'خطأ في تحميل البيانات')
    }
    setLoading(false)
  }

  // توحيد التنبيهات في قائمة واحدة
  const allAlerts = [
    ...issues.map(i => ({
      key: `issue-${i.id}`, kind: 'عطل', title: i.title, branch: i.branch,
      priority: i.priority, by: i.created_by_name, status: i.status || 'جديد', created_at: i.created_at
    })),
    ...taskAlerts.map(t => ({
      key: `task-${t.id}`, kind: 'مهمة', title: lang === 'ar' ? t.title_ar : (t.title_en || t.title_ar),
      branch: t.branch, priority: t.priority, by: '—', status: 'غير منجزة', created_at: null
    }))
  ].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))

  // الفروع المتاحة
  const branches = (() => {
    const set = new Set(BASE_BRANCHES)
    allAlerts.forEach(a => { if (a.branch) set.add(a.branch) })
    return ['الكل', ...Array.from(set)]
  })()

  // تطبيق الفلاتر والبحث
  const filtered = allAlerts.filter(a => {
    if (filterPriority !== 'الكل') {
      if (filterPriority === 'عاجل' && !(a.priority === 'عاجل' || a.priority === 'عالي')) return false
      if (filterPriority === 'عالي' && a.priority !== 'عالي') return false
      if (filterPriority === 'متوسط' && a.priority !== 'متوسط') return false
    }
    if (filterBranch !== 'الكل' && a.branch !== filterBranch) return false
    if (search.trim()) {
      const q = search.trim()
      if (!(String(a.branch || '').includes(q) || String(a.title || '').includes(q))) return false
    }
    return true
  })

  // عدّادات الملخص
  const urgentCount = allAlerts.filter(a => a.priority === 'عاجل' || a.priority === 'عالي').length
  const highCount = allAlerts.filter(a => a.priority === 'عالي').length
  const mediumCount = allAlerts.filter(a => a.priority === 'متوسط').length

  if (loading) return <div dir="rtl" style={{ textAlign: 'center', color: '#aaa', padding: 60, fontFamily: 'Tajawal' }}>جاري التحميل...</div>
  if (error) return (
    <div dir="rtl" style={{ background: '#fce4ec', color: 'var(--danger)', borderRadius: 12, padding: 20, textAlign: 'center', fontFamily: 'Tajawal' }}>
      ⚠️ {error}
      <button onClick={fetchAll} style={{ display: 'block', margin: '12px auto 0', ...solidBtn }}>إعادة المحاولة</button>
    </div>
  )

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>🚨 مركز التنبيهات</h2>
        <button onClick={fetchAll} style={outlineBtn}>🔄 تحديث</button>
      </div>

      {/* بطاقات الملخص */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        <SummaryCard label="عاجلة / عالية" value={urgentCount} color="var(--danger)" />
        <SummaryCard label="عالية" value={highCount} color="#e53935" />
        <SummaryCard label="متوسطة" value={mediumCount} color="#f57c00" />
        <SummaryCard label="تم الحل اليوم" value={resolvedToday} color="var(--success)" />
      </div>

      {/* الفلاتر */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {['الكل', 'عاجل', 'عالي', 'متوسط'].map(p => (
          <button key={p} onClick={() => setFilterPriority(p)} style={{
            padding: '6px 16px', borderRadius: 20, fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer',
            background: filterPriority === p ? 'var(--purple)' : 'white',
            color: filterPriority === p ? 'white' : 'var(--purple)',
            border: '1px solid var(--purple)', fontWeight: filterPriority === p ? 700 : 400
          }}>{p}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {branches.map(b => (
          <button key={b} onClick={() => setFilterBranch(b)} style={{
            padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer',
            background: filterBranch === b ? 'var(--gold)' : 'white',
            color: filterBranch === b ? 'white' : 'var(--gold)',
            border: '1px solid var(--gold)'
          }}>{b}</button>
        ))}
      </div>

      {/* البحث */}
      <input
        placeholder="🔍 ابحث باسم الفرع أو عنوان المشكلة"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', marginBottom: 16, border: '1px solid #ddd', borderRadius: 10, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }}
      />

      {/* قائمة التنبيهات */}
      {filtered.length === 0 ? (
        <div style={{ background: '#e8f5e9', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--success)', fontSize: 16, fontWeight: 600 }}>
          جميع الفروع تعمل بصورة طبيعية ✅
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(a => (
            <div key={a.key} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${priorityColor(a.priority)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>{a.title}</span>
                <span style={{ fontSize: 11, background: a.kind === 'عطل' ? '#f3eefb' : '#fff8e1', color: a.kind === 'عطل' ? 'var(--purple)' : '#f57c00', borderRadius: 10, padding: '2px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{a.kind === 'عطل' ? '🔧 عطل' : '✅ مهمة'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>📍 {a.branch}</span>
                <span>👤 {a.by || '—'}</span>
                <span style={{ color: priorityColor(a.priority), fontWeight: 700 }}>● {a.priority}</span>
                <span>🏷️ {a.status}</span>
                {a.created_at && <span>🕐 {new Date(a.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  )
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '6px 16px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
