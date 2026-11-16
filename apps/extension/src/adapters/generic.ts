import { detectFields, fillDetected, jobFromTitle } from './shared';
import type { DetectedField, FillInput, FillReport, JobDetails, PlatformAdapter } from '../types';

export const genericAdapter: PlatformAdapter = {
  id: 'generic',
  matches() {
    return false;
  },
  extractJob(doc: Document): JobDetails {
    return jobFromTitle(doc.title);
  },
  findFields(doc: Document): DetectedField[] {
    if (!doc.querySelector('form')) return [];
    return detectFields(doc).filter((field) => field.kind !== 'combobox');
  },
  fill(fields: DetectedField[], input: FillInput): Promise<FillReport> {
    return fillDetected(fields, input);
  },
};
