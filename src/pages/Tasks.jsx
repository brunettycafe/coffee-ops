import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الكل', 'الناصرية', 'النخيل', 'الربوة', 'الفرع الرابع', 'الفرع الخامس']
const shifts = ['صباحي', 'مسائي']
const roles = ['مدير فرع', 'مدير شفت', 'باريستا', 'كاشير', 'سايق', 'مدير تشغيل']
const priorities = ['عالي', 'متوسط', 'منخفض']
const priorityColor = { 'عالي': 'var(--danger)', 'متوسط': 'var(--gold)', 'منخفض': 'var(--olive)' }

const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
const todayISO = new Date().toISOString().split('T')[0]

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([])
  const [templates, setTemplates] = useState([])
  const [filterBranch, setFilterBranch] = useState('الكل')
  const [filterShift, setFilterShift] = useState('صباحي')
  const [lang, setLang] = useState('ar')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('tasks') // tasks | templates
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [editTemplate, setEditTemplate] = useState(null)
  const [newTask, setNewTask] = useState({ titleAr: '', titleEn: '', branch: 'الناصرية', shift: 'صباحي', roles: [], assignee: '', priority: 'متوسط' })
  const [newTemplate, setNewTemplate] = useState({ titleAr: '', titleEn: '', branch: 'الناصرية', shift: 'صباحي', roles: [], priority: 'متوسط' })

  const isOwner = user.role === 'owner'

  useEffect(() => { fetchTasks(); fetchTemplates() }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').eq('date', todayISO).order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function fetchTemplates() {
    const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data || [])
  }

  async function generateFromTemplates() {
    const existing = tasks.map(t => t.template_id).filter(Boolean)
    const toCreate = templates.filter(t => !existing.includes(t.id))
    if (toCreate.length === 0) return
    await supabase.from('tasks').insert(toCreate.map(t => ({
      title_ar: t.title_ar,
      title_en: t.title_en,
      branch: t.branch,
      shift: t.shift,
      roles: t.roles,
      priority: t.priority,
      done: false,
      date: todayISO,
      template_id: t.id
    })))
    fetchTasks()
  }

  useEffect(() => { if (templates.length > 0 && tasks.length === 0) generateFromTemplates() }, [templates])

  async function toggleDone(id, current) {
    await supabase.from('tasks').update({ done: !current, done_at: !current ? new Date().toISOString() : null }).eq('id', id)
    fetchTasks()
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  async function saveTask() {
    if (!newTask.titleAr) return
    if (editTask) {
      await supabase.from('tasks').update({ title_ar: newTask.titleAr, title_en: newTask.titleEn, branch: newTask.branch, shift: newTask.shift, roles: newTask.roles, assignee: newTask.assignee, priority: newTask.priority }).eq('id', editTask.id)
    } else {
      await supabase.from('tasks').insert([{ title_ar: newTask.titleAr, title_en: newTask.titleEn, branch: newTask.branch, shift: newTask.shift, roles: newTask.roles, assignee: newTask.assignee, priority: newTask.priority, done: false, date: todayISO }])
    }
    setNewTask({ titleAr: '', titleEn: '', branch: 'الناصرية', shift: 'صباحي', roles: [], ass
