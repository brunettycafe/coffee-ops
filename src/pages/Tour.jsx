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

function riyadhNowISO() {
  return new Date().toISOString()
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

function typeLabel(type) {
  const labels = {
    morning: 'صباحية',
    evening: 'مسائية',
    opening: 'افتتاح',
    closing: 'إغلاق',
    quality: 'جودة',
    cleanliness: 'نظافة',
    maintenance: 'صيانة',
    operations: 'تشغيل'
  }

  return labels[String(type || '').toLowerCase()] || type || 'عام'
}

const text = {
  ar: {
    title: '🚶 جولة التشغيل',
    subtitle: 'اختر الفرع ونوع الجولة، ثم نفّذ نقاط الفحص واحفظ النتائج.',
    branch: 'الفرع',
    type: 'نوع الجولة',
    chooseBranch: 'اختر الفرع',
    chooseType: 'اختر نوع الجولة',
    start: 'بدء الجولة',
    refresh: 'تحديث',
    loading: 'جاري التحميل...',
    noBranches: 'لا توجد فروع متاحة.',
    noTemplates: 'لا توجد بنود فعّالة لهذا النوع.',
    progress: 'نسبة الإنجاز',
    completed: 'مكتمل',
    pending: 'غير مكتمل',
    save: 'حفظ الجولة',
    saving: 'جاري الحفظ...',
    saved: 'تم حفظ الجولة بنجاح ✅',
    saveError: 'تعذر حفظ الجولة',
    loadError: 'تعذر تحميل بيانات الجولة',
    back: 'تغيير الفرع أو النوع',
    allDone: 'اكتملت جميع نقاط الجولة ✅',
    remaining: 'نقاط متبقية',
    item: 'بند',
    currentDate: 'تاريخ الجولة'
  },
  en: {
    title: '🚶 Operations Tour',
    subtitle: 'Choose a branch and checklist type, complete the items, then save.',
    branch: 'Branch',
    type: 'Tour Type',
    chooseBranch: 'Choose branch',
    chooseType: 'Choose type',
    start: 'Start Tour',
    refresh: 'Refresh',
    loading: 'Loading...',
    noBranches: 'No branches available.',
    noTemplates: 'No active checklist items for this type.',
    progress: 'Progress',
    completed: 'Completed',
    pending: 'Pending',
    save: 'Save Tour',
    saving: 'Saving...',
    saved: 'Tour saved successfully ✅',
    saveError: 'Could not save tour',
    loadError: 'Could not load tour data',
    back: 'Change branch or type',
    allDone: 'All checklist items completed ✅',
    remaining: 'items remaining',
    item: 'item',
    currentDate: 'Tour date'
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

  const [answers, setAnswers] = useState({})
  const [existingRows, setExistingRows] = useState({})

  useEffect(() => {
    loadSetup()
  }, [])

  async function loadSetup() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const [branchesResult, templatesResult] = await Promise.all([
        supabase.from('branches').select('*'),
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

  const completedCount = selectedTemplates.filter(item => answers[item.id] === true).length
  const totalCount = selectedTemplates.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const remainingCount = Math.max(totalCount - completedCount, 0)

  async function startTour() {
    if (!selectedBranchId || !selectedType) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase
        .from('checklist_completions')
        .select('id, branch_id, type, date, template_id, is_completed, completed_by, completed_at')
        .eq('branch_id', selectedBranchId)
        .eq('type', selectedType)
        .eq('date', today)

      if (result.error) {
        throw new Error(result.error.message)
      }

      const rows = result.data || []
      const rowMap = {}
      const answerMap = {}

      rows.forEach(row => {
        rowMap[row.template_id] = row
        answerMap[row.template_id] = Boolean(row.is_completed)
      })

      selectedTemplates.forEach(template => {
        if (!(template.id in answerMap)) {
          answerMap[template.id] = false
        }
      })

      setExistingRows(rowMap)
      setAnswers(answerMap)
      setStarted(true)
    } catch (startError) {
      setError(`${tr.loadError}: ${startError.message}`)
    } finally {
      setLoading(false)
    }
  }

  function toggleAnswer(templateId) {
    setMessage('')
    setAnswers(previous => ({
      ...previous,
      [templateId]: !previous[templateId]
    }))
  }

  async function saveTour() {
    if (!selectedBranchId || !selectedType || selectedTemplates.length === 0) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const userId = isUuid(user?.id) ? user.id : null
      const now = riyadhNowISO()

      const updates = []
      const inserts = []

      selectedTemplates.forEach(template => {
        const isCompleted = Boolean(answers[template.id])
        const existing = existingRows[template.id]

        const payload = {
          branch_id: selectedBranchId,
          type: selectedType,
          date: today,
          template_id: template.id,
          is_completed: isCompleted,
          completed_by: isCompleted ? userId : null,
          completed_at: isCompleted ? now : null
        }

        if (existing?.id) {
          updates.push(
            supabase
              .from('checklist_completions')
              .update({
                is_completed: payload.is_completed,
                completed_by: payload.completed_by,
                completed_at: payload.completed_at
              })
              .eq('id', existing.id)
          )
        } else {
          inserts.push(payload)
        }
      })

      if (updates.length > 0) {
        const updateResults = await Promise.all(updates)
        const updateError = updateResults.find(result => result.error)?.error
        if (updateError) throw new Error(updateError.message)
      }

      if (inserts.length > 0) {
        const insertResult = await supabase
          .from('checklist_completions')
          .insert(inserts)

        if (insertResult.error) {
          throw new Error(insertResult.error.message)
        }
      }

      setMessage(tr.saved)
      await startTour()
      setMessage(tr.saved)
    } catch (saveError) {
      setError(`${tr.saveError}: ${saveError.message}`)
    } finally {
      setSaving(false)
    }
  }

  function resetSelection() {
    setStarted(false)
    setAnswers({})
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

      {error && (
        <div style={errorStyle}>⚠️ {error}</div>
      )}

      {message && (
        <div style={successStyle}>{message}</div>
      )}

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
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div style={dateBoxStyle}>
            📅 {tr.currentDate}: <strong>{today}</strong>
          </div>

          {branches.length === 0 && (
            <div style={emptyStyle}>{tr.noBranches}</div>
          )}

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
              <strong>
                {branchLabel(branches.find(branch => branch.id === selectedBranchId))}
              </strong>
            </div>

            <div>
              <div style={smallLabelStyle}>{tr.type}</div>
              <strong>{typeLabel(selectedType)}</strong>
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
              <span>✅ {completedCount} {tr.completed}</span>
              <span>⏳ {remainingCount} {tr.remaining}</span>
            </div>
          </div>

          {selectedTemplates.length === 0 ? (
            <div style={emptyStyle}>{tr.noTemplates}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedTemplates.map((template, index) => {
                const done = Boolean(answers[template.id])
                const title =
                  lang === 'ar'
                    ? template.item_ar
                    : template.item_en || template.item_ar

                return (
                  <button
                    key={template.id}
                    onClick={() => toggleAnswer(template.id)}
                    style={{
                      ...itemButtonStyle,
                      borderInlineStart: `5px solid ${
                        done ? 'var(--success)' : '#ddd'
                      }`
                    }}
                  >
                    <div style={itemNumberStyle}>{index + 1}</div>

                    <div style={{ flex: 1, textAlign: lang === 'ar' ? 'right' : 'left' }}>
                      <div style={itemTitleStyle}>{title}</div>
                      <div
                        style={{
                          ...itemStatusStyle,
                          color: done ? 'var(--success)' : '#999'
                        }}
                      >
                        {done ? `✅ ${tr.completed}` : `○ ${tr.pending}`}
                      </div>
                    </div>

                    <div
                      style={{
                        ...checkCircleStyle,
                        background: done ? 'var(--success)' : '#f1f1f1',
                        color: done ? 'white' : '#aaa'
                      }}
                    >
                      {done ? '✓' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {progress === 100 && totalCount > 0 && (
            <div style={allDoneStyle}>{tr.allDone}</div>
          )}

          <button
            onClick={saveTour}
            disabled={saving || totalCount === 0}
            style={{
              ...primaryButtonStyle,
              marginTop: 18,
              opacity: saving || totalCount === 0 ? 0.55 : 1
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
  marginBottom: 14,
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
  color: '#888',
  fontSize: 11,
  marginTop: 9
}

const itemButtonStyle = {
  width: '100%',
  background: 'white',
  border: 'none',
  borderRadius: 13,
  padding: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  cursor: 'pointer',
  fontFamily: 'Tajawal'
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

const itemStatusStyle = {
  fontSize: 11,
  marginTop: 3
}

const checkCircleStyle = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  flexShrink: 0
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
