import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function branchLabel(branch) {
  return (
    branch?.name_ar ||
    branch?.name ||
    branch?.branch ||
    branch?.title_ar ||
    branch?.title ||
    branch?.code ||
    'فرع'
  )
}

function typeLabel(type, lang = 'ar') {
  const ar = {
    morning: 'صباحية',
    evening: 'مسائية',
    opening: 'افتتاح',
    closing: 'إغلاق',
    quality: 'جودة',
    cleanliness: 'نظافة',
    maintenance: 'صيانة',
    operations: 'تشغيل'
  }

  const en = {
    morning: 'Morning',
    evening: 'Evening',
    opening: 'Opening',
    closing: 'Closing',
    quality: 'Quality',
    cleanliness: 'Cleanliness',
    maintenance: 'Maintenance',
    operations: 'Operations'
  }

  const key = String(type || '').toLowerCase()
  return (lang === 'ar' ? ar[key] : en[key]) || type || (lang === 'ar' ? 'عام' : 'General')
}

function safeFileName(name) {
  return String(name || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

function getFileExtension(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName !== file?.name) return fromName.toLowerCase()

  const type = String(file?.type || '')
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

const text = {
  ar: {
    title: '🚶 جولة التشغيل',
    subtitle: 'اختر الفرع ونوع الجولة، ثم قيّم البنود واحفظ النتائج.',
    branch: 'الفرع',
    type: 'نوع الجولة',
    chooseBranch: 'اختر الفرع',
    chooseType: 'اختر نوع الجولة',
    start: 'بدء الجولة',
    refresh: 'تحديث',
    loading: 'جاري التحميل...',
    noBranches: 'لا توجد فروع متاحة.',
    noTemplates: 'لا توجد بنود فعّالة لهذا النوع.',
    progress: 'نسبة التقييم',
    compliant: 'مطابق',
    issue: 'مخالفة',
    notReviewed: 'لم يُقيّم',
    save: 'حفظ الجولة',
    saving: 'جاري الحفظ...',
    saved: 'تم حفظ الجولة والبلاغات بنجاح ✅',
    saveError: 'تعذر حفظ الجولة',
    loadError: 'تعذر تحميل بيانات الجولة',
    back: 'تغيير الفرع أو النوع',
    allReviewed: 'تم تقييم جميع البنود ✅',
    remaining: 'بنود متبقية',
    currentDate: 'تاريخ الجولة',
    notes: 'ملاحظات المخالفة',
    notesPlaceholder: 'اكتب وصف المشكلة والإجراء المطلوب...',
    photo: '📷 إضافة صورة',
    replacePhoto: '📷 استبدال الصورة',
    removePhoto: 'حذف الصورة',
    issueHint: 'عند اختيار مخالفة، يمكنك إضافة ملاحظة وصورة وسيُنشأ بلاغ صيانة تلقائيًا.',
    selectStatus: 'اختر مطابق أو مخالفة',
    savedImage: 'صورة محفوظة',
    retry: 'إعادة المحاولة'
  },
  en: {
    title: '🚶 Operations Tour',
    subtitle: 'Choose a branch and tour type, assess each item, then save.',
    branch: 'Branch',
    type: 'Tour Type',
    chooseBranch: 'Choose branch',
    chooseType: 'Choose type',
    start: 'Start Tour',
    refresh: 'Refresh',
    loading: 'Loading...',
    noBranches: 'No branches available.',
    noTemplates: 'No active checklist items for this type.',
    progress: 'Review Progress',
    compliant: 'Compliant',
    issue: 'Issue',
    notReviewed: 'Not reviewed',
    save: 'Save Tour',
    saving: 'Saving...',
    saved: 'Tour and issues saved successfully ✅',
    saveError: 'Could not save tour',
    loadError: 'Could not load tour data',
    back: 'Change branch or type',
    allReviewed: 'All items reviewed ✅',
    remaining: 'items remaining',
    currentDate: 'Tour date',
    notes: 'Issue notes',
    notesPlaceholder: 'Describe the issue and required action...',
    photo: '📷 Add photo',
    replacePhoto: '📷 Replace photo',
    removePhoto: 'Remove photo',
    issueHint: 'When an issue is selected, a maintenance request will be created automatically.',
    selectStatus: 'Choose compliant or issue',
    savedImage: 'Saved image',
    retry: 'Retry'
  }
}

export default function Tour({ user, lang = 'ar' }) {
  const tr = text[lang] || text.ar
  const today = riyadhToday()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [branches, setBranches] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [started, setStarted] = useState(false)

  // answers: null = لم يقيّم، true = مطابق، false = مخالفة
  const [answers, setAnswers] = useState({})
  const [notes, setNotes] = useState({})
  const [files, setFiles] = useState({})
  const [previews, setPreviews] = useState({})
  const [savedImages, setSavedImages] = useState({})
  const [existingRows, setExistingRows] = useState({})

  useEffect(() => {
    loadSetup()

    return () => {
      Object.values(previews).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSetup() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const [branchesResult, templatesResult] = await Promise.all([
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('checklist_templates')
          .select('id, type, item_ar, item_en, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      ])

      if (branchesResult.error) {
        throw new Error(`branches: ${branchesResult.error.message}`)
      }

      if (templatesResult.error) {
        throw new Error(`checklist_templates: ${templatesResult.error.message}`)
      }

      const branchRows = branchesResult.data || []
      const templateRows = templatesResult.data || []

      setBranches(branchRows)
      setTemplates(templateRows)

      if (branchRows.length === 1) {
        setSelectedBranchId(branchRows[0].id)
      }

      const uniqueTypes = [...new Set(templateRows.map(row => row.type).filter(Boolean))]
      if (uniqueTypes.length === 1) {
        setSelectedType(uniqueTypes[0])
      }
    } catch (loadError) {
      setError(`${tr.loadError}: ${loadError.message}`)
    } finally {
      setLoading(false)
    }
  }

  const availableTypes = useMemo(() => {
    return [...new Set(templates.map(row => row.type).filter(Boolean))]
  }, [templates])

  const selectedTemplates = useMemo(() => {
    return templates
      .filter(row => row.type === selectedType)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  }, [templates, selectedType])

  const reviewedCount = selectedTemplates.filter(item => answers[item.id] !== null && answers[item.id] !== undefined).length
  const compliantCount = selectedTemplates.filter(item => answers[item.id] === true).length
  const issueCount = selectedTemplates.filter(item => answers[item.id] === false).length
  const totalCount = selectedTemplates.length
  const progress = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0
  const remainingCount = Math.max(totalCount - reviewedCount, 0)

  const selectedBranch = branches.find(branch => branch.id === selectedBranchId)
  const selectedBranchName = branchLabel(selectedBranch)

  async function startTour() {
    if (!selectedBranchId || !selectedType) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase
        .from('checklist_completions')
        .select(`
          id,
          branch_id,
          type,
          date,
          template_id,
          is_completed,
          completed_by,
          completed_at,
          has_issue,
          notes,
          image_url,
          maintenance_request_id
        `)
        .eq('branch_id', selectedBranchId)
        .eq('type', selectedType)
        .eq('date', today)

      if (result.error) throw new Error(result.error.message)

      const rows = result.data || []
      const rowMap = {}
      const answerMap = {}
      const noteMap = {}
      const imageMap = {}

      rows.forEach(row => {
        rowMap[row.template_id] = row

        if (row.has_issue === true) {
          answerMap[row.template_id] = false
        } else if (row.is_completed === true) {
          answerMap[row.template_id] = true
        } else {
          answerMap[row.template_id] = null
        }

        noteMap[row.template_id] = row.notes || ''
        imageMap[row.template_id] = row.image_url || ''
      })

      selectedTemplates.forEach(template => {
        if (!(template.id in answerMap)) answerMap[template.id] = null
        if (!(template.id in noteMap)) noteMap[template.id] = ''
        if (!(template.id in imageMap)) imageMap[template.id] = ''
      })

      Object.values(previews).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })

      setExistingRows(rowMap)
      setAnswers(answerMap)
      setNotes(noteMap)
      setSavedImages(imageMap)
      setFiles({})
      setPreviews({})
      setStarted(true)
    } catch (startError) {
      setError(`${tr.loadError}: ${startError.message}`)
    } finally {
      setLoading(false)
    }
  }

  function setAnswer(templateId, value) {
    setMessage('')
    setAnswers(previous => ({ ...previous, [templateId]: value }))

    // إذا أصبحت مطابقة، لا نحذف البيانات تلقائيًا من الشاشة، لكن لن ينشأ بلاغ جديد.
  }

  function updateNote(templateId, value) {
    setNotes(previous => ({ ...previous, [templateId]: value }))
  }

  function handleFile(templateId, event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError(lang === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 10MB.' : 'Image must be 10MB or smaller.')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(lang === 'ar' ? 'الصيغة المسموحة: JPG أو PNG أو WEBP.' : 'Allowed formats: JPG, PNG, WEBP.')
      return
    }

    const oldPreview = previews[templateId]
    if (oldPreview) URL.revokeObjectURL(oldPreview)

    setFiles(previous => ({ ...previous, [templateId]: file }))
    setPreviews(previous => ({ ...previous, [templateId]: URL.createObjectURL(file) }))
    setError('')
  }

  function removeNewFile(templateId) {
    const oldPreview = previews[templateId]
    if (oldPreview) URL.revokeObjectURL(oldPreview)

    setFiles(previous => {
      const next = { ...previous }
      delete next[templateId]
      return next
    })

    setPreviews(previous => {
      const next = { ...previous }
      delete next[templateId]
      return next
    })
  }

  async function uploadEvidence(templateId, file) {
    if (!file) return savedImages[templateId] || null

    const extension = getFileExtension(file)
    const original = safeFileName(file.name)
    const path = `${selectedBranchId}/${today}/${templateId}-${Date.now()}-${original}.${extension}`

    const upload = await supabase.storage
      .from('tour-evidence')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (upload.error) throw new Error(`رفع الصورة: ${upload.error.message}`)

    const publicResult = supabase.storage
      .from('tour-evidence')
      .getPublicUrl(path)

    return publicResult.data?.publicUrl || null
  }

  async function createOrUpdateMaintenance({
    template,
    existingCompletion,
    imageUrl,
    note
  }) {
    const title =
      lang === 'ar'
        ? `مخالفة جولة: ${template.item_ar}`
        : `Tour issue: ${template.item_en || template.item_ar}`

    const payload = {
      title,
      branch: selectedBranchName,
      priority: selectedType === 'maintenance' ? 'عالي' : 'متوسط',
      status: 'جديد',
      created_by_name: user?.name || user?.email || 'مدير التشغيل',
      checklist_id: template.id,
      image_url: imageUrl,
      notes: note || null
    }

    if (existingCompletion?.maintenance_request_id) {
      const update = await supabase
        .from('maintenance_requests')
        .update(payload)
        .eq('id', existingCompletion.maintenance_request_id)
        .select('id')
        .single()

      if (update.error) throw new Error(`تحديث بلاغ الصيانة: ${update.error.message}`)
      return update.data.id
    }

    const insert = await supabase
      .from('maintenance_requests')
      .insert([payload])
      .select('id')
      .single()

    if (insert.error) throw new Error(`إنشاء بلاغ الصيانة: ${insert.error.message}`)
    return insert.data.id
  }

  async function closeLinkedMaintenance(maintenanceRequestId) {
    if (!maintenanceRequestId) return

    const result = await supabase
      .from('maintenance_requests')
      .update({
        status: 'مغلق',
        resolved_at: new Date().toISOString()
      })
      .eq('id', maintenanceRequestId)

    if (result.error) {
      throw new Error(`إغلاق بلاغ الصيانة: ${result.error.message}`)
    }
  }

  async function saveTour() {
    if (!selectedBranchId || !selectedType || selectedTemplates.length === 0) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const userId = isUuid(user?.id) ? user.id : null
      const now = new Date().toISOString()

      for (const template of selectedTemplates) {
        const answer = answers[template.id]

        // لا نحفظ البند الذي لم يُقيّم.
        if (answer === null || answer === undefined) continue

        const hasIssue = answer === false
        const existing = existingRows[template.id]
        const note = String(notes[template.id] || '').trim()
        const imageUrl = hasIssue
          ? await uploadEvidence(template.id, files[template.id])
          : (existing?.image_url || null)

        let maintenanceRequestId = existing?.maintenance_request_id || null

        if (hasIssue) {
          maintenanceRequestId = await createOrUpdateMaintenance({
            template,
            existingCompletion: existing,
            imageUrl,
            note
          })
        } else if (maintenanceRequestId) {
          await closeLinkedMaintenance(maintenanceRequestId)
        }

        const completionPayload = {
          branch_id: selectedBranchId,
          type: selectedType,
          date: today,
          template_id: template.id,
          is_completed: answer === true,
          completed_by: userId,
          completed_at: now,
          has_issue: hasIssue,
          notes: note || null,
          image_url: imageUrl,
          maintenance_request_id: maintenanceRequestId
        }

        if (existing?.id) {
          const update = await supabase
            .from('checklist_completions')
            .update(completionPayload)
            .eq('id', existing.id)

          if (update.error) throw new Error(update.error.message)
        } else {
          const insert = await supabase
            .from('checklist_completions')
            .insert([completionPayload])

          if (insert.error) throw new Error(insert.error.message)
        }
      }

      await startTour()
      setMessage(tr.saved)
    } catch (saveError) {
      setError(`${tr.saveError}: ${saveError.message}`)
    } finally {
      setSaving(false)
    }
  }

  function resetSelection() {
    Object.values(previews).forEach(url => {
      if (url) URL.revokeObjectURL(url)
    })

    setStarted(false)
    setAnswers({})
    setNotes({})
    setFiles({})
    setPreviews({})
    setSavedImages({})
    setExistingRows({})
    setMessage('')
    setError('')
  }

  if (loading) {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={centerStateStyle}>
        {tr.loading}
      </div>
    )
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{
        fontFamily: 'Tajawal',
        maxWidth: 760,
        margin: '0 auto'
      }}
    >
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>{tr.title}</h2>
          <div style={subtitleStyle}>{tr.subtitle}</div>
        </div>

        <button onClick={loadSetup} style={outlineButtonStyle}>
          🔄 {tr.refresh}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠️ {error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      {!started ? (
        <div style={cardStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tr.branch}</label>
            <select
              value={selectedBranchId}
              onChange={event => setSelectedBranchId(event.target.value)}
              style={selectStyle}
            >
              <option value="">{tr.chooseBranch}</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branchLabel(branch)}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{tr.type}</label>
            <select
              value={selectedType}
              onChange={event => setSelectedType(event.target.value)}
              style={selectStyle}
            >
              <option value="">{tr.chooseType}</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {typeLabel(type, lang)}
                </option>
              ))}
            </select>
          </div>

          <div style={dateBoxStyle}>
            📅 {tr.currentDate}: <strong>{today}</strong>
          </div>

          {branches.length === 0 && <div style={emptyStyle}>{tr.noBranches}</div>}
          {selectedType && selectedTemplates.length === 0 && (
            <div style={emptyStyle}>{tr.noTemplates}</div>
          )}

          <button
            onClick={startTour}
            disabled={!selectedBranchId || !selectedType || selectedTemplates.length === 0}
            style={{
              ...primaryButtonStyle,
              opacity:
                !selectedBranchId || !selectedType || selectedTemplates.length === 0
                  ? 0.45
                  : 1
            }}
          >
            {tr.start}
          </button>
        </div>
      ) : (
        <>
          <div style={summaryCardStyle}>
            <div>
              <div style={smallLabelStyle}>{tr.branch}</div>
              <strong>{selectedBranchName}</strong>
            </div>

            <div>
              <div style={smallLabelStyle}>{tr.type}</div>
              <strong>{typeLabel(selectedType, lang)}</strong>
            </div>

            <button onClick={resetSelection} style={linkButtonStyle}>
              {tr.back}
            </button>
          </div>

          <div style={progressCardStyle}>
            <div style={progressHeaderStyle}>
              <strong>{tr.progress}</strong>
              <strong style={{ color: healthColor(progress) }}>{progress}%</strong>
            </div>

            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressFillStyle,
                  width: `${progress}%`,
                  background: healthColor(progress)
                }}
              />
            </div>

            <div style={progressMetaStyle}>
              <span>✅ {compliantCount} {tr.compliant}</span>
              <span>❌ {issueCount} {tr.issue}</span>
              <span>⏳ {remainingCount} {tr.remaining}</span>
            </div>
          </div>

          <div style={hintStyle}>{tr.issueHint}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedTemplates.map((template, index) => {
              const answer = answers[template.id]
              const hasIssue = answer === false
              const compliant = answer === true
              const title =
                lang === 'ar'
                  ? template.item_ar
                  : template.item_en || template.item_ar

              const displayedImage = previews[template.id] || savedImages[template.id]

              return (
                <div
                  key={template.id}
                  style={{
                    ...itemCardStyle,
                    borderInlineStart: `5px solid ${
                      hasIssue
                        ? 'var(--danger)'
                        : compliant
                          ? 'var(--success)'
                          : '#ddd'
                    }`
                  }}
                >
                  <div style={itemHeaderStyle}>
                    <div style={itemNumberStyle}>{index + 1}</div>
                    <div style={itemTitleStyle}>{title}</div>
                  </div>

                  <div style={answerRowStyle}>
                    <button
                      type="button"
                      onClick={() => setAnswer(template.id, true)}
                      style={{
                        ...answerButtonStyle,
                        background: compliant ? 'var(--success)' : '#f3f3f3',
                        color: compliant ? 'white' : '#666'
                      }}
                    >
                      ✅ {tr.compliant}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswer(template.id, false)}
                      style={{
                        ...answerButtonStyle,
                        background: hasIssue ? 'var(--danger)' : '#f3f3f3',
                        color: hasIssue ? 'white' : '#666'
                      }}
                    >
                      ❌ {tr.issue}
                    </button>
                  </div>

                  {answer === null || answer === undefined ? (
                    <div style={notReviewedStyle}>{tr.selectStatus}</div>
                  ) : null}

                  {hasIssue && (
                    <div style={issuePanelStyle}>
                      <label style={labelStyle}>{tr.notes}</label>
                      <textarea
                        value={notes[template.id] || ''}
                        onChange={event => updateNote(template.id, event.target.value)}
                        placeholder={tr.notesPlaceholder}
                        style={textareaStyle}
                      />

                      <label style={photoButtonStyle}>
                        {displayedImage ? tr.replacePhoto : tr.photo}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          onChange={event => handleFile(template.id, event)}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {displayedImage && (
                        <div style={{ marginTop: 10 }}>
                          <img
                            src={displayedImage}
                            alt={tr.savedImage}
                            style={imageStyle}
                          />

                          {previews[template.id] && (
                            <button
                              type="button"
                              onClick={() => removeNewFile(template.id)}
                              style={removePhotoButtonStyle}
                            >
                              {tr.removePhoto}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {progress === 100 && totalCount > 0 && (
            <div style={allDoneStyle}>{tr.allReviewed}</div>
          )}

          <button
            onClick={saveTour}
            disabled={saving || reviewedCount === 0}
            style={{
              ...primaryButtonStyle,
              marginTop: 18,
              opacity: saving || reviewedCount === 0 ? 0.55 : 1
            }}
          >
            {saving ? tr.saving : `💾 ${tr.save}`}
          </button>
        </>
      )}
    </div>
  )
}

function healthColor(score) {
  if (score >= 85) return 'var(--success)'
  if (score >= 60) return 'var(--gold)'
  return 'var(--danger)'
}

const centerStateStyle = {
  textAlign: 'center',
  color: '#999',
  padding: 60,
  fontFamily: 'Tajawal'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 18
}

const titleStyle = {
  margin: 0,
  color: 'var(--purple)',
  fontSize: 23
}

const subtitleStyle = {
  color: '#888',
  fontSize: 13,
  marginTop: 5,
  lineHeight: 1.7
}

const cardStyle = {
  background: 'white',
  borderRadius: 16,
  padding: 18,
  boxShadow: '0 2px 10px rgba(0,0,0,0.07)'
}

const fieldStyle = {
  marginBottom: 14
}

const labelStyle = {
  display: 'block',
  color: 'var(--purple)',
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 6
}

const selectStyle = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #ddd',
  borderRadius: 10,
  fontFamily: 'Tajawal',
  fontSize: 14,
  background: 'white',
  boxSizing: 'border-box'
}

const dateBoxStyle = {
  background: '#f7f4fb',
  color: '#666',
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
  fontSize: 13
}

const primaryButtonStyle = {
  width: '100%',
  padding: '12px 18px',
  border: 'none',
  borderRadius: 24,
  background: 'var(--purple)',
  color: 'white',
  fontFamily: 'Tajawal',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer'
}

const outlineButtonStyle = {
  padding: '7px 14px',
  borderRadius: 20,
  background: 'white',
  color: 'var(--purple)',
  border: '1px solid var(--purple)',
  fontFamily: 'Tajawal',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
}

const summaryCardStyle = {
  background: 'white',
  borderRadius: 14,
  padding: 14,
  marginBottom: 12,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  gap: 12,
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const smallLabelStyle = {
  color: '#999',
  fontSize: 11,
  marginBottom: 3
}

const linkButtonStyle = {
  border: 'none',
  background: '#f3eefb',
  color: 'var(--purple)',
  borderRadius: 16,
  padding: '7px 10px',
  fontFamily: 'Tajawal',
  fontSize: 11,
  cursor: 'pointer'
}

const progressCardStyle = {
  background: 'white',
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const progressHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 10
}

const progressTrackStyle = {
  height: 10,
  background: '#ececec',
  borderRadius: 20,
  overflow: 'hidden'
}

const progressFillStyle = {
  height: '100%',
  borderRadius: 20,
  transition: 'width 0.25s ease'
}

const progressMetaStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  flexWrap: 'wrap',
  color: '#888',
  fontSize: 11,
  marginTop: 9
}

const hintStyle = {
  background: '#fff8e1',
  color: '#9b6d00',
  padding: 11,
  borderRadius: 10,
  marginBottom: 12,
  fontSize: 12,
  lineHeight: 1.7
}

const itemCardStyle = {
  background: 'white',
  borderRadius: 14,
  padding: 14,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const itemHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12
}

const itemNumberStyle = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#f3eefb',
  color: 'var(--purple)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0
}

const itemTitleStyle = {
  color: '#333',
  fontWeight: 700,
  fontSize: 14,
  lineHeight: 1.6
}

const answerRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8
}

const answerButtonStyle = {
  padding: '9px 10px',
  border: 'none',
  borderRadius: 10,
  fontFamily: 'Tajawal',
  fontWeight: 700,
  cursor: 'pointer'
}

const notReviewedStyle = {
  color: '#999',
  textAlign: 'center',
  marginTop: 8,
  fontSize: 11
}

const issuePanelStyle = {
  background: '#fff7f7',
  borderRadius: 12,
  padding: 12,
  marginTop: 12
}

const textareaStyle = {
  width: '100%',
  minHeight: 86,
  resize: 'vertical',
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 10,
  fontFamily: 'Tajawal',
  fontSize: 13,
  boxSizing: 'border-box'
}

const photoButtonStyle = {
  display: 'block',
  marginTop: 10,
  padding: 9,
  textAlign: 'center',
  border: '1px dashed var(--purple)',
  color: 'var(--purple)',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12
}

const imageStyle = {
  width: '100%',
  maxHeight: 260,
  objectFit: 'cover',
  borderRadius: 10,
  display: 'block'
}

const removePhotoButtonStyle = {
  width: '100%',
  marginTop: 7,
  border: 'none',
  background: '#fce4ec',
  color: 'var(--danger)',
  borderRadius: 8,
  padding: 7,
  fontFamily: 'Tajawal',
  cursor: 'pointer',
  fontSize: 11
}

const emptyStyle = {
  background: '#fff8e1',
  color: '#9b6d00',
  borderRadius: 12,
  padding: 18,
  textAlign: 'center',
  fontSize: 13,
  marginBottom: 14
}

const errorStyle = {
  background: '#fce4ec',
  color: 'var(--danger)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 14,
  fontSize: 13
}

const successStyle = {
  background: '#e8f5e9',
  color: 'var(--success)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 14,
  fontSize: 13,
  fontWeight: 700
}

const allDoneStyle = {
  background: '#e8f5e9',
  color: 'var(--success)',
  borderRadius: 12,
  padding: 14,
  textAlign: 'center',
  marginTop: 14,
  fontWeight: 700,
  fontSize: 13
}
