import { choiceGroups, detectFields, fillDetected, listboxTriggers, textOf } from './shared';
import { isVisible, visibleControls } from '../dom';
import type { PlatformAdapter } from '../types';

const STEP_WAIT_MS = 4000;

export const workdayAdapter: PlatformAdapter = {
  id: 'workday',
  matches(url) {
    return url.hostname === 'myworkdayjobs.com' || url.hostname.endsWith('.myworkdayjobs.com');
  },
  extractJob(doc, url) {
    const slug = url.hostname.split('.')[0];
    return {
      company:
        textOf(doc, ['[data-automation-id="jobPostingCompany"]']) ??
        (slug && slug !== 'www' ? slug.replace(/[-_]+/g, ' ') : undefined),
      role: textOf(doc, [
        '[data-automation-id="jobPostingHeader"]',
        'h1',
        '[data-automation-id="pageHeaderTitle"]',
      ]),
      location: textOf(doc, ['[data-automation-id="locations"]', '[data-automation-id="location"]']),
      description: textOf(doc, ['[data-automation-id="jobPostingDescription"]'])?.slice(0, 2000),
    };
  },
  prepare(doc) {
    return waitForStep(doc);
  },
  findFields(doc) {
    const root = visibleStep(doc);
    return [
      ...detectFields(doc, { root }).filter((field) => isVisible(field.element)),
      ...choiceGroups(root, doc),
      ...listboxTriggers(root, doc),
    ];
  },
  fill(fields, input) {
    return fillDetected(fields, input);
  },
};

function visibleStep(doc: Document): ParentNode {
  const page = [...doc.querySelectorAll('[data-automation-id="applyFlowPage"]')].find(
    (element) => element instanceof HTMLElement && isVisible(element),
  );
  return page ?? doc.body ?? doc;
}

function waitForStep(doc: Document): Promise<void> {
  if (stepHasFields(doc)) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (stepHasFields(doc)) finish();
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true });
    const timer = window.setTimeout(finish, STEP_WAIT_MS);
  });
}

function stepHasFields(doc: Document): boolean {
  const page = [...doc.querySelectorAll('[data-automation-id="applyFlowPage"]')].find(
    (element) => element instanceof HTMLElement && isVisible(element),
  );
  if (!(page instanceof HTMLElement)) return false;
  return visibleControls(page).some((control) => isVisible(control));
}
