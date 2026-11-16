'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ANSWER_CATEGORIES,
  answerCategory,
  parsePastedAnswers,
  type AnswerCategory,
} from '@job-tracker/shared';
import { importAnswersAction } from '@/app/actions/answers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Draft = {
  key: string;
  question: string;
  answer: string;
  category: AnswerCategory;
  categoryTouched: boolean;
};

export function PasteAnswers({
  onCategorize,
}: {
  onCategorize: (id: string, category: AnswerCategory) => void;
}) {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function split() {
    const pairs = parsePastedAnswers(text);
    if (pairs.length === 0) {
      setDrafts(null);
      setMessage(
        'No questions found. Put each question on its own line. End it with a question mark, or start it like a prompt, such as "Describe" or "Tell me".',
      );
      return;
    }
    setMessage(null);
    setDrafts(
      pairs.map((pair, index) => ({
        key: `${index}-${pair.question}`,
        question: pair.question,
        answer: pair.answer,
        category: answerCategory(pair.question),
        categoryTouched: false,
      })),
    );
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null,
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">Paste a list</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste questions and answers together. Put each question on its own line. It can end with a
          question mark, or start like a prompt, such as "Describe your ideal team" or "Tell me about
          a project you are proud of". The text under it becomes the answer. A short heading such as
          "By role" is skipped.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pasted-answers">Pasted text</Label>
        <Textarea
          id="pasted-answers"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder={'Why are you interested in this company?\nI want to join because…'}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={split} disabled={text.trim().length === 0}>
          Split into answers
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
      {drafts && drafts.length > 0 ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const items = drafts.map((draft) => ({
              question: draft.question,
              answer: draft.answer,
            }));
            startTransition(async () => {
              const result = await importAnswersAction({ items });
              if (!result.ok) {
                setMessage(result.error);
                return;
              }
              for (const saved of result.saved) {
                const draft = drafts.find((item) => item.question === saved.question);
                onCategorize(saved.id, draft?.category ?? answerCategory(saved.question));
              }
              const savedQuestions = new Set(result.saved.map((item) => item.question));
              setDrafts((current) => current?.filter((draft) => !savedQuestions.has(draft.question)) ?? null);
              if (result.saved.length === items.length) {
                setText('');
                setDrafts(null);
              }
              setMessage(importMessage(result.saved.length, result.skipped, result.errors));
              if (result.saved.length > 0) router.refresh();
            });
          }}
        >
          <ul className="flex flex-col gap-4">
            {drafts.map((draft, index) => (
              <li key={draft.key} className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {index + 1} · {draft.category}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDrafts((current) => current?.filter((item) => item.key !== draft.key) ?? null)
                    }
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`paste-question-${draft.key}`}>Question</Label>
                  <Input
                    id={`paste-question-${draft.key}`}
                    value={draft.question}
                    onChange={(event) => {
                      const question = event.target.value;
                      updateDraft(draft.key, {
                        question,
                        category: draft.categoryTouched ? draft.category : answerCategory(question),
                      });
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`paste-answer-${draft.key}`}>Answer</Label>
                  <Textarea
                    id={`paste-answer-${draft.key}`}
                    value={draft.answer}
                    onChange={(event) => updateDraft(draft.key, { answer: event.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`paste-category-${draft.key}`}>Category</Label>
                  <select
                    id={`paste-category-${draft.key}`}
                    value={draft.category}
                    onChange={(event) =>
                      updateDraft(draft.key, {
                        category: event.target.value as AnswerCategory,
                        categoryTouched: true,
                      })
                    }
                    className="h-8 rounded-lg border bg-background px-2 text-sm"
                  >
                    {ANSWER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              Save {drafts.length} {drafts.length === 1 ? 'answer' : 'answers'}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function importMessage(saved: number, skipped: string[], errors: string[]): string {
  const parts = [`Saved ${saved}.`];
  if (skipped.length > 0) parts.push(`Already saved: ${skipped.join('; ')}.`);
  if (errors.length > 0) parts.push(errors.join(' '));
  return parts.join(' ');
}
