import { useEffect, useState } from 'react';
import { parseProfileYaml, type Profile } from '@job-tracker/shared';
import {
  readProfile,
  readResume,
  readSettings,
  writeProfile,
  writeResume,
  writeSettings,
  type ExtensionSettings,
} from '../../src/settings';

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [profileLabel, setProfileLabel] = useState('No profile imported');
  const [resumeLabel, setResumeLabel] = useState('No resume imported');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [nextSettings, profile, resume] = await Promise.all([
        readSettings(),
        readProfile(),
        readResume(),
      ]);
      setSettings(nextSettings);
      if (profile) setProfileLabel(profileName(profile));
      if (resume) setResumeLabel(resume.name);
    })();
  }, []);

  if (!settings) return <p>Loading…</p>;

  async function save(next: ExtensionSettings) {
    setSettings(next);
    await writeSettings(next);
    setMessage('Saved.');
  }

  return (
    <main>
      <h1>Job Tracker</h1>
      <p>Import your profile and resume. The extension fills fields and never clicks Submit.</p>
      <label>
        Tracker URL
        <input
          value={settings.trackerUrl}
          onChange={(event) => setSettings({ ...settings, trackerUrl: event.target.value })}
        />
      </label>
      <label>
        API key
        <input
          type="password"
          autoComplete="off"
          value={settings.apiKey}
          onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.enableCoverLetter}
          onChange={(event) =>
            setSettings({ ...settings, enableCoverLetter: event.target.checked })
          }
        />
        Fill cover letter
      </label>
      <fieldset>
        <legend>Platforms</legend>
        <label>
          <input
            type="checkbox"
            checked={settings.platforms.greenhouse}
            onChange={(event) =>
              setSettings({
                ...settings,
                platforms: { ...settings.platforms, greenhouse: event.target.checked },
              })
            }
          />
          Greenhouse
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.platforms.lever}
            onChange={(event) =>
              setSettings({
                ...settings,
                platforms: { ...settings.platforms, lever: event.target.checked },
              })
            }
          />
          Lever
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.platforms.ashby}
            onChange={(event) =>
              setSettings({
                ...settings,
                platforms: { ...settings.platforms, ashby: event.target.checked },
              })
            }
          />
          Ashby
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.platforms.workday}
            onChange={(event) =>
              setSettings({
                ...settings,
                platforms: { ...settings.platforms, workday: event.target.checked },
              })
            }
          />
          Workday
        </label>
      </fieldset>
      <button type="button" onClick={() => void save(settings)}>
        Save settings
      </button>
      <label>
        Import profile.yaml
        <input
          type="file"
          accept=".yaml,.yml,text/yaml"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importYaml(file, setProfileLabel, setMessage);
          }}
        />
      </label>
      <p>{profileLabel}</p>
      <label>
        Resume PDF
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importResume(file, setResumeLabel, setMessage);
          }}
        />
      </label>
      <p>{resumeLabel}</p>
      <button type="button" onClick={() => void sync('sync-put', setMessage, setProfileLabel)}>
        Sync to web
      </button>
      <button type="button" onClick={() => void sync('sync-get', setMessage, setProfileLabel)}>
        Sync from web
      </button>
      <p>Shortcut: Alt+Shift+F autofills the current application.</p>
      {message ? <p>{message}</p> : null}
    </main>
  );
}

async function importYaml(
  file: File,
  setProfileLabel: (value: string) => void,
  setMessage: (value: string) => void,
) {
  try {
    const profile = parseProfileYaml(await file.text());
    await writeProfile(profile);
    setProfileLabel(profileName(profile));
    setMessage('Profile imported.');
  } catch (error) {
    setMessage(errorMessage(error));
  }
}

async function importResume(
  file: File,
  setResumeLabel: (value: string) => void,
  setMessage: (value: string) => void,
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeResume({
    name: file.name,
    type: file.type || 'application/pdf',
    base64: bytesToBase64(bytes),
  });
  setResumeLabel(file.name);
  setMessage('Resume imported.');
}

async function sync(
  type: 'sync-put' | 'sync-get',
  setMessage: (value: string) => void,
  setProfileLabel: (value: string) => void,
) {
  const result = (await browser.runtime.sendMessage({ type })) as {
    ok?: boolean;
    error?: string;
    profile?: Profile;
  };
  if (!result?.ok) {
    setMessage(result?.error ?? 'Sync failed');
    return;
  }
  if (result.profile) setProfileLabel(profileName(result.profile));
  setMessage(
    type === 'sync-put' ? 'Profile saved to the tracker.' : 'Profile loaded from the tracker.',
  );
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues;
    return issues?.[0]?.message ?? 'Invalid profile';
  }
  return 'Could not read that file';
}

function profileName(profile: Profile): string {
  const name = [profile.personal.first_name, profile.personal.last_name].filter(Boolean).join(' ');
  return name || profile.personal.email || 'Profile imported';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
}
