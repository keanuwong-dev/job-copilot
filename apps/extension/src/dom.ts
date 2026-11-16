import { normalizeLabel, type ProfileField } from '@job-tracker/shared';

const FINAL_BUTTON =
  /^(submit|submit application|apply|apply now|send application|save and continue)$/i;

export function isFinalButton(element: Element): boolean {
  const automation = element.getAttribute('data-automation-id') ?? '';
  if (/pageFooter(Next|Submit)Button/i.test(automation)) return true;
  const value = element instanceof HTMLInputElement ? element.value : '';
  const label = `${element.textContent ?? ''} ${value}`.replace(/\s+/g, ' ').trim();
  return FINAL_BUTTON.test(label);
}

/** Hidden steps stay out of the fill. Layout size is ignored so tests can use the hidden attribute. */
export function isVisible(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
    const display = current.style.display;
    const visibility = current.style.visibility;
    if (display === 'none' || visibility === 'hidden') return false;
    const view = current.ownerDocument.defaultView;
    if (view) {
      const computed = view.getComputedStyle(current);
      if (computed.display === 'none' || computed.visibility === 'hidden') return false;
    }
    current = current.parentElement;
  }
  return true;
}

export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

export function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function labelFor(element: HTMLElement, doc: Document): string {
  const aria = element.getAttribute('aria-label')?.trim();
  if (aria) return aria;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .join(' ');
    const cleaned = cleanLabel(text);
    if (cleaned) return cleaned;
  }
  if (element.id) {
    const explicit = doc.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    const text = explicit?.textContent ? cleanLabel(explicit.textContent) : '';
    if (text) return text;
  }
  const wrapping = element.closest('label');
  if (wrapping) {
    const clone = wrapping.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, textarea, select, button').forEach((child) => child.remove());
    const text = cleanLabel(clone.textContent ?? '');
    if (text) return text;
  }
  const container = element.closest('div, li, fieldset');
  const nearby = container?.querySelector('label');
  if (nearby && !nearby.contains(element)) {
    const text = cleanLabel(nearby.textContent ?? '');
    if (text) return text;
  }
  return (
    element.getAttribute('placeholder')?.trim() ||
    element.getAttribute('name')?.trim() ||
    element.getAttribute('id')?.trim() ||
    'Field'
  );
}

export function isRequired(element: HTMLElement, label: string): boolean {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    if (element.required || element.getAttribute('aria-required') === 'true') return true;
  }
  if (element.getAttribute('aria-required') === 'true') return true;
  return label.includes('*');
}

export function applicationRoot(doc: Document): ParentNode {
  return (
    doc.querySelector(
      'form#application_form, form#application-form, form.application-form, form#application, form',
    ) ??
    doc.body ??
    doc
  );
}

export function visibleControls(
  root: ParentNode,
): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return [...root.querySelectorAll('input, textarea, select')].filter(
    (element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
      if (element instanceof HTMLInputElement) {
        return !['hidden', 'submit', 'button', 'reset', 'password', 'image'].includes(element.type);
      }
      return element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
    },
  );
}

export function kindFor(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' {
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element instanceof HTMLSelectElement) return 'select';
  if (element.type === 'file') return 'file';
  if (element.type === 'radio') return 'radio';
  if (element.type === 'checkbox') return 'checkbox';
  return 'text';
}

export function radioGroupKey(element: HTMLInputElement): string {
  return element.name || element.id || labelFor(element, element.ownerDocument);
}

export function matchOption(element: HTMLSelectElement, wanted: string): HTMLOptionElement | null {
  const target = normalizeLabel(wanted);
  const options = [...element.options].filter(
    (option) => option.value !== '' || cleanLabel(option.text),
  );
  return (
    options.find((option) => normalizeLabel(option.text) === target) ??
    options.find((option) => normalizeLabel(option.value) === target) ??
    options.find((option) => normalizeLabel(option.text).includes(target)) ??
    null
  );
}

export function profileFromHints(
  hints: ReadonlyArray<readonly [RegExp, ProfileField]>,
  label: string,
  id: string,
  name: string,
): ProfileField | null {
  const haystack = normalizeLabel(`${id} ${name} ${label}`);
  for (const [pattern, field] of hints) {
    if (pattern.test(haystack)) return field;
  }
  return null;
}
