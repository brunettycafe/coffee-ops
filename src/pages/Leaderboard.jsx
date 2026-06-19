import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const periods = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const medals = ['🥇', '🥈', '🥉']
const periodKey = periods[new Date().getMonth()] + ' ' + new Date().getFullYear()

function getDateRange(type) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (type === 'daily') return { from: today, to: today }
  if (type === 'weekly') { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: d.toISOString().split('T')[0], to: today } }
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: d.toISOString().split('T')[0], to: today }
}

export default function Leaderboard({ lang }) {
  const tr = t[lang]
  const [tab, setTab] = useState('daily')
  const [staffRanking, setStaffRanking] = useState([])
  const [branchRanking, setBranchRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchStaffRanking(), fetchBranchRanking()])
    setLoading(false)
  }

  async function fetchStaffRanking() {
    const { data: metrics } = await supabase.from('kpi_metrics').select('*').eq('active', true)
    const { data: reviews } = await supabase.from('kpi_reviews').select('*').eq('period', periodKey)
    const { data: staff } = await supabase.from('staff').select('*')
    if (!metrics || !reviews || !staff) return
    const totalWeight = metrics.reduce((s, m) => s + m.weight, 0)
    const ranked = staff.map(s => {
      const sr = reviews.filter(r => r.staff_id === s.id)
      if (sr.length === 0) return null
      const score = Math.round(metrics.reduce((sum, m) => { const r = sr.find(r => r.metric_id === m.id); return sum + (r ? r.score * m.weight : 0) }, 0) / (totalWeight || 1))
      return { ...s, score }
    }).filter(Boolean).sort((a, b) => b.score - a.score)
    setStaffRanking(ranked)
  }

  async function fetchBranchRanking() {
    const { from, to } = getDateRange(tab)
    const { data } = await supabase.from('sales').select('*').gte('date', from).lte('date', to)
    if (!data) return
    const totals = branches.map(b => ({ name: b, total: data.filter(s => s.branch === b).reduce((sum, s) => sum + (s.amount || 0), 0) })).filter(b => b.total > 0).sort((a, b) => b.total - a.total)
    setBranchRanking(totals)
  }

  const tabLabel = { daily: lang === 'ar' ? 'يومي' : 'Daily', weekly: lang === 'ar' ? 'أسبوعي' : 'Weekly', monthly: lang === 'ar' ? 'شهري' : 'Monthly' }
  const SAR = lang === 'ar' ? 'ر.س' : 'SAR'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>🏆 {lang === 'ar' ? 'لوحة التحفيز' : 'Leaderboard'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setTab(p)} style={{ padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13, background: tab === p ? 'var(--purple)' : 'white', color: tab === p ? 'white' : 'var(--purple)', border: '1px solid var(--purple)' }}>{tabLabel[p]}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>{tr.loading}</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <h3 style={{ color: 'var(--purple)', marginBottom: 16, fontSize: 16 }}>⭐ {lang === 'ar' ? 'أفضل الموظفين (هذا الشهر)' : 'Top Staff (This Month)'}</h3>
              {staffRanking.length === 0 ? <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{lang === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staffRanking.slice(0, 5).map((s, i) => (
                    <div key={s.id} style={{ background: i === 0 ? 'linear-gradient(135deg, #f5f0ff, #ede0ff)' : 'white', borderRadius: 12, padding: '14px 16px', boxShadow: i === 0 ? '0 4px 16px rgba(108,43,217,0.15)' : '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: i === 0 ? '2px solid var(--purple)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: i < 3 ? 24 : 16, minWidth: 32, textAlign: 'center' }}>{i < 3 ? medals[i] : '#' + (i + 1)}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: i === 0 ? 'var(--purple)' : '#333' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{s.role}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 20, color: s.score >= 80 ? 'var(--success)' : s.score >= 60 ? 'var(--gold)' : 'var(--danger)' }}>{s.score}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ color: 'var(--purple)', marginBottom: 16, fontSize: 16 }}>📍 {lang === 'ar' ? `أفضل الفروع (${tabLabel[tab]})` : `Top Branches (${tabLabel[tab]})`}</h3>
              {branchRanking.length === 0 ? <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{lang === 'ar' ? 'لا توجد مبيعات بعد' : 'No sales yet'}</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {branchRanking.map((b, i) => (
                    <div key={b.name} style={{ background: i === 0 ? 'linear-gradient(135deg, #fffbf0, #fff3cc)' : 'white', borderRadius: 12, padding: '14px 16px', boxShadow: i === 0 ? '0 4px 16px rgba(212,175,55,0.2)' : '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: i === 0 ? '2px solid var(--gold)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: i < 3 ? 24 : 16, minWidth: 32, textAlign: 'center' }}>{i < 3 ? medals[i] : '#' + (i + 1)}</span>
                        <div style={{ fontWeight: 700, fontSize: 15, color: i === 0 ? '#b8860b' : '#333' }}>{b.name}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: i === 0 ? 'var(--gold)' : 'var(--purple)' }}>{b.total.toLocaleString()} {SAR}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(staffRanking.length > 0 || branchRanking.length > 0) && (
            <div style={{ background: 'linear-gradient(135deg, var(--purple), #9b59b6)', borderRadius: 16, padding: 24, color: 'white', textAlign: 'center', boxShadow: '0 8px 32px rgba(108,43,217,0.3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{lang === 'ar' ? 'نجوم الفترة' : 'Stars of the Period'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
                {staffRanking[0] && (
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>⭐ {lang === 'ar' ? 'أفضل موظف هذا الشهر' : 'Best Staff This Month'}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{staffRanking[0].name}</div>
                    <div style={{ fontSize: 15, color: 'var(--gold)', marginTop: 4 }}>{staffRanking[0].score}%</div>
                  </div>
                )}
                {staffRanking[0] && branchRanking[0] && <div style={{ width: 1, background: 'rgba(255,255,255,0.3)', margin: '0 8px' }} />}
                {branchRanking[0] && (
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>📍 {lang === 'ar' ? `أفضل فرع (${tabLabel[tab]})` : `Top Branch (${tabLabel[tab]})`}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{branchRanking[0].name}</div>
                    <div style={{ fontSize: 15, color: 'var(--gold)', marginTop: 4 }}>{branchRanking[0].total.toLocaleString()} {SAR}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
