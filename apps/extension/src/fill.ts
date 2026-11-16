import { matchSynonym } from '@job-tracker/shared';
import { isFinalButton, matchOption, setNativeValue } from './dom';
import { answerFor, fullName, profileValue } from './profile-values';
import type { DetectedField, FillInput, FillItem, FillReport, StoredResume } from './types';

export async function fillFields(fields: DetectedField[], input: FillInput): Promise<FillReport> {
  const seenRadios = new Set<string>();
  const items: FillItem[] = [];

  for (const field of fields) {
    if (field.kind === 'radio') {
      const key = radioKey(field.element);
      if (seenRadios.has(key)) continue;
      seenRadios.add(key);
    }
    items.push(await fillField(field, input));
  }

  return {
    items,
    filled: items.filter((item) => item.status === 'filled').length,
    attention: items.filter((item) => item.status === 'uncertain').length,
  };
}

async function fillField(field: DetectedField, input: FillInput): Promise<FillItem> {
  if (field.intent === 'cover_letter' && !input.coverLetter) {
    return item(field, field.required ? 'uncertain' : 'skipped', 'Cover letter is turned off');
  }

  const resolved = valueFor(field, input);
  const value = resolved.value;
  if (!value) {
    return item(
      field,
      field.required ? 'uncertain' : 'skipped',
      field.required ? 'No confident answer' : undefined,
    );
  }

  if (field.kind === 'file' || field.intent === 'resume') {
    if (!input.resume) return item(field, 'uncertain', 'Import a resume in the extension options');
    const fileInput = field.element;
    if (!(fileInput instanceof HTMLInputElement) || fileInput.type !== 'file') {
      return item(field, 'uncertain', 'Resume control is not a file input');
    }
    assignFile(fileInput, input.resume);
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.kind === 'select' && field.element instanceof HTMLSelectElement) {
    const option = matchOption(field.element, value);
    if (!option) return item(field, 'uncertain', `No option matches “${value}”`);
    field.element.value = option.value;
    field.element.dispatchEvent(new Event('input', { bubbles: true }));
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.kind === 'radio' && field.element instanceof HTMLInputElement) {
    const matched = chooseRadio(field.element, value);
    if (!matched) return item(field, 'uncertain', `No choice matches “${value}”`);
    matched.click();
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.kind === 'checkbox' && field.element instanceof HTMLInputElement) {
    field.element.checked = isAffirmative(value);
    field.element.dispatchEvent(new Event('input', { bubbles: true }));
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.kind === 'combobox') {
    const matched = await chooseComboboxOption(field.element, value);
    if (!matched) return item(field, 'uncertain', `No option matches “${value}”`);
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.kind === 'buttons') {
    const matched = chooseButton(field.element, value);
    if (!matched) return item(field, 'uncertain', `No choice matches “${value}”`);
    matched.click();
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
    setNativeValue(field.element, dateValue(field.element, value));
    return item(field, 'filled', undefined, resolved.usedAnswer);
  }

  return item(field, 'uncertain', 'Unsupported control');
}

function valueFor(
  field: DetectedField,
  input: FillInput,
): { value: string; usedAnswer?: string } {
  if (field.intent === 'full_name') return { value: fullName(input.profile) };
  if (field.intent === 'resume') return { value: input.resume ? input.resume.name : '' };
  if (field.intent === 'cover_letter') {
    return { value: input.profile.common_answers.cover_letter_default };
  }
  if (field.profileField) return { value: profileValue(input.profile, field.profileField).trim() };
  const fromSynonym = matchSynonym(field.label);
  if (fromSynonym) return { value: profileValue(input.profile, fromSynonym).trim() };
  const bank = answerFor(field.label, input.answers);
  if (!bank) return { value: '' };
  return { value: bank.answer.trim(), usedAnswer: bank.question_normalized };
}

function chooseRadio(element: HTMLInputElement, value: string): HTMLInputElement | null {
  const name = element.name;
  const radios = name
    ? [
        ...element.ownerDocument.querySelectorAll<HTMLInputElement>(
          `input[type="radio"][name="${CSS.escape(name)}"]`,
        ),
      ]
    : [element];
  const target = value.toLowerCase();
  return (
    radios.find((radio) => radio.value.toLowerCase() === target) ??
    radios.find((radio) => (radio.labels?.[0]?.textContent ?? '').toLowerCase().includes(target)) ??
    null
  );
}

function chooseButton(container: HTMLElement, value: string): HTMLButtonElement | null {
  const target = value.toLowerCase();
  const buttons = [...container.querySelectorAll('button')];
  return (
    buttons.find((button) => {
      if (isFinalButton(button)) return false;
      const text = (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === target || text.includes(target);
    }) ?? null
  );
}

async function chooseComboboxOption(trigger: HTMLElement, value: string): Promise<boolean> {
  if (isFinalButton(trigger)) return false;
  trigger.click();
  await delay(30);
  const target = value.toLowerCase();
  const options = [
    ...trigger.ownerDocument.querySelectorAll<HTMLElement>('[role="option"], .select__option'),
  ];
  const match = options.find((option) => {
    const text = (option.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text === target || text.includes(target);
  });
  if (!match || isFinalButton(match)) return false;
  match.click();
  return true;
}

function assignFile(input: HTMLInputElement, resume: StoredResume): void {
  const bytes = Uint8Array.from(atob(resume.base64), (char) => char.charCodeAt(0));
  const file = new File([bytes], resume.name, { type: resume.type || 'application/pdf' });
  if (typeof DataTransfer !== 'undefined') {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  } else {
    const files = Object.assign([file], {
      item: (index: number) => files[index] ?? null,
    }) as unknown as FileList;
    Object.defineProperty(input, 'files', { configurable: true, value: files });
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function dateValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): string {
  if (
    element instanceof HTMLInputElement &&
    element.type === 'date' &&
    /^\d{4}-\d{2}$/.test(value)
  ) {
    return `${value}-01`;
  }
  return value;
}

function radioKey(element: HTMLElement): string {
  return element instanceof HTMLInputElement ? element.name || element.id : element.id;
}

function isAffirmative(value: string): boolean {
  return /^(yes|true|y)$/i.test(value.trim());
}

function item(
  field: DetectedField,
  status: FillItem['status'],
  detail?: string,
  usedAnswer?: string,
): FillItem {
  return { label: field.label, status, detail, element: field.element, usedAnswer };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
