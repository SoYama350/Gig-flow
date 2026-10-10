export type Language = "ar" | "en";

const LANG_STORAGE_KEY = "gigflow_language";

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "ar";
  const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language;
  if (stored === "ar" || stored === "en") return stored;
  return "ar"; // Arabic is the main/default language as requested
}

export function setLanguagePreference(lang: Language) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
}

export const translations = {
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    agentWorkspace: "مساحة الوكيل الذكي",
    gigsFeed: "سوق المشاريع",
    analytics: "التحليلات",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    darkMode: "الوضع الليلي",
    lightMode: "الوضع الفاتح",
    switchLanguage: "English",

    // Agent Workspace
    agentBadge: "الاكتشاف المستقل للمشاريع وتأريض المقترحات",
    agentTitle: "مساحة عمل الوكيل الذكي",
    agentSubtitle:
      "أعطِ تعليماتك باللغة الطبيعية. سيقوم الوكيل بالتخطيط، وجمع المشاريع عبر المحولات المعزولة، والتقييم وفق مهاراتك المعتمدة، ثم كتابة مقترحات مؤرضة تنتظر موافقتك.",
    commandPlaceholder: "مثال: 'ابحث عن 5 مشاريع React وTypeScript على مستقل بميزانيات ممتازة'...",
    executeInstruction: "تنفيذ التعليمات",
    orchestrating: "جاري التخطيط والتنفيذ...",
    quickIntents: "أوامر سريعة مقترحة:",
    intent1: "ابحث عن 5 مشاريع Frontend React على مستقل",
    intent2: "اجمع مشاريع Fullstack Node.js من جميع المنصات",
    intent3: "ابحث عن وظائف عن بعد لمطوري Python أو React",

    // Runs History
    runHistory: "سجل عمليات الوكيل",
    refresh: "تحديث",
    noRuns: "لا توجد عمليات سابقة. اكتب تعليمة أعلاه لتشغيل الوكيل.",

    // Source Adapters
    sourceAdapters: "محولات المصادر (Adapters)",
    check: "فحص",
    latency: "استجابة",
    ready: "جاهز",
    failures: "إخفاقات",
    active: "مفعل",
    disabled: "معطل",

    // Grounding Knowledge Base
    groundingKb: "قاعدة المعرفة والتأريض",
    addGuide: "+ إضافة دليل",
    uploadFile: "رفع ملف من جهازك",
    cancel: "إلغاء",
    docTitlePlaceholder: "اسم الدليل (مثال: أسلوب العروض التنافسية)",
    docContentPlaceholder: "الصق هنا إرشادات العروض، شروطك، روابط سابقة، أو القالب المفضل...",
    saveGuide: "حفظ الدليل في قاعدة المعرفة",
    dropOrClick: "اضغط لرفع ملف (TXT, MD, PDF, JSON)",

    // Candidate Queue
    candidateQueue: "قائمة الفرص والمراجعة البشرية (Human-in-the-Loop)",
    candidateSubtitle: "افحص نسبة ملاءمة الوكيل، والمقترحات المؤرضة، واعتمدها أو ارفضها قبل الإرسال.",
    filterAll: "الكل",
    filterPending: "قيد المراجعة",
    filterApproved: "تم الاعتماد",
    filterRejected: "مرفوض",
    noTasks: "لا توجد مشاريع مطابقة للفلتر في هذه العملية. ابدأ عملية جديدة أو اختر من السجل.",
    match: "ملاءمة",
    approvedBadge: "معتمد ✓",
    rejectedBadge: "مرفوض ✗",
    pendingBadge: "قيد المراجعة",
    budgetNegotiable: "الميزانية قابلة للتفاوض",
    source: "المصدر",
    budget: "الميزانية",
    fit: "الملاءمة",
    rejectBtn: "رفض المشروع",
    approveBtn: "اعتماد المقترح",
    agentFitAssessment: "تقييم الوكيل للملاءمة",
    riskWarnings: "تحذيرات وملاحظات المخاطر",
    groundedDraft: "مسودة المقترح الذكي (قابلة للتعديل)",
    groundedNotice: "مؤرضة بالكامل استناداً لمهاراتك المعتمدة وأدلة قاعدة المعرفة",
    saveDraft: "حفظ التعديلات على المسودة",

    // General Toasts
    agentInitToast: "تم تشغيل الوكيل: التخطيط والجمع جارٍ الآن…",
    agentDoneToast: "اكتملت العملية بنجاح وجرى تقييم الفرص!",
    taskApproved: "تم اعتماد المشروع بنجاح",
    taskRejected: "تم رفض المشروع بنجاح",
    guideSaved: "تم حفظ الدليل في قاعدة المعرفة بنجاح",
    sourceToggled: "تم تغيير حالة المصدر بنجاح",
    fileUploadedSuccess: "تم رفع واستخراج محتوى الملف بنجاح",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    agentWorkspace: "Agent Workspace",
    gigsFeed: "Gigs Feed",
    analytics: "Analytics",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    switchLanguage: "العربية",

    // Agent Workspace
    agentBadge: "Autonomous Freelance Discovery & Grounding",
    agentTitle: "Agent Workspace",
    agentSubtitle:
      "Issue high-level natural language instructions. The agent plans, fetches across isolated adapters, scores against your verified profile, and generates grounded proposals for your approval.",
    commandPlaceholder: "e.g., 'Find 5 React and TypeScript web gigs on Mostaql with high budgets'...",
    executeInstruction: "Execute Instruction",
    orchestrating: "Orchestrating...",
    quickIntents: "Quick intents:",
    intent1: "Find 5 Frontend React gigs on Mostaql",
    intent2: "Collect Fullstack Node.js projects from all sources",
    intent3: "Look for Remote React or Python jobs with good fit",

    // Runs History
    runHistory: "Run History",
    refresh: "Refresh",
    noRuns: "No previous runs. Enter an instruction above to trigger the agent.",

    // Source Adapters
    sourceAdapters: "Source Adapters",
    check: "Check",
    latency: "latency",
    ready: "Ready",
    failures: "failures",
    active: "Active",
    disabled: "Disabled",

    // Grounding Knowledge Base
    groundingKb: "Grounding Knowledge Base",
    addGuide: "+ Add Guide",
    uploadFile: "Upload local file",
    cancel: "Cancel",
    docTitlePlaceholder: "Doc title (e.g., My Upwork Proposal Blueprint)",
    docContentPlaceholder: "Paste proposal guidelines, rules, portfolio links, or preferred structure here...",
    saveGuide: "Save Guide",
    dropOrClick: "Click or drop file (TXT, MD, PDF, JSON)",

    // Candidate Queue
    candidateQueue: "Candidate Queue & Human-in-the-Loop Review",
    candidateSubtitle: "Inspect agent fit scores, grounded proposals, and approve or reject before application.",
    filterAll: "ALL",
    filterPending: "PENDING",
    filterApproved: "APPROVED",
    filterRejected: "REJECTED",
    noTasks: "No candidate tasks matching filter in this run. Start a new run or select another from history.",
    match: "Match",
    approvedBadge: "Approved ✓",
    rejectedBadge: "Rejected ✗",
    pendingBadge: "Pending Review",
    budgetNegotiable: "Budget negotiable",
    source: "Source",
    budget: "Budget",
    fit: "Fit",
    rejectBtn: "Reject",
    approveBtn: "Approve Application",
    agentFitAssessment: "Agent Fit Assessment",
    riskWarnings: "Risk & Boundary Warnings",
    groundedDraft: "Grounded AI Proposal Draft (Editable)",
    groundedNotice: "Grounded strictly in verified skills & knowledge base guidelines",
    saveDraft: "Save Draft Changes",

    // General Toasts
    agentInitToast: "Agent initialized: Planning & Collecting…",
    agentDoneToast: "Agent Run completed with evaluated opportunities!",
    taskApproved: "Task approved successfully",
    taskRejected: "Task rejected successfully",
    guideSaved: "Guide saved to Knowledge Base",
    sourceToggled: "Source toggled",
    fileUploadedSuccess: "File uploaded and parsed successfully",
  },
};
