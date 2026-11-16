import { useEffect, useState } from 'react';
import type { LookupApplication } from '../../src/api';

type Status = {
  platform: string | null;
  applied: LookupApplication | null;
  error: string | null;
  trackerUrl: string;
};

export default function App() {
  const [status, setStatus] = useState<Status>({
    platform: null,
    applied: null,
    error: null,
    trackerUrl: 'http://localhost:3000',
  });

  useEffect(() => {
    void inspect().then(setStatus);
  }, []);

  return (
    <main>
      <h1>Job Tracker</h1>
      <p>
        {status.platform
          ? `Detected ${status.platform}`
          : 'Autofill uses label matching on this page. LinkedIn and Indeed stay blocked.'}
      </p>
      {status.applied ? (
        <p>
          Already applied on {(status.applied.applied_at ?? '').slice(0, 10) || 'a previous date'}.
        </p>
      ) : (
        <p>No logged application for this page.</p>
      )}
      {status.error ? <p>{status.error}</p> : null}
      <button type="button" onClick={() => void send('autofill', setStatus)}>
        Autofill this page
      </button>
      <button type="button" onClick={() => void send('open-log', setStatus)}>
        Log application
      </button>
      <p>
        <a href={status.trackerUrl} target="_blank" rel="noreferrer">
          Open tracker
        </a>
      </p>
    </main>
  );
}

async function inspect(): Promise<Status> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const bundle = (await browser.runtime.sendMessage({ type: 'bundle' })) as {
    settings?: { trackerUrl?: string };
  };
  const trackerUrl = bundle?.settings?.trackerUrl || 'http://localhost:3000';
  if (tab?.id == null || !tab.url) {
    return { platform: null, applied: null, error: null, trackerUrl };
  }
  let platform: string | null = null;
  try {
    const status = (await browser.tabs.sendMessage(tab.id, { type: 'status' })) as {
      platform?: string;
    };
    platform = status?.platform ?? null;
  } catch {
    platform = null;
  }
  const lookup = (await browser.runtime.sendMessage({ type: 'lookup', url: tab.url })) as {
    ok?: boolean;
    application?: LookupApplication | null;
    error?: string;
  };
  return {
    platform,
    applied: lookup?.application ?? null,
    error: lookup?.ok ? null : (lookup?.error ?? null),
    trackerUrl,
  };
}

async function send(
  type: 'autofill' | 'open-log',
  setStatus: (update: (current: Status) => Status) => void,
) {
  setStatus((current) => ({ ...current, error: null }));
  const result = (await browser.runtime.sendMessage({
    type: type === 'autofill' ? 'autofill-active' : 'open-log-active',
  })) as { ok?: boolean; error?: string };
  if (!result?.ok) {
    setStatus((current) => ({
      ...current,
      error: result?.error ?? 'Could not autofill this page',
    }));
  }
}
