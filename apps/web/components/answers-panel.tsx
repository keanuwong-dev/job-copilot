'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ANSWER_CATEGORIES,
  answerCategory,
  type AnswerCategory,
} from '@job-tracker/shared';
import { deleteAnswerAction, saveAnswerAction } from '@/app/actions/answers';
import { PasteAnswers } from '@/components/paste-answers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CATEGORY_STORAGE_KEY = 'answer-categories';

export type AnswerRow = {
  id: string;
  question_raw: string | null;
  question_normalized: string;
  answer: string;
  platform: string | null;
  times_used: number;
  updated_at: string;
};

export function AnswersPanel({ answers }: { answers: AnswerRow[] }) {
  const [overrides, setOverrides] = useState<Record<string, AnswerCategory>>({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setOverrides(readOverrides());
  }, []);

  function setCategory(id: string, category: AnswerCategory) {
    const next = { ...overrides, [id]: category };
    setOverrides(next);
    writeOverrides(next);
  }

  const grouped = new Map<AnswerCategory, AnswerRow[]>();
  for (const category of ANSWER_CATEGORIES) grouped.set(category, []);
  for (const answer of answers) {
    const question = answer.question_raw || answer.question_normalized;
    const category = overrides[answer.id] ?? answerCategory(question);
    grouped.get(category)?.push(answer);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div>
          <h1 className="text-xl font-semibold">Answers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scroll across the categories. Scroll inside a category to read each question.
          </p>
        </div>
        <Button type="button" onClick={() => setAdding((open) => !open)}>
          {adding ? 'Close' : '+ Add answer'}
        </Button>
      </div>
      {adding ? (
        <div className="max-h-[min(28rem,50vh)] overflow-y-auto border-y px-4 py-4">
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <AnswerForm onCategorize={setCategory} />
            <PasteAnswers onCategorize={setCategory} />
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-4 py-4">
          {ANSWER_CATEGORIES.map((category) => {
            const rows = grouped.get(category) ?? [];
            return (
              <section
                key={category}
                className="flex min-h-0 w-72 shrink-0 flex-col rounded-lg border"
              >
                <h2 className="border-b px-3 py-2 text-sm font-semibold">
                  {category}
                  <span className="ml-2 font-normal text-muted-foreground">{rows.length}</span>
                </h2>
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {rows.length === 0 ? (
                    <li className="px-1 py-2 text-sm text-muted-foreground">No answers yet.</li>
                  ) : (
                    rows.map((answer) => (
                      <li key={answer.id} className="shrink-0">
                        <AnswerRowView
                          answer={answer}
                          category={
                            overrides[answer.id] ??
                            answerCategory(answer.question_raw || answer.question_normalized)
                          }
                          onCategorize={setCategory}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
      </div>
    </main>
  );
}

function AnswerForm({ onCategorize }: { onCategorize: (id: string, category: AnswerCategory) => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState<AnswerCategory>('Other');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveAnswerAction({ question, answer });
          if (!result.ok) {
            setMessage(result.error);
            return;
          }
          onCategorize(result.id, category);
          setMessage('Saved.');
          setQuestion('');
          setAnswer('');
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">One question</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a single question and answer.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-question">Question</Label>
        <Input
          id="new-question"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setCategory(answerCategory(event.target.value));
          }}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-answer">Answer</Label>
        <Textarea
          id="new-answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-category">Category</Label>
        <CategorySelect id="new-category" value={category} onChange={setCategory} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Add answer
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}

function AnswerRowView({
  answer,
  category,
  onCategorize,
}: {
  answer: AnswerRow;
  category: AnswerCategory;
  onCategorize: (id: string, category: AnswerCategory) => void;
}) {
  const [mode, setMode] = useState<'summary' | 'view' | 'edit'>('summary');
  const question = answer.question_raw || answer.question_normalized;

  return (
    <div
      className={
        mode === 'summary'
          ? 'flex h-36 items-start gap-2 overflow-hidden rounded-md border px-3 py-3'
          : 'flex min-h-36 items-start gap-2 rounded-md border px-3 py-3'
      }
    >
      <div className="min-w-0 flex-1">
        {mode === 'edit' ? (
          <AnswerEditor
            answer={answer}
            category={category}
            onCategorize={onCategorize}
            onClose={() => setMode('summary')}
          />
        ) : (
          <>
            <p className={mode === 'summary' ? 'line-clamp-2 font-medium' : 'font-medium'}>
              {question}
            </p>
            <p
              className={
                mode === 'view'
                  ? 'mt-1 text-sm whitespace-pre-wrap text-muted-foreground'
                  : 'mt-1 line-clamp-3 text-sm text-muted-foreground'
              }
            >
              {answer.answer}
            </p>
          </>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="shrink-0 rounded-md border px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Options
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setMode(mode === 'view' ? 'summary' : 'view')}>
            {mode === 'view' ? 'Hide answer' : 'View answer'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode('edit')}>Edit</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {ANSWER_CATEGORIES.map((item) => (
                <DropdownMenuItem key={item} onClick={() => onCategorize(answer.id, item)}>
                  {item === category ? `${item} · current` : item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DeleteItem id={answer.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AnswerEditor({
  answer,
  category,
  onCategorize,
  onClose,
}: {
  answer: AnswerRow;
  category: AnswerCategory;
  onCategorize: (id: string, category: AnswerCategory) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(answer.question_raw || answer.question_normalized);
  const [text, setText] = useState(answer.answer);
  const [nextCategory, setNextCategory] = useState(category);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveAnswerAction({ id: answer.id, question, answer: text });
          if (!result.ok) {
            setMessage(result.error);
            return;
          }
          onCategorize(result.id, nextCategory);
          router.refresh();
          onClose();
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`question-${answer.id}`}>Question</Label>
        <Input
          id={`question-${answer.id}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`answer-${answer.id}`}>Answer</Label>
        <Textarea
          id={`answer-${answer.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`category-${answer.id}`}>Category</Label>
        <CategorySelect id={`category-${answer.id}`} value={nextCategory} onChange={setNextCategory} />
      </div>
      <p className="text-xs text-muted-foreground">
        Used {answer.times_used} {answer.times_used === 1 ? 'time' : 'times'}
        {answer.platform ? ` · ${answer.platform}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}

function DeleteItem({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteAnswerAction(id);
            if (!result.ok) setMessage(result.error);
            else router.refresh();
          });
        }}
      >
        Delete
      </DropdownMenuItem>
      {message ? <p className="px-1.5 py-1 text-xs text-destructive">{message}</p> : null}
    </>
  );
}

function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: AnswerCategory;
  onChange: (category: AnswerCategory) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as AnswerCategory)}
      className="h-8 rounded-lg border bg-background px-2 text-sm"
    >
      {ANSWER_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}

function readOverrides(): Record<string, AnswerCategory> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const next: Record<string, AnswerCategory> = {};
    for (const [id, category] of Object.entries(parsed)) {
      if (isCategory(category)) next[id] = category;
    }
    return next;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, AnswerCategory>) {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(overrides));
}

function isCategory(value: unknown): value is AnswerCategory {
  return ANSWER_CATEGORIES.some((category) => category === value);
}
