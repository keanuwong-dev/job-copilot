import type { ApplicationWrite, Platform, Profile } from '@job-tracker/shared';
import { fieldFor } from './adapters/shared';
import { attachDraftButtons } from './draft';
import { labelFor } from './dom';
import { paintReport } from './highlight';
import type { LookupApplication } from './api';
import type { AnswerEntry, FillReport, PlatformAdapter } from './types';

type Bundle = {
  ok: boolean;
  settings?: { trackerUrl: string; enableCoverLetter: boolean };
  profile?: unknown;
  answers?: AnswerEntry[];
  resume?: { name: string; type: string; base64: string } | null;
  error?: string;
};

let filling = false;

export function mountWidget(adapter: PlatformAdapter): void {
  if (document.documentElement.dataset.jobTracker === adapter.id) return;
  document.documentElement.dataset.jobTracker = adapter.id;

  const host = document.createElement('div');
  host.setAttribute('data-job-tracker-host', '');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = template();
  document.documentElement.append(host);
  attachDraftButtons(adapter);

  const root = shadow.querySelector<HTMLElement>('.root');
  const button = shadow.querySelector<HTMLButtonElement>('.autofill');
  const panel = shadow.querySelector<HTMLElement>('.panel');
  const summary = shadow.querySelector<HTMLElement>('.summary');
  const list = shadow.querySelector<HTMLElement>('.list');
  const banner = shadow.querySelector<HTMLElement>('.banner');
  const companyInput = shadow.querySelector<HTMLInputElement>('[name="company"]');
  const roleInput = shadow.querySelector<HTMLInputElement>('[name="role"]');
  const locationInput = shadow.querySelector<HTMLInputElement>('[name="location"]');
  const domainInput = shadow.querySelector<HTMLInputElement>('[name="domain"]');
  const logButton = shadow.querySelector<HTMLButtonElement>('.log');
  const tracker = shadow.querySelector<HTMLAnchorElement>('.tracker');
  const saveBox = shadow.querySelector<HTMLElement>('.save');
  const saveQuestion = shadow.querySelector<HTMLElement>('.save-question');
  const saveYes = shadow.querySelector<HTMLButtonElement>('.save-yes');
  const saveNo = shadow.querySelector<HTMLButtonElement>('.save-no');
  if (
    !root ||
    !button ||
    !panel ||
    !summary ||
    !list ||
    !banner ||
    !companyInput ||
    !roleInput ||
    !locationInput ||
    !domainInput ||
    !logButton ||
    !tracker ||
    !saveBox ||
    !saveQuestion ||
    !saveYes ||
    !saveNo
  ) {
    return;
  }

  const panelEl = panel;
  const summaryEl = summary;
  const listEl = list;
  const pageUrl = location.href;
  const job = adapter.extractJob(document, new URL(pageUrl));
  companyInput.value = job.company ?? '';
  roleInput.value = job.role ?? '';
  locationInput.value = job.location ?? '';
  tracker.href = 'http://localhost:3000';

  void browser.runtime.sendMessage({ type: 'bundle' }).then((bundle: Bundle) => {
    if (bundle?.settings?.trackerUrl) tracker.href = bundle.settings.trackerUrl;
  });
  void browser.runtime
    .sendMessage({ type: 'lookup', url: pageUrl })
    .then((result: { ok?: boolean; application?: LookupApplication | null }) => {
      if (result?.ok && result.application) {
        banner.hidden = false;
        panelEl.hidden = false;
        banner.textContent = `Already applied on ${day(result.application.applied_at)}`;
      }
    });

  let dragged = false;
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = host.getBoundingClientRect();
    dragged = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) < 4) return;
      dragged = true;
      host.style.left = `${rect.left + dx}px`;
      host.style.top = `${rect.top + dy}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  button.addEventListener('click', () => {
    if (dragged) {
      dragged = false;
      return;
    }
    void runFill();
  });

  logButton.addEventListener('click', () => {
    const platform = adapter.id === 'generic' ? 'other' : adapter.id;
    void log(platform, pageUrl, {
      company: companyInput,
      role: roleInput,
      location: locationInput,
      domain: domainInput,
      summary: summaryEl,
    });
  });

  let pendingSave: { question: string; answer: string } | null = null;

  document.addEventListener(
    'input',
    (event) => {
      if (filling) return;
      const target = event.target;
      if (
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
        target.dataset.jobTrackerProgrammatic === '1'
      ) {
        return;
      }
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.dataset.jobTrackerEdited = '1';
      }
    },
    true,
  );

  document.addEventListener(
    'focusout',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && !['text', 'search'].includes(target.type)) return;
      if (target.dataset.jobTrackerEdited !== '1') return;
      const question = labelFor(target, document);
      const answer = target.value.trim();
      if (!question || question === 'Field' || !answer) return;
      if (fieldFor(question, target.id, target.name)) return;
      pendingSave = { question, answer };
      saveQuestion.textContent = question;
      saveBox.hidden = false;
      panelEl.hidden = false;
    },
    true,
  );

  saveYes.addEventListener('click', () => {
    if (!pendingSave) return;
    const payload = pendingSave;
    pendingSave = null;
    saveBox.hidden = true;
    void browser.runtime.sendMessage({
      type: 'save-answer',
      question: payload.question,
      answer: payload.answer,
      platform: adapter.id === 'generic' ? null : adapter.id,
    });
  });
  saveNo.addEventListener('click', () => {
    pendingSave = null;
    saveBox.hidden = true;
  });

  async function runFill() {
    panelEl.hidden = false;
    summaryEl.textContent = 'Filling…';
    filling = true;
    try {
      const bundle = (await browser.runtime.sendMessage({ type: 'bundle' })) as Bundle;
      if (!bundle?.ok || !bundle.profile) {
        summaryEl.textContent = bundle?.error ?? 'Import your profile in the extension options.';
        return;
      }
      if (adapter.prepare) await adapter.prepare(document);
      const fields = adapter.findFields(document);
      const report = await adapter.fill(fields, {
        profile: bundle.profile as Profile,
        answers: bundle.answers ?? [],
        resume: bundle.resume ?? null,
        coverLetter: bundle.settings?.enableCoverLetter === true,
      });
      paintReport(report);
      renderSummary(summaryEl, listEl, report);
      const used = [
        ...new Set(report.items.flatMap((item) => (item.usedAnswer ? [item.usedAnswer] : []))),
      ];
      if (used.length > 0) {
        void browser.runtime.sendMessage({ type: 'answers-used', used });
      }
    } finally {
      filling = false;
    }
  }

  browser.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message?.type === 'autofill') void runFill();
    if (message?.type === 'open-log') panelEl.hidden = false;
    if (message?.type === 'status') {
      sendResponse({ platform: adapter.id });
      return true;
    }
    return undefined;
  });
}

async function log(
  platform: Platform,
  pageUrl: string,
  fields: {
    company: HTMLInputElement;
    role: HTMLInputElement;
    location: HTMLInputElement;
    domain: HTMLInputElement;
    summary: HTMLElement;
  },
) {
  const application: ApplicationWrite = {
    company: fields.company.value.trim(),
    role: fields.role.value.trim(),
    location: fields.location.value.trim() || null,
    company_domain: fields.domain.value.trim() || null,
    job_url: pageUrl,
    platform,
    status: 'applied',
    applied_at: null,
    salary_range: null,
    notes: null,
  };
  fields.summary.textContent = 'Saving…';
  const result = (await browser.runtime.sendMessage({ type: 'log', application })) as {
    ok?: boolean;
    created?: boolean;
    error?: string;
  };
  if (!result?.ok) {
    fields.summary.textContent = result?.error ?? 'Could not log application';
    return;
  }
  fields.summary.textContent = result.created
    ? 'Logged this application.'
    : 'That job URL is already in the tracker.';
}

function renderSummary(summary: HTMLElement, list: HTMLElement, report: FillReport) {
  summary.textContent = `Filled ${report.filled} fields, ${report.attention} need your attention`;
  list.replaceChildren();
  for (const item of report.items) {
    if (item.status === 'skipped') continue;
    const row = document.createElement('button');
    row.type = 'button';
    row.textContent = `${item.status === 'filled' ? 'Filled' : 'Check'}: ${item.label}`;
    row.addEventListener('click', () => {
      item.element.scrollIntoView({ block: 'center' });
      item.element.focus();
    });
    list.append(row);
  }
}

function day(value: string | null): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '');
  return match?.[1] ?? 'a previous date';
}

function template(): string {
  return `
    <style>
      .root { font: 13px/1.4 system-ui, sans-serif; color: #111; }
      .autofill, .log, .list button {
        border: 0; border-radius: 999px; background: #111; color: #fff;
        padding: 8px 12px; cursor: pointer;
      }
      .panel {
        width: 280px; margin-top: 8px; padding: 12px; border-radius: 12px;
        background: #fff; color: #111; box-shadow: 0 8px 30px rgba(0,0,0,.2);
      }
      .banner { margin: 0 0 8px; color: #92400e; }
      label { display: grid; gap: 2px; margin-bottom: 6px; font-size: 12px; }
      input { border: 1px solid #ccc; border-radius: 6px; padding: 4px 6px; }
      .list { display: grid; gap: 4px; margin: 8px 0; }
      .list button, .save button { border-radius: 6px; background: #f4f4f5; color: #111; text-align: left; }
      .save { margin: 8px 0; padding: 8px; border-radius: 8px; background: #f4f4f5; }
      .save p { margin: 0 0 6px; }
      .save-actions { display: flex; gap: 6px; }
      .tracker { display: inline-block; margin-top: 8px; }
      :host {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
        font: 13px/1.4 system-ui, sans-serif;
      }
    </style>
    <div class="root">
      <button class="autofill" type="button">Autofill</button>
      <div class="panel" hidden>
        <p class="banner" hidden></p>
        <div class="save" hidden>
          <p>Save answer for similar questions?</p>
          <p class="save-question"></p>
          <div class="save-actions">
            <button class="save-yes" type="button">Save</button>
            <button class="save-no" type="button">Not now</button>
          </div>
        </div>
        <p class="summary"></p>
        <div class="list"></div>
        <label>Company <input name="company" /></label>
        <label>Role <input name="role" /></label>
        <label>Location <input name="location" /></label>
        <label>Company domain <input name="domain" placeholder="stripe.com" /></label>
        <button class="log" type="button">Log application</button>
        <a class="tracker" target="_blank" rel="noreferrer">Open tracker</a>
      </div>
    </div>
  `;
}
