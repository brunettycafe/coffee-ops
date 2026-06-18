import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { t } from '../App.jsx'

const branches = ['الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']

export default function Login({ onLogin, lang, setLang }) {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', nameEn: '', password: '', branch: 'الناصرية', role: 'staff' })
  const [loginForm, setLoginForm] = useState({ name: '', password: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const tr = t[lang]

  async function handleLogin() {
    if (loginForm.name === 'Bandar' && loginForm.password === 'bronti2024') {
      return onLogin({ id: 'owner-1', name: 'Bandar', name_en: 'Bandar', role: 'owner', branch: 'all', approved: true })
    }
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').eq('name', loginForm.name).eq('password', loginForm.password).single()
    setLoading(false)
    if (error || !data) return setMsg(tr.wrongCredentials)
    if (!data.approved) return setMsg(tr.pendingApproval)
    onLogin(data)
  }

  async function handleRegister() {
    if (!form.name || !form.password) return setMsg(tr.enterNamePassword)
    setLoading(true)
    const { error } = await supabase.from('users').insert([{ name: form.name, name_en: form.nameEn, password: form.password, branch: form.branch, role: 'staff', approved: false }])
    setLoading(false)
    if (error) return setMsg(tr.registerError)
    setMsg(tr.requestSent)
    setIsRegister(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--purple)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
