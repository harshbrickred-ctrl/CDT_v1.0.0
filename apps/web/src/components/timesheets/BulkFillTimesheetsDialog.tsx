import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  apiErrorMessage,
  candidatesApi,
  clientsApi,
  leavesApi,
  timesheetsApi,
} from '../../lib/api';
import { scopeClientsForUser } from '../../lib/client-scope';
import { useAuth } from '../../context/AuthContext';
import Dialog from '../ui/Dialog';
import EmptyState from '../ui/EmptyState';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  fieldClass,
  tableWrap,
  tdClass,
  thClass,
} from '../ui/styles';

export type BulkFillCandidate = {
  id: string;
  name: string;
  clientId?: string | null;
  status?: string | null;
};

type BulkRow = {
  candidateId: string;
  candidateName: string;
  workingDays: string;
  leaveDays: number;
  daysWorked: string;
  remarks: string;
  error?: string | null;
  saved?: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function periodFromYearMonth(yearMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    periodStart: new Date(Date.UTC(year, month - 1, 1)),
    periodEnd: new Date(Date.UTC(year, month, 0)),
  };
}

function toUtcDateOnly(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function inclusiveCalendarDays(from: Date, to: Date) {
  const start = toUtcDateOnly(from);
  const end = toUtcDateOnly(to);
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function overlapInclusiveDays(
  leaveFrom: Date,
  leaveTo: Date,
  periodStart: Date,
  periodEnd: Date,
) {
  const a = toUtcDateOnly(leaveFrom);
  const b = toUtcDateOnly(leaveTo);
  const c = toUtcDateOnly(periodStart);
  const d = toUtcDateOnly(periodEnd);
  const start = a.getTime() > c.getTime() ? a : c;
  const end = b.getTime() < d.getTime() ? b : d;
  if (end.getTime() < start.getTime()) return 0;
  return inclusiveCalendarDays(start, end);
}

function formatYearMonthLabel(yearMonth: string) {
  const period = periodFromYearMonth(yearMonth);
  if (!period) return yearMonth;
  return period.periodStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildRows(
  candidates: BulkFillCandidate[],
  yearMonth: string,
  timesheets: Array<{
    candidateId: string;
    workingDays?: number | null;
    daysWorked?: number | null;
    remarks?: string | null;
  }>,
  leaves: Array<{
    candidateId: string;
    status: string;
    startDate: string;
    endDate: string;
  }>,
): BulkRow[] {
  const period = periodFromYearMonth(yearMonth);
  if (!period) return [];

  const existingByCandidate = new Map(
    timesheets.map((t) => [t.candidateId, t]),
  );

  return candidates.map((c) => {
    const existing = existingByCandidate.get(c.id);
    const leaveDays = leaves
      .filter((lv) => lv.candidateId === c.id && lv.status === 'APPROVED')
      .reduce(
        (sum, leave) =>
          sum +
          overlapInclusiveDays(
            new Date(leave.startDate),
            new Date(leave.endDate),
            period.periodStart,
            period.periodEnd,
          ),
        0,
      );
    const workingDays = existing?.workingDays ?? 22;
    const suggested = Math.max(0, Number(workingDays) - leaveDays);
    const released =
      c.status === 'RELEASED' ||
      (typeof c.status === 'string' &&
        c.status.replace(/_/g, ' ').toUpperCase() === 'RELEASED');
    return {
      candidateId: c.id,
      candidateName: released ? `${c.name} (Released)` : c.name,
      workingDays: String(workingDays),
      leaveDays,
      daysWorked:
        existing?.daysWorked != null
          ? String(existing.daysWorked)
          : String(suggested),
      remarks: existing?.remarks ?? '',
      error: null,
      saved: false,
    };
  });
}

export default function BulkFillTimesheetsDialog({
  open,
  onClose,
  onSaved,
  mode,
  initialClientId = '',
  initialYearMonth,
  candidates = [],
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  mode: 'by-client' | 'by-candidates';
  initialClientId?: string;
  initialYearMonth: string;
  candidates?: BulkFillCandidate[];
}) {
  const { user } = useAuth();
  const [clientId, setClientId] = useState(initialClientId);
  const [yearMonth, setYearMonth] = useState(initialYearMonth);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefillKeyRef = useRef('');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRows([]);
    prefillKeyRef.current = '';
    setClientId(initialClientId);
    setYearMonth(initialYearMonth);
  }, [open, initialClientId, initialYearMonth, mode]);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
    enabled: open && mode === 'by-client',
  });

  const scopedClients = useMemo(
    () =>
      scopeClientsForUser(
        clientsQuery.data?.items ?? [],
        user?.ownedClientIds,
      ),
    [clientsQuery.data?.items, user?.ownedClientIds],
  );

  const byClientCandidatesQuery = useQuery({
    queryKey: ['candidates', 'bulk-ts', clientId],
    queryFn: () =>
      candidatesApi.list({
        clientId,
        statuses: 'ACTIVE,RELEASED',
        pageSize: 200,
      }),
    enabled: open && mode === 'by-client' && Boolean(clientId),
  });

  const timesheetsQuery = useQuery({
    queryKey: [
      'timesheets',
      'bulk-fill',
      mode,
      mode === 'by-client' ? clientId : 'all',
      yearMonth,
    ],
    queryFn: () =>
      timesheetsApi.list({
        ...(mode === 'by-client' && clientId ? { clientId } : {}),
        yearMonth,
        pageSize: 500,
      }),
    enabled:
      open &&
      Boolean(yearMonth) &&
      (mode === 'by-candidates' || Boolean(clientId)),
  });

  const leavesQuery = useQuery({
    queryKey: [
      'leaves',
      'bulk-fill',
      mode,
      mode === 'by-client' ? clientId : 'all',
    ],
    queryFn: () =>
      leavesApi.list({
        ...(mode === 'by-client' && clientId ? { clientId } : {}),
        status: 'APPROVED',
        pageSize: 500,
      }),
    enabled:
      open && (mode === 'by-candidates' || Boolean(clientId)),
  });

  const seedCandidates = useMemo((): BulkFillCandidate[] => {
    if (mode === 'by-candidates') return candidates;
    return (byClientCandidatesQuery.data?.items ?? []).map((c) => ({
      id: c.id,
      name: c.fullName,
      clientId: c.clientId,
      status: c.status,
    }));
  }, [mode, candidates, byClientCandidatesQuery.data]);

  const loading =
    timesheetsQuery.isLoading ||
    leavesQuery.isLoading ||
    (mode === 'by-client' &&
      Boolean(clientId) &&
      byClientCandidatesQuery.isLoading);

  const fetching =
    timesheetsQuery.isFetching ||
    leavesQuery.isFetching ||
    (mode === 'by-client' && byClientCandidatesQuery.isFetching);

  useEffect(() => {
    if (!open || !yearMonth) {
      setRows([]);
      prefillKeyRef.current = '';
      return;
    }
    if (mode === 'by-client' && !clientId) {
      setRows([]);
      prefillKeyRef.current = '';
      return;
    }
    if (fetching) return;
    if (seedCandidates.length === 0) {
      setRows([]);
      return;
    }

    const tsItems = timesheetsQuery.data?.items ?? [];
    const leaveItems = leavesQuery.data?.items ?? [];
    const key = `${mode}|${clientId}|${yearMonth}|${seedCandidates.map((c) => c.id).join(',')}|${tsItems.length}|${leaveItems.length}`;
    if (prefillKeyRef.current === key) return;
    prefillKeyRef.current = key;

    setRows(buildRows(seedCandidates, yearMonth, tsItems, leaveItems));
  }, [
    open,
    mode,
    clientId,
    yearMonth,
    seedCandidates,
    fetching,
    timesheetsQuery.data,
    leavesQuery.data,
  ]);

  function updateRow(candidateId: string, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((r) =>
        r.candidateId === candidateId
          ? { ...r, ...patch, saved: false, error: null }
          : r,
      ),
    );
  }

  async function save() {
    setError(null);
    if (mode === 'by-client' && !clientId) {
      setError('Select a client.');
      return;
    }
    if (!yearMonth) {
      setError('Select a month.');
      return;
    }
    if (rows.length === 0) {
      setError(
        mode === 'by-client'
          ? 'No active employees for this client.'
          : 'No employees to fill.',
      );
      return;
    }

    setSaving(true);
    let failCount = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i += 1) {
      const row = next[i];
      const workingDays = Number(row.workingDays);
      const daysWorked = Number(row.daysWorked);
      if (!Number.isFinite(workingDays) || workingDays < 0) {
        next[i] = { ...row, error: 'Invalid working days', saved: false };
        failCount += 1;
        continue;
      }
      if (!Number.isFinite(daysWorked) || daysWorked < 0) {
        next[i] = { ...row, error: 'Invalid days worked', saved: false };
        failCount += 1;
        continue;
      }
      if (daysWorked > workingDays) {
        next[i] = {
          ...row,
          error: 'Days worked cannot exceed working days',
          saved: false,
        };
        failCount += 1;
        continue;
      }
      try {
        await timesheetsApi.upsert({
          candidateId: row.candidateId,
          yearMonth,
          workingDays,
          daysWorked,
          remarks: row.remarks || undefined,
        });
        next[i] = { ...row, error: null, saved: true };
      } catch (err) {
        next[i] = {
          ...row,
          error: apiErrorMessage(err, 'Save failed'),
          saved: false,
        };
        failCount += 1;
      }
      setRows([...next]);
    }
    setSaving(false);

    if (failCount === 0) {
      await onSaved?.();
      onClose();
    } else {
      setError(`${failCount} row(s) failed to save. Fix and retry.`);
    }
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  const title =
    mode === 'by-candidates'
      ? `Bulk fill timesheets — ${formatYearMonthLabel(yearMonth)}`
      : 'Bulk fill by client';

  const canSave =
    !saving &&
    rows.length > 0 &&
    Boolean(yearMonth) &&
    (mode === 'by-candidates' || Boolean(clientId));

  return (
    <Dialog open={open} title={title} onClose={handleClose} size="xl">
      <div className="space-y-4">
        {mode === 'by-client' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="bulk-ts-client"
              label="Client *"
              value={clientId}
              onChange={(e) => {
                prefillKeyRef.current = '';
                setClientId(e.target.value);
              }}
            >
              <option value="">Select client</option>
              {scopedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              id="bulk-ts-month"
              label="Month *"
              type="month"
              value={yearMonth}
              onChange={(e) => {
                prefillKeyRef.current = '';
                setYearMonth(e.target.value);
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Filling missing timesheets for{' '}
            <strong>{formatYearMonthLabel(yearMonth)}</strong> (
            {candidates.length} employee
            {candidates.length === 1 ? '' : 's'}).
          </p>
        )}

        {mode === 'by-client' && !clientId ? (
          <EmptyState
            title="Select a client"
            description="Choose a client and month to load active employees."
          />
        ) : loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              mode === 'by-client'
                ? 'No active employees'
                : 'No employees to fill'
            }
            description={
              mode === 'by-client'
                ? 'This client has no active employees to fill.'
                : 'There are no employees in this missing-timesheet list.'
            }
          />
        ) : (
          <div className={`max-h-[50vh] overflow-auto ${tableWrap}`}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={thClass}>Employee</th>
                  <th className={thClass}>Working days</th>
                  <th className={thClass}>Leave / LOP</th>
                  <th className={thClass}>Days worked</th>
                  <th className={thClass}>Remarks</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.candidateId}>
                    <td className={tdClass}>{row.candidateName}</td>
                    <td className={tdClass}>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className={`${fieldClass} !py-1.5`}
                        value={row.workingDays}
                        disabled={saving}
                        onChange={(e) =>
                          updateRow(row.candidateId, {
                            workingDays: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {row.leaveDays}
                    </td>
                    <td className={tdClass}>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className={`${fieldClass} !py-1.5`}
                        value={row.daysWorked}
                        disabled={saving}
                        onChange={(e) =>
                          updateRow(row.candidateId, {
                            daysWorked: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        className={`${fieldClass} !py-1.5`}
                        value={row.remarks}
                        disabled={saving}
                        onChange={(e) =>
                          updateRow(row.candidateId, {
                            remarks: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className={tdClass}>
                      {row.error ? (
                        <span className="text-xs text-destructive">
                          {row.error}
                        </span>
                      ) : row.saved ? (
                        <span className="text-xs text-success">Saved</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <Alert tone="error" className="!mb-0">
            {error}
          </Alert>
        )}

        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : `Save ${rows.length || ''} timesheets`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
