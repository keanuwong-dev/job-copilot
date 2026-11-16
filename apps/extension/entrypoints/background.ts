import type { ApplicationWrite } from '@job-tracker/shared';
import {
  getProfile,
  listAnswers,
  logApplication,
  lookupApplication,
  putProfile,
  draftAnswer,
  recordAnswerUse,
  saveAnswer,
} from '../src/api';
import { isBlockedPage } from '../src/sites';
import {
  publicSettings,
  readProfile,
  readResume,
  readSettings,
  writeProfile,
} from '../src/settings';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handle(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Request failed',
        });
      });
    return true;
  });

  browser.commands.onCommand.addListener((command) => {
    if (command !== 'autofill') return;
    void runOnActiveTab('autofill').catch(() => undefined);
  });
});

async function handle(message: unknown) {
  const type =
    message && typeof message === 'object' && 'type' in message ? String(message.type) : '';
  if (type === 'bundle') {
    const settings = await readSettings();
    const answers = settings.apiKey
      ? await listAnswers(settings.trackerUrl, settings.apiKey).catch(() => [])
      : [];
    return {
      ok: true,
      settings: publicSettings(settings),
      profile: await readProfile(),
      resume: await readResume(),
      answers,
    };
  }
  if (type === 'autofill-active') return runOnActiveTab('autofill');
  if (type === 'open-log-active') return runOnActiveTab('open-log');
  if (type === 'save-answer') {
    const settings = await requireApi();
    await saveAnswer(settings.trackerUrl, settings.apiKey, {
      question: field(message, 'question'),
      answer: field(message, 'answer'),
      platform: optionalField(message, 'platform'),
    });
    return { ok: true };
  }
  if (type === 'draft-answer') {
    const settings = await requireApi();
    const profile = await readProfile();
    if (!profile) throw new Error('Import a profile in the extension options');
    const answer = await draftAnswer(settings.trackerUrl, settings.apiKey, {
      question: field(message, 'question'),
      company: optionalField(message, 'company') ?? '',
      role: optionalField(message, 'role') ?? '',
      description: optionalField(message, 'description') ?? '',
      profile,
    });
    return { ok: true, answer };
  }
  if (type === 'answers-used') {
    const settings = await requireApi();
    const used = stringList(message, 'used');
    await recordAnswerUse(settings.trackerUrl, settings.apiKey, used);
    return { ok: true };
  }
  if (type === 'lookup') {
    const url = field(message, 'url');
    const settings = await requireApi();
    const application = await lookupApplication(settings.trackerUrl, settings.apiKey, url);
    return { ok: true, application };
  }
  if (type === 'log') {
    const application = fieldValue(message, 'application') as ApplicationWrite;
    const settings = await requireApi();
    const result = await logApplication(settings.trackerUrl, settings.apiKey, application);
    return { ok: true, ...result };
  }
  if (type === 'sync-put') {
    const settings = await requireApi();
    const profile = await readProfile();
    if (!profile) throw new Error('Import a profile before syncing');
    await putProfile(settings.trackerUrl, settings.apiKey, profile);
    return { ok: true };
  }
  if (type === 'sync-get') {
    const settings = await requireApi();
    const profile = await getProfile(settings.trackerUrl, settings.apiKey);
    if (!profile) throw new Error('No profile is stored in the tracker yet');
    await writeProfile(profile);
    return { ok: true, profile };
  }
  return { ok: false, error: 'Unknown message' };
}

async function requireApi() {
  const settings = await readSettings();
  if (!settings.apiKey) throw new Error('Add an API key in the extension options');
  return settings;
}

function field(message: unknown, key: string): string {
  if (!message || typeof message !== 'object' || !(key in message))
    throw new Error('Missing request');
  const value = (message as Record<string, unknown>)[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing request');
  return value;
}

async function runOnActiveTab(type: 'autofill' | 'open-log') {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || !tab.url) throw new Error('Open an application page first');
  if (isBlockedPage(tab.url)) throw new Error('LinkedIn and Indeed are not supported');
  await ensureContentScript(tab.id);
  const mounted = (await browser.tabs.sendMessage(tab.id, { type: 'mount-generic' })) as {
    ok?: boolean;
    error?: string;
  };
  if (mounted?.ok === false) throw new Error(mounted.error ?? 'Could not open autofill');
  await browser.tabs.sendMessage(tab.id, { type });
  return { ok: true };
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const ping = (await browser.tabs.sendMessage(tabId, { type: 'ping' })) as { ok?: boolean };
    if (ping?.ok) return;
  } catch {
    // The page does not have the content script yet.
  }
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/content.js'],
  });
}

function optionalField(message: unknown, key: string): string | null {
  if (!message || typeof message !== 'object' || !(key in message)) return null;
  const value = (message as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringList(message: unknown, key: string): string[] {
  if (!message || typeof message !== 'object' || !(key in message))
    throw new Error('Missing request');
  const value = (message as Record<string, unknown>)[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('Missing request');
  }
  return value;
}

function fieldValue(message: unknown, key: string): unknown {
  if (!message || typeof message !== 'object' || !(key in message))
    throw new Error('Missing request');
  return (message as Record<string, unknown>)[key];
}
