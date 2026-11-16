import type { Profile, ProfileField } from '@job-tracker/shared';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'combobox'
  | 'buttons';

export type FieldIntent = 'full_name' | 'resume' | 'cover_letter';

export type DetectedField = {
  label: string;
  element: HTMLElement;
  kind: FieldKind;
  required: boolean;
  profileField: ProfileField | null;
  intent?: FieldIntent;
};

export type FillStatus = 'filled' | 'skipped' | 'uncertain';

export type FillItem = {
  label: string;
  status: FillStatus;
  detail?: string;
  element: HTMLElement;
  usedAnswer?: string;
};

export type FillReport = {
  items: FillItem[];
  filled: number;
  attention: number;
};

export type AnswerEntry = {
  question_normalized: string;
  answer: string;
};

export type StoredResume = {
  name: string;
  type: string;
  base64: string;
};

export type FillInput = {
  profile: Profile;
  answers: readonly AnswerEntry[];
  resume: StoredResume | null;
  coverLetter: boolean;
};

export type JobDetails = {
  company?: string;
  role?: string;
  location?: string;
  description?: string;
};

export interface PlatformAdapter {
  id: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic';
  matches(url: URL, doc: Document): boolean;
  extractJob(doc: Document, url: URL): JobDetails;
  /** Wait until the fields for this step exist. Workday renders them after load. */
  prepare?(doc: Document): Promise<void>;
  findFields(doc: Document): DetectedField[];
  fill(fields: DetectedField[], input: FillInput): Promise<FillReport>;
}
