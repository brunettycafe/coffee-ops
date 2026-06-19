import React, { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Announcements from './pages/Announcements.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Sales from './pages/Sales.jsx'
import Waste from './pages/Waste.jsx'
import KPI from './pages/KPI.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

export const t = {
  ar: {
    dashboard: 'الرئيسية', sales: 'المبيعات', waste: 'الهدر', tasks: 'المهام',
    kpi: 'الأداء', announcements: 'التوجيهات', admin: 'الإدارة', logout: 'خروج',
    dashTitle: 'لوحة المتابعة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
    totalSales: 'إجمالي المبيعات', targetAchieve: 'نسبة تحقيق الهدف', tasksDone: 'إنجاز المهام',
    noTarget: 'لا يوجد هدف مسجل', noSales: 'لا توجد مبيعات مسجلة لهذه الفترة',
    addSalesHint: 'أضف مبيعات من صفحة المبيعات', branchPerf: 'أداء الفروع',
    wasteTotal: 'إجمالي الهدر', noWaste: 'لا يوجد هدر مسجل', loading: 'جاري التحميل...',
    excellent: '🟢 ممتاز', good: '🟡 جيد', belowTarget: '🔴 دون الهدف',
    target: 'الهدف', noSalesBranch: 'لا توجد مبيعات',
    salesTitle: 'المبيعات', edit: '✏️ تعديل', save: '💾 حفظ', saving: 'جاري الحفظ...',
    cancel: 'إلغاء', actualSales: 'المبيعات الفعلية (ر.س)', targetSAR: 'الهدف (ر.س)',
    notEntered: 'لم يُدخل بعد', totalTarget: 'إجمالي الهدف', achieveRate: 'نسبة التحقيق',
    wasteTitle: '🗑️ الهدر', addWaste: '+ إضافة', newWaste: 'تسجيل هدر جديد',
    itemName: 'اسم الصنف *', quantity: 'الكمية', cost: 'التكلفة (ر.س) *',
    notes: 'ملاحظات (اختياري)', noWasteToday: 'لا يوجد هدر مسجل لهذا اليوم', all: 'الكل',
    tasksTitle: 'المهام', templates: '⚙️ القوالب', tasksList: '📋 المهام', add: '+ إضافة',
    morning: '🌅 صباحي', evening: '🌙 مسائي', noTasks: 'لا توجد مهام لهذا الشفت',
    shiftProgress: 'إنجاز الشفت', task: 'مهمة', taskNameAr: 'اسم المهمة بالعربي *',
    taskNameEn: 'Task name in English', assignee: 'المسؤول (اختياري)',
    roles: 'الأدوار (اختر واحد أو أكثر):', newTask: 'مهمة جديدة', editTask: 'تعديل المهمة',
    newTemplate: 'قالب جديد', editTemplate: 'تعديل القالب', saveTemplate: 'حفظ القالب',
    templatesNote: '⚙️ القوالب هي المهام الثابتة التي تتولد تلقائياً كل يوم',
    noTemplates: 'لا توجد قوالب بعد — أضف أول مهمة ثابتة',
    kpiTitle: '📊 مؤشرات الأداء', metrics: '⚙️ البنود', reviews: '📋 التقييمات',
    addMetric: '+ إضافة بند', metricName: 'اسم البند (مثل: الالتزام بالوقت)',
    weight: 'الوزن (%)', weightWarning: 'مجموع الأوزان:', preferHundred: '(يُفضل 100%)',
    saveReview: '💾 حفظ التقييم', expectedResult: 'النتيجة المتوقعة',
    notRated: 'لم يُقيَّم', rate: 'تقييم', noMetrics: 'لا توجد بنود — أضف بنود من ⚙️ البنود',
    noStaff: 'لا يوجد موظفون', back: '← رجوع',
    announcementsTitle: 'التوجيهات والملاحظات', newAnnouncement: '+ توجيه جديد',
    publishAnnouncement: 'نشر التوجيه', announcementTitle: 'العنوان',
    announcementBody: 'محتوى التوجيه...', noAnnouncements: 'لا توجد توجيهات بعد',
    priority: 'الأولوية', branch: 'الفرع', high: 'عالي', medium: 'متوسط', low: 'منخفض',
    adminTitle: 'لوحة الإدارة', pendingRequests: 'طلبات التسجيل المعلقة',
    noPending: 'لا توجد طلبات معلقة', approve: '✓ قبول', reject: '✕ رفض',
    activeStaff: 'الموظفون النشطون', noStaffYet: 'لا يوجد موظفون مسجلون بعد',
    owner: 'مالك', employee: 'موظف', delete: 'حذف',
    systemName: 'نظام إدارة برونتي كافيه', username: 'الاسم', password: 'كلمة المرور',
    loginBtn: 'دخول', loggingIn: 'جاري الدخول...', noAccount: 'ماعندك حساب؟',
    registerNow: 'سجل الآن', nameAr: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي',
    sendRequest: 'إرسال طلب التسجيل', sending: 'جاري الإرسال...', backToLogin: 'رجوع لتسجيل الدخول',
    wrongCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    pendingApproval: 'حسابك قيد المراجعة — انتظر موافقة المالك',
    enterNamePassword: 'أدخل الاسم وكلمة المرور', registerError: 'حدث خطأ — حاول مرة أخرى',
    requestSent: 'تم إرسال طلب التسجيل — انتظر موافقة المالك',
  },
  en: {
    dashboard: 'Dashboard', sales: 'Sales', waste: 'Waste', tasks: 'Tasks',
    kpi: 'Performance', announcements: 'Directives', admin: 'Admin', logout: 'Logout',
    dashTitle: 'Overview', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
    totalSales: 'Total Sales', targetAchieve: 'Target Achievement', tasksDone: 'Tasks Done',
    noTarget: 'No target set', noSales: 'No sales recorded for this period',
    addSalesHint: 'Add sales from the Sales page', branchPerf: 'Branch Performance',
    wasteTotal: 'Total Waste', noWaste: 'No waste recorded', loading: 'Loading...',
    excellent: '🟢 Excellent', good: '🟡 Good', belowTarget: '🔴 Below Target',
    target: 'Target', noSalesBranch: 'No sales',
    salesTitle: 'Sales', edit: '✏️ Edit', save: '💾 Save', saving: 'Saving...',
    cancel: 'Cancel', actualSales: 'Actual Sales (SAR)', targetSAR: 'Target (SAR)',
    notEntered: 'Not entered yet', totalTarget: 'Total Target', achieveRate: 'Achievement Rate',
    wasteTitle: '🗑️ Waste', addWaste: '+ Add', newWaste: 'Log New Waste',
    itemName: 'Item Name *', quantity: 'Quantity', cost: 'Cost (SAR) *',
    notes: 'Notes (optional)', noWasteToday: 'No waste logged today', all: 'All',
    tasksTitle: 'Tasks', templates: '⚙️ Templates', tasksList: '📋 Tasks', add: '+ Add',
    morning: '🌅 Morning', evening: '🌙 Evening', noTasks: 'No tasks for this shift',
    shiftProgress: 'Shift Progress', task: 'task', taskNameAr: 'Task name in Arabic *',
    taskNameEn: 'Task name in English', assignee: 'Assignee (optional)',
    roles: 'Roles (select one or more):', newTask: 'New Task', editTask: 'Edit Task',
    newTemplate: 'New Template', editTemplate: 'Edit Template', saveTemplate: 'Save Template',
    templatesNote: '⚙️ Templates are recurring tasks auto-generated daily',
    noTemplates: 'No templates yet — add your first recurring task',
    kpiTitle: '📊 Performance Indicators', metrics: '⚙️ Metrics', reviews: '📋 Reviews',
    addMetric: '+ Add Metric', metricName: 'Metric name (e.g. Punctuality)',
    weight: 'Weight (%)', weightWarning: 'Total weight:', preferHundred: '(ideally 100%)',
    saveReview: '💾 Save Review', expectedResult: 'Expected Score',
    notRated: 'Not rated', rate: 'Review', noMetrics: 'No metrics — add metrics from ⚙️ Metrics',
    noStaff: 'No staff found', back: '← Back',
    announcementsTitle: 'Directives & Notes', newAnnouncement: '+ New Directive',
    publishAnnouncement: 'Publish', announcementTitle: 'Title',
    announcementBody: 'Directive content...', noAnnouncements: 'No directives yet',
    priority: 'Priority', branch: 'Branch', high: 'High', medium: 'Medium', low: 'Low',
    adminTitle: 'Admin Panel', pendingRequests: 'Pending Registrations',
    noPending: 'No pending requests', approve: '✓ Approve', reject: '✕ Reject',
    activeStaff: 'Active Staff', noStaffYet: 'No staff registered yet',
    owner: 'Owner', employee: 'Employee', delete: 'Delete',
    systemName: 'Bronti Cafe Management System', username: 'Name', password: 'Password',
    loginBtn: 'Login', loggingIn: 'Logging in...', noAccount: "Don't have an account?",
    registerNow: 'Register', nameAr: 'Name in Arabic', nameEn: 'Name in English',
    sendRequest: 'Send Registration Request', sending: 'Sending...', backToLogin: 'Back to Login',
    wrongCredentials: 'Incorrect username or password',
    pendingApproval: 'Your account is pending approval',
    enterNamePassword: 'Enter name and password', registerError: 'An error occurred — try again',
    requestSent: 'Registration request sent — await owner approval',
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [lang, setLang] = useState('ar')

  if (!user) return <Login onLogin={setUser} lang={lang} setLang={setLang} />

  const tr = t[lang]

  const navItems = [
    { key: 'dashboard', label: tr.dashboard },
    { key: 'sales', label: tr.sales },
    { key: 'waste', label: tr.waste },
    { key: 'tasks', label: tr.tasks },
    { key: 'kpi', label: tr.kpi },
    { key: 'leaderboard', label: lang === 'ar' ? '🏆 التحفيز' : '🏆 Leaderboard' },
    { key: 'announcements', label: tr.announcements },
    ...(user.role === 'owner' ? [{ key: 'admin', label: tr.admin }] : [])
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <nav style={{ background: 'var(--purple)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 20 }}>BRONTI OS</span>
        <div style={{ display: 'flex', gap: 16 }}>
          {navItems.map(({ key, label }) => (
            <button key={key} onClick={() => setPage(key)} style={{ background: page === key ? 'var(--gold)' : 'transparent', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 14 }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}>{lang === 'ar' ? 'EN' : 'ع'}</button>
          <button onClick={() => setUser(null)} style={{ background: 'transparent', color: '#ccc', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal' }}>{tr.logout}</button>
        </div>
      </nav>
      <main style={{ padding: 24 }}>
        {page === 'dashboard' && <Dashboard user={user} lang={lang} />}
        {page === 'sales' && <Sales user={user} lang={lang} />}
        {page === 'waste' && <Waste user={user} lang={lang} />}
        {page === 'kpi' && <KPI user={user} lang={lang} />}
        {page === 'tasks' && <Tasks user={user} lang={lang} />}
        {page === 'announcements' && <Announcements user={user} lang={lang} />}
        {page === 'leaderboard' && <Leaderboard lang={lang} />}
        {page === 'admin' && user.role === 'owner' && <AdminPanel lang={lang} />}
      </main>
    </div>
  )
}

