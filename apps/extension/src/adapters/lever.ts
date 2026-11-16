import { detectFields, fillDetected, textOf } from './shared';
import type { PlatformAdapter } from '../types';

export const leverAdapter: PlatformAdapter = {
  id: 'lever',
  matches(url) {
    return url.hostname === 'jobs.lever.co' && url.pathname.includes('/apply');
  },
  extractJob(doc, url) {
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[0];
    const company =
      textOf(doc, ['.main-header-logo img', '.posting-headline .company']) ??
      doc.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim() ??
      (slug ? slug.replace(/[-_]+/g, ' ') : undefined);
    return {
      company,
      role: textOf(doc, ['.posting-headline h2', 'h2']),
      location: textOf(doc, ['.posting-categories .location', '.location']),
      description: textOf(doc, ['.section-wrapper.page-full-width', '.posting-page'])?.slice(
        0,
        2000,
      ),
    };
  },
  findFields(doc) {
    return detectFields(doc, { fullNameNames: ['name', 'cards[name]'] });
  },
  fill(fields, input) {
    return fillDetected(fields, input);
  },
};
