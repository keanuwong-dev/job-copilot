import { ProfileSchema, type Profile } from '@job-tracker/shared';
import type { StoredResume } from './types';

export type ExtensionSettings = {
  trackerUrl: string;
  apiKey: string;
  enableCoverLetter: boolean;
  platforms: { greenhouse: boolean; lever: boolean; ashby: boolean; workday: boolean };
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  trackerUrl: 'http://localhost:3000',
  apiKey: '',
  enableCoverLetter: false,
  platforms: { greenhouse: true, lever: true, ashby: true, workday: true },
};

export type PublicSettings = Omit<ExtensionSettings, 'apiKey'>;

export async function readSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get('settings');
  const value = stored.settings;
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const record = value as Partial<ExtensionSettings>;
  return {
    trackerUrl:
      typeof record.trackerUrl === 'string' && record.trackerUrl.trim()
        ? record.trackerUrl.trim()
        : DEFAULT_SETTINGS.trackerUrl,
    apiKey: typeof record.apiKey === 'string' ? record.apiKey.trim() : '',
    enableCoverLetter: record.enableCoverLetter === true,
    platforms: {
      greenhouse: record.platforms?.greenhouse !== false,
      lever: record.platforms?.lever !== false,
      ashby: record.platforms?.ashby !== false,
      workday: record.platforms?.workday !== false,
    },
  };
}

export async function writeSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({ settings });
}

export function publicSettings(settings: ExtensionSettings): PublicSettings {
  return {
    trackerUrl: settings.trackerUrl,
    enableCoverLetter: settings.enableCoverLetter,
    platforms: settings.platforms,
  };
}

export async function readProfile(): Promise<Profile | null> {
  const stored = await browser.storage.local.get('profile');
  const parsed = ProfileSchema.safeParse(stored.profile);
  return parsed.success ? parsed.data : null;
}

export async function writeProfile(profile: Profile): Promise<void> {
  await browser.storage.local.set({ profile });
}

export async function readResume(): Promise<StoredResume | null> {
  const stored = await browser.storage.local.get('resume');
  const resume = stored.resume as StoredResume | undefined;
  if (!resume || typeof resume.base64 !== 'string' || typeof resume.name !== 'string') return null;
  return { name: resume.name, type: resume.type || 'application/pdf', base64: resume.base64 };
}

export async function writeResume(resume: StoredResume | null): Promise<void> {
  if (!resume) {
    await browser.storage.local.remove('resume');
    return;
  }
  await browser.storage.local.set({ resume });
}
