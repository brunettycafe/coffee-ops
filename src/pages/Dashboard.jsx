import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

function getDateRange(period) {
  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]
  if (period === 'يومي') return { from: todayISO, to: todayISO }
  if (period === 'أسبوعي') {
    const d = new Date(now); d.setDate(d.getDate() - 6)
    return { from: d.toISOString().split('T')[0], to: todayISO }
  }
  if (period === 'شهري') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: d.toISOString().split('T')[0], to: todayISO }
  }
  return { from: todayISO, to: todayISO }
}

export default function Dashboard({ user }) {
  const [period, setPeriod] = useState('يومي')
  const [salesData, setSalesData] = useState([])
  const [tasksData, setTasksData] = useState({ done: 0, total: 0 })
  const [wasteData, setWasteData] = useState(0)
  const [loading, setLoading] = useState(true)

  const periods = ['يومي', 'أسبوعي', 'شهري']
  const myBranches = user.role === 'owner' ? branches : [user.branch]
  const { from, to } = getDateRange(period)

  useEffect(() => { fetchAll() }, [period])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchSales(), fetchTasks(), fetchWaste()])
    setLoading(false)
  }

  async function fetchSales() {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .gte('date', from)
      .lte('date', to)
    setSalesData(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('done')
      .gte('date', from)
      .lte('date', to)
    const all = data || []
    setTasksData({ done: all.filter(t => t.done).length, total: all.length })
  }

  async function fetchWaste() {
    const { data } = await supabase
      .from('waste_logs')
      .select('cost')
      .gte('date', from)
      .lte('date', to)
    const total = (data || []).reduce((s, r) => s + (r.cost || 0), 0)
    setWasteData(total)
  }

  // حساب مبيعات كل فرع
  function getBranchSales(branch) {
    return salesData.filter(s => s.branch === branch).reduce((sum, s) => sum + (s.amount || 0), 0)
  }

  function getBranchTarget(branch) {
    const row = salesData.find(s => s.branch === branch && s.target)
    return row?.target || 0
  }

  const totalSales = myBranches.reduce((s, b) => s + getBranchSales(b), 0)
  const totalTarget = myBranches.reduce((s, b) => s + getBranchTarget(b), 0)
  const achievePct = totalTarget > 0 ? Math.round(totalSales / totalTarget * 100) : 0

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>جاري التحميل...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>لوحة المتابعة</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 16px', borderRadius: 20,
              background: period === p ? 'var(--purple)' : 'white',
              color: period === p ? 'white' : 'var(--purple)',
              border: '1px solid var(--purple)', cursor: 'pointer',
              fontFamily: 'Tajawal', fontSize: 13
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          title="إجمالي المبيعات"
          value={totalSales > 0 ? `${totalSales.toLocaleString()} ر.س` : '—'}
          sub={totalTarget > 0 ? `الهدف: ${totalTarget.toLocaleString()} ر.س` : null}
          color="var(--purple)"
        />
        <KPICard
          title="نسبة تحقيق الهدف"
          value={totalTarget > 0 ? `${achievePct}%` : '—'}
          sub={totalTarget > 0 ? (achievePct >= 90 ? '🟢 ممتاز' : achievePct >= 70 ? '🟡 جيد' : '🔴 دون الهدف') : 'لا يوجد هدف مسجل'}
          color={achievePct >= 90 ? 'var(--success)' : achievePct >= 70 ? 'var(--gold)' : 'var(--danger)'}
        />
        <KPICard
          title="إنجاز المهام"
          value={tasksData.total > 0 ? `${tasksData.done}/${tasksData.total}` : '—'}
          sub={tasksData.total > 0 ? `${Math.round(tasksData.done / tasksData.total * 100)}% مكتملة` : 'لا توجد مهام'}
          color="var(--gold)"
        />
      </div>

      {/* Waste KPI */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: '#666' }}>🗑️ إجمالي الهدر ({period})</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: wasteData > 0 ? 'var(--danger)' : 'var(--success)' }}>
          {wasteData > 0 ? `${wasteData.toLocaleString()} ر.س` : 'لا يوجد هدر مسجل'}
        </span>
      </div>

      {/* Branch Performance */}
      <h3 style={{ color: 'var(--purple)', marginBottom: 16, fontSize: 18 }}>أداء الفروع — {period}</h3>

      {totalSales === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40, background: 'white', borderRadius: 12 }}>
          لا توجد مبيعات مسجلة لهذه الفترة
          <div style={{ fontSize: 12, marginTop: 8 }}>أضف مبيعات من صفحة المبيعات</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {myBranches.map(b => {
            const sales = getBranchSales(b)
            const target = getBranchTarget(b)
            const pct = target > 0 ? Math.round(sales / target * 100) : 0
            return (
              <div key={b} style={{
                background: 'white', borderRadius: 12, padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 16 }}>{b}</span>
                  {target > 0 && (
                    <span style={{
                      background: pct >= 90 ? '#e8f5e9' : pct >= 70 ? '#fff8e1' : '#fce4ec',
                      color: pct >= 90 ? 'var(--success)' : pct >= 70 ? '#f57c00' : 'var(--danger)',
                      padding: '2px 10px', borderRadius: 12, fontSize: 13
                    }}>{pct}%</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  {sales > 0
                    ? <>المبيعات: <strong>{sales.toLocaleString()}</strong> ر.س{target > 0 ? ` / الهدف: ${target.toLocaleString()}` : ''}</>
                    : <span style={{ color: '#bbb' }}>لا توجد مبيعات</span>
                  }
                </div>
                {target > 0 && (
                  <div style={{ background: '#f0f0f0', borderRadius: 8, height: 8 }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`, height: '100%',
                      background: pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--gold)' : 'var(--danger)',
                      borderRadius: 8, transition: 'width 0.5s'
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KPICard({ title, value, sub, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center'
    }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa' }}>{sub}</div>}
    </div>
  )
}
