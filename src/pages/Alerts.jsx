import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'

const BASE_BRANCHES = [
  'الناصرية',
  'النخيل',
  'الربوة',
  'المطار بلازا',
  'الخمسين'
]

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

const CLOSED_STATUSES = [
  'مكتمل',
  'مغلق',
  'تم الحل',
  'completed',
  'closed',
  'done',
  'resolved'
]

function isIssueClosed(status) {
  return CLOSED_STATUSES.includes(normalizeText(status))
}

function normalizePriority(priority) {
  const value = normalizeText(priority)

  if (
    value === 'عاجل' ||
    value === 'عالية' ||
    value === 'عالي' ||
    value === 'urgent' ||
    value === 'critical' ||
    value === 'high'
  ) {
    return 'عالي'
  }

  if (
    value === 'متوسط' ||
    value === 'متوسطة' ||
    value === 'medium'
  ) {
    return 'متوسط'
  }

  return 'منخفض'
}

function priorityColor(priority) {
  const normalized = normalizePriority(priority)

  if (normalized === 'عالي') return 'var(--danger)'
  if (normalized === 'متوسط') return '#f57c00'
  return '#999'
}

function priorityRank(priority) {
  const normalized = normalizePriority(priority)

  if (normalized === 'عالي') return 3
  if (normalized === 'متوسط') return 2
  return 1
}

function formatCreatedAt(value, lang) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(
    lang === 'ar' ? 'ar-SA' : 'en-GB',
    {
      timeZone: 'Asia/Riyadh',
      calendar: 'gregory',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date)
}

const labels = {
  ar: {
    title: '🚨 مركز التنبيهات',
    refresh: '🔄 تحديث',
    urgent: 'عاجلة / عالية',
    medium: 'متوسطة',
    openMaintenance: 'أعطال مفتوحة',
    resolvedToday: 'تم الحل اليوم',
    all: 'الكل',
    high: 'عالي',
    search: '🔍 ابحث باسم الفرع أو عنوان المشكلة',
    normal: 'جميع الفروع تعمل بصورة طبيعية ✅',
    loading: 'جاري التحميل...',
    retry: 'إعادة المحاولة',
    loadFailed: 'فشل تحميل جدول',
    maintenance: '🔧 عطل',
    task: '✅ مهمة',
    newStatus: 'جديد',
    undone: 'غير منجزة',
    noTitle: 'بدون عنوان'
  },

  en: {
    title: '🚨 Alerts Center',
    refresh: '🔄 Refresh',
    urgent: 'Urgent / High',
    medium: 'Medium',
    openMaintenance: 'Open Maintenance',
    resolvedToday: 'Resolved Today',
    all: 'All',
    high: 'High',
    search: '🔍 Search by branch or issue title',
    normal: 'All branches are operating normally ✅',
    loading: 'Loading...',
    retry: 'Retry',
    loadFailed: 'Failed to load table',
    maintenance: '🔧 Issue',
    task: '✅ Task',
    newStatus: 'New',
    undone: 'Not completed',
    noTitle: 'No title'
  }
}

export default function Alerts({ user, lang }) {
  const tr = labels[lang] || labels.ar
  const today = riyadhToday()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [issues, setIssues] = useState([])
  const [taskAlerts, setTaskAlerts] = useState([])
  const [resolvedToday, setResolvedToday] = useState(0)

  const [priorityFilter, setPriorityFilter] = useState('الكل')
  const [branchFilter, setBranchFilter] = useState('الكل')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    try {
      const issuesResult = await supabase
        .from('maintenance_requests')
        .select(
          'id, title, branch, priority, status, created_by_name, created_at, resolved_at'
        )

      if (issuesResult.error) {
        throw new Error(
          `${tr.loadFailed}: maintenance_requests — ${issuesResult.error.message}`
        )
      }

      const allIssues = issuesResult.data || []

      const openIssues = allIssues.filter(
        issue => !isIssueClosed(issue.status)
      )

      const resolvedCount = allIssues.filter(issue => {
        if (!issue.resolved_at) return false
        return String(issue.resolved_at).slice(0, 10) === today
      }).length

      /*
        قاعدة tasks الحقيقية:
        - date: تاريخ المهمة
        - done: هل تم إنجازها
        - branch: الفرع
        - priority: الأولوية
        - title_ar / title_en: عنوان المهمة
      */
      const tasksResult = await supabase
        .from('tasks')
        .select(
          'id, title, title_ar, title_en, branch, priority, status, done, date'
        )
        .eq('date', today)
        .eq('done', false)

      if (tasksResult.error) {
        throw new Error(
          `${tr.loadFailed}: tasks — ${tasksResult.error.message}`
        )
      }

      const importantUndoneTasks = (tasksResult.data || []).filter(task => {
        const priority = normalizePriority(task.priority)
        return priority === 'عالي' || priority === 'متوسط'
      })

      setIssues(openIssues)
      setTaskAlerts(importantUndoneTasks)
      setResolvedToday(resolvedCount)
    } catch (fetchError) {
      setError(fetchError.message || 'خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const allAlerts = useMemo(() => {
    const maintenanceAlerts = issues.map(issue => ({
      key: `issue-${issue.id}`,
      type: 'maintenance',
      title: issue.title || tr.noTitle,
      branch: issue.branch || '—',
      priority: normalizePriority(issue.priority),
      recordedBy: issue.created_by_name || '—',
      status: issue.status || tr.newStatus,
      createdAt: issue.created_at
    }))

    const tasksAlerts = taskAlerts.map(task => ({
      key: `task-${task.id}`,
      type: 'task',
      title:
        lang === 'ar'
          ? task.title_ar || task.title || task.title_en || tr.noTitle
          : task.title_en || task.title || task.title_ar || tr.noTitle,
      branch: task.branch || '—',
      priority: normalizePriority(task.priority),
      recordedBy: '—',
      status: tr.undone,
      createdAt: null
    }))

    return [...maintenanceAlerts, ...tasksAlerts].sort(
      (a, b) => priorityRank(b.priority) - priorityRank(a.priority)
    )
  }, [issues, taskAlerts, lang, tr.noTitle, tr.newStatus, tr.undone])

  const availableBranches = useMemo(() => {
    const branchSet = new Set(BASE_BRANCHES)

    allAlerts.forEach(alert => {
      if (alert.branch && alert.branch !== '—') {
        branchSet.add(alert.branch)
      }
    })

    return ['الكل', ...Array.from(branchSet)]
  }, [allAlerts])

  const filteredAlerts = useMemo(() => {
    const searchValue = normalizeText(search)

    return allAlerts.filter(alert => {
      if (
        priorityFilter !== 'الكل' &&
        alert.priority !== priorityFilter
      ) {
        return false
      }

      if (
        branchFilter !== 'الكل' &&
        alert.branch !== branchFilter
      ) {
        return false
      }

      if (searchValue) {
        const searchableText = normalizeText(
          `${alert.title} ${alert.branch}`
        )

        if (!searchableText.includes(searchValue)) {
          return false
        }
      }

      return true
    })
  }, [allAlerts, priorityFilter, branchFilter, search])

  const urgentCount = allAlerts.filter(
    alert => alert.priority === 'عالي'
  ).length

  const mediumCount = allAlerts.filter(
    alert => alert.priority === 'متوسط'
  ).length

  const openMaintenanceCount = issues.length

  if (loading) {
    return (
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={{
          textAlign: 'center',
          color: '#aaa',
          padding: 60,
          fontFamily: 'Tajawal'
        }}
      >
        {tr.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={{
          background: '#fce4ec',
          color: 'var(--danger)',
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
          fontFamily: 'Tajawal'
        }}
      >
        ⚠️ {error}

        <button
          onClick={fetchAll}
          style={{
            display: 'block',
            margin: '12px auto 0',
            ...solidButton
          }}
        >
          {tr.retry}
        </button>
      </div>
    )
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Tajawal' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16
        }}
      >
        <h2
          style={{
            color: 'var(--purple)',
            fontSize: 22,
            margin: 0
          }}
        >
          {tr.title}
        </h2>

        <button onClick={fetchAll} style={outlineButton}>
          {tr.refresh}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 20
        }}
      >
        <SummaryCard
          label={tr.urgent}
          value={urgentCount}
          color="var(--danger)"
        />

        <SummaryCard
          label={tr.medium}
          value={mediumCount}
          color="#f57c00"
        />

        <SummaryCard
          label={tr.openMaintenance}
          value={openMaintenanceCount}
          color="var(--gold)"
        />

        <SummaryCard
          label={tr.resolvedToday}
          value={resolvedToday}
          color="var(--success)"
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 10,
          overflowX: 'auto',
          paddingBottom: 2
        }}
      >
        {[
          { value: 'الكل', label: tr.all },
          { value: 'عالي', label: tr.high },
          { value: 'متوسط', label: tr.medium }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setPriorityFilter(option.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontFamily: 'Tajawal',
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background:
                priorityFilter === option.value
                  ? 'var(--purple)'
                  : 'white',
              color:
                priorityFilter === option.value
                  ? 'white'
                  : 'var(--purple)',
              border: '1px solid var(--purple)',
              fontWeight:
                priorityFilter === option.value ? 700 : 400
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 10,
          overflowX: 'auto',
          paddingBottom: 2
        }}
      >
        {availableBranches.map(branch => (
          <button
            key={branch}
            onClick={() => setBranchFilter(branch)}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              fontFamily: 'Tajawal',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background:
                branchFilter === branch
                  ? 'var(--gold)'
                  : 'white',
              color:
                branchFilter === branch
                  ? 'white'
                  : 'var(--gold)',
              border: '1px solid var(--gold)'
            }}
          >
            {branch === 'الكل' ? tr.all : branch}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder={tr.search}
        value={search}
        onChange={event => setSearch(event.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          marginBottom: 16,
          border: '1px solid #ddd',
          borderRadius: 10,
          fontFamily: 'Tajawal',
          fontSize: 14,
          textAlign: lang === 'ar' ? 'right' : 'left',
          boxSizing: 'border-box'
        }}
      />

      {filteredAlerts.length === 0 ? (
        <div
          style={{
            background: '#e8f5e9',
            borderRadius: 14,
            padding: 40,
            textAlign: 'center',
            color: 'var(--success)',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {tr.normal}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {filteredAlerts.map(alert => {
            const displayedDate = formatCreatedAt(
              alert.createdAt,
              lang
            )

            return (
              <div
                key={alert.key}
                style={{
                  background: 'white',
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderInlineStart: `5px solid ${priorityColor(
                    alert.priority
                  )}`
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 7
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#333',
                      lineHeight: 1.7
                    }}
                  >
                    {alert.title}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      background:
                        alert.type === 'maintenance'
                          ? '#f3eefb'
                          : '#fff8e1',
                      color:
                        alert.type === 'maintenance'
                          ? 'var(--purple)'
                          : '#f57c00',
                      borderRadius: 10,
                      padding: '3px 9px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {alert.type === 'maintenance'
                      ? tr.maintenance
                      : tr.task}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: '#888',
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}
                >
                  <span>📍 {alert.branch}</span>

                  <span
                    style={{
                      color: priorityColor(alert.priority),
                      fontWeight: 700
                    }}
                  >
                    ● {alert.priority}
                  </span>

                  <span>🏷️ {alert.status}</span>

                  {alert.recordedBy !== '—' && (
                    <span>👤 {alert.recordedBy}</span>
                  )}

                  {displayedDate && (
                    <span>🕐 {displayedDate}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#999',
          marginTop: 4
        }}
      >
        {label}
      </div>
    </div>
  )
}

const solidButton = {
  padding: '8px 20px',
  borderRadius: 20,
  background: 'var(--purple)',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Tajawal',
  fontSize: 13
}

const outlineButton = {
  padding: '6px 16px',
  borderRadius: 20,
  background: 'white',
  color: 'var(--purple)',
  border: '1px solid var(--purple)',
  cursor: 'pointer',
  fontFamily: 'Tajawal',
  fontSize: 13
}
