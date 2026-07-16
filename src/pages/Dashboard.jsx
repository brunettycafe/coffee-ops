import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const BASE_BRANCHES = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']

// تاريخ السعودية بصيغة YYYY-MM-DD (يتجنب انزلاق UTC)
function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

// التاريخ الميلادي المعروض: الخميس، 16 يوليو 2026
function riyadhDisplayDate(lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    timeZone: 'Asia/Riyadh', calendar: 'gregory',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date())
}

const CLOSED_STATUSES = ['مكتمل', 'مغلق', 'completed', 'closed', 'done']
function isIssueClosed(status) {
  if (status == null) return false
  const s = String(status).trim()
  return CLOSED_STATUSES.includes(s) || CLOSED_STATUSES.includes(s.toLowerCase())
}

// ═══════════════════════════════════════════════════════════════
// معادلة درجة صحة الفرع — قابلة للتعديل لاحقاً (الأوزان خارج الواجهة)
// تحقيق الهدف 40% + إنجاز المهام 30% + (خصم الأعطال والهدر) 30%
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
    title: 'لوحة التشغيل', refresh: '🔄 تحديث', needAction: '🚦 يحتاج تدخلك الآن',
    allNormal: 'جميع الفروع تعمل بصورة طبيعية ✅',
    urgentOpen: 'أعطال عاجلة مفتوحة', todayUndone: 'مهام اليوم غير المنجزة',
    lowestBranch: 'الفرع الأقل صحة', todaySales: '💰 مبيعات اليوم', target: 'الهدف',
    noTarget: 'لا يوجد هدف', avgTicket: '🧾 متوسط الفاتورة', notAvailable: 'غير متاح',
    needFoodics: 'يحتاج ربط Foodics', avgHealth: '❤️ صحة الفروع', critical: '🚨 التنبيهات الحرجة',
    urgentIssues: 'أعطال عاجلة', openIssues: '🔧 الأعطال المفتوحة', maintenance: 'صيانة',
    todayTasks: '✅ مهام اليوم', undoneToday: 'غير منجزة اليوم', branchStatus: 'حالة الفروع',
    notEntered: 'لم يُدخل', issue: 'عطل', noUrgent: 'لا توجد مشكلات عاجلة ✅', task: 'مهمة',
    undoneTasksSection: 'مهام اليوم غير المنجزة', noUndone: 'كل مهام اليوم منجزة ✅',
    summary: 'ملخص اليوم', achievePct: 'بنسبة تحقيق', wasteToday: 'هدر اليوم',
    noIssues: 'لا أعطال مفتوحة.', retry: 'إعادة المحاولة', loadFail: 'فشل تحميل جدول', loading: 'جاري التحميل...',
  },
  en: {
    title: 'Operations Dashboard', refresh: '🔄 Refresh', needAction: '🚦 Needs Your Action',
    allNormal: 'All branches operating normally ✅',
    urgentOpen: 'urgent open issues', todayUndone: "today's undone tasks",
    lowestBranch: 'Lowest health branch', todaySales: "💰 Today's Sales", target: 'Target',
    noTarget: 'No target', avgTicket: '🧾 Avg Ticket', notAvailable: 'N/A',
    needFoodics: 'Requires Foodics', avgHealth: '❤️ Branch Health', critical: '🚨 Critical Alerts',
    urgentIssues: 'urgent issues', openIssues: '🔧 Open Issues', maintenance: 'maintenance',
    todayTasks: "✅ Today's Tasks", undoneToday: 'undone today', branchStatus: 'Branch Status',
    notEntered: 'Not entered', issue: 'issue', noUrgent: 'No urgent issues ✅', task: 'task',
    undoneTasksSection: "Today's Undone Tasks", noUndone: "All today's tasks done ✅",
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
  const [completions, setCompletions] = useState([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setError(null)
    try {
      const salesRes = await supabase.from('sales').select('branch, amount, target').eq('date', today)
      if (salesRes.error) throw new Error(`${tt.loadFail}: sales — ${salesRes.error.message}`)

      const wasteRes = await supabase.from('waste_logs').select('branch, cost').eq('date', today)
      if (wasteRes.error) throw new Error(`${tt.loadFail}: waste_logs — ${wasteRes.error.message}`)

      const issuesRes = await supabase.from('maintenance_requests').select('id, title, branch, priority, status, created_by_name')
      if (issuesRes.error) throw new Error(`${tt.loadFail}: maintenance_requests — ${issuesRes.error.message}`)

      // مهام اليوم فقط (date = اليوم) — لا limit(1000)
      const tasksRes = await supabase.from('tasks').select('id, title_ar, title_en, branch, priority, shift').eq('date', today)
      if (tasksRes.error) throw new Error(`${tt.loadFail}: tasks — ${tasksRes.error.message}`)

      // سجلات إنجاز اليوم فقط لمهام اليوم
      const todayTaskIds = (tasksRes.data || []).map(t => t.id)
      let compData = []
      if (todayTaskIds.length > 0) {
        const compRes = await supabase.from('task_completions').select('task_id').in('task_id', todayTaskIds)
        if (compRes.error) throw new Error(`${tt.loadFail}: task_completions — ${compRes.error.message}`)
        compData = compRes.data || []
      }

      setSales(salesRes.data || [])
      setWaste(wasteRes.data || [])
      setIssues((issuesRes.data || []).filter(i => !isIssueClosed(i.status)))
      setTasks(tasksRes.data || [])
      setCompletions(compData)
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
  const completedTaskIds = new Set(completions.map(c => c.task_id))
  const isTaskDone = id => completedTaskIds.has(id)

  const totalSalesToday = sales.reduce((s, r) => s + num(r.amount), 0)
  const totalTargetToday = sales.reduce((s, r) => s + num(r.target), 0)
  const totalWasteToday = waste.reduce((s, r) => s + num(r.cost), 0)
  const openIssuesCount = issues.length
  const criticalAlerts = issues.filter(i => i.priority === 'عالي' || i.priority === 'عاجل').length

  // مهام اليوم غير المنجزة (تاريخها اليوم + لا سجل إنجاز)
  const undoneTasks = tasks.filter(t => !isTaskDone(t.id))

  const branchStates = branches.map(b => {
    const bSalesRows = sales.filter(s => s.branch === b)
    const amount = bSalesRows.reduce((s, r) => s + num(r.amount), 0)
    const target = bSalesRows.reduce((s, r) => s + num(r.target), 0)
    const salesPct = target > 0 ? (amount / target * 100) : 0
    const bIssues = issues.filter(i => i.branch === b)
    const bWaste = waste.filter(w => w.branch === b).reduce((s, w) => s + num(w.cost), 0)
    const bTasks = tasks.filter(t => t.branch === b)
    const doneTasks = bTasks.filter(t => isTaskDone(t.id)).length
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
  const lowestBranch = scored.length > 0 ? scored.reduce((min, b) => b.health < min.health ? b : min, scored[0]) : null

  const priorityRank = { 'عالي': 3, 'عاجل': 3, 'متوسط': 2, 'منخفض': 1 }
  const topIssues = [...issues].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)).slice(0, 5)

  const needActionItems = []
  if (criticalAlerts > 0) needActionItems.push({ icon: '🚨', text: `${criticalAlerts} ${tt.urgentOpen}`, color: 'var(--danger)' })
  if (undoneTasks.length > 0) needActionItems.push({ icon: '✅', text: `${undoneTasks.length} ${tt.todayUndone}`, color: 'var(--gold)' })
  if (lowestBranch && lowestBranch.health != null && lowestBranch.health < 70) needActionItems.push({ icon: '❤️', text: `${tt.lowestBranch}: ${lowestBranch.branch} (${lowestBranch.health})`, color: 'var(--danger)' })

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
      <div style={{ color: '#999', fontSize: 12, marginBottom: 20 }}>{riyadhDisplayDate(lang)}</div>

      {/* يحتاج تدخلك الآن — أعلى الصفحة */}
      <div style={{ background: needActionItems.length === 0 ? '#e8f5e9' : '#fff', borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineStart: `5px solid ${needActionItems.length === 0 ? 'var(--success)' : 'var(--danger)'}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--purple)', marginBottom: needActionItems.length === 0 ? 0 : 12 }}>{tt.needAction}</div>
        {needActionItems.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>{tt.allNormal}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {needActionItems.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#333' }}>
                <span style={{ fontSize: 18 }}>{it.icon}</span>
                <span style={{ fontWeight: 600, color: it.color }}>{it.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المؤشرات الرئيسية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard label={tt.todaySales} value={`${totalSalesToday.toLocaleString()} ${SAR}`} sub={totalTargetToday > 0 ? `${tt.target} ${totalTargetToday.toLocaleString()}` : tt.noTarget} color="var(--purple)" />
        <MetricCard label={tt.avgTicket} value={tt.notAvailable} sub={tt.needFoodics} color="#bbb" muted />
        <MetricCard label={tt.avgHealth} value={avgHealth == null ? '—' : `${avgHealth}`} sub={healthLabel(avgHealth, lang)} color={healthColor(avgHealth)} />
        <MetricCard label={tt.critical} value={`${criticalAlerts}`} sub={tt.urgentIssues} color={criticalAlerts > 0 ? 'var(--danger)' : 'var(--success)'} />
        <MetricCard label={tt.openIssues} value={`${openIssuesCount}`} sub={tt.maintenance} color={openIssuesCount > 0 ? 'var(--gold)' : 'var(--success)'} />
        <MetricCard label={tt.todayTasks} value={`${undoneTasks.length}`} sub={tt.undoneToday} color={undoneTasks.length > 0 ? 'var(--danger)' : 'var(--success)'} />
      </div>

      {/* حالة الفروع */}
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
              <span style={{ color: b.issues > 0 ? 'var(--danger)' : '#666' }}>🔧 {b.issues} {tt.issue}</span>
            </div>
          </div>
        ))}
      </div>

      {/* أهم المشكلات */}
      <SectionTitle>{tt.needAction}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {topIssues.length === 0 ? <EmptyState>{tt.noUrgent}</EmptyState> : topIssues.map(i => (
          <div key={i.id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${(i.priority === 'عالي' || i.priority === 'عاجل') ? 'var(--danger)' : i.priority === 'متوسط' ? 'var(--gold)' : '#aaa'}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>{i.title}</div>
            <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>📍 {i.branch}</span>
              <span>👤 {i.created_by_name || '—'}</span>
              <span style={{ color: (i.priority === 'عالي' || i.priority === 'عاجل') ? 'var(--danger)' : i.priority === 'متوسط' ? '#f57c00' : '#999', fontWeight: 700 }}>● {i.priority}</span>
            </div>
          </div>
        ))}
      </div>

      {/* مهام اليوم غير المنجزة */}
      <SectionTitle>{tt.undoneTasksSection}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {undoneTasks.length === 0 ? <EmptyState>{tt.noUndone}</EmptyState> : undoneTasks.slice(0, 8).map(t => (
          <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderInlineEnd: `4px solid ${t.priority === 'عالي' ? 'var(--danger)' : t.priority === 'متوسط' ? 'var(--gold)' : '#ccc'}` }}>
            <span style={{ fontSize: 14, color: '#333' }}>{lang === 'ar' ? (t.title_ar || tt.task) : (t.title_en || t.title_ar || tt.task)}</span>
            <span style={{ fontSize: 12, color: '#888' }}>📍 {t.branch || '—'} {t.shift === 'صباحي' ? '🌅' : '🌙'}</span>
          </div>
        ))}
      </div>

      {/* ملخص اليوم */}
      <SectionTitle>{tt.summary}</SectionTitle>
      <div style={{ background: 'linear-gradient(135deg, var(--purple), #6b4c9a)', borderRadius: 16, padding: 20, color: 'white', boxShadow: '0 4px 16px rgba(107,76,154,0.3)' }}>
        <div style={{ fontSize: 15, lineHeight: 2 }}>
          {tt.todaySales} <strong>{totalSalesToday.toLocaleString()} {SAR}</strong>
          {totalTargetToday > 0 && <> {tt.achievePct} <strong>{Math.round(totalSalesToday / totalTargetToday * 100)}%</strong></>}.{' '}
          {tt.avgHealth} <strong>{avgHealth == null ? '—' : avgHealth}</strong> ({healthLabel(avgHealth, lang)}).{' '}
          {openIssuesCount > 0 ? <><strong>{openIssuesCount}</strong> {tt.openIssues} — <strong>{criticalAlerts}</strong> {tt.urgentIssues}.</> : <>{tt.noIssues}</>}
          {undoneTasks.length > 0 && <> <strong>{undoneTasks.length}</strong> {tt.todayUndone}.</>}
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
