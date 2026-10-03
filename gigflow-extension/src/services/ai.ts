/**
 * AI Proposal Generation — calls Gemini directly from the extension.
 * No server proxy needed; API key stored in chrome.storage.local.
 */

interface Gig {
  title: string;
  description: string;
  budget: string | null;
  requiredSkills: string | null;
  platform: string;
}

interface GenerateOptions {
  gig: Gig;
  userSkills: string[];
  userName: string;
  userBio: string;
  apiKey: string;
  language: 'arabic' | 'english';
}

export async function generateProposal(opts: GenerateOptions): Promise<string> {
  const { gig, userSkills, userName, userBio, apiKey, language } = opts;

  const isArabic = language === 'arabic';

  const prompt = isArabic
    ? `أنت مستقل محترف. اكتب عرضاً مقنعاً لهذا الطلب بالعربية.

**بيانات الطلب:**
المنصة: ${gig.platform}
العنوان: ${gig.title}
الوصف: ${gig.description}
الميزانية: ${gig.budget || 'غير محددة'}
المهارات المطلوبة: ${gig.requiredSkills || 'غير محددة'}

**بيانات المستقل:**
الاسم: ${userName}
نبذة: ${userBio}
المهارات: ${userSkills.join(', ')}

اكتب عرضاً احترافياً موجزاً (150-250 كلمة) يتضمن:
1. تحية شخصية
2. فهمك للمشروع
3. لماذا أنت الأنسب (اذكر مهاراتك المتطابقة)
4. خطوات العمل باختصار
5. دعوة للتواصل

لا تضف أي شروحات خارج نص العرض.`
    : `You are a professional freelancer. Write a compelling proposal for this job in English.

**Job Details:**
Platform: ${gig.platform}
Title: ${gig.title}
Description: ${gig.description}
Budget: ${gig.budget || 'Not specified'}
Required Skills: ${gig.requiredSkills || 'Not specified'}

**Freelancer Info:**
Name: ${userName}
Bio: ${userBio}
Skills: ${userSkills.join(', ')}

Write a professional proposal (150-250 words) including:
1. Personal greeting
2. Understanding of the project
3. Why you're the best fit (mention matching skills)
4. Brief work plan
5. Call to action

Return only the proposal text, no extra commentary.`;

  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = new Error((err as any)?.error?.message || `Gemini API error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error('Empty response from Gemini');
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      if (res.ok) return true;
    } catch {}
  }
  return false;
}

