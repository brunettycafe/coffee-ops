import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const units = ['جرام', 'كيلو', 'لتر', 'مل', 'حبة', 'كرتون']
const todayISO = new Date().toISOString().split('T')[0]

const emptyForm = { branch: 'الناصرية', item: '', quantity: '', unit: 'جرام', cost: '', notes: '' }

export default function Waste({ user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [filterBranch, setFilterBranch] = useState('الكل')

  const isOwner = user.role === 'owner'

  useEffect(() => { fetchLogs() }, [selectedDate])

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('waste_logs')
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  async function saveLog() {
    if (!form.item || !form.cost) return
    setSaving(true)
    await supabase.from('waste_logs').insert([{
      date: selectedDate,
      branch: form.branch,
      item: form.item,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      cost: parseFloat(form.cost) || 0,
      notes: form.notes
    }])
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    fetchLogs()
  }

  async function deleteLog(id) {
    if (!window.confirm('حذف هذا السجل؟')) return
    await supabase.from('waste_logs').delete().eq('id', id)
    fetchLogs()
  }

  const myBranches = isOwner ? branches : [user.branch]
  const filteredLogs = logs.filter(l => {
    if (!myBranches.includes(l.branch)) return false
    if (filterBranch !== 'الكل' && l.branch !== filterBranch) return false
    return true
  })

  const totalCost = filteredLogs.reduce((s, l) => s + (l.cost || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>🗑️ الهدر</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'Tajawal', fontSize: 13 }} />
          <button onClick={() => { setShowForm(true); setForm({ ...emptyForm, branch: myBranches[0] }) }} style={solidBtn}>+ إضافة</button>
        </div>
      </div>

      {filteredLogs.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#666' }}>إجمالي الهدر</span>
          <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--danger)' }}>{totalCost.toLocaleString()} ر.س</span>
        </div>
      )}

      {isOwner && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['الكل', ...branches].map(b => (
            <button key={b} onClick={() => setFilterBranch(b)} style={{
              padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer',
              background: filterBranch === b ? 'var(--gold)' : 'white',
              color: filterBranch === b ? 'white' : 'var(--gold)',
              border: '1px solid var(--gold)'
            }}>{b}</button>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>تسجيل هدر جديد</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {isOwner && (
              <select value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            )}
            <input placeholder="اسم الصنف *" value={form.item}
              onChange={e => setForm(p => ({ ...p, item: e.target.value }))} style={{ ...inputStyle, flex: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input type="number" placeholder="الكمية" value={form.quantity}
              onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
              {units.map(u => <option key={u}>{u}</option>)}
            </select>
            <input type="number" placeholder="التكلفة (ر.س) *" value={form.cost}
              onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input placeholder="ملاحظات (اختياري)" value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveLog} disabled={saving} style={solidBtn}>{saving ? 'جاري الحفظ...' : '💾 حفظ'}</button>
            <button onClick={() => setShowForm(false)} style={outlineBtn}>إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>جاري التحميل...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>لا يوجد هدر مسجل لهذا اليوم</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredLogs.map(l => (
            <div key={l.id} style={{
              background: 'white', borderRadius: 12, padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRight: '4px solid var(--danger)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#333',
