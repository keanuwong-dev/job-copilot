import type { ApplicationWrite, Profile } from '@job-tracker/shared';

export type LookupApplication = {
  id: string;
  company: string;
  role: string;
  status: string;
  applied_at: string | null;
  job_url: string | null;
};

export function trackerOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function lookupApplication(
  trackerUrl: string,
  apiKey: string,
  pageUrl: string,
): Promise<LookupApplication | null> {
  const response = await request(
    trackerUrl,
    apiKey,
    `/api/applications/lookup?url=${encodeURIComponent(pageUrl)}`,
  );
  const body = (await response.json()) as {
    application?: LookupApplication | null;
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? 'Lookup failed');
  return body.application ?? null;
}

export async function logApplication(
  trackerUrl: string,
  apiKey: string,
  application: ApplicationWrite,
): Promise<{ created: boolean }> {
  const response = await request(trackerUrl, apiKey, '/api/applications', {
    method: 'POST',
    body: JSON.stringify(application),
  });
  const body = (await response.json()) as { created?: boolean; error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Could not log application');
  return { created: body.created === true };
}

export async function putProfile(
  trackerUrl: string,
  apiKey: string,
  profile: Profile,
): Promise<void> {
  const response = await request(trackerUrl, apiKey, '/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ data: profile }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Could not sync profile');
  }
}

export async function listAnswers(
  trackerUrl: string,
  apiKey: string,
): Promise<Array<{ question_normalized: string; answer: string }>> {
  const response = await request(trackerUrl, apiKey, '/api/answers');
  const body = (await response.json()) as {
    answers?: Array<{ question_normalized: string; answer: string }>;
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? 'Could not load answers');
  return body.answers ?? [];
}

export async function saveAnswer(
  trackerUrl: string,
  apiKey: string,
  input: { question: string; answer: string; platform: string | null },
): Promise<void> {
  const response = await request(trackerUrl, apiKey, '/api/answers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Could not save answer');
  }
}

export async function recordAnswerUse(
  trackerUrl: string,
  apiKey: string,
  used: string[],
): Promise<void> {
  const response = await request(trackerUrl, apiKey, '/api/answers', {
    method: 'POST',
    body: JSON.stringify({ used }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Could not update answers');
  }
}

export async function draftAnswer(
  trackerUrl: string,
  apiKey: string,
  input: {
    question: string;
    company: string;
    role: string;
    description: string;
    profile: Profile;
  },
): Promise<string> {
  const response = await request(trackerUrl, apiKey, '/api/answers/draft', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = (await response.json()) as { answer?: string; error?: string };
  if (!response.ok || !body.answer) throw new Error(body.error ?? 'Could not draft an answer');
  return body.answer;
}

export async function getProfile(trackerUrl: string, apiKey: string): Promise<Profile | null> {
  const response = await request(trackerUrl, apiKey, '/api/profile');
  const body = (await response.json()) as { data?: Profile | null; error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Could not load profile');
  return body.data ?? null;
}

async function request(
  trackerUrl: string,
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${trackerOrigin(trackerUrl)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}
