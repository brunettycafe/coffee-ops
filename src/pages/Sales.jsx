import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const todayISO = new Date().toISOString().split('T')[0]

export default function Sales({ user, lang }) {
  const tr = t[lang]
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [form, setForm] = useState({})
  const [editMode, setEditMode] = useState(false)
  const isOwner = user.role === 'owner'
  const myBranches = isOwner ? branches : [user.branch]

  useEffect(() => { fetchSales() }, [selectedDate])

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase.from('sales').select('*').eq('date', selectedDate)
    setSalesData(data || [])
    const f = {}
    myBranches.forEach(b => { const row = (data || []).find(s => s.branch === b); f[b] = { amount: row?.amount || '', target: row?.target || '' } })
    setForm(f)
    setLoading(false)
  }

  async function saveSales() {
    setSaving(true)
    for (const branch of myBranches) {
      const amount = parseFloat(form[branch]?.amount) || 0
      const target = parseFloat(form[branch]?.target) || 0
      const existing = salesData.find(s => s.branch === branch)
      if (existing) { await supabase.from('sales').update({ amount, target }).eq('id', existing.id) }
      else { await supabase.from('sales').insert([{ date: selectedDate, branch, amount, target }]) }
    }
    setSaving(false); setEditMode(false); fetchSales()
  }

  const totalSales = salesData.filter(s => myBranches.includes(s.branch)).reduce((sum, s) => sum + (s.amount || 0), 0)
  const totalTarget = salesData.filter(s => myBranches.includes(s.branch)).reduce((sum, s) => sum + (s.target || 0), 0)
  const pctTotal = totalTarget > 0 ? Math.round(totalSales / totalTarget * 100) : 0
  const SAR = lang === 'ar' ? 'ر.س' : 'SAR'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{tr.salesTitle}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'Tajawal', fontSize: 13 }} />
          {isOwner && !editMode && <button onClick={() => setEditMode(true)} style={solidBtn}>{tr.edit}</button>}
          {editMode && (<><button onClick={saveSales} disabled={saving} style={solidBtn}>{saving ? tr.saving : tr.save}</button><button onClick={() => { setEditMode(false); fetchSales() }} style={outlineBtn}>{tr.cancel}</button></>)}
        </div>
      </div>
      {totalSales > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <KPI label={tr.totalSales} value={`${totalSales.toLocaleString()} ${SAR}`} color="var(--purple)" />
          <KPI label={tr.totalTarget} value={`${totalTarget.toLocaleString()} ${SAR}`} color="var(--gold)" />
          <KPI label={tr.achieveRate} value={totalTarget > 0 ? `${pctTotal}%` : '—'} color={pctTotal >= 90 ? 'var(--success)' : pctTotal >= 70 ? 'var(--gold)' : 'var(--danger)'} />
        </div>
      )}
      {loading ? <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>{tr.loading}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myBranches.map(branch => {
            const row = salesData.find(s => s.branch === branch)
            const amount = row?.amount || 0; const target = row?.target || 0; const pct = target > 0 ? Math.round(amount / target * 100) : 0
            return (
              <div key={branch} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRight: `4px solid ${pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--gold)' : amount > 0 ? 'var(--danger)' : '#ddd'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 16 }}>📍 {branch}</span>
                  {target > 0 && <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: pct >= 90 ? '#e8f5e9' : pct >= 70 ? '#fff8e1' : '#fce4ec', color: pct >= 90 ? 'var(--success)' : pct >= 70 ? '#f57c00' : 'var(--danger)' }}>{pct}%</span>}
                </div>
                {editMode ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{tr.actualSales}</div>
                      <input type="number" value={form[branch]?.amount || ''} onChange={e => setForm(f => ({ ...f, [branch]: { ...f[branch], amount: e.target.value } }))} placeholder="0" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{tr.targetSAR}</div>
                      <input type="number" value={form[branch]?.target || ''} onChange={e => setForm(f => ({ ...f, [branch]: { ...f[branch], target: e.target.value } }))} placeholder="0" style={inputStyle} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, color: '#444', marginBottom: 8 }}>
                      {amount > 0 ? <>{lang === 'ar' ? 'المبيعات' : 'Sales'}: <strong style={{ color: 'var(--purple)' }}>{amount.toLocaleString()}</strong> {SAR}{target > 0 ? ` / ${tr.target}: ${target.toLocaleString()} ${SAR}` : ''}</> : <span style={{ color: '#bbb' }}>{tr.notEntered}</span>}
                    </div>
                    {target > 0 && <div style={{ background: '#f0f0f0', borderRadius: 8, height: 8 }}><div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 8, background: pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--gold)' : 'var(--danger)', transition: 'width 0.5s' }} /></div>}
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

function KPI({ label, value, color }) {
  return <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}><div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div></div>
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }
