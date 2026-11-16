import { isVisible, labelFor, setNativeValue } from './dom';
import type { PlatformAdapter } from './types';

/** Adds a Draft answer button beside each visible long-text question. */
export function attachDraftButtons(adapter: PlatformAdapter): void {
  const add = () => {
    for (const area of document.querySelectorAll('textarea')) {
      if (!(area instanceof HTMLTextAreaElement)) continue;
      if (area.dataset.jobTrackerDraft === '1' || !isVisible(area)) continue;
      if (area.closest('[data-job-tracker-host]')) continue;
      area.dataset.jobTrackerDraft = '1';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Draft answer';
      button.setAttribute('data-job-tracker-draft', '');
      Object.assign(button.style, {
        display: 'inline-block',
        marginTop: '4px',
        padding: '4px 8px',
        border: '1px solid #111',
        borderRadius: '6px',
        background: '#fff',
        color: '#111',
        font: '12px/1.2 system-ui, sans-serif',
        cursor: 'pointer',
      });
      area.insertAdjacentElement('afterend', button);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void draftInto(area, button, adapter);
      });
    }
  };

  add();
  const observer = new MutationObserver(() => add());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class', 'aria-hidden'],
  });
}

async function draftInto(
  area: HTMLTextAreaElement,
  button: HTMLButtonElement,
  adapter: PlatformAdapter,
): Promise<void> {
  const question = labelFor(area, document);
  if (!question || question === 'Field') {
    note(button, 'This question needs a label before it can be drafted.');
    return;
  }
  button.disabled = true;
  button.textContent = 'Drafting…';
  note(button, '');
  const job = adapter.extractJob(document, new URL(location.href));
  try {
    const result = (await browser.runtime.sendMessage({
      type: 'draft-answer',
      question,
      company: job.company ?? '',
      role: job.role ?? '',
      description: job.description ?? '',
    })) as { ok?: boolean; answer?: string; error?: string };
    if (!result?.ok || !result.answer) {
      note(button, result?.error ?? 'Could not draft an answer');
      return;
    }
    area.dataset.jobTrackerProgrammatic = '1';
    setNativeValue(area, result.answer);
    delete area.dataset.jobTrackerProgrammatic;
    note(button, 'Edit this before you submit.');
  } catch (error) {
    note(button, error instanceof Error ? error.message : 'Could not draft an answer');
  } finally {
    button.disabled = false;
    button.textContent = 'Draft answer';
  }
}

function note(button: HTMLButtonElement, message: string): void {
  const next = button.nextElementSibling;
  const hint =
    next instanceof HTMLElement && next.hasAttribute('data-job-tracker-draft-note')
      ? next
      : createHint(button);
  hint.textContent = message;
}

function createHint(button: HTMLButtonElement): HTMLSpanElement {
  const hint = document.createElement('span');
  hint.setAttribute('data-job-tracker-draft-note', '');
  hint.style.display = 'block';
  hint.style.marginTop = '4px';
  hint.style.font = '12px/1.3 system-ui, sans-serif';
  hint.style.color = '#444';
  button.insertAdjacentElement('afterend', hint);
  return hint;
}
