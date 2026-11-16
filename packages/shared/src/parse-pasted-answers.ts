import { normalizeLabel } from './normalize';

export type PastedAnswer = {
  question: string;
  answer: string;
};

const QUESTION_MIN = 8;
const QUESTION_MAX = 240;
const PROMPT_MAX = 180;
const PROMPT_MAX_WORDS = 25;

/** Imperative prompts and real questions, not answer sentences such as "How we shipped it". */
const PROMPT_START =
  /^(?:please\s+)?(?:describe|explain|discuss|outline|summarize|introduce|anything else)\b|^(?:please\s+)?tell me\b|^(?:please\s+)?walk me\b|^(?:please\s+)?talk about\b|^(?:please\s+)?(?:share|list|name|give)\s+(?:a|an|the|your|me|us|one|some)\b|^(?:why|how|where|when|who|which)\s+(?:do|does|did|are|is|was|were|would|could|should|can|will|have|has|of)\b|^what\s+(?:is|are|was|were|do|does|did|would|could|should|can|will|have|has|'s)\b|^(?:do|are|have|can|would|could|did|will)\s+you\b/i;

/**
 * Splits a pasted list into question and answer pairs.
 * A question is its own line. It can end with "?", or it can be a prompt such as
 * "Describe your ideal team" or "Tell me about a project you are proud of".
 * The lines under it are the answer. A short heading such as "By role" is skipped.
 */
export function parsePastedAnswers(text: string): PastedAnswer[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const pairs: PastedAnswer[] = [];
  let question: string | null = null;
  let answerLines: string[] = [];

  const flush = () => {
    if (!question) return;
    const answer = joinAnswer(answerLines);
    if (answer) pairs.push({ question, answer });
    question = null;
    answerLines = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const nextQuestion = questionAt(lines, index);
    if (nextQuestion) {
      flush();
      question = nextQuestion;
      continue;
    }
    if (!question) continue;
    if (isSectionHeader(lines, index)) continue;
    answerLines.push(lines[index] ?? '');
  }
  flush();
  return dedupe(pairs);
}

function questionAt(lines: readonly string[], index: number): string | null {
  const value = cleanLine(lines[index] ?? '');
  if (!value) return null;
  if (isMarkedQuestion(value)) return value;
  if (!isPrompt(value) || !atPromptBoundary(lines, index) || !followedByAnswer(lines, index)) {
    return null;
  }
  return value;
}

function cleanLine(line: string): string {
  let value = line.trim();
  if (!value || value === '---' || value === '===') return '';
  value = value.replace(/^#{1,6}\s+/, '');
  value = value.replace(/^[-*]\s+/, '');
  value = value.replace(/^\d+[.)]\s+/, '');
  value = value.replace(/^\*\*(.+)\*\*$/, '$1');
  value = value.replace(/^__(.+)__$/, '$1');
  value = value.replace(/^(?:q|question)\s*:\s*/i, '');
  return value.trim();
}

function isMarkedQuestion(value: string): boolean {
  if (value.length < QUESTION_MIN || value.length > QUESTION_MAX) return false;
  if (!value.endsWith('?')) return false;
  return !/[.!?]/.test(value.slice(0, -1));
}

function isPrompt(value: string): boolean {
  if (value.length < QUESTION_MIN || value.length > PROMPT_MAX) return false;
  if (value.split(/\s+/).length > PROMPT_MAX_WORDS) return false;
  if (!/^[A-Z]/.test(value)) return false;
  if (/[.!]/.test(value.slice(0, -1))) return false;
  return PROMPT_START.test(value);
}

/** A prompt starts the paste, follows a blank line or heading, or follows a finished sentence. */
function atPromptBoundary(lines: readonly string[], index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0 && !(lines[cursor] ?? '').trim()) cursor -= 1;
  if (cursor < 0) return true;
  const previous = cleanLine(lines[cursor] ?? '');
  if (cursor < index - 1 || isBareHeader(previous)) return true;
  return /[.!?]$/.test(previous);
}

/** The next real line is answer text, so a prompt with nothing under it stays out of the list. */
function followedByAnswer(lines: readonly string[], index: number): boolean {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const value = cleanLine(lines[cursor] ?? '');
    if (!value || isBareHeader(value)) continue;
    if (isMarkedQuestion(value) || isPrompt(value)) return false;
    return true;
  }
  return false;
}

function isBareHeader(value: string): boolean {
  if (!value || value.length > 40) return false;
  if (value.split(/\s+/).length > 4) return false;
  return !/[.?!,;:]/.test(value);
}

/** A short unlabeled line immediately before the next question, such as "By role". */
function isSectionHeader(lines: readonly string[], index: number): boolean {
  const value = cleanLine(lines[index] ?? '');
  if (!isBareHeader(value)) return false;
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const next = (lines[cursor] ?? '').trim();
    if (!next) continue;
    return questionAt(lines, cursor) !== null;
  }
  return false;
}

function joinAnswer(lines: readonly string[]): string {
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') cleaned.push('');
      continue;
    }
    const text = cleaned.length === 0 ? trimmed.replace(/^(?:a|answer)\s*:\s*/i, '') : trimmed;
    if (text) cleaned.push(text);
  }
  while (cleaned[cleaned.length - 1] === '') cleaned.pop();
  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function dedupe(pairs: readonly PastedAnswer[]): PastedAnswer[] {
  const order: string[] = [];
  const byKey = new Map<string, PastedAnswer>();
  for (const pair of pairs) {
    const key = normalizeLabel(pair.question);
    if (!key) continue;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, pair);
  }
  return order.flatMap((key) => {
    const pair = byKey.get(key);
    return pair ? [pair] : [];
  });
}
