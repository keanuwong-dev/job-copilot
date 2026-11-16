import { matchSynonym, normalizeLabel, type ProfileField } from '@job-tracker/shared';
import {
  applicationRoot,
  cleanLabel,
  isFinalButton,
  isRequired,
  isVisible,
  kindFor,
  labelFor,
  profileFromHints,
  radioGroupKey,
  visibleControls,
} from '../dom';
import { fillFields } from '../fill';
import type { DetectedField, FieldIntent, FillInput, FillReport, JobDetails } from '../types';

const CONTACT_HINTS: ReadonlyArray<readonly [RegExp, ProfileField]> = [
  [/\bfirst name\b|\bgiven name\b/, 'personal.first_name'],
  [/\blast name\b|\bsurname\b|\bfamily name\b/, 'personal.last_name'],
  [/\bpreferred name\b|\bnickname\b/, 'personal.preferred_name'],
  [/\bemail\b/, 'personal.email'],
  [/\bphone\b|\bmobile\b/, 'personal.phone'],
  [/\blinkedin\b/, 'links.linkedin'],
  [/\bgithub\b/, 'links.github'],
  [/\bportfolio\b/, 'links.portfolio'],
  [/\bpersonal website\b|\bwebsite\b/, 'links.website'],
  [/\bauthorized to work\b|\blegally authorized\b/, 'work_auth.authorized_us'],
  [/\bstreet address\b|\baddress line\b|\baddress\b/, 'personal.address_line1'],
  [/\bcity\b/, 'personal.city'],
  [/\bstate\b|\bprovince\b/, 'personal.state'],
  [/\bzip\b|\bpostal code\b/, 'personal.zip'],
  [/\bcountry\b/, 'personal.country'],
  [/\bhow did you hear\b/, 'common_answers.how_did_you_hear'],
];

export function textOf(doc: Document, selectors: readonly string[]): string | undefined {
  for (const selector of selectors) {
    const value = doc.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    if (value) return value;
  }
  return undefined;
}

export function jobFromTitle(title: string): JobDetails {
  const match = /^(.*?)\s+at\s+(.+)$/i.exec(title.trim());
  if (!match) return { role: title.trim() || undefined };
  return { role: match[1]?.trim(), company: match[2]?.trim() };
}

export function detectFields(
  doc: Document,
  options?: { fullNameNames?: readonly string[]; root?: ParentNode },
): DetectedField[] {
  const root = options?.root ?? applicationRoot(doc);
  const fields: DetectedField[] = [];
  const seenRadios = new Set<string>();

  for (const control of visibleControls(root)) {
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      const key = radioGroupKey(control);
      if (seenRadios.has(key)) continue;
      seenRadios.add(key);
    }
    const label = labelFor(control, doc);
    const id = control.id;
    const name = control.getAttribute('name') ?? '';
    const intent = intentFor(label, control, name, options?.fullNameNames ?? []);
    fields.push({
      label,
      element: control,
      kind: kindFor(control),
      required: isRequired(control, label),
      profileField: intent ? null : fieldFor(label, id, name),
      intent,
    });
  }

  for (const trigger of root.querySelectorAll<HTMLElement>('[role="combobox"], .select__control')) {
    if (trigger instanceof HTMLInputElement || trigger instanceof HTMLSelectElement) continue;
    const label = labelFor(trigger, doc);
    fields.push({
      label,
      element: trigger,
      kind: 'combobox',
      required: isRequired(trigger, label),
      profileField: fieldFor(label, trigger.id, ''),
    });
  }

  return fields;
}

export function fieldFor(label: string, id: string, name: string): ProfileField | null {
  const haystack = normalizeLabel(`${id} ${name} ${label}`);
  if (/\bsponsorship\b|\bvisa\b/.test(haystack)) {
    const future = /\bfuture\b/.test(haystack);
    const now = /\bnow\b|\bcurrently\b/.test(haystack);
    if (future && now) return 'work_auth.needs_sponsorship';
    if (future) return 'work_auth.needs_sponsorship_future';
    if (now) return 'work_auth.needs_sponsorship_now';
    return 'work_auth.needs_sponsorship';
  }
  return profileFromHints(CONTACT_HINTS, label, id, name) ?? matchSynonym(label);
}

export function fillDetected(fields: DetectedField[], input: FillInput): Promise<FillReport> {
  return fillFields(fields, input);
}

function intentFor(
  label: string,
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  name: string,
  fullNameNames: readonly string[],
): FieldIntent | undefined {
  const normalized = normalizeLabel(`${label} ${name}`);
  if (control instanceof HTMLInputElement && control.type === 'file') {
    if (normalized.includes('cover letter')) return 'cover_letter';
    if (normalized.includes('resume') || normalized.includes('cv')) return 'resume';
  }
  if (normalized.includes('cover letter')) return 'cover_letter';
  const labelOnly = normalizeLabel(label);
  if (
    fullNameNames.includes(name) ||
    normalized === 'full name' ||
    normalized === 'name' ||
    labelOnly === 'full name' ||
    labelOnly === 'name' ||
    labelOnly === 'legal name'
  ) {
    return 'full_name';
  }
  return undefined;
}

/** Yes/no (and similar) button groups used by Ashby. Submit buttons are ignored. */
export function choiceGroups(root: ParentNode, doc: Document): DetectedField[] {
  const fields: DetectedField[] = [];
  for (const container of root.querySelectorAll('fieldset, [role="group"]')) {
    if (!(container instanceof HTMLElement) || !isVisible(container)) continue;
    const buttons = [...container.querySelectorAll('button')].filter(
      (button) =>
        !isFinalButton(button) && button.getAttribute('aria-haspopup') == null && isVisible(button),
    );
    if (buttons.length < 2 || buttons.length > 6) continue;
    const legend = container.querySelector('legend')?.textContent;
    const label = legend ? cleanLabel(legend) : labelFor(container, doc);
    if (!label || label === 'Field') continue;
    fields.push({
      label,
      element: container,
      kind: 'buttons',
      required: isRequired(container, label),
      profileField: fieldFor(label, container.id, ''),
    });
  }
  return fields;
}

/** Custom dropdown triggers that are not native selects or Greenhouse comboboxes. */
export function listboxTriggers(root: ParentNode, doc: Document): DetectedField[] {
  const fields: DetectedField[] = [];
  const triggers = root.querySelectorAll<HTMLElement>(
    'button[aria-haspopup="listbox"], [data-automation-id="selectWidget"]',
  );
  for (const trigger of triggers) {
    if (!isVisible(trigger) || isFinalButton(trigger)) continue;
    if (trigger.getAttribute('role') === 'combobox' || trigger.classList.contains('select__control')) {
      continue;
    }
    if (trigger instanceof HTMLInputElement || trigger instanceof HTMLSelectElement) continue;
    const label = labelFor(trigger, doc);
    fields.push({
      label,
      element: trigger,
      kind: 'combobox',
      required: isRequired(trigger, label),
      profileField: fieldFor(label, trigger.id, ''),
    });
  }
  return fields;
}
