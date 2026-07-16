import React, { useMemo, useState } from 'react'

const BRANCHES = [
  'الناصرية',
  'النخيل',
  'الربوة',
  'المطار بلازا',
  'الخمسين'
]

const CHECKLIST = [
  {
    category: 'النظافة',
    icon: '🧹',
    items: [
      'نظافة أرضية الفرع',
      'نظافة منطقة التحضير',
      'نظافة بوكس الساندوتش والكروسان',
      'نظافة دورات المياه',
      'نظافة واجهة الفرع'
    ]
  },
  {
    category: 'معدات القهوة',
    icon: '☕',
    items: [
      'تنظيف الطاحونة',
      'تنظيف ماكينة الإسبريسو',
      'نظافة البورتافلتر',
      'معايرة الإسبريسو',
      'سلامة الفلاتر'
    ]
  },
  {
    category: 'الجودة',
    icon: '⭐',
    items: [
      'جودة الإسبريسو',
      'جودة الحليب',
      'جودة الكروسان والساندوتشات',
      'سلامة تواريخ الصلاحية',
      'درجة حرارة الثلاجات'
    ]
  },
  {
    category: 'الموظفون',
    icon: '👥',
    items: [
      'الالتزام بالزي الموحد',
      'النظافة الشخصية',
      'ترتيب الشعر والمظهر',
      'الترحيب بالعملاء',
      'معرفة الموظفين بمهام الشفت'
    ]
  },
  {
    category: 'التشغيل',
    icon: '⚙️',
    items: [
      'توفر المواد الأساسية',
      'عدم وجود أعطال مؤثرة',
      'جاهزية نقاط البيع',
      'سرعة تنفيذ الطلبات',
      'تسجيل المبيعات والمهام'
    ]
  }
]

function createInitialAnswers() {
  const answers = {}

  BRANCHES.forEach(branch => {
    answers[branch] = {}

    CHECKLIST.forEach(section => {
      section.items.forEach(item => {
        answers[branch][item] = null
      })
    })
  })

  return answers
}

function getRiyadhDateTime() {
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh',
    calendar: 'gregory',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date())
}

export default function Tour({ user, lang = 'ar' }) {
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [branchIndex, setBranchIndex] = useState(0)
  const [answers, setAnswers] = useState(createInitialAnswers)
  const [notes, setNotes] = useState({})
  const [photos, setPhotos] = useState({})
  const [startedAt, setStartedAt] = useState(null)

  const currentBranch = BRANCHES[branchIndex]

  const allItems = useMemo(
    () => CHECKLIST.flatMap(section => section.items),
    []
  )

  const branchAnswered = allItems.filter(
    item => answers[currentBranch]?.[item] !== null
  ).length

  const branchPassed = allItems.filter(
    item => answers[currentBranch]?.[item] === true
  ).length

  const branchProgress = Math.round(
    (branchAnswered / allItems.length) * 100
  )

  const totalAnswered = BRANCHES.reduce((total, branch) => {
    return total + allItems.filter(
      item => answers[branch]?.[item] !== null
    ).length
  }, 0)

  const totalItems = BRANCHES.length * allItems.length

  const totalProgress = Math.round(
    (totalAnswered / totalItems) * 100
  )

  function startTour() {
    setStartedAt(new Date().toISOString())
    setStarted(true)
  }

  function updateAnswer(item, value) {
    setAnswers(previous => ({
      ...previous,
      [currentBranch]: {
        ...previous[currentBranch],
        [item]: value
      }
    }))
  }

  function updateNote(value) {
    setNotes(previous => ({
      ...previous,
      [currentBranch]: value
    }))
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    setPhotos(previous => ({
      ...previous,
      [currentBranch]: {
        fileName: file.name,
        previewUrl
      }
    }))
  }

  function goNext() {
    if (branchIndex < BRANCHES.length - 1) {
      setBranchIndex(previous => previous + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    finishTour()
  }

  function goBack() {
    if (branchIndex > 0) {
      setBranchIndex(previous => previous - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function finishTour() {
    const tourReport = {
      id: `tour-${Date.now()}`,
      manager: user?.name || user?.email || 'مدير التشغيل',
      startedAt,
      finishedAt: new Date().toISOString(),
      answers,
      notes,
      progress: totalProgress,
      branches: BRANCHES.map(branch => {
        const passed = allItems.filter(
          item => answers[branch]?.[item] === true
        ).length

        const failed = allItems.filter(
          item => answers[branch]?.[item] === false
        ).length

        return {
          branch,
          passed,
          failed,
          score: Math.round((passed / allItems.length) * 100),
          note: notes[branch] || ''
        }
      })
    }

    const previousTours = JSON.parse(
      localStorage.getItem('bronti_tours') || '[]'
    )

    localStorage.setItem(
      'bronti_tours',
      JSON.stringify([tourReport, ...previousTours])
    )

    setFinished(true)
  }

  function resetTour() {
    setStarted(false)
    setFinished(false)
    setBranchIndex(0)
    setAnswers(createInitialAnswers())
    setNotes({})
    setPhotos({})
    setStartedAt(null)
  }

  if (!started) {
    return (
      <div dir="rtl" style={pageStyle}>
        <div style={welcomeCardStyle}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🚶‍♂️</div>

          <h2 style={titleStyle}>جولة مدير التشغيل</h2>

          <p style={descriptionStyle}>
            نفّذ جولة موحدة على جميع فروع برونتي، وسجّل مستوى
            النظافة والجودة والتشغيل والموظفين.
          </p>

          <div style={informationBoxStyle}>
            <div>📍 عدد الفروع: {BRANCHES.length}</div>
            <div>📋 نقاط الفحص لكل فرع: {allItems.length}</div>
            <div>⏱️ الوقت المتوقع: 10–15 دقيقة لكل فرع</div>
          </div>

          <button onClick={startTour} style={primaryButtonStyle}>
            ابدأ الجولة
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    const branchResults = BRANCHES.map(branch => {
      const passed = allItems.filter(
        item => answers[branch]?.[item] === true
      ).length

      return {
        branch,
        score: Math.round((passed / allItems.length) * 100)
      }
    })

    return (
      <div dir="rtl" style={pageStyle}>
        <div style={welcomeCardStyle}>
          <div style={{ fontSize: 52 }}>✅</div>

          <h2 style={titleStyle}>اكتملت الجولة</h2>

          <p style={descriptionStyle}>
            تم حفظ تقرير الجولة داخل هذا الجهاز.
          </p>

          <div style={{
            ...informationBoxStyle,
            textAlign: 'right'
          }}>
            <div>👤 المنفذ: {user?.name || 'مدير التشغيل'}</div>
            <div>📅 الانتهاء: {getRiyadhDateTime()}</div>
            <div>📊 نسبة استكمال الجولة: {totalProgress}%</div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 20
          }}>
            {branchResults.map(result => (
              <div
                key={result.branch}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderInlineStart: `5px solid ${
                    result.score >= 85
                      ? 'var(--success)'
                      : result.score >= 70
                        ? 'var(--gold)'
                        : 'var(--danger)'
                  }`
                }}
              >
                <strong>📍 {result.branch}</strong>
                <strong>{result.score}%</strong>
              </div>
            ))}
          </div>

          <button onClick={resetTour} style={primaryButtonStyle}>
            بدء جولة جديدة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{
            color: '#888',
            fontSize: 12,
            marginBottom: 4
          }}>
            المحطة {branchIndex + 1} من {BRANCHES.length}
          </div>

          <h2 style={{
            ...titleStyle,
            margin: 0
          }}>
            📍 {currentBranch}
          </h2>
        </div>

        <div style={{
          fontWeight: 700,
          color: 'var(--purple)'
        }}>
          {totalProgress}%
        </div>
      </div>

      <ProgressBar value={totalProgress} />

      <div style={branchSummaryStyle}>
        <div>
          <span style={summaryNumberStyle}>{branchPassed}</span>
          <span style={summaryLabelStyle}> مطابق</span>
        </div>

        <div>
          <span style={summaryNumberStyle}>
            {branchAnswered - branchPassed}
          </span>
          <span style={summaryLabelStyle}> ملاحظة</span>
        </div>

        <div>
          <span style={summaryNumberStyle}>{branchProgress}%</span>
          <span style={summaryLabelStyle}> مكتمل</span>
        </div>
      </div>

      {CHECKLIST.map(section => (
        <div key={section.category} style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {section.icon} {section.category}
          </h3>

          {section.items.map(item => {
            const answer = answers[currentBranch]?.[item]

            return (
              <div key={item} style={itemStyle}>
                <div style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  {item}
                </div>

                <div style={{
                  display: 'flex',
                  gap: 7
                }}>
                  <button
                    onClick={() => updateAnswer(item, true)}
                    style={{
                      ...answerButtonStyle,
                      background:
                        answer === true
                          ? 'var(--success)'
                          : '#f3f3f3',
                      color:
                        answer === true
                          ? 'white'
                          : '#777'
                    }}
                  >
                    ✓
                  </button>

                  <button
                    onClick={() => updateAnswer(item, false)}
                    style={{
                      ...answerButtonStyle,
                      background:
                        answer === false
                          ? 'var(--danger)'
                          : '#f3f3f3',
                      color:
                        answer === false
                          ? 'white'
                          : '#777'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>📝 ملاحظات الفرع</h3>

        <textarea
          value={notes[currentBranch] || ''}
          onChange={event => updateNote(event.target.value)}
          placeholder="اكتب أهم الملاحظات والإجراءات المطلوبة..."
          style={textareaStyle}
        />

        <label style={photoButtonStyle}>
          📷 إضافة صورة
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />
        </label>

        {photos[currentBranch]?.previewUrl && (
          <img
            src={photos[currentBranch].previewUrl}
            alt="ملاحظة الجولة"
            style={{
              width: '100%',
              maxHeight: 240,
              objectFit: 'cover',
              borderRadius: 12,
              marginTop: 12
            }}
          />
        )}
      </div>

      <div style={navigationStyle}>
        <button
          onClick={goBack}
          disabled={branchIndex === 0}
          style={{
            ...secondaryButtonStyle,
            opacity: branchIndex === 0 ? 0.4 : 1
          }}
        >
          السابق
        </button>

        <button onClick={goNext} style={primaryButtonStyle}>
          {branchIndex === BRANCHES.length - 1
            ? 'إنهاء الجولة'
            : 'الفرع التالي'}
        </button>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div style={{
      height: 9,
      background: '#e7e7e7',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 16
    }}>
      <div style={{
        width: `${value}%`,
        height: '100%',
        background: 'var(--purple)',
        transition: 'width 0.3s ease'
      }} />
    </div>
  )
}

const pageStyle = {
  fontFamily: 'Tajawal',
  maxWidth: 760,
  margin: '0 auto'
}

const welcomeCardStyle = {
  background: 'white',
  borderRadius: 18,
  padding: 24,
  textAlign: 'center',
  boxShadow: '0 3px 14px rgba(0,0,0,0.08)'
}

const titleStyle = {
  color: 'var(--purple)',
  fontSize: 23
}

const descriptionStyle = {
  color: '#777',
  lineHeight: 1.9,
  fontSize: 14
}

const informationBoxStyle = {
  background: '#f7f4fb',
  borderRadius: 14,
  padding: 16,
  margin: '18px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  color: '#555',
  fontSize: 14
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12
}

const branchSummaryStyle = {
  background: 'white',
  borderRadius: 14,
  padding: 14,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  textAlign: 'center',
  marginBottom: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const summaryNumberStyle = {
  color: 'var(--purple)',
  fontWeight: 700,
  fontSize: 19
}

const summaryLabelStyle = {
  color: '#888',
  fontSize: 11
}

const sectionStyle = {
  background: 'white',
  borderRadius: 15,
  padding: 16,
  marginBottom: 14,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const sectionTitleStyle = {
  color: 'var(--purple)',
  fontSize: 16,
  margin: '0 0 12px'
}

const itemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '11px 0',
  borderBottom: '1px solid #eee'
}

const answerButtonStyle = {
  width: 38,
  height: 34,
  borderRadius: 9,
  border: 'none',
  fontSize: 18,
  cursor: 'pointer'
}

const textareaStyle = {
  width: '100%',
  minHeight: 100,
  resize: 'vertical',
  padding: 12,
  border: '1px solid #ddd',
  borderRadius: 10,
  fontFamily: 'Tajawal',
  fontSize: 14,
  boxSizing: 'border-box'
}

const photoButtonStyle = {
  display: 'block',
  marginTop: 12,
  padding: 10,
  textAlign: 'center',
  border: '1px dashed var(--purple)',
  color: 'var(--purple)',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
}

const navigationStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  marginTop: 18
}

const primaryButtonStyle = {
  flex: 1,
  padding: '12px 20px',
  borderRadius: 24,
  border: 'none',
  background: 'var(--purple)',
  color: 'white',
  cursor: 'pointer',
  fontFamily: 'Tajawal',
  fontSize: 14,
  fontWeight: 700
}

const secondaryButtonStyle = {
  flex: 1,
  padding: '12px 20px',
  borderRadius: 24,
  border: '1px solid var(--purple)',
  background: 'white',
  color: 'var(--purple)',
  cursor: 'pointer',
  fontFamily: 'Tajawal',
  fontSize: 14,
  fontWeight: 700
}
