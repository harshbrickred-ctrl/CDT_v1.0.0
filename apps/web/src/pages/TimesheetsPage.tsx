import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  clientsApi,
  invoicesApi,
  leavesApi,
  timesheetsApi,
} from '../lib/api';
import { currentYearMonth, formatDate, formatPct } from '../lib/format';
import { scopeClientsForUser } from '../lib/client-scope';
import type { Candidate, Timesheet } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Dialog from '../components/ui/Dialog';
import FilterBar from '../components/ui/FilterBar';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import CandidateCombobox from '../components/ui/CandidateCombobox';
import { DetailField, DetailGrid, clickableRowClass } from '../components/ui/DetailGrid';
import BulkFillTimesheetsDialog from '../components/timesheets/BulkFillTimesheetsDialog';
import {
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type TimesheetForm = {
  candidateId: string;
  yearMonth: string;
  workingDays: string;
  daysWorked: string;
  remarks: string;
};

const emptyForm = (): TimesheetForm => ({
  candidateId: '',
  yearMonth: currentYearMonth(),
  workingDays: '22',
  daysWorked: '',
  remarks: '',
});

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
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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

function attendancePreview(daysWorked: number, workingDays: number) {
  if (workingDays <= 0) return null;
  return Math.round((daysWorked / workingDays) * 1000) / 10;
}

function monthLabel(yearMonth: string) {
  const period = periodFromYearMonth(yearMonth);
  if (!period) return yearMonth;
  return period.periodStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function timesheetPeriodDates(t: Timesheet) {
  if (t.periodStart && t.periodEnd) {
    return { start: t.periodStart, end: t.periodEnd };
  }
  const period = periodFromYearMonth(t.yearMonth);
  if (!period) return { start: null, end: null };
  return {
    start: period.periodStart.toISOString().slice(0, 10),
    end: period.periodEnd.toISOString().slice(0, 10),
  };
}

export default function TimesheetsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [yearMonthFilter, setYearMonthFilter] = useState(currentYearMonth());
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInitialClientId, setBulkInitialClientId] = useState('');
  const [bulkInitialMonth, setBulkInitialMonth] = useState(currentYearMonth());
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(
    null,
  );
  const [form, setForm] = useState<TimesheetForm>(emptyForm);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [daysWorkedTouched, setDaysWorkedTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefillKeyRef = useRef('');

  const listQuery = useQuery({
    queryKey: [
      'timesheets',
      'list',
      { yearMonthFilter, status, clientId },
    ],
    queryFn: () =>
      timesheetsApi.list({
        pageSize: 100,
        yearMonth: yearMonthFilter || undefined,
        approvalStatus: status || undefined,
        clientId: clientId || undefined,
      }),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const scopedClients = useMemo(
    () =>
      scopeClientsForUser(
        clientsQuery.data?.items ?? [],
        user?.ownedClientIds,
      ),
    [clientsQuery.data?.items, user?.ownedClientIds],
  );

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'for-timesheets', yearMonthFilter],
    queryFn: () => invoicesApi.list({ yearMonth: yearMonthFilter, pageSize: 200 }),
  });

  const invoiceByTimesheetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoicesQuery.data?.items ?? []) {
      map.set(inv.timesheetId, inv.publicId);
    }
    return map;
  }, [invoicesQuery.data]);

  const canGenerateInvoice =
    user?.role === 'ADMIN' ||
    user?.role === 'DELIVERY_OWNER' ||
    user?.role === 'ACCOUNT_OWNER';

  const generateMut = useMutation({
    mutationFn: (timesheetId: string) => invoicesApi.generate(timesheetId),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const existingQuery = useQuery({
    queryKey: [
      'timesheets',
      'existing',
      form.candidateId,
      form.yearMonth,
    ],
    queryFn: () =>
      timesheetsApi.list({
        candidateId: form.candidateId,
        yearMonth: form.yearMonth,
        pageSize: 1,
      }),
    enabled: formOpen && Boolean(form.candidateId && form.yearMonth),
  });

  const existing = existingQuery.data?.items?.[0] ?? null;

  const leavesQuery = useQuery({
    queryKey: ['leaves', 'for-timesheet', form.candidateId],
    queryFn: () =>
      leavesApi.list({
        candidateId: form.candidateId,
        status: 'APPROVED',
        pageSize: 100,
      }),
    enabled: formOpen && Boolean(form.candidateId),
  });

  const approvedLeaveDays = useMemo(() => {
    const period = periodFromYearMonth(form.yearMonth);
    if (!period || !leavesQuery.data?.items) return 0;
    return leavesQuery.data.items.reduce((sum, leave) => {
      if (leave.status !== 'APPROVED') return sum;
      return (
        sum +
        overlapInclusiveDays(
          new Date(leave.startDate),
          new Date(leave.endDate),
          period.periodStart,
          period.periodEnd,
        )
      );
    }, 0);
  }, [form.yearMonth, leavesQuery.data]);

  const workingDaysNum = Number(form.workingDays);
  const suggestedDaysWorked =
    Number.isFinite(workingDaysNum) && workingDaysNum >= 0
      ? Math.max(0, workingDaysNum - approvedLeaveDays)
      : null;

  const daysWorkedNum =
    form.daysWorked === '' ? null : Number(form.daysWorked);
  const previewPct =
    daysWorkedNum != null &&
    Number.isFinite(daysWorkedNum) &&
    Number.isFinite(workingDaysNum)
      ? attendancePreview(daysWorkedNum, workingDaysNum)
      : null;

  // Prefill once per candidate/month (existing row), or keep leave-based suggestion until edited
  useEffect(() => {
    if (!formOpen || !form.candidateId || !form.yearMonth) return;
    if (existingQuery.isFetching) return;

    const key = `${form.candidateId}|${form.yearMonth}|${existing?.id ?? 'new'}`;

    if (existing) {
      if (prefillKeyRef.current === key) return;
      prefillKeyRef.current = key;
      setForm((f) => ({
        ...f,
        workingDays: String(existing.workingDays ?? 22),
        daysWorked:
          existing.daysWorked != null ? String(existing.daysWorked) : '',
        remarks: existing.remarks ?? '',
      }));
      setDaysWorkedTouched(true);
      return;
    }

    if (leavesQuery.isFetching) return;

    if (prefillKeyRef.current !== key) {
      prefillKeyRef.current = key;
      setDaysWorkedTouched(false);
    }

    if (!daysWorkedTouched && suggestedDaysWorked != null) {
      setForm((f) =>
        f.daysWorked === String(suggestedDaysWorked)
          ? f
          : { ...f, daysWorked: String(suggestedDaysWorked) },
      );
    }
  }, [
    formOpen,
    form.candidateId,
    form.yearMonth,
    existing,
    existingQuery.isFetching,
    leavesQuery.isFetching,
    daysWorkedTouched,
    suggestedDaysWorked,
  ]);

  const upsertMut = useMutation({
    mutationFn: () =>
      timesheetsApi.upsert({
        candidateId: form.candidateId,
        yearMonth: form.yearMonth,
        workingDays: Number(form.workingDays),
        daysWorked: Number(form.daysWorked),
        remarks: form.remarks || undefined,
      }),
    onSuccess: async () => {
      resetDialog();
      setFormOpen(false);
      await qc.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function resetDialog() {
    setForm(emptyForm());
    setSelectedCandidate(null);
    setDaysWorkedTouched(false);
    setError(null);
    prefillKeyRef.current = '';
  }

  function openCreate() {
    resetDialog();
    setFormOpen(true);
  }

  function openBulk() {
    setBulkInitialClientId(clientId);
    setBulkInitialMonth(yearMonthFilter || currentYearMonth());
    setBulkOpen(true);
  }

  function openEdit(row: Timesheet) {
    setError(null);
    setDaysWorkedTouched(true);
    setSelectedCandidate(
      row.candidate
        ? ({
            id: row.candidate.id,
            publicId: row.candidate.publicId,
            fullName: row.candidate.fullName,
            status: 'ACTIVE',
            clientId: row.candidate.clientId ?? '',
            client: row.candidate.client,
          } as Candidate)
        : null,
    );
    setForm({
      candidateId: row.candidateId,
      yearMonth: row.yearMonth,
      workingDays: String(row.workingDays ?? 22),
      daysWorked: row.daysWorked != null ? String(row.daysWorked) : '',
      remarks: row.remarks ?? '',
    });
    setFormOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.candidateId) {
      setError('Select a candidate to continue.');
      return;
    }
    if (!form.yearMonth) {
      setError('Select a month.');
      return;
    }
    if (!Number.isFinite(workingDaysNum) || workingDaysNum < 0) {
      setError('Enter valid working days.');
      return;
    }
    if (daysWorkedNum == null || !Number.isFinite(daysWorkedNum) || daysWorkedNum < 0) {
      setError('Enter days worked.');
      return;
    }
    if (daysWorkedNum > workingDaysNum) {
      setError('Days worked cannot exceed working days.');
      return;
    }
    upsertMut.mutate();
  }

  function applySuggestedDays() {
    if (suggestedDaysWorked == null) return;
    setForm((f) => ({ ...f, daysWorked: String(suggestedDaysWorked) }));
    setDaysWorkedTouched(false);
  }

  const rows = listQuery.data?.items ?? [];
  const hasFilters = Boolean(status || clientId || yearMonthFilter !== currentYearMonth());
  const isEdit = Boolean(existing);

  return (
    <div>
      <PageHeader
        eyebrow="Attendance"
        title="Timesheets"
        description="Search a candidate, confirm the month, and fill attendance with leave-aware suggestions."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={openBulk}>
              Bulk fill by client
            </button>
            <button type="button" className={btnPrimary} onClick={openCreate}>
              Fill timesheet
            </button>
          </div>
        }
      />

      <FilterBar columns={4}>
        <Input
          id="ts-month-filter"
          label="Month"
          type="month"
          value={yearMonthFilter}
          onChange={(e) => setYearMonthFilter(e.target.value)}
        />
        <Select
          id="ts-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
        <Select
          id="ts-client"
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">All clients</option>
          {scopedClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!hasFilters}
            onClick={() => {
              setYearMonthFilter(currentYearMonth());
              setStatus('');
              setClientId('');
            }}
          >
            Reset filters
          </Button>
        </div>
      </FilterBar>

      {listQuery.isLoading && <Spinner />}
      {listQuery.isError && (
        <Alert tone="error">
          {apiErrorMessage(listQuery.error, 'Could not load timesheets')}
        </Alert>
      )}
      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No matching timesheets' : 'No timesheets yet'}
          description={
            hasFilters
              ? 'Try another month or clear filters.'
              : 'Use Fill timesheet to capture monthly attendance for an active candidate.'
          }
        />
      ) : (
        !listQuery.isLoading && (
          <div className={tableWrap}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={thClass}>Timesheet ID</th>
                  <th className={thClass}>Candidate</th>
                  <th className={thClass}>Client</th>
                  <th className={thClass}>Month</th>
                  <th className={thClass}>Attendance %</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className={clickableRowClass}
                    onClick={() => setSelectedTimesheet(t)}
                  >
                    <td className={tdClass}>
                      <PublicId value={t.publicId} />
                    </td>
                    <td className={tdClass}>
                      {t.candidate?.fullName ?? '—'}
                    </td>
                    <td className={tdClass}>
                      {t.candidate?.client?.name ?? '—'}
                    </td>
                    <td className={tdClass}>
                      <span className="block">{monthLabel(t.yearMonth)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t.yearMonth}
                      </span>
                    </td>
                    <td className={tdClass}>{formatPct(t.attendancePct)}</td>
                    <td className={tdClass}>
                      <StatusPill status={t.status ?? t.approvalStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Dialog
        open={Boolean(selectedTimesheet)}
        title="Timesheet details"
        wide
        onClose={() => setSelectedTimesheet(null)}
      >
        {selectedTimesheet && (
          <>
            <DetailGrid>
              <DetailField
                label="Timesheet ID"
                value={<PublicId value={selectedTimesheet.publicId} />}
              />
              <DetailField
                label="Candidate ID"
                value={<PublicId value={selectedTimesheet.candidate?.publicId} />}
              />
              <DetailField
                label="Candidate name"
                value={selectedTimesheet.candidate?.fullName}
              />
              <DetailField
                label="Client"
                value={selectedTimesheet.candidate?.client?.name}
              />
              <DetailField
                label="Period start date"
                value={formatDate(timesheetPeriodDates(selectedTimesheet).start)}
              />
              <DetailField
                label="Period end date"
                value={formatDate(timesheetPeriodDates(selectedTimesheet).end)}
              />
              <DetailField
                label="Working days in period"
                value={selectedTimesheet.workingDays}
              />
              <DetailField
                label="Days worked (submitted)"
                value={selectedTimesheet.daysWorked ?? '—'}
              />
              <DetailField
                label="Leave days (auto)"
                value={
                  selectedTimesheet.leaveDays ??
                  selectedTimesheet.approvedLeaveDays ??
                  '—'
                }
              />
              <DetailField
                label="Attendance %"
                value={formatPct(selectedTimesheet.attendancePct)}
              />
              <DetailField
                label="Approval status"
                value={
                  <StatusPill
                    status={
                      selectedTimesheet.status ?? selectedTimesheet.approvalStatus
                    }
                  />
                }
              />
              <DetailField
                label="Approved by"
                value={selectedTimesheet.approvedBy?.fullName}
              />
              <DetailField
                label="Remarks"
                value={selectedTimesheet.remarks}
                className="sm:col-span-2"
              />
            </DetailGrid>
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
              {canGenerateInvoice &&
                (selectedTimesheet.approvalStatus === 'APPROVED' ||
                  selectedTimesheet.status === 'APPROVED') &&
                !invoiceByTimesheetId.has(selectedTimesheet.id) && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={generateMut.isPending}
                    onClick={() => generateMut.mutate(selectedTimesheet.id)}
                  >
                    {generateMut.isPending ? 'Generating…' : 'Generate invoice'}
                  </Button>
                )}
              {invoiceByTimesheetId.has(selectedTimesheet.id) && (
                <span className="self-center text-sm text-muted-foreground">
                  Invoice{' '}
                  <PublicId value={invoiceByTimesheetId.get(selectedTimesheet.id)} />
                </span>
              )}
              <Button
                type="button"
                onClick={() => {
                  const row = selectedTimesheet;
                  setSelectedTimesheet(null);
                  openEdit(row);
                }}
              >
                Edit timesheet
              </Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={formOpen}
        title={isEdit ? 'Update timesheet' : 'Fill timesheet'}
        wide
        onClose={() => {
          setFormOpen(false);
          resetDialog();
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <CandidateCombobox
            required
            statuses={['ACTIVE', 'RELEASED']}
            placeholder="Search active or released candidates…"
            value={form.candidateId}
            selected={selectedCandidate}
            onChange={(c) => {
              setSelectedCandidate(c);
              setDaysWorkedTouched(false);
              setForm((f) => ({
                ...f,
                candidateId: c?.id ?? '',
                daysWorked: '',
                remarks: '',
                workingDays: '22',
              }));
            }}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="ts-month"
              label="Month *"
              type="month"
              required
              value={form.yearMonth}
              onChange={(e) => {
                setDaysWorkedTouched(false);
                setForm((f) => ({
                  ...f,
                  yearMonth: e.target.value,
                  daysWorked: '',
                }));
              }}
            />
            <div>
              <label className={labelClass} htmlFor="ts-working">
                Working days *
              </label>
              <input
                id="ts-working"
                type="number"
                min={0}
                step={0.5}
                required
                className={fieldClass}
                value={form.workingDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, workingDays: e.target.value }))
                }
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[20, 21, 22, 23].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, workingDays: String(n) }))
                    }
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.candidateId && (
            <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {monthLabel(form.yearMonth)} snapshot
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Approved leave in this month:{' '}
                    <span className="font-semibold tabular-nums text-slate-deep">
                      {leavesQuery.isFetching ? '…' : approvedLeaveDays}
                    </span>
                  </p>
                  {isEdit && existing?.publicId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updating existing{' '}
                      <PublicId value={existing.publicId} />
                    </p>
                  )}
                </div>
                {suggestedDaysWorked != null && (
                  <button
                    type="button"
                    className={`${btnSecondary} !px-2.5 !py-1.5 text-xs`}
                    onClick={applySuggestedDays}
                  >
                    Use {suggestedDaysWorked} days worked
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Leave days (auto)
                  </p>
                  <p className="font-display text-xl font-semibold tabular-nums text-slate-deep">
                    {leavesQuery.isFetching ? '—' : approvedLeaveDays}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Attendance preview
                  </p>
                  <p className="font-display text-xl font-semibold tabular-nums text-slate-deep">
                    {formatPct(previewPct)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ts-worked">
                Days worked *
              </label>
              <input
                id="ts-worked"
                type="number"
                min={0}
                step={0.5}
                required
                className={fieldClass}
                value={form.daysWorked}
                onChange={(e) => {
                  setDaysWorkedTouched(true);
                  setForm((f) => ({ ...f, daysWorked: e.target.value }));
                }}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Suggested from working days minus approved leave
                {suggestedDaysWorked != null
                  ? ` (${suggestedDaysWorked})`
                  : ''}
                .
              </p>
            </div>
            <Input
              id="ts-remarks"
              label="Remarks (optional)"
              placeholder="Note for approvers"
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
            />
          </div>

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={upsertMut.isPending}>
              {upsertMut.isPending
                ? 'Saving…'
                : isEdit
                  ? 'Update timesheet'
                  : 'Submit for approval'}
            </Button>
          </div>
        </form>
      </Dialog>

      <BulkFillTimesheetsDialog
        open={bulkOpen}
        mode="by-client"
        initialClientId={bulkInitialClientId}
        initialYearMonth={bulkInitialMonth}
        onClose={() => setBulkOpen(false)}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ['timesheets'] });
        }}
      />
    </div>
  );
}
