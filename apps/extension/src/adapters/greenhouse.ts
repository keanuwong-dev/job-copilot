import { detectFields, fillDetected, jobFromTitle, textOf } from './shared';
import type { DetectedField, FillInput, FillReport, JobDetails, PlatformAdapter } from '../types';

export const greenhouseAdapter: PlatformAdapter = {
  id: 'greenhouse',
  matches(url) {
    const host = url.hostname;
    return (
      host === 'boards.greenhouse.io' ||
      host === 'job-boards.greenhouse.io' ||
      host === 'grnh.se' ||
      host.endsWith('.grnh.se')
    );
  },
  extractJob(doc, url) {
    const fromTitle = jobFromTitle(doc.title);
    const company =
      textOf(doc, ['.company-name', '.job__company', '[data-company]']) ?? fromTitle.company;
    const role = textOf(doc, ['h1', '.app-title', '.job__title']) ?? fromTitle.role;
    const location = textOf(doc, ['.location', '.job__location', '.body--metadata']);
    const description = textOf(doc, ['#content', '.job__description', '#job-description']);
    return compactJob({ company, role, location, description, fallbackCompany: slugCompany(url) });
  },
  findFields(doc) {
    return detectFields(doc);
  },
  fill(fields: DetectedField[], input: FillInput): Promise<FillReport> {
    return fillDetected(fields, input);
  },
};

function slugCompany(url: URL): string | undefined {
  const [slug] = url.pathname.split('/').filter(Boolean);
  if (!slug || slug === 'embed') return undefined;
  return slug.replace(/[-_]+/g, ' ');
}

function compactJob(input: {
  company?: string;
  role?: string;
  location?: string;
  description?: string;
  fallbackCompany?: string;
}): JobDetails {
  return {
    company: input.company ?? input.fallbackCompany,
    role: input.role,
    location: input.location,
    description: input.description?.slice(0, 2000),
  };
}
