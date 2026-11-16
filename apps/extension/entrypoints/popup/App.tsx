import { useState } from 'react';

type Notice = { tone: 'muted' | 'error'; text: string } | null;

export default function App() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  return (
    <main>
      <h1>Job Tracker</h1>
      <p>Fills this page from your profile. You still submit it.</p>
      <button type="button" disabled={busy} onClick={() => void run('autofill', setBusy, setNotice)}>
        {busy ? 'Filling…' : 'Autofill this page'}
      </button>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => void run('open-log', setBusy, setNotice)}
      >
        Log application
      </button>
      {notice ? <p className={notice.tone === 'error' ? 'error' : undefined}>{notice.text}</p> : null}
    </main>
  );
}

async function run(
  type: 'autofill' | 'open-log',
  setBusy: (busy: boolean) => void,
  setNotice: (notice: Notice) => void,
) {
  setBusy(true);
  setNotice(null);
  try {
    const result = (await browser.runtime.sendMessage({
      type: type === 'autofill' ? 'autofill-active' : 'open-log-active',
    })) as { ok?: boolean; error?: string; filled?: number; attention?: number };
    if (!result?.ok) {
      setNotice({ tone: 'error', text: result?.error ?? 'Could not autofill this page' });
      return;
    }
    if (type === 'autofill') {
      const filled = result.filled ?? 0;
      const attention = result.attention ?? 0;
      setNotice({
        tone: 'muted',
        text:
          filled === 0
            ? 'No matching fields on this page.'
            : `Filled ${filled} field${filled === 1 ? '' : 's'}${attention ? `, ${attention} left for you` : ''}.`,
      });
    } else {
      setNotice({ tone: 'muted', text: 'Log this job from the panel on the page.' });
    }
  } catch (error) {
    setNotice({
      tone: 'error',
      text: error instanceof Error ? error.message : 'Could not autofill this page',
    });
  } finally {
    setBusy(false);
  }
}
