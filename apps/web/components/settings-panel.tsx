'use client';

import { useState, useTransition } from 'react';
import { createApiKeyAction, revokeApiKeyAction } from '@/app/actions/api-keys';
import type { ApiKeyRow } from '@/lib/rows';
import { formatWhen } from '@/components/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SettingsPanel({ keys }: { keys: ApiKeyRow[] }) {
  const [name, setName] = useState('Extension');
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function createKey() {
    setError(null);
    setSecret(null);
    startTransition(async () => {
      const result = await createApiKeyAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSecret(result.secret);
    });
  }

  function revoke(id: string, keyName: string) {
    if (!window.confirm(`Revoke “${keyName}”? Anything using it will stop working.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeApiKeyAction(id);
      if (!result.ok) setError(result.error);
    });
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-6">
      <section className="grid gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">API keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The extension and Apps Script send a key as `Authorization: Bearer …`. The key is shown
            once. Only its hash is stored. Applied and assessment rows with no activity for 30 days
            are marked Ghosted by the daily job. Answer drafts and uncertain email classification
            stay off until the server has `AI_ENABLED=true` and `AI_API_KEY`.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="key-name" className="mb-1.5">
              Name
            </Label>
            <Input id="key-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <Button type="button" onClick={createKey} disabled={pending}>
            Generate key
          </Button>
        </div>
        {secret ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Copy this key now. It will not be shown again.</p>
            <code className="mt-2 block overflow-x-auto text-xs break-all">{secret}</code>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copySecret}>
              Copy
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        ) : (
          <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatWhen(key.created_at)}
                    {key.last_used_at
                      ? ` · Last used ${formatWhen(key.last_used_at)}`
                      : ' · Never used'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => revoke(key.id, key.name)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
