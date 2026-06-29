import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

function getDateRange(days) {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default function TasksCompliance({ lang }) {
  const tr = t[lang]
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)
  const [selectedBranch, setSelectedBranch] = useState('الكل')
  const [expandedUser, setExpandedUser] = useState(null)

  const branches = ['الكل', 'الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']

  useEffect(() => { fetchAll() }, [period])

  async function fetchAll() {
    setLoading(true)
    const dates = getDateRange(period)
    const from = dates[0]
    const to = dates[dates.length - 1]

    const [{ data: usersData }, { data: tasksData }, { data: completionsData }] = await Promise.all([
      supabase.from('users').select('id, name, name_en, role, branch').eq('approved', true).neq('role', 'owner'),
      supabase.from('tasks').select('id, branch, date, roles, title_ar').gte('date', from).lte('date', to),
      supabase.from('task_completions').select('task_id, user_id, completed_at').gte('completed_at', `${from}T00:00:00`).lte('completed_at', `${to}T23:59:59`)
    ])

    setUsers(usersData || [])
    setTasks(tasksData || [])
    setCompletions(completionsData || [])
    setLoading(false)
  }

  function getUserStats(user) {
    const userTasks = tasks.filter(t => {
      if (t.branch !== user.branch && user.branch !== 'all') return false
      if (t.roles && t.roles.length > 0 && !t.roles.includes(user.role)) return false
      return true
    })

    const total = userTasks.length
    const userCompletions = completions.filter(c => c.user_id === user.id)
    const completedTaskIds = new Set(userCompletions.map(c => c.task_id))
    const done = userTasks.filter(t => completedTaskIds.has(t.id)).length
    const pct = total > 0 ? Math.round(done / total * 100) : null

    const doneDates = [...new Set(userCompletions.map(c => c.completed_at?.split('T')[0]))]
    const totalDates = [...new Set(userTasks.map(t => t.date))]
    const consistency = totalDates.length > 0 ? Math.round(doneDates.length / totalDates.length * 100) : null

    const dailyDetails = totalDates.sort().map(date => {
      const dayTasks = userTasks.filter(t => t.date === date)
      const dayDone = dayTasks.filter(t => completedTaskIds.has(t.id)).length
      return { date, total: dayTasks.length, done: dayDone, pct: dayTasks.length > 0 ? Math.round(dayDone / dayTasks.length * 100) : 0 }
    })

    return { total, done, pct, consistency, activeDays: doneDates.length, totalDays: totalDates.length, dailyDetails }
  }

  const filteredUsers = users.filter(u => selectedBranch === 'الكل' || u.branch === selectedBranch)
  const roleIcon = (r) => ({ 'مدير فرع': '🏪', 'مدير شفت': '⏱️', 'باريستا': '☕', 'كاشير': '💳', 'سايق': '🚗', 'مدير تشغيل': '🔑' }[r] || '👤')

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 20 }}>📋 {lang === 'ar' ? 'التزام الموظفين بالمهام' : 'Staff Task Compliance'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12, background: period === d ? 'var(--purple)' : 'white', color: period === d ? 'white' : 'var(--purple)' }}>
              {lang === 'ar' ? (d === 1 ? 'اليوم' : d === 7 ? '7 أيام' : '30 يوم') : (d === 1 ? 'Today' : d === 7 ? '7 Days' : '30 Days')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {branches.map(b => (
          <button key={b} onClick={() => setSelectedBranch(b)} style={{ padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer', background: selectedBranch === b ? 'var(--gold)' : 'white', color: selectedBranch === b ? 'white' : 'var(--gold)', border: '1px solid var(--gold)' }}>{b}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>{tr.loading}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredUsers.length === 0 ? <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>{lang === 'ar' ? 'لا يوجد موظفون' : 'No staff'}</div> :
            filteredUsers
              .map(u => ({ ...u, stats: getUserStats(u) }))
              .sort((a, b) => (b.stats.pct || -1) - (a.stats.pct || -1))
              .map(u => {
                const { total, done, pct, consistency, activeDays, totalDays, dailyDetails } = u.stats
                const color = pct === null ? '#ddd' : pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--gold)' : 'var(--danger)'
                const isExpanded = expandedUser === u.id
                return (
                  <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRight: `4px solid ${color}` }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: total > 0 ? 10 : 0, cursor: 'pointer' }}
                      onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>{roleIcon(u.role)} {u.name} {u.name_en ? `/ ${u.name_en}` : ''}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>📍 {u.branch} • {u.role}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color }}>{pct !== null ? `${pct}%` : '—'}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{lang === 'ar' ? 'إنجاز' : 'Done'}</div>
                        </div>
                        <div style={{ fontSize: 18, color: '#ccc' }}>{isExpanded ? '▲' : '▼'}</div>
                      </div>
                    </div>

                    {total > 0 && (
                      <>
                        <div style={{ background: '#f0f0f0', borderRadius: 8, height: 6, marginBottom: 8 }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
                          <span>✅ {done}/{total} {lang === 'ar' ? 'مهمة' : 'tasks'}</span>
                          <span>📅 {lang === 'ar' ? `نشط ${activeDays}/${totalDays} يوم` : `Active ${activeDays}/${totalDays} days`}</span>
                          {consistency !== null && <span style={{ color: consistency >= 80 ? 'var(--success)' : consistency >= 50 ? 'var(--gold)' : 'var(--danger)' }}>🔥 {consistency}% {lang === 'ar' ? 'انتظام' : 'consistency'}</span>}
                        </div>
                      </>
                    )}

                    {isExpanded && dailyDetails.length > 0 && (
                      <div style={{ marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{lang === 'ar' ? 'تفاصيل يومية:' : 'Daily breakdown:'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {dailyDetails.map(day => {
                            const dc = day.pct >= 80 ? 'var(--success)' : day.pct >= 50 ? 'var(--gold)' : 'var(--danger)'
                            return (
                              <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 12, color: '#666', minWidth: 90 }}>{formatDate(day.date)}</div>
                                <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 6, height: 8 }}>
                                  <div style={{ width: `${day.pct}%`, height: '100%', background: dc, borderRadius: 6 }} />
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: dc, minWidth: 55, textAlign: 'left' }}>{day.done}/{day.total} ({day.pct}%)</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {total === 0 && <div style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>{lang === 'ar' ? 'لا توجد مهام مسجلة لهذه الفترة' : 'No tasks recorded for this period'}</div>}
                  </div>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
