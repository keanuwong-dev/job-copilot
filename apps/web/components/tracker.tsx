'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  columnVisibilityFeature,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  APP_STATUSES,
  applicationRowTone,
  applicationStats,
  TIERS,
  type AppStatus,
  type ApplicationRowTone,
  type ApplicationStats,
  type Tier,
} from '@job-tracker/shared';
import {
  createApplicationAction,
  deleteApplicationAction,
  updateApplicationAction,
  updateStatusAction,
  updateTierAction,
} from '@/app/actions/applications';
import {
  ApplicationFields,
  draftFromRow,
  emptyDraft,
  type ApplicationDraft,
} from '@/components/application-fields';
import {
  formatRate,
  formatWhen,
  platformLabel,
  STATUS_LABELS,
  STATUS_OPTION_CLASS,
  TIER_LABELS,
} from '@/components/labels';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApplicationRow, EmailEventRow } from '@/lib/rows';
import { cn } from '@/lib/utils';

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

type TrackerColumn = ColumnDef<typeof features, ApplicationRow>;
type GroupMode = 'none' | 'tier' | 'color';

const GROUP_HEADER: Record<string, string> = {
  open: 'bg-[#cfe2f3] text-[#202124]',
  interview: 'bg-white text-black',
  live: 'bg-[#93c47d] text-[#202124]',
  closed: 'bg-[#5f6368] text-white',
  reach: 'bg-[#f8f9fa] text-[#202124]',
  target: 'bg-[#f8f9fa] text-[#202124]',
  volume: 'bg-[#f8f9fa] text-[#202124]',
  unset: 'bg-[#f8f9fa] text-[#5f6368]',
};

const COLOR_GROUPS: { id: string; label: string; statuses: AppStatus[] }[] = [
  { id: 'open', label: 'Saved and applied', statuses: ['saved', 'applied'] },
  { id: 'interview', label: 'Interview', statuses: ['interview'] },
  { id: 'live', label: 'Assessment and offer', statuses: ['oa', 'offer'] },
  { id: 'closed', label: 'Closed', statuses: ['rejected', 'ghosted', 'withdrawn'] },
];

function groupKey(row: ApplicationRow, mode: GroupMode): string {
  if (mode === 'tier') return row.tier ?? 'unset';
  return COLOR_GROUPS.find((group) => group.statuses.includes(row.status))?.id ?? 'open';
}

function groupLabel(key: string, mode: GroupMode): string {
  if (mode === 'tier') return key === 'unset' ? 'Unlabeled' : (TIER_LABELS[key as Tier] ?? key);
  return COLOR_GROUPS.find((group) => group.id === key)?.label ?? key;
}

function groupRank(row: ApplicationRow, mode: GroupMode): number {
  const key = groupKey(row, mode);
  if (mode === 'tier') return ['reach', 'target', 'volume', 'unset'].indexOf(key);
  return COLOR_GROUPS.findIndex((group) => group.id === key);
}

function compareApplications(a: ApplicationRow, b: ApplicationRow, sorting: SortingState): number {
  for (const sort of sorting) {
    const left = a[sort.id as keyof ApplicationRow];
    const right = b[sort.id as keyof ApplicationRow];
    const compared = String(left ?? '').localeCompare(String(right ?? ''), undefined, {
      numeric: true,
    });
    if (compared !== 0) return sort.desc ? -compared : compared;
  }
  return 0;
}

const SHEET_HEAD =
  'h-6 border border-[#dadce0] bg-[#f8f9fa] px-1.5 py-0 text-left text-[12px] font-medium text-[#5f6368]';
const SHEET_CELL = 'h-6 border border-[#dadce0] px-1.5 py-0 text-[13px] leading-6';

const SHEET_ROW: Record<ApplicationRowTone, string> = {
  open: 'bg-[#cfe2f3] text-[#202124] group-hover:bg-[#bcd4ea] [&_a]:text-[#1155cc]',
  live: 'bg-[#93c47d] text-[#202124] group-hover:bg-[#7fba68] [&_a]:text-[#1155cc]',
  plain: 'bg-white text-black group-hover:bg-[#f1f3f4] [&_a]:text-[#1155cc]',
  closed: 'bg-[#5f6368] text-white group-hover:bg-[#4a4e52] [&_a]:text-white [&_svg]:text-white',
};

export function Tracker({
  applications,
  events,
  asOf,
}: {
  applications: ApplicationRow[];
  events: EmailEventRow[];
  asOf: string;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | 'all'>('all');
  const [groupBy, setGroupBy] = useState<GroupMode>('none');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'last_activity_at', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ApplicationDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => applicationStats(applications, new Date(asOf)), [applications, asOf]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        row.company,
        row.role,
        row.location,
        row.platform,
        row.notes,
        row.status,
        row.tier,
        row.company_domain,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [applications, query, statusFilter]);

  const tableData = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (groupBy !== 'none') {
        const rank = groupRank(a, groupBy) - groupRank(b, groupBy);
        if (rank !== 0) return rank;
      }
      return compareApplications(a, b, sorting);
    });
    return copy;
  }, [filtered, groupBy, sorting]);

  const selected = applications.find((row) => row.id === selectedId) ?? null;
  const selectedEvents = events.filter((event) => event.application_id === selectedId);

  function openRow(row: ApplicationRow) {
    setSelectedId(row.id);
    setEditDraft(draftFromRow(row));
    setError(null);
    setNotice(null);
  }

  const columns = useMemo<TrackerColumn[]>(
    () => [
      { accessorKey: 'company', header: 'Company' },
      { accessorKey: 'role', header: 'Role' },
      {
        accessorKey: 'tier',
        header: 'Label',
        cell: ({ row }) => (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Select
              value={row.original.tier ?? 'none'}
              onValueChange={(value) => {
                const tier = !value || value === 'none' ? null : (value as Tier);
                setError(null);
                startTransition(async () => {
                  const result = await updateTierAction(row.original.id, tier);
                  if (!result.ok) setError(result.error);
                });
              }}
            >
              <SelectTrigger className="h-5 rounded-none border-0 bg-transparent px-1 py-0 text-[13px] shadow-none data-[size=default]:h-5 data-[size=default]:rounded-none focus-visible:ring-1 [&_svg]:size-3 [&_svg]:text-current">
                <SelectValue>
                  {row.original.tier ? TIER_LABELS[row.original.tier] : '—'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {TIER_LABELS[tier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Select
              value={row.original.status}
              onValueChange={(value) => {
                if (!value) return;
                setError(null);
                startTransition(async () => {
                  const result = await updateStatusAction(row.original.id, value as AppStatus);
                  if (!result.ok) setError(result.error);
                });
              }}
            >
              <SelectTrigger className="h-5 rounded-none border-0 bg-transparent px-1 py-0 text-[13px] shadow-none data-[size=default]:h-5 data-[size=default]:rounded-none focus-visible:ring-1 [&_svg]:size-3 [&_svg]:text-current">
                <SelectValue>{STATUS_LABELS[row.original.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {APP_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className={STATUS_OPTION_CLASS[status]}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      },
      {
        accessorKey: 'applied_at',
        header: 'Applied',
        cell: ({ row }) => formatWhen(row.original.applied_at),
        sortFn: 'datetime',
      },
      {
        accessorKey: 'last_activity_at',
        header: 'Last activity',
        cell: ({ row }) => formatWhen(row.original.last_activity_at),
        sortFn: 'datetime',
      },
      {
        accessorKey: 'platform',
        header: 'Platform',
        cell: ({ row }) => platformLabel(row.original.platform),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => row.original.location || '—',
      },
      {
        accessorKey: 'job_url',
        header: 'Link',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.job_url ? (
            <a
              href={row.original.job_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              onClick={(event) => event.stopPropagation()}
            >
              Open
            </a>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-56">{row.original.notes || '—'}</span>
        ),
      },
    ],
    [],
  );

  const table = useTable({
    features,
    data: tableData,
    columns,
    state: { sorting: [], columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  function toggleSort(columnId: string) {
    setSorting((current) => {
      const active = current[0];
      if (!active || active.id !== columnId) return [{ id: columnId, desc: false }];
      if (!active.desc) return [{ id: columnId, desc: true }];
      return [{ id: 'last_activity_at', desc: true }];
    });
  }

  function saveNew() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createApplicationAction(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdding(false);
      setDraft(emptyDraft());
      setNotice(
        result.created === false ? 'That job URL is already in the tracker.' : 'Application added.',
      );
    });
  }

  function saveEdit() {
    if (!selected || !editDraft) return;
    setError(null);
    startTransition(async () => {
      const result = await updateApplicationAction(selected.id, editDraft);
      if (!result.ok) setError(result.error);
      else setNotice('Saved.');
    });
  }

  function removeSelected() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.company} — ${selected.role}?`)) return;
    startTransition(async () => {
      const result = await deleteApplicationAction(selected.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelectedId(null);
      setEditDraft(null);
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4">
      <StatsBar stats={stats} />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company, role, notes"
          className="w-full sm:max-w-xs"
          aria-label="Search applications"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter((value ?? 'all') as AppStatus | 'all')}
        >
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue>
              {statusFilter === 'all' ? 'All statuses' : STATUS_LABELS[statusFilter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APP_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className={STATUS_OPTION_CLASS[status]}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(value) => setGroupBy((value ?? 'none') as GroupMode)}>
          <SelectTrigger className="w-44" aria-label="Group applications">
            <SelectValue>
              {groupBy === 'tier'
                ? 'Group: label'
                : groupBy === 'color'
                  ? 'Group: status'
                  : 'No grouping'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="tier">Group by label</SelectItem>
            <SelectItem value="color">Group by status</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>Columns</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(checked)}
              >
                {columnLabel(column.id)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv(table.getRowModel().rows.map((row) => row.original))}
        >
          Export CSV
        </Button>
        <Button
          type="button"
          className="sm:ml-auto"
          onClick={() => {
            setDraft({
              ...emptyDraft(),
              applied_at: new Date().toISOString().slice(0, 10),
            });
            setAdding(true);
            setError(null);
          }}
        >
          Add application
        </Button>
      </div>

      <div className="border border-[#dadce0] bg-white">
        <Table className="border-collapse text-[13px] leading-none">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="border-0 hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead key={header.id} className={SHEET_HEAD}>
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={header.column.getCanSort() ? 'hover:underline' : undefined}
                        onClick={() => {
                          if (header.column.getCanSort()) toggleSort(header.column.id);
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorting[0]?.id === header.column.id
                          ? sorting[0].desc
                            ? ' ↓'
                            : ' ↑'
                          : null}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="border border-[#dadce0] py-8 text-center text-muted-foreground"
                >
                  No applications yet.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.flatMap((row, index, rows) => {
                const tone = applicationRowTone(row.original.status, row.original.notes);
                const key = groupBy === 'none' ? '' : groupKey(row.original, groupBy);
                const previous =
                  index === 0 || groupBy === 'none'
                    ? ''
                    : groupKey(rows[index - 1]?.original ?? row.original, groupBy);
                const header =
                  groupBy !== 'none' && key !== previous ? (
                    <TableRow key={`group-${key}`} className="border-0 hover:bg-transparent">
                      <TableCell
                        colSpan={row.getVisibleCells().length}
                        className={cn(
                          'border border-[#dadce0] px-1.5 py-1 text-[12px] font-medium',
                          GROUP_HEADER[key],
                        )}
                      >
                        {groupLabel(key, groupBy)}
                      </TableCell>
                    </TableRow>
                  ) : null;
                return [
                  header,
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer border-0 bg-transparent hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent"
                    onClick={() => openRow(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cn(SHEET_CELL, SHEET_ROW[tone])}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>,
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add application</DialogTitle>
          </DialogHeader>
          <ApplicationFields draft={draft} onChange={setDraft} idPrefix="add" />
          <DialogFooter>
            <Button type="button" onClick={saveNew} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setEditDraft(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && editDraft ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.company} — {selected.role}
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 px-4">
                <ApplicationFields draft={editDraft} onChange={setEditDraft} idPrefix="edit" />
                <div>
                  <h2 className="text-sm font-medium">Email timeline</h2>
                  {selectedEvents.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No emails yet.</p>
                  ) : (
                    <ul className="mt-2 grid gap-2">
                      {selectedEvents.map((event) => (
                        <li key={event.id} className="rounded-lg bg-muted p-2 text-sm">
                          <p className="font-medium">{event.subject || '(no subject)'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(event.received_at)}
                            {event.detected_status
                              ? ` · ${STATUS_LABELS[event.detected_status]}`
                              : ''}
                          </p>
                          {event.snippet ? <p className="mt-1">{event.snippet}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <SheetFooter className="flex-row justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeSelected}
                  disabled={pending}
                >
                  Delete
                </Button>
                <Button type="button" onClick={saveEdit} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatsBar({ stats }: { stats: ApplicationStats }) {
  const items = [
    ['Applied', String(stats.totalApplied)],
    ['This week', String(stats.appliedThisWeek)],
    ['Response rate', formatRate(stats.responseRate)],
    ['Interviews', String(stats.interviews)],
    ['Offers', String(stats.offers)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              'text-lg font-semibold tabular-nums',
              label === 'Offers' && 'text-green-700',
              label === 'Interviews' && 'text-black',
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function columnLabel(id: string): string {
  const labels: Record<string, string> = {
    company: 'Company',
    role: 'Role',
    status: 'Status',
    applied_at: 'Applied',
    last_activity_at: 'Last activity',
    platform: 'Platform',
    location: 'Location',
    job_url: 'Link',
    tier: 'Label',
    notes: 'Notes',
  };
  return labels[id] ?? id;
}

function downloadCsv(rows: ApplicationRow[]) {
  const headers = [
    'company',
    'role',
    'status',
    'applied_at',
    'last_activity_at',
    'platform',
    'location',
    'job_url',
    'company_domain',
    'salary_range',
    'tier',
    'notes',
  ] as const;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'applications.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
