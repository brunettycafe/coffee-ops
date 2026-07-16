import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const BASE_BRANCHES = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}
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
function complianceColor(pct) {
  if (pct >= 85) return 'var(--success)'
  if (pct >= 70) return 'var(--gold)'
  if (pct >= 50) return '#f57c00'
  return 'var(--danger)'
}

export default function Dashboard({ user, lang }) {
  const isAr = lang === 'ar'
  const SAR = isAr ? 'ر.س' : 'SAR'
  const today = riyadhToday()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sales, setSales] = useState([])
  const [waste, setWaste] = useState([])
  const [issues, setIssues] = useState([])
  const [tasks, setTasks] = useState([])
  const [branchRows, setBranchRows] = useState([])
  const [checkTemplates, setCheckTemplates] = useState([])
  const [checkToday, setCheckToday] = useState([])
  const [violations, setViolations] = useState([])
  const [modalImg, setModalImg] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setError(null)
    try {
      const salesRes = await supabase.from('sales').select('branch, amount, target').eq('date', today)
      if (salesRes.error) throw new Error(`فشل تحميل جدول: sales — ${salesRes.error.message}`)

      const wasteRes = await supabase.from('waste_logs').select('branch, cost').eq('date', today)
      if (wasteRes.error) throw new Error(`فشل تحميل جدول: waste_logs — ${wasteRes.error.message}`)

      const issuesRes = await supabase.from('maintenance_requests').select('id, title, branch, priority, status, created_by_name')
      if (issuesRes.error) throw new Error(`فشل تحميل جدول: maintenance_requests — ${issuesRes.error.message}`)

      // مهام اليوم — بعمود done مباشرة (بلا task_completions)
      const tasksRes = await supabase.from('tasks').select('id, title_ar, title_en, branch, priority, done').eq('date', today)
      if (tasksRes.error) throw new Error(`فشل تحميل جدول: tasks — ${tasksRes.error.message}`)

      const branchesRes = await supabase.from('branches').select('id, name_ar, name_en, is_active')
      if (branchesRes.error) throw new Error(`فشل تحميل جدول: branches — ${branchesRes.error.message}`)

      const tmplRes = await supabase.from('checklist_templates').select('id, item_ar, item_en, type, is_active')
      if (tmplRes.error) throw new Error(`فشل تحميل جدول: checklist_templates — ${tmplRes.error.message}`)

      const checkTodayRes = await supabase.from('checklist_completions')
        .select('id, branch_id, template_id, is_completed, has_issue, image_url')
        .eq('date', today)
      if (checkTodayRes.error) throw new Error(`فشل تحميل جدول: checklist_completions — ${checkTodayRes.error.message}`)

      const violRes = await supabase.from('checklist_completions')
        .select('id, branch_id, template_id, notes, image_url, completed_at, completed_by, maintenance_request_id, has_issue')
        .eq('has_issue', true)
        .order('completed_at', { ascending: false })
        .limit(50)
      if (violRes.error) throw new Error(`فشل تحميل جدول: checklist_completions — ${violRes.error.message}`)

      setSales(salesRes.data || [])
      setWaste(wasteRes.data || [])
      setIssues((issuesRes.data || []).filter(i => !isIssueClosed(i.status)))
      setTasks(tasksRes.data || [])
      setBranchRows(branchesRes.data || [])
      setCheckTemplates(tmplRes.data || [])
      setCheckToday(checkTodayRes.data || [])
      setViolations(violRes.data || [])
    } catch (e) {
      setError(e.message || 'خطأ في تحميل البيانات')
    }
    setLoading(false)
  }

  const num = v => Number(v) || 0

  const branchName = id => {
    const b = branchRows.find(x => x.id === id)
    return b ? (isAr ? b.name_ar : (b.name_en || b.name_ar)) : '—'
  }
  const templateName = id => {
    const t = checkTemplates.find(x => x.id === id)
    return t ? (isAr ? t.item_ar : (t.item_en || t.item_ar)) : '—'
  }

  const totalSalesToday = sales.reduce((s, r) => s + num(r.amount), 0)
  const totalTargetToday = sales.reduce((s, r) => s + num(r.target), 0)
  const totalWasteToday = waste.reduce((s, r) => s + num(r.cost), 0)
  const openIssuesCount = issues.length
  const criticalAlerts = issues.filter(i => i.priority === 'عالي' || i.priority === 'عاجل').length

  // مهام اليوم غير المنجزة — done !== true
  const undoneTasks = tasks.filter(t => t.done !== true)

  const branches = (() => {
    const set = new Set(BASE_BRANCHES)
    ;[...sales, ...tasks, ...issues, ...waste].forEach(r => { if (r && r.branch) set.add(r.branch) })
    return Array.from(set)
  })()
  const branchStates = branches.map(b => {
    const bSalesRows = sales.filter(s => s.branch === b)
    const amount = bSalesRows.reduce((s, r) => s + num(r.amount), 0)
    const target = bSalesRows.reduce((s, r) => s + num(r.target), 0)
    const salesPct = target > 0 ? (amount / target * 100) : 0
    const bIssues = issues.filter(i => i.branch === b)
    const bWaste = waste.filter(w => w.branch === b).reduce((s, w) => s + num(w.cost), 0)
    const bTasks = tasks.filter(t => t.branch === b)
    const doneTasks = bTasks.filter(t => t.done === true).length
    const tasksPct = bTasks.length > 0 ? (doneTasks / bTasks.length * 100) : 0
    const { score, hasEnoughData } = calcBranchHealth({
      hasSales: bSalesRows.length > 0, salesPct, hasTasks: bTasks.length > 0, tasksPct,
      openIssues: bIssues.length, wasteCost: bWaste
    })
    return { branch: b, amount, target, salesPct: Math.round(salesPct), health: score, hasEnoughData, issues: bIssues.length, hasSales: bSalesRows.length > 0 }
  })
  const scored = branchStates.filter(b => b.hasEnoughData && b.health != null)
  const avgHealth = scored.length > 0 ? Math.round(scored.reduce((s, b) => s + b.health, 0) / scored.length) : null
  const lowestBranch = scored.length > 0 ? scored.reduce((min, b) => b.health < min.health ? b : min, scored[0]) : null

  const priorityRank = { 'عالي': 3, 'عاجل': 3, 'متوسط': 2, 'منخفض': 1 }
  const topIssues = [...issues].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)).slice(0, 5)

  // ═══ حسابات الجولات ═══
  // البند مقيّم فقط إذا is_completed === true أو has_issue === true
  const evaluatedToday = checkToday.filter(c => c.is_completed === true || c.has_issue === true)
  const tourMatched = evaluatedToday.filter(c => c.is_completed === true).length
  const tourViolations = evaluatedToday.filter(c => c.has_issue === true).length
  const tourItemsToday = tourMatched + tourViolations
  const tourPhotos = checkToday.filter(c => c.image_url).length
  const tourCompliancePct = tourItemsToday > 0 ? Math.round(tourMatched / tourItemsToday * 100) : null

  const tourBranchRanking = branchRows
    .filter(b => b.is_active !== false)
    .map(b => {
      const rows = checkToday.filter(c => c.branch_id === b.id && (c.is_completed === true || c.has_issue === true))
      const evaluated = rows.length
      const matched = rows.filter(c => c.is_completed === true).length
      const pct = evaluated > 0 ? Math.round(matched / evaluated * 100) : null
      return { id: b.id, name: isAr ? b.name_ar : (b.name_en || b.name_ar), evaluated, matched, pct }
    })
    .filter(b => b.evaluated > 0)
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101))

  const violByTemplate = (() => {
    const map = {}
    violations.forEach(v => { map[v.template_id] = (map[v.template_id] || 0) + 1 })
    return Object.entries(map)
      .map(([tid, count]) => ({ name: templateName(tid), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  })()

  const recentViolations = violations.slice(0, 5)
  const violationPhotos = violations.filter(v => v.image_url).slice(0, 6)

  const needActionItems = []
  if (criticalAlerts > 0) needActionItems.push({ icon: '🚨', text: `${criticalAlerts} ${isAr ? 'أعطال عاجلة مفتوحة' : 'urgent open issues'}`, color: 'var(--danger)' })
  if (undoneTasks.length > 0) needActionItems.push({ icon: '✅', text: `${undoneTasks.length} ${isAr ? 'مهام اليوم غير المنجزة' : "today's undone tasks"}`, color: 'var(--gold)' })
  if (tourViolations > 0) needActionItems.push({ icon: '📋', text: `${tourViolations} ${isAr ? 'مخالفة جولات اليوم' : "today's tour violations"}`, color: 'var(--danger)' })
  if (lowestBranch && lowestBranch.health != null && lowestBranch.health < 70) needActionItems.push({ icon: '❤️', text: `${isAr ? 'الفرع الأقل صحة' : 'Lowest branch'}: ${lowestBranch.branch} (${lowestBranch.health})`, color: 'var(--danger)' })

  const smartSummary = (() => {
    const lines = []
    if (tourViolations > 0) lines.push(`يوجد اليوم ${tourViolations} مخالفة جولات.`)
    if (tourBranchRanking.length > 0 && tourBranchRanking[0].pct != null) {
      const w = tourBranchRanking[0]
      lines.push(`أكثر فرع يحتاج متابعة: ${w.name} بنسبة مطابقة ${w.pct}%.`)
    }
    if (violByTemplate.length > 0) lines.push(`أكثر بند تكراراً كمخالفة: ${violByTemplate[0].name}.`)
    if (openIssuesCount > 0) lines.push(`يوصى بمتابعة ${openIssuesCount} بلاغ صيانة مفتوح.`)
    if (undoneTasks.length > 0) lines.push(`${undoneTasks.length} مهمة لم تُنجز بعد اليوم.`)
    if (lines.length === 0) lines.push('لا توجد مخالفات أو بلاغات اليوم — الوضع مستقر ✅')
    return lines
  })()

  if (loading) return <div dir={isAr ? 'rtl' : 'ltr'} style={{ textAlign: 'center', color: '#aaa', padding: 60, fontFamily: 'Tajawal' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
  if (error) return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#fce4ec', color: 'var(--danger)', borderRadius: 12, padding: 20, textAlign: 'center', fontFamily: 'Tajawal' }}>
      ⚠️ {error}
      <button onClick={fetchAll} style={{ display: 'block', margin: '12px auto 0', ...solidBtn }}>{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
    </div>
  )

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: 'Tajawal' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{isAr ? 'لوحة التشغيل' : 'Operations Dashboard'}</h2>
        <button onClick={fetchAll} style={outlineBtn}>🔄 {isAr ? 'تحديث' : 'Refresh'}</button>
      </div>
      <div style={{ color: '#999', fontSize: 12, marginBottom: 20 }}>{riyadhDisplayDate(lang)}</div>

      <div style={{ background: 'linear-gradient(135deg, #f3eefb, #fff)', borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineStart: '5px solid var(--gold)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--purple)', marginBottom: 10 }}>🧠 {isAr ? 'ملخص تشغيلي' : 'Operational Summary'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {smartSummary.map((line, i) => <div key={i} style={{ fontSize: 14, color: '#444' }}>• {line}</div>)}
        </div>
      </div>

      <div style={{ background: needActionItems.length === 0 ? '#e8f5e9' : '#fff', borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineStart: `5px solid ${needActionItems.length === 0 ? 'var(--success)' : 'var(--danger)'}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--purple)', marginBottom: needActionItems.length === 0 ? 0 : 12 }}>🚦 {isAr ? 'يحتاج تدخلك الآن' : 'Needs Your Action'}</div>
        {needActionItems.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>{isAr ? 'جميع الفروع تعمل بصورة طبيعية ✅' : 'All branches operating normally ✅'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {needActionItems.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>{it.icon}</span>
                <span style={{ fontWeight: 600, color: it.color }}>{it.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard label={`💰 ${isAr ? 'مبيعات اليوم' : "Today's Sales"}`} value={`${totalSalesToday.toLocaleString()} ${SAR}`} sub={totalTargetToday > 0 ? `${isAr ? 'الهدف' : 'Target'} ${totalTargetToday.toLocaleString()}` : (isAr ? 'لا يوجد هدف' : 'No target')} color="var(--purple)" />
        <MetricCard label={`🧾 ${isAr ? 'متوسط الفاتورة' : 'Avg Ticket'}`} value={isAr ? 'غير متاح' : 'N/A'} sub={isAr ? 'يحتاج ربط Foodics' : 'Requires Foodics'} color="#bbb" muted />
        <MetricCard label={`❤️ ${isAr ? 'صحة الفروع' : 'Branch Health'}`} value={avgHealth == null ? '—' : `${avgHealth}`} sub={healthLabel(avgHealth, lang)} color={healthColor(avgHealth)} />
        <MetricCard label={`🚨 ${isAr ? 'التنبيهات الحرجة' : 'Critical Alerts'}`} value={`${criticalAlerts}`} sub={isAr ? 'أعطال عاجلة' : 'urgent'} color={criticalAlerts > 0 ? 'var(--danger)' : 'var(--success)'} />
        <MetricCard label={`🔧 ${isAr ? 'الأعطال المفتوحة' : 'Open Issues'}`} value={`${openIssuesCount}`} sub={isAr ? 'صيانة' : 'maintenance'} color={openIssuesCount > 0 ? 'var(--gold)' : 'var(--success)'} />
        <MetricCard label={`✅ ${isAr ? 'مهام اليوم' : "Today's Tasks"}`} value={`${undoneTasks.length}`} sub={isAr ? 'غير منجزة' : 'undone'} color={undoneTasks.length > 0 ? 'var(--danger)' : 'var(--success)'} />
      </div>

      <SectionTitle>{isAr ? 'حالة الفروع' : 'Branch Status'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {branchStates.map(b => (
          <div key={b.branch} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${healthColor(b.health)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--purple)' }}>📍 {b.branch}</span>
              <span style={{ background: healthColor(b.health), color: 'white', borderRadius: 12, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>{b.health == null ? healthLabel(null, lang) : b.health}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#666' }}>
              <span>💰 {b.hasSales ? `${b.amount.toLocaleString()} ${SAR}` : (isAr ? 'لم يُدخل' : 'Not entered')}</span>
              <span>🎯 {b.target > 0 ? `${b.salesPct}%` : '—'}</span>
              <span style={{ color: b.issues > 0 ? 'var(--danger)' : '#666' }}>🔧 {b.issues} {isAr ? 'عطل' : 'issue'}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>{isAr ? 'يحتاج تدخلك الآن' : 'Top Issues'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {topIssues.length === 0 ? <EmptyState>{isAr ? 'لا توجد مشكلات عاجلة ✅' : 'No urgent issues ✅'}</EmptyState> : topIssues.map(i => (
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

      <SectionTitle>{isAr ? 'مهام اليوم غير المنجزة' : "Today's Undone Tasks"}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {undoneTasks.length === 0 ? <EmptyState>{isAr ? 'كل مهام اليوم منجزة ✅' : "All today's tasks done ✅"}</EmptyState> : undoneTasks.slice(0, 8).map(t => (
          <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderInlineEnd: `4px solid ${t.priority === 'عالي' ? 'var(--danger)' : t.priority === 'متوسط' ? 'var(--gold)' : '#ccc'}` }}>
            <span style={{ fontSize: 14, color: '#333' }}>{isAr ? t.title_ar : (t.title_en || t.title_ar)}</span>
            <span style={{ fontSize: 12, color: '#888' }}>📍 {t.branch}</span>
          </div>
        ))}
      </div>

      <SectionTitle>{isAr ? 'مؤشرات جولات اليوم' : "Today's Tour Metrics"}</SectionTitle>
      {tourItemsToday === 0 ? (
        <EmptyState>{isAr ? 'لا توجد جولات مسجلة اليوم' : 'No tours recorded today'}</EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
          <MetricCard label={`📋 ${isAr ? 'بنود مقيّمة' : 'Evaluated'}`} value={`${tourItemsToday}`} color="var(--purple)" />
          <MetricCard label={`✅ ${isAr ? 'مطابقة' : 'Matched'}`} value={`${tourMatched}`} color="var(--success)" />
          <MetricCard label={`⚠️ ${isAr ? 'مخالفات' : 'Violations'}`} value={`${tourViolations}`} color={tourViolations > 0 ? 'var(--danger)' : 'var(--success)'} />
          <MetricCard label={`📷 ${isAr ? 'صور مرفوعة' : 'Photos'}`} value={`${tourPhotos}`} color="var(--gold)" />
          <MetricCard label={`📊 ${isAr ? 'نسبة المطابقة' : 'Compliance'}`} value={tourCompliancePct == null ? '—' : `${tourCompliancePct}%`} color={tourCompliancePct == null ? '#bbb' : complianceColor(tourCompliancePct)} />
        </div>
      )}

      <SectionTitle>{isAr ? 'ترتيب الفروع حسب جولات اليوم' : 'Branch Ranking (Today)'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {tourBranchRanking.length === 0 ? <EmptyState>{isAr ? 'لا توجد جولات مقيّمة اليوم' : 'No evaluated tours today'}</EmptyState> : tourBranchRanking.map(b => (
          <div key={b.id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>📍 {b.name}</span>
              <span style={{ fontWeight: 700, color: complianceColor(b.pct ?? 0) }}>{b.pct == null ? '—' : `${b.pct}%`}</span>
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${b.pct ?? 0}%`, height: '100%', background: complianceColor(b.pct ?? 0), borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{b.matched}/{b.evaluated} {isAr ? 'بند مطابق' : 'matched'}</div>
          </div>
        ))}
      </div>

      <SectionTitle>{isAr ? 'آخر مخالفات الجولات' : 'Recent Tour Violations'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {recentViolations.length === 0 ? <EmptyState>{isAr ? 'لا توجد مخالفات ✅' : 'No violations ✅'}</EmptyState> : recentViolations.map(v => (
          <div key={v.id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: '5px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>{templateName(v.template_id)}</div>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>📍 {branchName(v.branch_id)}</span>
                  {v.notes && <span>📝 {v.notes}</span>}
                  {v.completed_at && <span>🕐 {new Date(v.completed_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                  {v.maintenance_request_id && <span style={{ color: 'var(--purple)', fontWeight: 700 }}>🔧 بلاغ صيانة</span>}
                </div>
              </div>
              {v.image_url && <img src={v.image_url} onClick={() => setModalImg(v.image_url)} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', cursor: 'pointer' }} />}
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>{isAr ? 'أكثر البنود تكراراً كمخالفة' : 'Most Frequent Violations'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {violByTemplate.length === 0 ? <EmptyState>{isAr ? 'لا توجد مخالفات متكررة ✅' : 'None ✅'}</EmptyState> : violByTemplate.map((v, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{i + 1}. {v.name}</span>
            <span style={{ background: '#fce4ec', color: 'var(--danger)', borderRadius: 12, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>{v.count} {isAr ? 'مرة' : 'x'}</span>
          </div>
        ))}
      </div>

      <SectionTitle>{isAr ? 'آخر صور المخالفات' : 'Recent Violation Photos'}</SectionTitle>
      {violationPhotos.length === 0 ? (
        <EmptyState>{isAr ? 'لا توجد صور مخالفات' : 'No violation photos'}</EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 24 }}>
          {violationPhotos.map(v => (
            <img key={v.id} src={v.image_url} onClick={() => setModalImg(v.image_url)} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 12, objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
          ))}
        </div>
      )}

      <SectionTitle>{isAr ? 'آخر بلاغات الصيانة' : 'Recent Maintenance'}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {issues.length === 0 ? <EmptyState>{isAr ? 'لا توجد بلاغات مفتوحة ✅' : 'No open requests ✅'}</EmptyState> : issues.slice(0, 5).map(i => {
          const statusColor = i.status === 'مكتمل' ? 'var(--success)' : i.status === 'قيد التنفيذ' ? 'var(--gold)' : 'var(--danger)'
          const statusLabel = i.status === 'قيد التنفيذ' ? 'جاري الإصلاح' : i.status === 'مكتمل' ? 'تم الإصلاح' : 'جديد'
          return (
            <div key={i.id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderInlineEnd: `5px solid ${statusColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>{i.title}</div>
                <span style={{ background: statusColor, color: 'white', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{statusLabel}</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>📍 {i.branch}</span>
                <span>👤 {i.created_by_name || '—'}</span>
              </div>
            </div>
          )
        })}
      </div>

      <SectionTitle>{isAr ? 'ملخص اليوم' : "Today's Summary"}</SectionTitle>
      <div style={{ background: 'linear-gradient(135deg, var(--purple), #6b4c9a)', borderRadius: 16, padding: 20, color: 'white', boxShadow: '0 4px 16px rgba(107,76,154,0.3)' }}>
        <div style={{ fontSize: 15, lineHeight: 2 }}>
          {isAr ? 'مبيعات اليوم' : "Today's sales"} <strong>{totalSalesToday.toLocaleString()} {SAR}</strong>
          {totalTargetToday > 0 && <> {isAr ? 'بنسبة تحقيق' : 'at'} <strong>{Math.round(totalSalesToday / totalTargetToday * 100)}%</strong></>}.{' '}
          {isAr ? 'صحة الفروع' : 'Health'} <strong>{avgHealth == null ? '—' : avgHealth}</strong>.{' '}
          {tourViolations > 0 && <> <strong>{tourViolations}</strong> {isAr ? 'مخالفة جولات' : 'tour violations'}.</>}
          {openIssuesCount > 0 && <> <strong>{openIssuesCount}</strong> {isAr ? 'بلاغ صيانة مفتوح' : 'open requests'}.</>}
          {totalWasteToday > 0 && <> {isAr ? 'هدر اليوم' : 'waste'} <strong>{totalWasteToday.toLocaleString()} {SAR}</strong>.</>}
        </div>
      </div>

      {modalImg && (
        <div onClick={() => setModalImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <img src={modalImg} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
          <button onClick={() => setModalImg(null)} style={{ position: 'absolute', top: 20, insetInlineEnd: 20, background: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
      )}
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
