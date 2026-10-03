chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PARSE_HTML') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(message.html, 'text/html');
      
      if (message.parserType === 'mostaql-list') {
        const rows = doc.querySelectorAll('.project-row');
        const result = [];
        rows.forEach((row) => {
          const a = row.querySelector('h2 a');
          if (!a) return;
          const title = a.textContent?.trim() || '';
          const href = a.getAttribute('href') || '';
          const url = href.startsWith('http') ? href : `https://mostaql.com${href}`;
          const desc = row.querySelector('p.project__brief')?.textContent?.trim() || '';
          if (title && url) {
            result.push({ title, description: desc, url });
          }
        });
        sendResponse({ ok: true, data: result });
      } else if (message.parserType === 'mostaql-detail') {
        let budget = 'Not specified';
        doc.querySelectorAll('.meta-row').forEach((row) => {
          const label = row.querySelector('.meta-label')?.textContent;
          if (label && label.includes('الميزانية')) {
            budget = row.querySelector('.meta-value span')?.textContent?.trim()
              || row.querySelector('.meta-value')?.textContent?.trim()
              || 'Not specified';
          }
        });
        const skills = [];
        doc.querySelectorAll('.skills.list-tags .skills__item a.tag').forEach((el) => {
          const s = el.textContent?.trim();
          if (s) skills.push(s);
        });
        const description = doc.querySelector('.project-content__body, .fr-view')?.textContent?.trim() || '';
        sendResponse({ ok: true, data: { budget, skills, description } });
      } else if (message.parserType === 'khamsat-list') {
        const rows = doc.querySelectorAll('tr.forum_post');
        const result = [];
        rows.forEach((row) => {
          const a = row.querySelector('td.details-td h3.details-head a.ajaxbtn');
          if (!a) return;
          const title = a.textContent?.trim() || '';
          const href = a.getAttribute('href') || '';
          const url = href.startsWith('http') ? href : `https://khamsat.com${href}`;
          if (title && url) {
            result.push({ title, url });
          }
        });
        sendResponse({ ok: true, data: result });
      } else if (message.parserType === 'khamsat-detail') {
        const description = doc.querySelector('article.replace_urls')?.textContent?.trim() || '';
        sendResponse({ ok: true, data: { description } });
      } else {
        sendResponse({ ok: false, error: 'Unknown parser type' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true; // Keep channel open for async response
  }
});
