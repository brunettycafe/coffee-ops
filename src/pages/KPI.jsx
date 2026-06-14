import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const periods = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const currentPeriod = periods[new Date().getMonth()] + ' ' + new Date().getFullYear()

export default function KPI({ user }) {
  const [view, setView] = useState('reviews')
  const [metrics, setMetrics] = useState([])
  const [staff, setStaff] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState(false)
  const [showMetricForm, setShowMetricForm] = useState(false)
  const [editMetric, setEditMetric] = useState(null)
  const [metricForm, setMetricForm] = useState({ name: '', weight: 10 })

  const isOwner = user.role === 'owner'

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (selectedStaff) fetchReviews() }, [selectedPeriod, selectedStaff])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchMetrics(), fetchStaff(), fetchReviews()])
    setLoading(false)
  }

  async function fetchMetrics() {
    const { data } = await supabase.from('kpi_metrics').select('*').eq('active', true).order('created_at')
    setMetrics(data || [])
  }

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').order('name')
    setStaff(data || [])
  }

  async function fetchReviews() {
    const { data } = await supabase.from('kpi_reviews').select('*').eq('period', selectedPeriod)
    setReviews(data || [])
  }

  async function saveMetric() {
    if (!metricForm.name) return
    if (editMetric) {
      await supabase.from('kpi_metrics').update({ name: metricForm.name, weight: parseFloat(metricForm.weight) }).eq('id', editMetric.id)
    } else {
      await supabase.from('kpi_metrics').insert([{ name: metricForm.name, weight: parseFloat(metricForm.weight) }])
    }
    setMetricForm({ name: '', weight: 10 })
    setEditMetric(null)
    setShowMetricForm(false)
    fetchMetrics()
  }

  async function deleteMetric(id) {
    if (!window.confirm('حذف هذا البند؟')) return
    await supabase.from('kpi_metrics').update({ active: false }).eq('id', id)
    fetchMetrics()
  }

  async function saveReview() {
    if (!selectedStaff) return
    setSaving(true)
    for (const metric of metrics) {
      const score = parseFloat(scores[metric.id]) || 0
      const existing = reviews.find(r => r.staff_id === selectedStaff && r.metric_id === metric.id)
      if (existing) {
        await supabase.from('kpi_reviews').update({ score, reviewer: user.name || user.email }).eq('id', existing.id)
      } else {
        await supabase.from('kpi_reviews').insert([{
          staff_id: selectedStaff,
          metric_id: metric.id,
          score,
          period: selectedPeriod,
          reviewer: user.name || user.email
        }])
      }
    }
    setSaving(false)
    setSelectedStaff(null)
    setScores({})
    fetchReviews()
  }

  function openReview(staffId) {
    setSelectedStaff(staffId)
    const existing = {}
    reviews.filter(r => r.staff_id === staffId).forEach(r => { existing[r.metric_id] = r.score })
    setScores(existing)
  }

  function getStaffScore(staffId) {
    const staffReviews = reviews.filter(r => r.staff_id === staffId)
    if (staffReviews.length === 0) return null
    const totalWeight = metrics.reduce((s, m) => s + m.weight, 0)
    const weighted = metrics.reduce((s, m) => {
      const r = staffReviews.find(r => r.metric_id === m.id)
      return s + (r ? r.score * m.weight : 0)
    }, 0)
    return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0
  }

  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0)

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>جاري التحميل...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>📊 مؤشرات الأداء</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && (
            <button onClick={() => { setView(v => v === 'reviews' ? 'metrics' : 'reviews'); setShowMetricForm(false) }} style={outlineBtn}>
              {view === 'reviews' ? '⚙️ البنود' : '📋 التقييمات'}
            </button>
          )}
        </div>
      </div>

      {view === 'metrics' && isOwner && (
        <div>
          <div style={{ background: '#fff8e1', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#f57c00', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ مجموع الأوزان: <strong>{totalWeight}%</strong> {totalWeight !== 100 ? '(يُفضل 100%)' : '✅'}</span>
            <button onClick={() => { setShowMetricForm(true); setEditMetric(null); setMetricForm({ name: '', weight: 10 }) }} style={solidBtn}>+ إضافة بند</button>
          </div>

          {showMetricForm && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ color: 'var(--purple)', marginBottom: 12 }}>{editMetric ? 'تعديل البند' : 'بند جديد'}</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  placeholder="اسم البند (مثل: الالتزام بالوقت)"
                  value={metricForm.name}
                  onChange={e => setMetricForm(p => ({ ...p, name: e.target.value }))}
                  style={{ ...inputStyle, flex: 3 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>الوزن (%)</div>
                  <input
                    type="number" min="1" max="100"
                    value={metricForm.weight}
                    onChange={e => setMetricForm(p => ({ ...p, weight: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={saveMetric} style={solidBtn}>حفظ</button>
                <button onClick={() => { setShowMetricForm(false); setEditMetric(null) }} style={outlineBtn}>إلغاء</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metrics.map(m => (
              <div key={m.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>الوزن: {m.weight}%</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditMetric(m); setMetricForm({ name: m.name, weight: m.weight }); setShowMetricForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteMetric(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reviews' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} style={{ ...inputStyle, width: 'auto', display: 'inline-block' }}>
              {periods.map(p => {
                const year = new Date().getFullYear()
                return <option key={p}>{p} {year}</option>
              })}
            </select>
          </div>

          {metrics.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>لا توجد بنود — أضف بنود من ⚙️ البنود</div>
          ) : selectedStaff ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: 'var(--purple)' }}>تقييم: {staff.find(s => s.id === selectedStaff)?.name}</h3>
                <button onClick={() => { setSelectedStaff(null); setScores({}) }} style={outlineBtn}>← رجوع</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {metrics.map(m => (
                  <div key={m.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: '#888' }}>وزن: {m.weight}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="range" min="0" max="100"
                        value={scores[m.id] || 0}
                        onChange={e => setScores(s => ({ ...s, [m.id]: e.target.value }))}
                        style={{ flex: 1, accentColor: 'var(--purple)' }}
                      />
                      <span style={{ fontWeight: 700, color: 'var(--purple)', minWidth: 40, textAlign: 'center' }}>{scores[m.id] || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>النتيجة المتوقعة</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--purple)' }}>
                  {Math.round(metrics.reduce((s, m) => s + ((parseFloat(scores[m.id]) || 0) * m.weight), 0) / (totalWeight || 1))}%
                </span>
              </div>
              <button onClick={saveReview} disabled={saving} style={solidBtn}>{saving ? 'جاري الحفظ...' : '💾 حفظ التقييم'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staff.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>لا يوجد موظفون</div>
              ) : staff.map(s => {
                const score = getStaffScore(s.id)
                return (
                  <div key={s.id} style={{
                    background: 'white', borderRadius: 12, padding: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderRight: `4px solid ${score === null ? '#ddd' : score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--gold)' : 'var(--danger)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {score !== null ? (
                        <span style={{
                          fontWeight: 700, fontSize: 18,
                          color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--gold)' : 'var(--danger)'
                        }}>{score}%</span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#bbb' }}>لم يُقيَّم</span>
                      )}
                      {isOwner && (
                        <button onClick={() => openReview(s.id)} style={solidBtn}>تقييم</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }
