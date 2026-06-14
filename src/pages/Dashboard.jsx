import React, { useState } from 'react'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

const mockData = {
  'الناصرية': { sales: 18500, target: 20000, staff: 9, issues: 1 },
  'النخيل': { sales: 12300, target: 18000, staff: 7, issues: 3 },
  'الربوة': { sales: 15800, target: 16000, staff: 8, issues: 0 },
  'الفرع الرابع': { sales: 14200, target: 15000, staff: 8, issues: 2 },
  'الفرع الخامس': { sales: 13100, target: 14000, staff: 8, issues: 1 },
}

export default function Dashboard({ user }) {
  const [period, setPeriod] = useState('يومي')
  const periods = ['يومي', 'أسبوعي', 'شهري', 'دوري']
  const myBranches = user.role === 'owner' ? branches : [user.branch]

  const totalSales = myBranches.reduce((s, b) => s + mockData[b].sales, 0)
  const totalTarget = myBranches.reduce((s, b) => s + mockData[b].target, 0)
  const totalIssues = myBranches.reduce((s, b) => s + mockData[b].issues, 0)

  return (
    <div>
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
        <KPICard title="إجمالي المبيعات" value={`${totalSales.toLocaleString()} ر.س`} color="var(--purple)" />
        <KPICard title="نسبة تحقيق الهدف" value={`${Math.round(totalSales/totalTarget*100)}%`} color="var(--gold)" />
        <KPICard title="مشاكل مفتوحة" value={totalIssues} color={totalIssues > 0 ? 'var(--danger)' : 'var(--success)'} />
      </div>

      {/* Branch Cards */}
      <h3 style={{ color: 'var(--purple)', marginBottom: 16, fontSize: 18 }}>أداء الفروع — {period}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {myBranches.map(b => {
          const d = mockData[b]
          const pct = Math.round(d.sales / d.target * 100)
          return (
            <div key={b} style={{
              background: 'white', borderRadius: 12, padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 16 }}>{b}</span>
                <span style={{
                  background: pct >= 90 ? '#e8f5e9' : pct >= 70 ? '#fff8e1' : '#fce4ec',
                  color: pct >= 90 ? 'var(--success)' : pct >= 70 ? '#f57c00' : 'var(--danger)',
                  padding: '2px 10px', borderRadius: 12, fontSize: 13
                }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                المبيعات: <strong>{d.sales.toLocaleString()}</strong> / الهدف: {d.target.toLocaleString()} ر.س
              </div>
              <div style={{ background: '#f0f0f0', borderRadius: 8, height: 8, marginBottom: 12 }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  background: pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--gold)' : 'var(--danger)',
                  borderRadius: 8, transition: 'width 0.5s'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
                <span>👥 {d.staff} موظف</span>
                <span style={{ color: d.issues > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {d.issues > 0 ? `⚠️ ${d.issues} مشكلة` : '✅ لا مشاكل'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KPICard({ title, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center'
    }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
