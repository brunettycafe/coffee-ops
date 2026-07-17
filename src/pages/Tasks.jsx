import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'

const branches = ['الكل', 'الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
const shifts = ['صباحي', 'مسائي']
const allRoles = ['مدير فرع', 'مدير شفت', 'باريستا', 'كاشير', 'سايق', 'مدير تشغيل']
const priorities = ['عالي', 'متوسط', 'منخفض']
const priorityColor = { 'عالي': 'var(--danger)', 'متوسط': 'var(--gold)', 'منخفض': 'var(--olive)' }
// [مرحلة 1] تصنيف المهام حسب نوع التشغيل
const taskCategories = ['تشغيل يومي', 'جودة', 'نظافة', 'مخزون', 'موظفين', 'إغلاق']
const categoryIcon = { 'تشغيل يومي': '🔧', 'جودة': '⭐', 'نظافة': '🧹', 'مخزون': '📦', 'موظفين': '👥', 'إغلاق': '🔒' }
const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
const todayISO = new Date().toISOString().split('T')[0]

const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// [مرحلة 1] أضفنا category و checklist بقيم افتراضية آمنة (لا تكسر أي مهمة قديمة بدونها)
const emptyTask = { titleAr: '', titleEn: '', branch: 'الناصرية', shift: 'صباحي', roles: [], assignee: '', priority: 'متوسط', requiresPhoto: false, category: 'تشغيل يومي', checklist: [] }
const emptyTemplate = { titleAr: '', titleEn: '', branch: 'الكل', shift: 'صباحي', roles: [], priority: 'متوسط', days: [], requiresPhoto: false, category: 'تشغيل يومي', checklist: [] }

export default function Tasks({ user, lang }) {
  const [tasks, setTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [templates, setTemplates] = useState([])
  const [filterBranch, setFilterBranch] = useState('الكل')
  const [filterShift, setFilterShift] = useState('صباحي')
  const [filterCategory, setFilterCategory] = useState('الكل') // [مرحلة 1]
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('tasks')
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [editTemplate, setEditTemplate] = useState(null)
  const [taskForm, setTaskForm] = useState(emptyTask)
  const [templateForm, setTemplateForm] = useState(emptyTemplate)
  const [pendingPhotoTask, setPendingPhotoTask] = useState(null)
  const [uploadingTaskId, setUploadingTaskId] = useState(null)
  const fileInputRef = useRef(null)
  const isOwner = user.role === 'owner'

  // [مرحلة 1] حالات نافذة إنهاء المهمة (Checklist + ملاحظات + صورة مجتمعين)
  const [completingTask, setCompletingTask] = useState(null)
  const [completionChecklistState, setCompletionChecklistState] = useState({})
  const [completionNotes, setCompletionNotes] = useState('')
  const [completionPhotoFile, setCompletionPhotoFile] = useState(null)
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState(null)
  const [submittingCompletion, setSubmittingCompletion] = useState(false)
  const completionFileInputRef = useRef(null)

  // [مرحلة 1] تحرير ملاحظة سريعة بعد الإنجاز (مستقلة، لا تعطل سرعة الإنجاز الأصلية)
  const [noteEditingId, setNoteEditingId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => { fetchTasks(); fetchTemplates() }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', todayISO)
      .order('created_at', { ascending: false })

    const { data: completionsData } = await supabase
      .from('task_completions')
      .select('task_id, completed_at, photo_url, notes')
      .eq('user_id', user.id)

    setTasks(tasksData || [])
    setCompletions(completionsData || [])
    setLoading(false)
  }

  async function fetchTemplates() {
    const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data || [])
  }

  async function generateFromTemplates(tmpl) {
    const todayDayIndex = new Date().getDay()
    const todayDayAr = daysAr[todayDayIndex]
    const allBranches = ['الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين']
    const { data: existing } = await supabase.from('tasks').select('template_id, branch').eq('date', todayISO)
    const toInsert = []
    for (const t of tmpl) {
      const targetBranches = t.branch === 'الكل' ? allBranches : [t.branch]
      for (const branch of targetBranches) {
        if (t.days && t.days.length > 0 && !t.days.includes(todayDayAr)) continue
        const alreadyExists = (existing || []).some(e => e.template_id === t.id && e.branch === branch)
        if (!alreadyExists) {
          toInsert.push({
            title_ar: t.title_ar, title_en: t.title_en, branch, shift: t.shift, roles: t.roles,
            priority: t.priority, done: false, date: todayISO, template_id: t.id,
            requires_photo: t.requires_photo || false,
            category: t.category || 'تشغيل يومي', // [مرحلة 1]
            checklist: t.checklist || null // [مرحلة 1]
          })
        }
      }
    }
    if (toInsert.length === 0) return
    await supabase.from('tasks').upsert(toInsert, { onConflict: 'template_id,branch,date', ignoreDuplicates: true })
    fetchTasks()
  }

  useEffect(() => {
    if (templates.length > 0) generateFromTemplates(templates)
  }, [templates])

  // ضغط الصورة قبل الرفع (أقصى عرض 1280px، جودة 70%)
  function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1280
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async function toggleDone(task) {
    const completion = completions.find(c => c.task_id === task.id)
    if (completion) {
      // إلغاء الإنجاز — حذف السجل والصورة إن وجدت
      if (completion.photo_url) {
        const path = completion.photo_url.split('/task-photos/')[1]
        if (path) await supabase.storage.from('task-photos').remove([path])
      }
      await supabase.from('task_completions').delete().eq('task_id', task.id).eq('user_id', user.id)
      fetchTasks()
      return
    }
    // [مرحلة 1] لو المهمة فيها Checklist، لازم تفتح نافذة الإنهاء لتأكيد كل بند
    // (السلوك الأصلي — صورة فقط بدون Checklist — يبقى كما هو تمامًا بدون تغيير)
    if (task.checklist && task.checklist.length > 0) {
      openCompletionModal(task)
      return
    }
    if (task.requires_photo) {
      // المهمة تتطلب صورة — فتح الكاميرا (سلوك أصلي بدون تغيير)
      setPendingPhotoTask(task)
      fileInputRef.current.value = ''
      fileInputRef.current.click()
      return
    }
    await supabase.from('task_completions').insert([{ task_id: task.id, user_id: user.id }])
    fetchTasks()
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files[0]
    const task = pendingPhotoTask
    setPendingPhotoTask(null)
    if (!file || !task) return
    setUploadingTaskId(task.id)
    try {
      const blob = await compressImage(file)
      const path = `${todayISO}/${task.id}_${user.id}_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('task-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (upErr) { alert('فشل رفع الصورة — حاول مرة أخرى'); setUploadingTaskId(null); return }
      const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(path)
      await supabase.from('task_completions').insert([{ task_id: task.id, user_id: user.id, photo_url: urlData.publicUrl }])
      fetchTasks()
    } finally {
      setUploadingTaskId(null)
    }
  }

  // ===================== [مرحلة 1] نافذة إنهاء المهمة =====================
  // تجمع Checklist (إن وجد) + صورة (إن كانت مطلوبة) + ملاحظات اختيارية في خطوة واحدة
  function openCompletionModal(task) {
    setCompletingTask(task)
    const initialState = {}
    ;(task.checklist || []).forEach(item => { initialState[item.id] = false })
    setCompletionChecklistState(initialState)
    setCompletionNotes('')
    setCompletionPhotoFile(null)
    setCompletionPhotoPreview(null)
  }

  function closeCompletionModal() {
    setCompletingTask(null)
    setCompletionChecklistState({})
    setCompletionNotes('')
    setCompletionPhotoFile(null)
    setCompletionPhotoPreview(null)
    setSubmittingCompletion(false)
  }

  function toggleCompletionChecklistItem(itemId) {
    setCompletionChecklistState(p => ({ ...p, [itemId]: !p[itemId] }))
  }

  function handleCompletionPhotoSelected(e) {
    const file = e.target.files[0]
    if (!file) return
    setCompletionPhotoFile(file)
    setCompletionPhotoPreview(URL.createObjectURL(file))
  }

  const checklistAllDone = !completingTask || !completingTask.checklist || completingTask.checklist.length === 0
    ? true
    : (completingTask.checklist.every(item => completionChecklistState[item.id]))
  const photoSatisfied = !completingTask || !completingTask.requires_photo || !!completionPhotoFile
  const canSubmitCompletion = checklistAllDone && photoSatisfied && !submittingCompletion

  async function submitCompletion() {
    if (!completingTask || !canSubmitCompletion) return
    setSubmittingCompletion(true)
    try {
      let photoUrl = null
      if (completingTask.requires_photo && completionPhotoFile) {
        const blob = await compressImage(completionPhotoFile)
        const path = `${todayISO}/${completingTask.id}_${user.id}_${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage.from('task-photos').upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) { alert('فشل رفع الصورة — حاول مرة أخرى'); setSubmittingCompletion(false); return }
        const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
      await supabase.from('task_completions').insert([{
        task_id: completingTask.id,
        user_id: user.id,
        photo_url: photoUrl,
        notes: completionNotes || null,
        checklist_state: completingTask.checklist && completingTask.checklist.length > 0 ? completionChecklistState : null
      }])
      closeCompletionModal()
      fetchTasks()
    } finally {
      setSubmittingCompletion(false)
    }
  }

  // [مرحلة 1] إضافة/تعديل ملاحظة سريعة بعد الإنجاز — لا تعيد فتح المهمة ولا تلغي إنجازها
  function startEditNote(task, existingNote) {
    setNoteEditingId(task.id)
    setNoteDraft(existingNote || '')
  }

  async function saveNote(taskId) {
    await supabase.from('task_completions').update({ notes: noteDraft || null }).eq('task_id', taskId).eq('user_id', user.id)
    setNoteEditingId(null)
    setNoteDraft('')
    fetchTasks()
  }
  // ============================================================================

  async function deleteTask(id) {
    if (!window.confirm('حذف هذه المهمة؟')) return
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  async function saveTask() {
    if (!taskForm.titleAr) return
    if (editTask) {
      await supabase.from('tasks').update({
        title_ar: taskForm.titleAr, title_en: taskForm.titleEn,
        branch: taskForm.branch, shift: taskForm.shift,
        roles: taskForm.roles, assignee: taskForm.assignee, priority: taskForm.priority,
        requires_photo: taskForm.requiresPhoto,
        category: taskForm.category, // [مرحلة 1]
        checklist: taskForm.checklist && taskForm.checklist.length > 0 ? taskForm.checklist : null // [مرحلة 1]
      }).eq('id', editTask.id)
    } else {
      await supabase.from('tasks').insert([{
        title_ar: taskForm.titleAr, title_en: taskForm.titleEn,
        branch: taskForm.branch, shift: taskForm.shift,
        roles: taskForm.roles, assignee: taskForm.assignee,
        priority: taskForm.priority, done: false, date: todayISO,
        requires_photo: taskForm.requiresPhoto,
        category: taskForm.category, // [مرحلة 1]
        checklist: taskForm.checklist && taskForm.checklist.length > 0 ? taskForm.checklist : null // [مرحلة 1]
      }])
    }
    setTaskForm(emptyTask); setEditTask(null); setShowForm(false); fetchTasks()
  }

  async function saveTemplate() {
    if (!templateForm.titleAr) return
    if (editTemplate) {
      await supabase.from('task_templates').update({
        title_ar: templateForm.titleAr, title_en: templateForm.titleEn,
        branch: templateForm.branch, shift: templateForm.shift,
        roles: templateForm.roles, priority: templateForm.priority,
        days: templateForm.days,
        requires_photo: templateForm.requiresPhoto,
        category: templateForm.category, // [مرحلة 1]
        checklist: templateForm.checklist && templateForm.checklist.length > 0 ? templateForm.checklist : null // [مرحلة 1]
      }).eq('id', editTemplate.id)
    } else {
      await supabase.from('task_templates').insert([{
        title_ar: templateForm.titleAr, title_en: templateForm.titleEn,
        branch: templateForm.branch, shift: templateForm.shift,
        roles: templateForm.roles, priority: templateForm.priority,
        days: templateForm.days,
        requires_photo: templateForm.requiresPhoto,
        category: templateForm.category, // [مرحلة 1]
        checklist: templateForm.checklist && templateForm.checklist.length > 0 ? templateForm.checklist : null // [مرحلة 1]
      }])
    }
    setTemplateForm(emptyTemplate); setEditTemplate(null); setShowForm(false); fetchTemplates()
  }

  async function deleteTemplate(id) {
    if (!window.confirm('حذف هذا القالب؟')) return
    await supabase.from('task_templates').delete().eq('id', id)
    fetchTemplates()
  }

  function toggleRole(role, form, setForm) {
    setForm(p => ({ ...p, roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role] }))
  }

  const isBranchManager = user.role === 'مدير فرع' || user.role === 'مدير تشغيل'
  // [مرحلة 1] دعم مهام مدير الفرع: يقدر يضيف/يعدّل/يحذف مهام (وليس قوالب) — لا يزال الأصحاب Owner فقط يديرون القوالب
  const canManageTasks = isOwner || isBranchManager

  const canCompleteTask = (t) => {
    if (isOwner) return true
    if (!t.roles || t.roles.length === 0) return true
    return t.roles.includes(user.role)
  }

  const isTaskDone = (taskId) => completions.some(c => c.task_id === taskId)

  const myTasks = tasks.filter(t => {
    if (!isOwner && t.branch !== user.branch) return false
    if (isOwner && filterBranch !== 'الكل' && t.branch !== filterBranch) return false
    if (t.shift !== filterShift) return false
    if (filterCategory !== 'الكل' && (t.category || 'تشغيل يومي') !== filterCategory) return false // [مرحلة 1]
    if (!isOwner && !isBranchManager && t.roles && t.roles.length > 0 && !t.roles.includes(user.role)) return false
    return true
  })

  const myOwnTasks = isOwner ? myTasks : myTasks.filter(t => !t.roles || t.roles.length === 0 || t.roles.includes(user.role))
  const done = myOwnTasks.filter(t => isTaskDone(t.id)).length
  const total = myOwnTasks.length

  function RoleSelector({ form, setForm }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>الأدوار (اختر واحد أو أكثر):</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allRoles.map(r => (
            <button key={r} onClick={() => toggleRole(r, form, setForm)} style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 12,
              cursor: 'pointer', fontFamily: 'Tajawal', border: 'none',
              background: form.roles.includes(r) ? 'var(--purple)' : '#f0f0f0',
              color: form.roles.includes(r) ? 'white' : '#666'
            }}>{r}</button>
          ))}
        </div>
      </div>
    )
  }

  // [مرحلة 1] اختيار تصنيف المهمة
  function CategorySelector({ form, setForm }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>تصنيف المهمة:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {taskCategories.map(c => (
            <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 12,
              cursor: 'pointer', fontFamily: 'Tajawal', border: 'none',
              background: form.category === c ? 'var(--purple)' : '#f0f0f0',
              color: form.category === c ? 'white' : '#666'
            }}>{categoryIcon[c]} {c}</button>
          ))}
        </div>
      </div>
    )
  }

  // [مرحلة 1] محرر Checklist داخل نموذج المهمة/القالب — اختياري تمامًا
  function ChecklistEditor({ form, setForm }) {
    const [draft, setDraft] = useState('')
    function addItem() {
      if (!draft.trim()) return
      setForm(p => ({ ...p, checklist: [...(p.checklist || []), { id: `${Date.now()}`, text: draft.trim() }] }))
      setDraft('')
    }
    function removeItem(id) {
      setForm(p => ({ ...p, checklist: (p.checklist || []).filter(i => i.id !== id) }))
    }
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Checklist داخل المهمة (اختياري):</div>
        {(form.checklist || []).map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 13, background: '#f7f7f7', borderRadius: 6, padding: '6px 10px' }}>{item.text}</span>
            <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="أضف بند Checklist..." style={{ ...inputStyle, marginBottom: 0, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} />
          <button onClick={addItem} style={outlineBtn}>+ إضافة</button>
        </div>
      </div>
    )
  }

  function PhotoToggle({ form, setForm }) {
    return (
      <button onClick={() => setForm(p => ({ ...p, requiresPhoto: !p.requiresPhoto }))} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '10px 14px', marginBottom: 12, borderRadius: 8,
        border: `1px solid ${form.requiresPhoto ? 'var(--purple)' : '#ddd'}`,
        background: form.requiresPhoto ? '#f3eefb' : 'white',
        cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 14,
        color: form.requiresPhoto ? 'var(--purple)' : '#666', fontWeight: form.requiresPhoto ? 700 : 400
      }}>
        <span style={{ fontSize: 16 }}>{form.requiresPhoto ? '✅' : '⬜'}</span>
        📷 تتطلب صورة عند الإنجاز
      </button>
    )
  }

  return (
    <div>
      {/* إدخال مخفي لالتقاط الصورة من الكاميرا (سلوك أصلي — مهام صورة بدون Checklist) */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelected} style={{ display: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ color: 'var(--purple)', fontSize: 22 }}>{view === 'tasks' ? '📋 مهام اليوم' : '⚙️ القوالب الثابتة'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && <button onClick={() => { setView(v => v === 'tasks' ? 'templates' : 'tasks'); setShowForm(false) }} style={outlineBtn}>{view === 'tasks' ? '⚙️ القوالب' : '📋 المهام'}</button>}
          {((view === 'tasks' && canManageTasks) || (view === 'templates' && isOwner)) && (
            <button onClick={() => {
              setShowForm(true); setEditTask(null); setEditTemplate(null)
              // [مرحلة 1] مدير الفرع (وليس Owner) يبدأ نموذج مهمة مربوط تلقائيًا بفرعه
              setTaskForm(isBranchManager && !isOwner ? { ...emptyTask, branch: user.branch } : emptyTask)
              setTemplateForm(emptyTemplate)
            }} style={solidBtn}>+ إضافة</button>
          )}
        </div>
      </div>

      <div style={{ color: 'var(--gold)', fontSize: 13, marginBottom: 16 }}>📅 {today}</div>

      {view === 'tasks' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {shifts.map(s => (
              <button key={s} onClick={() => setFilterShift(s)} style={{
                padding: '8px 20px', borderRadius: 20, fontFamily: 'Tajawal', fontSize: 14, cursor: 'pointer',
                background: filterShift === s ? 'var(--purple)' : 'white',
                color: filterShift === s ? 'white' : 'var(--purple)',
                border: '2px solid var(--purple)', fontWeight: filterShift === s ? 700 : 400
              }}>{s === 'صباحي' ? '🌅 صباحي' : '🌙 مسائي'}</button>
            ))}
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {branches.map(b => (
                <button key={b} onClick={() => setFilterBranch(b)} style={{
                  padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer',
                  background: filterBranch === b ? 'var(--gold)' : 'white',
                  color: filterBranch === b ? 'white' : 'var(--gold)',
                  border: '1px solid var(--gold)'
                }}>{b}</button>
              ))}
            </div>
          )}

          {/* [مرحلة 1] فلترة حسب التصنيف */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['الكل', ...taskCategories].map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} style={{
                padding: '5px 12px', borderRadius: 16, fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer',
                background: filterCategory === c ? 'var(--purple)' : 'white',
                color: filterCategory === c ? 'white' : 'var(--purple)',
                border: '1px solid var(--purple)'
              }}>{c === 'الكل' ? c : `${categoryIcon[c]} ${c}`}</button>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>إنجازي {filterShift === 'صباحي' ? '🌅' : '🌙'}</span>
              <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{done}/{total} مهمة</span>
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: 8, height: 10 }}>
              <div style={{ width: total > 0 ? `${Math.round(done/total*100)}%` : '0%', height: '100%', background: 'var(--success)', borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
          </div>

          {showForm && canManageTasks && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>{editTask ? 'تعديل المهمة' : 'مهمة جديدة'}</h3>
              <input placeholder="اسم المهمة بالعربي *" value={taskForm.titleAr} onChange={e => setTaskForm(p => ({...p, titleAr: e.target.value}))} style={inputStyle} />
              <input placeholder="Task name in English" value={taskForm.titleEn} onChange={e => setTaskForm(p => ({...p, titleEn: e.target.value}))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 12 }}>
                {/* [مرحلة 1] مدير الفرع مقيّد بفرعه فقط — لا يقدر ينشئ مهمة لفرع آخر */}
                <select value={taskForm.branch} disabled={isBranchManager && !isOwner} onChange={e => setTaskForm(p => ({...p, branch: e.target.value}))} style={{...inputStyle, flex: 1, opacity: (isBranchManager && !isOwner) ? 0.7 : 1}}>
                  {['الكل', 'الناصرية', 'النخيل', 'الربوة', 'المطار بلازا', 'الخمسين'].map(b => <option key={b}>{b}</option>)}
                </select>
                <select value={taskForm.shift} onChange={e => setTaskForm(p => ({...p, shift: e.target.value}))} style={{...inputStyle, flex: 1}}>
                  {shifts.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={taskForm.priority} onChange={e => setTaskForm(p => ({...p, priority: e.target.value}))} style={{...inputStyle, flex: 1}}>
                  {priorities.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <CategorySelector form={taskForm} setForm={setTaskForm} />
              <RoleSelector form={taskForm} setForm={setTaskForm} />
              <PhotoToggle form={taskForm} setForm={setTaskForm} />
              <ChecklistEditor form={taskForm} setForm={setTaskForm} />
              <input placeholder="المسؤول (اختياري)" value={taskForm.assignee} onChange={e => setTaskForm(p => ({...p, assignee: e.target.value}))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveTask} style={solidBtn}>حفظ</button>
                <button onClick={() => { setShowForm(false); setEditTask(null) }} style={outlineBtn}>إلغاء</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>جاري التحميل...</div>
          ) : myOwnTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>لا توجد مهام لهذا الشفت</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myOwnTasks.map(t => {
                const done = isTaskDone(t.id)
                const completion = completions.find(c => c.task_id === t.id)
                const uploading = uploadingTaskId === t.id
                return (
                  <div key={t.id} style={{
                    background: 'white', borderRadius: 12, padding: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    opacity: done ? 0.65 : 1,
                    borderRight: `4px solid ${priorityColor[t.priority] || 'var(--gold)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {uploading ? (
                        <span style={{ fontSize: 18 }}>⏳</span>
                      ) : (
                        <input type="checkbox" checked={done} onChange={() => canCompleteTask(t) && toggleDone(t)} disabled={!canCompleteTask(t)}
                          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--purple)' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? '#aaa' : '#333' }}>
                          {lang === 'ar' ? t.title_ar : (t.title_en || t.title_ar)}
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span>{categoryIcon[t.category] || '🔧'} {t.category || 'تشغيل يومي'}</span>
                          <span>📍 {t.branch}</span>
                          {t.days && t.days.length > 0 && <span>📅 {t.days.join('، ')}</span>}
                          {(!t.days || t.days.length === 0) && <span>📅 يومي</span>}
                          <span>{t.shift === 'صباحي' ? '🌅' : '🌙'} {t.shift}</span>
                          {t.assignee && <span>👤 {t.assignee}</span>}
                          {t.roles && t.roles.length > 0 && <span>🎯 {t.roles.join('، ')}</span>}
                          <span style={{ color: priorityColor[t.priority] }}>● {t.priority}</span>
                          {t.checklist && t.checklist.length > 0 && <span>☑️ {t.checklist.length} بنود</span>}
                          {t.requires_photo && !done && <span style={{ color: 'var(--purple)', fontWeight: 700 }}>📷 تتطلب صورة</span>}
                          {done && completion && <span>✓ {new Date(completion.completed_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>}
                          {done && completion && completion.photo_url && (
                            <a href={completion.photo_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--purple)', fontWeight: 700, textDecoration: 'none' }}>
                              <img src={completion.photo_url} alt="دليل الإنجاز" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid #ddd' }} />
                              عرض الصورة
                            </a>
                          )}
                        </div>
                        {/* [مرحلة 1] ملاحظة سريعة بعد الإنجاز — اختيارية، لا تعطل سرعة الإنجاز الأصلية */}
                        {done && completion && (
                          noteEditingId === t.id ? (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                              <input autoFocus value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="اكتب ملاحظة..." style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: 12, padding: '6px 10px' }} onKeyDown={e => { if (e.key === 'Enter') saveNote(t.id) }} />
                              <button onClick={() => saveNote(t.id)} style={{ ...outlineBtn, padding: '4px 12px', fontSize: 12 }}>حفظ</button>
                            </div>
                          ) : (
                            <div style={{ marginTop: 6 }}>
                              {completion.notes ? (
                                <span onClick={() => startEditNote(t, completion.notes)} style={{ fontSize: 12, color: '#666', cursor: 'pointer', background: '#f7f7f7', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>📝 {completion.notes}</span>
                              ) : (
                                <span onClick={() => startEditNote(t, '')} style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer' }}>📝 إضافة ملاحظة</span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                      {canManageTasks && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditTask(t); setTaskForm({ titleAr: t.title_ar, titleEn: t.title_en || '', branch: t.branch, shift: t.shift || 'صباحي', roles: t.roles || [], assignee: t.assignee || '', priority: t.priority, requiresPhoto: t.requires_photo || false, category: t.category || 'تشغيل يومي', checklist: t.checklist || [] }); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                          <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'templates' && isOwner && (
        <>
          <div style={{ background: '#fff8e1', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#f57c00' }}>
            ⚙️ القوالب هي المهام الثابتة التي تتولد تلقائياً كل يوم
          </div>

          {showForm && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ color: 'var(--purple)', marginBottom: 16 }}>{editTemplate ? 'تعديل القالب' : 'قالب جديد'}</h3>
              <input placeholder="اسم المهمة بالعربي *" value={templateForm.titleAr} onChange={e => setTemplateForm(p => ({...p, titleAr: e.target.value}))} style={inputStyle} />
              <input placeholder="Task name in English" value={templateForm.titleEn} onChange={e => setTemplateForm(p => ({...p, titleEn: e.target.value}))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 12 }}>
                <select value={templateForm.branch} onChange={e => setTemplateForm(p => ({...p, branch: e.target.value}))} style={{...inputStyle, flex: 1}}>
                  {branches.map(b => <option key={b}>{b}</option>)}
                </select>
                <select value={templateForm.shift} onChange={e => setTemplateForm(p => ({...p, shift: e.target.value}))} style={{...inputStyle, flex: 1}}>
                  {shifts.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={templateForm.priority} onChange={e => setTemplateForm(p => ({...p, priority: e.target.value}))} style={{...inputStyle, flex: 1}}>
                  {priorities.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>أيام التكرار (فاضي = يومي):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {daysAr.map(d => (
                    <button key={d} onClick={() => setTemplateForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))} style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal', border: 'none', background: templateForm.days.includes(d) ? 'var(--purple)' : '#f0f0f0', color: templateForm.days.includes(d) ? 'white' : '#666' }}>{d}</button>
                  ))}
                </div>
                {templateForm.days.length === 0 && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>يومي (كل الأيام)</div>}
              </div>
              <CategorySelector form={templateForm} setForm={setTemplateForm} />
              <RoleSelector form={templateForm} setForm={setTemplateForm} />
              <PhotoToggle form={templateForm} setForm={setTemplateForm} />
              <ChecklistEditor form={templateForm} setForm={setTemplateForm} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveTemplate} style={solidBtn}>حفظ القالب</button>
                <button onClick={() => { setShowForm(false); setEditTemplate(null) }} style={outlineBtn}>إلغاء</button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>لا توجد قوالب بعد — أضف أول مهمة ثابتة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.map(t => (
                <div key={t.id} style={{
                  background: 'white', borderRadius: 12, padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRight: `4px solid ${priorityColor[t.priority] || 'var(--gold)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t.title_ar}</div>
                      {t.title_en && <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{t.title_en}</div>}
                      <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{categoryIcon[t.category] || '🔧'} {t.category || 'تشغيل يومي'}</span>
                        <span>📍 {t.branch}</span>
                        <span>{t.shift === 'صباحي' ? '🌅' : '🌙'} {t.shift}</span>
                        {t.roles && t.roles.length > 0 && <span>🎯 {t.roles.join('، ')}</span>}
                        <span style={{ color: priorityColor[t.priority] }}>● {t.priority}</span>
                        {t.checklist && t.checklist.length > 0 && <span>☑️ {t.checklist.length} بنود</span>}
                        {t.requires_photo && <span style={{ color: 'var(--purple)', fontWeight: 700 }}>📷 تتطلب صورة</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditTemplate(t); setTemplateForm({ titleAr: t.title_ar, titleEn: t.title_en || '', branch: t.branch, shift: t.shift, roles: t.roles || [], priority: t.priority, days: t.days || [], requiresPhoto: t.requires_photo || false, category: t.category || 'تشغيل يومي', checklist: t.checklist || [] }); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                      <button onClick={() => deleteTemplate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* [مرحلة 1] نافذة إنهاء المهمة — تظهر فقط للمهام التي تحتوي Checklist */}
      {completingTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={closeCompletionModal}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--purple)', marginBottom: 4 }}>إنهاء المهمة</h3>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>{completingTask.title_ar}</div>

            {completingTask.checklist && completingTask.checklist.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>أكمل كل بند قبل الإنهاء:</div>
                {completingTask.checklist.map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!completionChecklistState[item.id]} onChange={() => toggleCompletionChecklistItem(item.id)} style={{ width: 18, height: 18, accentColor: 'var(--purple)' }} />
                    <span style={{ fontSize: 14, textDecoration: completionChecklistState[item.id] ? 'line-through' : 'none', color: completionChecklistState[item.id] ? '#aaa' : '#333' }}>{item.text}</span>
                  </label>
                ))}
              </div>
            )}

            {completingTask.requires_photo && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>صورة كدليل (مطلوبة):</div>
                <input ref={completionFileInputRef} type="file" accept="image/*" capture="environment" onChange={handleCompletionPhotoSelected} style={{ display: 'none' }} />
                {completionPhotoPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={completionPhotoPreview} alt="معاينة" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #ddd' }} />
                    <button onClick={() => completionFileInputRef.current.click()} style={outlineBtn}>تغيير الصورة</button>
                  </div>
                ) : (
                  <button onClick={() => completionFileInputRef.current.click()} style={solidBtn}>📷 التقاط صورة</button>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>ملاحظات (اختياري):</div>
              <textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="أي ملاحظة تخص إنجاز هذه المهمة..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitCompletion} disabled={!canSubmitCompletion} style={{ ...solidBtn, opacity: canSubmitCompletion ? 1 : 0.5, cursor: canSubmitCompletion ? 'pointer' : 'not-allowed' }}>
                {submittingCompletion ? 'جارٍ الحفظ...' : '✓ إنهاء المهمة'}
              </button>
              <button onClick={closeCompletionModal} style={outlineBtn}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', display: 'block' }
const solidBtn = { padding: '8px 20px', borderRadius: 20, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
const outlineBtn = { padding: '8px 20px', borderRadius: 20, background: 'white', color: 'var(--purple)', border: '1px solid var(--purple)', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }
