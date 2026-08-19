// Realistic sample data so the UI renders on static hosts (GitHub Pages)
// where no backend is available. On Vercel the page wrappers fetch live data
// from the API and fall back to these when the API is unreachable.

export interface Gig {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  url: string;
  platform: string;
  requiredSkills: string | null;
  scrapedAt: string;
  status: string;
  proposal: string | null;
  matchScore?: number | null;
}

export const DEMO_USER = {
  email: "demo@gigflow.app",
  name: "Demo Freelancer",
  bio: "Full-stack developer specializing in React, Node.js and Arabic-localized products. 5+ years building freelance web apps.",
  skills: "React,TypeScript,Node.js,Next.js,TailwindCSS,UI Design",
};

export const DEMO_SKILLS = DEMO_USER.skills.split(",");

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();

export const DEMO_GIGS: Gig[] = [
  {
    id: "g1",
    title: "تطوير واجهة لوحة تحكم بإستخدام React و TypeScript",
    description:
      "أحتاج إلى مطور لتطوير واجهة لوحة تحكم متكاملة باستخدام React و TypeScript مع رسوم بيانية تفاعلية. يجب أن تكون الواجه متجاوبة بالكامل وتدعم RTL.",
    budget: "1500",
    url: "https://mostaql.com/projects/demo-1",
    platform: "Mostaql",
    requiredSkills: "React,TypeScript,UI Design,TailwindCSS",
    scrapedAt: days(0),
    status: "NEW",
    proposal: null,
    matchScore: 92,
  },
  {
    id: "g2",
    title: "تصميم وتطوير متجر إلكتروني بـ Next.js",
    description:
      "متجر إلكتروني متكامل باستخدام Next.js مع بوابة دفع ولوحة تحكم للمنتجات. البحث عن مطور خبرته في Next.js و SEO.",
    budget: "3000",
    url: "https://mostaql.com/projects/demo-2",
    platform: "Mostaql",
    requiredSkills: "Next.js,React,Node.js,SEO",
    scrapedAt: days(1),
    status: "VIEWED",
    proposal: null,
    matchScore: 88,
  },
  {
    id: "g3",
    title: "تطبيق جوال بـ React Native لإدارة المهام",
    description:
      "تطبيق مهام بإشعارات وتزامن سحابي. التصميم جاهز في Figma. أبحث عن مطور React Native محترف.",
    budget: "2000",
    url: "https://mostaql.com/projects/demo-3",
    platform: "Mostaql",
    requiredSkills: "React Native,React,UI Design",
    scrapedAt: days(2),
    status: "APPLIED",
    proposal:
      "مرحباً، لدي خبرة واسعة في تطوير تطبيقات React Native ويمكنني تنفيذ تطبيق إدارة المهام مع الإشعارات والتزامن السحابي خلال أسبوعين.",
    matchScore: 75,
  },
  {
    id: "g4",
    title: "واجهة برمجة تطبيقات بـ Node.js و PostgreSQL",
    description:
      "بناء REST API كامل باستخدام Node.js و Express مع قاعدة بيانات PostgreSQL ومصادقة JWT.",
    budget: "1800",
    url: "https://mostaql.com/projects/demo-4",
    platform: "Khamsat",
    requiredSkills: "Node.js,PostgreSQL,Django",
    scrapedAt: days(3),
    status: "NEW",
    proposal: null,
    matchScore: 60,
  },
  {
    id: "g5",
    title: "تحسين أداء تطبيق React القائم",
    description:
      "تطبيق React بطيء ويحتاج لتحسين الأداء، إعادة هيكلة المكونات واستخدام memoization وتقسيم الكود.",
    budget: "800",
    url: "https://mostaql.com/projects/demo-5",
    platform: "Mostaql",
    requiredSkills: "React,TypeScript",
    scrapedAt: days(5),
    status: "ARCHIVED",
    proposal: null,
    matchScore: 95,
  },
  {
    id: "g6",
    title: "موقع تعريفي بشركة بـ Next.js وتصميم عصري",
    description:
      "موقع تعريفي احترافي بصفحات متعددة، حركات سلسة، وتصميم متجاوب. أبحث عن مصمم/مطور UI.",
    budget: "1200",
    url: "https://mostaql.com/projects/demo-6",
    platform: "Mostaql",
    requiredSkills: "Next.js,UI Design,TailwindCSS",
    scrapedAt: days(7),
    status: "VIEWED",
    proposal: null,
    matchScore: 82,
  },
];

export const DEMO_STATS = {
  totalGigs: DEMO_GIGS.length,
  newGigs: DEMO_GIGS.filter((g) => g.status === "NEW").length,
  appliedGigs: DEMO_GIGS.filter((g) => g.status === "APPLIED").length,
  archivedGigs: DEMO_GIGS.filter((g) => g.status === "ARCHIVED").length,
};
