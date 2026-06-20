import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const unitsAr = ['جرام', 'كيلو', 'لتر', 'مل', 'حبة', 'كرتون']
const unitsEn = ['Gram', 'Kg', 'Liter', 'ml', 'Piece', 'Carton']
const todayISO = new Date().toISOString().split('T')[0]
const emptyForm = { branch: 'الناصرية', item: '', quantity: '', unit: 'جرام', cost: '', notes: '' }

export default function Waste({ user, lang }) {
  const tr = t[lang]
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
    const { data } = await supabase.from('waste_logs').select('*').eq('date', selectedDate).order('created_at', { ascending: false })
    setLogs(data || []); setLoading(false)
  }

  async function saveLog() {
    if (!form.item || !form.cost) return
    setSaving(true)
    await supabase.from('waste_logs').insert([{ date: selectedDate, branch: form.branch, item: form.item, quantity: parseFloat(form.quantity) || 0, unit: form.unit, cost: parseFloat(form.cost) || 0, notes: form.notes }])
    setSaving(false); setShowForm(false); setForm(emptyForm); fetchLogs()
  }

  async function deleteLog(id) {
    if (!window.confirm(lang === 'ar' ? 'حذف هذا السجل؟' : 'Delete this record?')) return
    await supabase.from('waste_logs').delete().eq('id', id); fetchLogs()
  }

  const myBranches = isOwner ? branches : [user.branch]
  const filteredLogs = logs.filter(l => { if (!myBranches.includes(l.branch)) return false; if (filterBranch !== 'الكل' && filterBranch !== 'All' && l.branch !== filterBranch) return false; return true })
  const totalCost = filteredLogs.reduce((s, l) => s + (l.cost || 0), 0)
  const SAR = lang === 'ar' ? 'ر.س' : 'SAR'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{tr.wasteTitle}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'Tajawal', fontSize: 13 }} />
          <button onClick={() => { setShowForm(true); setForm({ ...emptyForm, branch: myBranches[0] }) }} style={solidBtn}>{tr.addWaste}</button>
        </div>
      </div>
      {filteredLogs.length > 0 && <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14, color: '#666' }}>{tr.wasteTotal}</span><span style={{ fontWeight: 700, fontSize: 20, color: 'var(--danger)' }}>{totalCost.toLocaleString()} {SAR}</span></div>}
      {isOwner && <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{[tr.all, ...branches].map((b, i) => <button key={b} onClick={() => setFilterBranch(i === 0 ? 'الكل' : b)} style={{ padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer', background: (filterBranch === 'الكل' && i === 0) || filterBranch === b ? 'var(--gold)' : 'white', color: (filterBranch === 'الكل' && i === 0) || filterBranch === b ? 'white' : 'var(--gold)', border: '1px solid var(--gold)' }}>{b}</button>)}</div>}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>{tr.newWaste}</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {isOwner && <select value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>{branches.map(b => <option key={b}>{b}</option>)}</select>}
            <input placeholder={tr.itemName} value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} style={{ ...inputStyle, flex: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input type="number" placeholder={tr.quantity} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>{unitsAr.map((u, i) => <option key={u} value={u}>{lang === 'ar' ? u : unitsEn[i]}</option>)}</select>
            <input type="number" placeholder={tr.cost} value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input placeholder={tr.notes} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveLog} disabled={saving} style={solidBtn}>{saving ? tr.saving : tr.save}</button>
            <button onClick={() => setShowForm(false)} style={outlineBtn}>{tr.cancel}</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>{tr.loading}</div> : filteredLogs.length === 0 ? <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>{tr.noWasteToday}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredLogs.map(l => (
            <div key={l.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRight: '4px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#333', marginBottom: 4 }}>{l.item}</div>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>📍 {l.branch}</span>
                  {l.quantity > 0 && <span>📦 {l.quantity} {l.unit || ''}</span>}
                  {l.notes && <span>📝 {l.notes}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>{l.cost.toLocaleString()} {SAR}</span>
                {isOwner && <button onClick={() => deleteLog(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', boxSizing: 'border-box' }

