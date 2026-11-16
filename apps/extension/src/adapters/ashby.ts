import { choiceGroups, detectFields, fillDetected, jobFromTitle, listboxTriggers, textOf } from './shared';
import type { PlatformAdapter } from '../types';

export const ashbyAdapter: PlatformAdapter = {
  id: 'ashby',
  matches(url) {
    return url.hostname === 'jobs.ashbyhq.com';
  },
  extractJob(doc, url) {
    const fromTitle = jobFromTitle(doc.title);
    const slug = url.pathname.split('/').filter(Boolean)[0];
    return {
      company:
        textOf(doc, ['[data-company]', '.company-name']) ??
        fromTitle.company ??
        (slug ? slug.replace(/[-_]+/g, ' ') : undefined),
      role: textOf(doc, ['h1', '[data-testid="job-title"]']) ?? fromTitle.role,
      location: textOf(doc, ['[data-testid="location"]', '.location']),
      description: textOf(doc, ['[data-testid="job-description"]', '.job-description'])?.slice(
        0,
        2000,
      ),
    };
  },
  findFields(doc) {
    const root = doc.querySelector('form.ashby-application-form, form') ?? doc.body ?? doc;
    return [...detectFields(doc, { root }), ...choiceGroups(root, doc), ...listboxTriggers(root, doc)];
  },
  fill(fields, input) {
    return fillDetected(fields, input);
  },
};
