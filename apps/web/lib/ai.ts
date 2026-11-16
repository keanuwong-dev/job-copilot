import 'server-only';

import {
  parseModelClassification,
  profileForDraft,
  type Classification,
  type Profile,
} from '@job-tracker/shared';

const MODEL = 'gpt-4o-mini';

export function aiConfig(): { apiKey: string } | null {
  if (process.env.AI_ENABLED !== 'true') return null;
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey };
}

export async function draftAnswer(input: {
  question: string;
  company: string;
  role: string;
  description: string;
  profile: Profile;
}): Promise<string> {
  const text = await complete(
    [
      'You draft a job-application answer the user will edit before submitting.',
      'Use only the profile JSON and the job text. Do not invent employers, schools, degrees, dates, metrics, or tools.',
      'Do not mention GPA unless the question asks for it.',
      'Write plain first-person sentences. No title, bullets, or quotation marks around the answer.',
      'If the profile does not contain enough to answer, say what is missing in one sentence.',
    ].join(' '),
    [
      `Question: ${input.question}`,
      `Company: ${input.company || 'Unknown'}`,
      `Role: ${input.role || 'Unknown'}`,
      `Job description: ${input.description || 'Not provided'}`,
      `Profile: ${profileForDraft(input.profile)}`,
    ].join('\n'),
  );
  const answer = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  if (!answer) throw new Error('The model returned an empty answer');
  return answer.slice(0, 4000);
}

export async function classifyAmbiguousEmail(input: {
  subject: string;
  body: string;
}): Promise<Classification | null> {
  try {
    const text = await complete(
      [
        'You classify one recruiting email.',
        'Reply with JSON only: {"status":"applied"|"oa"|"interview"|"offer"|"rejected"|null,"confidence":0 to 1}.',
        'Use null when the message is not a status update. Do not use ghosted or withdrawn.',
      ].join(' '),
      `Subject: ${input.subject}\n\n${input.body.slice(0, 4000)}`,
    );
    return parseModelClassification(text);
  } catch {
    return null;
  }
}

async function complete(system: string, user: string): Promise<string> {
  const config = aiConfig();
  if (!config) throw new Error('AI is turned off');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error('The model request failed');
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('The model returned an empty answer');
  return content;
}
