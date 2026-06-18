import React, { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Announcements from './pages/Announcements.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Sales from './pages/Sales.jsx'
import Waste from './pages/Waste.jsx'
import KPI from './pages/KPI.jsx'

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
