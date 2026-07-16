import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const BASE_BRANCHES = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']

// تاريخ السعودية بصيغة YYYY-MM-DD (يتجنب انزلاق UTC)
function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

// تحويل أي تاريخ إلى YYYY-MM-DD بأمان
function toYMD(v) {
  if (!v) return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const d = new Date(v)
  if (isNaN(d)) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

const CLOSED_STATUSES = ['مكتمل', 'مغلق', 'completed', 'closed', 'done']
function isClosed(status, completed) {
  if (completed === true) return true
  if (status == null) return false
  return CLOSED_STATUSES.includes(String(status).trim().toLowerCase()) ||
         CLOSED_STATUSES.includes(String(status).trim())
}

// ملاحظة: أعمدة جدول tasks افتراضية — يعتمد الكود على branch و status/completed
// وأحد أعمدة التاريخ (due_date / date / deadline / scheduled_date) وعنوان (title / name_ar / name)
const DATE_COLS = ['due_date', 'date', 'deadline', 'scheduled_date']
function taskDate(row) {
  for (const c of DATE_COLS) if (row && row[c]) return toYMD(row[c])
  return null
}
function tasksHaveDateColumn(rows) {
  return rows.some(r => DATE_COLS.some(c => c in (r || {}) && r[c]))
}

// ═══════════════════════════════════════════════════════════════
// معادلة درجة صحة الفرع — قابلة للتعديل لاحقاً (الأوزان خارج الواجهة)
// تحقيق الهدف 40% + إنجاز المهام 30% + (خصم الأعطال والهدر) 30%
// تُعيد { score, hasEnoughData }
// ═══════════════════════════════════════════════════════════════
const HEALTH_WEIGHTS = { target: 0.40, tasks: 0.30, issues: 0.30 }

function calcBranchHealth({ hasSales, salesPct, hasTasks, tasksPct, openIssues, wasteCost }) {
  const hasEnoughData = hasSales || hasTasks
  if (!hasEnoughData) return { score: null, hasEnoughData: false }

  const issuePenalty = Math.min(openIssues * 15, 60)
  const wastePenalty = Math.min(Math.floor(wasteCost / 100) * 5, 40)
  const issuesScore = Math.max(0, 100 - issuePenalty - wastePenalty)

  let wSum = HEALTH_WEIGHTS.issues
  let acc = issuesScore * HEALTH_WEIGHTS.issues
  if (hasSales) { acc += Math.min(salesPct, 100) * HEALTH_WEIGHTS.target; wSum += HEALTH_WEIGHTS.target }
  if (hasTasks) { acc += Math.min(tasksPct, 100) * HEALTH_WEIGHTS.tasks; wSum += HEALTH_WEIGHTS.tasks }

  return { score: Math.round(acc / wSum), hasEnoughData: true }
}

function healthColor(score) {
  if (score == null) return '#bbb'
  if (score >= 85) return 'var(--success)'
  if (score >= 70) return 'var(--gold)'
  return 'var(--danger)'
}
function healthLabel(score, lang) {
  if (score == null) return lang === 'ar' ? 'بيانات غير مكتملة' : 'Incomplete data'
  if (score >= 85) return lang === 'ar' ? 'ممتاز' : 'Excellent'
  if (score >= 70) return lang === 'ar' ? 'يحتاج متابعة' : 'Needs attention'
  return lang === 'ar' ? 'حرج' : 'Critical'
}

const L = {
  ar: {
    title: 'لوحة التشغيل', refresh: '🔄 تحديث', todaySales: 'مبيعات اليوم', target: 'الهدف',
    noTarget: 'لا يوجد هدف', avgTicket: 'متوسط الفاتورة', notAvailable: 'غير متاح',
    needFoodics: 'يحتاج ربط Foodics', avgHealth: 'متوسط صحة الفروع', critical: 'التنبيهات الحرجة',
    urgentIssues: 'أعطال عاجلة', openIssues: 'الأعطال المفتوحة', maintenance: 'صيانة',
    lateTasks: 'المهام المتأخرة', openTasks: 'المهام المفتوحة', overdue: 'تجاوزت موعدها',
    inProgress: 'قيد التنفيذ', branchStatus: 'حالة الفروع', notEntered: 'لم يُدخل',
    needAction: 'يحتاج تدخلك الآن', noUrgent: 'لا توجد مشكلات عاجلة ✅', issue: 'عطل',
    noteOpen: 'ملاحظة: عرض "المهام المفتوحة" — المهام المتأخرة تحتاج عمود due_date مستقبلاً',
    noLate: 'لا توجد مهام متأخرة ✅', noOpen: 'لا توجد مهام مفتوحة ✅', task: 'مهمة',
    summary: 'ملخص اليوم', achievePct: 'بنسبة تحقيق', wasteToday: 'هدر اليوم',
    noIssues: 'لا أعطال مفتوحة.', retry: 'إعادة المحاولة', loadFail: 'فشل تحميل جدول', loading: 'جاري التحميل...',
  },
  en: {
    title: 'Operations Dashboard', refresh: '🔄 Refresh', todaySales: "Today's Sales", target: 'Target',
    noTarget: 'No target', avgTicket: 'Avg Ticket', notAvailable: 'N/A',
    needFoodics: 'Requires Foodics', avgHealth: 'Avg Branch Health', critical: 'Critical Alerts',
    urgentIssues: 'urgent issues', openIssues: 'Open Issues', maintenance: 'maintenance',
    lateTasks: 'Overdue Tasks', openTasks: 'Open Tasks', overdue: 'past due',
    inProgress: 'in progress', branchStatus: 'Branch Status', notEntered: 'Not entered',
    needAction: 'Needs Your Action', noUrgent: 'No urgent issues ✅', issue: 'issue',
    noteOpen: 'Note: showing "Open Tasks" — overdue tasks need a due_date column later',
    noLate: 'No overdue tasks ✅', noOpen: 'No open tasks ✅', task: 'task',
    summary: "Today's Summary", achievePct: 'at', wasteToday: 'waste today',
    noIssues: 'No open issues.', retry: 'Retry', loadFail: 'Failed to load table', loading: 'Loading...',
  }
}

export default function Dashboard({ user, lang }) {
  const tt = L[lang] || L.ar
  const SAR = lang === 'ar' ? 'ر.س' : 'SAR'
  const today = riyadhToday()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sales, setSales] = useState([])
  const [waste, setWaste] = useState([])
  const [issues, setIssues] = useState([])
  const [tasks, setTasks] = useState([])
  const [hasDateCol, setHasDateCol] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setError(null)
    try {
      const salesRes = await supabase.from('sales').select('*').eq('date', today)
      if (salesRes.error) throw new Error(`${tt.loadFail}: sales — ${salesRes.error.message}`)

      const wasteRes = await supabase.from('waste_logs').select('*').eq('date', today)
      if (wasteRes.error) throw new Error(`${tt.loadFail}: waste_logs — ${wasteRes.error.message}`)

      const issuesRes = await supabase.from('maintenance_requests').select('*')
      if (issuesRes.error) throw new Error(`${tt.loadFail}: maintenance_requests — ${issuesRes.error.message}`)

      const tasksRes = await supabase.from('tasks').select('*').limit(1000)
      if (tasksRes.error) throw new Error(`${tt.loadFail}: tasks — ${tasksRes.error.message}`)

      setSales(salesRes.data || [])
      setWaste(wasteRes.data || [])
      setIssues((issuesRes.data || []).filter(i => !isClosed(i.status, i.completed)))
      const tRows = tasksRes.data || []
      setHasDateCol(tasksHaveDateColumn(tRows))
      setTasks(tRows)
    } catch (e) {
      setError(e.message || 'خطأ في تحميل البيانات')
    }
    setLoading(false)
  }

  const branches = (() => {
    const set = new Set(BASE_BRANCHES)
    ;[...sales, ...tasks, ...issues, ...waste].forEach(r => { if (r && r.branch) set.add(r.branch) })
    return Array.from(set)
  })()

  const num = v => Number(v) || 0

  const totalSalesToday = sales.reduce((s, r) => s + num(r.amount), 0)
  const totalTargetToday = sales.reduce((s, r) => s + num(r.target), 0)
  const totalWasteToday = waste.reduce((s, r) => s + num(r.cost), 0)
  const openIssuesCount = issues.length
  const criticalAlerts = issues.filter(i => i.priority === 'عاجل').length

  const branchStates = branches.map(b => {
    const bSalesRows = sales.filter(s => s.branch === b)
    const amount = bSalesRows.reduce((s, r) => s + num(r.amount), 0)
    const target = bSalesRows.reduce((s, r) => s + num(r.target), 0)
    const salesPct = target > 0 ? (amount / target * 100) : 0
    const bIssues = issues.filter(i => i.branch === b)
    const bWaste = waste.filter(w => w.branch === b).reduce((s, w) => s + num(w.cost), 0)
    const bTasks = tasks.filter(t => t.branch === b)
    const doneTasks = bTasks.filter(t => isClosed(t.status, t.completed)).length
    const tasksPct = bTasks.length > 0 ? (doneTasks / bTasks.length * 100) : 0
    const { score, hasEnoughData } = calcBranchHealth({
      hasSales: bSalesRows.length > 0, salesPct,
      hasTasks: bTasks.length > 0, tasksPct,
      openIssues: bIssues.length, wasteCost: bWaste
    })
    return { branch: b, amount, target, salesPct: Math.round(salesPct), health: score, hasEnoughData, issues: bIssues.length, hasSales: bSalesRows.length > 0 }
  })

  const scored = branchStates.filter(b => b.hasEnoughData && b.health != null)
  const avgHealth = scored.length > 0 ? Math.round(scored.reduce((s, b) => s + b.health, 0) / scored.length) : null

  const priorityRank = { 'عاجل': 3, 'متوسط': 2, 'منخفض': 1 }
  const topIssues = [...issues].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)).slice(0, 5)

  const openTasks = tasks.filter(t => !isClosed(t.status, t.completed))
  const lateTasks = hasDateCol
    ? openTasks.filter(t => { const d = taskDate(t); return d && d < today })
    : openTasks

  if (loading) return <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ textAlign: 'center', color: '#aaa', padding: 60, fontFamily: 'Tajawal' }}>{tt.loading}</div>
  if (error) return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ background: '#fce4ec', color: 'var(--danger)', borderRadius: 12, padding: 20, textAlign: 'center', fontFamily: 'Tajawal' }}>
      ⚠️ {error}
      <button onClick={fetchAll} style={{ display: 'block', margin: '12px auto 0', ...solidBtn }}>{tt.retry}</button>
    </div>
  )

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: 'Tajawal' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{tt.title}</h2>
        <button onClick={fetchAll} style={outlineBtn}>{tt.refresh}</button>
      </div>
      <div style={{ color: '#999', fontSize: 12, marginBottom: 20 }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long' })}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard label={tt.todaySales} value={`${totalSalesToday.toLocaleString()} ${SAR}`} sub={totalTargetToday > 0 ? `${tt.target} ${totalTargetToday.toLocaleString()}` : tt.noTarget} color="var(--purple)" />
        <MetricCard label={tt.avgTicket} value={tt.notAvailable} sub={tt.needFoodics} color="#bbb" muted />
        <MetricCard label={tt.avgHealth} value={avgHealth == null ? '—' : `${avgHealth}`} sub={healthLabel(avgHealth, lang)} color={healthColor(avgHealth)} />
        <MetricCard label={tt.critical} value={`${criticalAlerts}`} sub={tt.urgentIssues} color={criticalAlerts > 0 ? 'var(--danger)' : 'var(--success)'} />
        <MetricCard label={tt.openIssues} value={`${openIssuesCount}`} sub={tt.maintenance} color={openIssuesCount > 0 ? 'var(--gold)' : 'var(--success)'} />
        <MetricCard label={hasDateCol ? tt.lateTasks : tt.openTasks} value={`${lateTasks.length}`} sub={hasDateCol ? tt.overdue : tt.inProgress} color={lateTasks.length > 0 ? 'var(--danger)' : 'var(--success)'} />
      </div>

      <SectionTitle>{tt.branchStatus}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {branchStates.map(b => (
          <div key={b.branch} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${healthColor(b.health)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--purple)' }}>📍 {b.branch}</span>
              <span style={{ background: healthColor(b.health), color: 'white', borderRadius: 12, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>{b.health == null ? healthLabel(null, lang) : b.health}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#666' }}>
              <span>💰 {b.hasSales ? `${b.amount.toLocaleString()} ${SAR}` : tt.notEntered}</span>
              <span>🎯 {b.target > 0 ? `${b.salesPct}%` : '—'}</span>
              <span>🧾 {tt.notAvailable}</span>
              <span style={{ color: b.issues > 0 ? 'var(--danger)' : '#666' }}>🔧 {b.issues} {tt.issue}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>{tt.needAction}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {topIssues.length === 0 ? <EmptyState>{tt.noUrgent}</EmptyState> : topIssues.map(i => (
          <div key={i.id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${i.priority === 'عاجل' ? 'var(--danger)' : i.priority === 'متوسط' ? 'var(--gold)' : '#aaa'}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>{i.title}</div>
            <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>📍 {i.branch}</span>
              <span>👤 {i.created_by_name || '—'}</span>
              <span style={{ color: i.priority === 'عاجل' ? 'var(--danger)' : i.priority === 'متوسط' ? '#f57c00' : '#999', fontWeight: 700 }}>● {i.priority}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>{hasDateCol ? tt.lateTasks : tt.openTasks}</SectionTitle>
      {!hasDateCol && <div style={{ background: '#fff8e1', borderRadius: 10, padding: 10, fontSize: 12, color: '#f57c00', marginBottom: 10 }}>{tt.noteOpen}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {lateTasks.length === 0 ? <EmptyState>{hasDateCol ? tt.noLate : tt.noOpen}</EmptyState> : lateTasks.slice(0, 8).map(t => (
          <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#333' }}>{t.title || t.name_ar || t.name || tt.task}</span>
            <span style={{ fontSize: 12, color: '#888' }}>📍 {t.branch || '—'}</span>
          </div>
        ))}
      </div>

      <SectionTitle>{tt.summary}</SectionTitle>
      <div style={{ background: 'linear-gradient(135deg, var(--purple), #6b4c9a)', borderRadius: 16, padding: 20, color: 'white', boxShadow: '0 4px 16px rgba(107,76,154,0.3)' }}>
        <div style={{ fontSize: 15, lineHeight: 2 }}>
          {tt.todaySales} <strong>{totalSalesToday.toLocaleString()} {SAR}</strong>
          {totalTargetToday > 0 && <> {tt.achievePct} <strong>{Math.round(totalSalesToday / totalTargetToday * 100)}%</strong></>}.{' '}
          {tt.avgHealth} <strong>{avgHealth == null ? '—' : avgHealth}</strong> ({healthLabel(avgHealth, lang)}).{' '}
          {openIssuesCount > 0 ? <><strong>{openIssuesCount}</strong> {tt.openIssues} — <strong>{criticalAlerts}</strong> {tt.urgentIssues}.</> : <>{tt.noIssues}</>}
          {totalWasteToday > 0 && <> {tt.wasteToday} <strong>{totalWasteToday.toLocaleString()} {SAR}</strong>.</>}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, muted }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', opacity: muted ? 0.75 : 1 }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--purple)', margin: '0 0 12px', borderInlineStart: '3px solid var(--gold)', paddingInlineStart: 10 }}>{children}</h3>
}

function EmptyState({ children }) {
  return <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: '#aaa', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{children}</div>
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '6px 16px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
