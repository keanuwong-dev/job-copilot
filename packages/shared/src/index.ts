/** Display name shared by the web app and extension. */
export const APP_NAME = 'Job Tracker';

export {
  APP_STATUSES,
  AppStatusSchema,
  FORWARD_STATUS_ORDER,
  applicationRowTone,
  canAutoAdvance,
  type AppStatus,
  type ApplicationRowTone,
} from './status';

export { ProfileSchema, parseProfileYaml, type Profile } from './profile';

export { normalizeLabel } from './normalize';

export {
  AnswerSaveSchema,
  AnswerUseSchema,
  matchAnswer,
  type AnswerSave,
  type StoredAnswer,
} from './answers';

export { parsePastedAnswers, type PastedAnswer } from './parse-pasted-answers';

export { ANSWER_CATEGORIES, answerCategory, type AnswerCategory } from './answer-categories';

export { PROFILE_FIELDS, SYNONYMS, matchSynonym, type ProfileField } from './synonyms';

export {
  RULE_CONFIDENCE,
  UNMATCHED_CONFIDENCE,
  classifyEmail,
  type Classification,
} from './classify';

export {
  DraftRequestSchema,
  parseModelClassification,
  profileForDraft,
  type DraftRequest,
} from './ai';

export {
  GHOSTED_AFTER_DAYS,
  INBOUND_EMAIL_BATCH,
  InboundBatchSchema,
  InboundEmailSchema,
  isGhostedCandidate,
  matchApplication,
  shouldAutoApply,
  type EmailMatchInput,
  type InboundEmail,
  type MatchCandidate,
} from './email-match';

export { type Database, type Json } from './database.types';

export {
  PLATFORMS,
  PlatformSchema,
  TIERS,
  TierSchema,
  ApplicationWriteSchema,
  applicationStats,
  parseApplicationWrite,
  buildApplicationInsert,
  type Platform,
  type Tier,
  type ApplicationWrite,
  type ApplicationStats,
  type ApplicationInsertFields,
} from './application';
