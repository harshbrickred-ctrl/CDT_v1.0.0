import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  clientsApi,
  leavesApi,
  lookupsApi,
} from '../lib/api';
import { scopeClientsForUser } from '../lib/client-scope';
import { LEAVE_TYPE_FALLBACK } from '../lib/masterLists';
import { formatDate } from '../lib/format';
import type { Candidate, Leave } from '../lib/types';
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
import {
  btnPrimary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type LeaveForm = {
  candidateId: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const emptyForm: LeaveForm = {
  candidateId: '',
  leaveTypeCode: '',
  startDate: '',
  endDate: '',
  reason: '',
};

function parseLocalDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Inclusive calendar days — matches API `inclusiveCalendarDays`. */
function inclusiveDays(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay) + 1;
}

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso: string, days: number) {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function LeavePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['leaves', 'list', { status, clientId }],
    queryFn: () =>
      leavesApi.list({
        pageSize: 100,
        status: status || undefined,
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

  const leaveTypesQuery = useQuery({
    queryKey: ['lookups', 'LEAVE_TYPE'],
    queryFn: () => lookupsApi.list('LEAVE_TYPE'),
  });

  const leaveTypes = useMemo(() => {
    const items = leaveTypesQuery.data?.items ?? [];
    if (items.length) return items;
    return LEAVE_TYPE_FALLBACK.map((t, i) => ({
      id: t.code,
      code: t.code,
      label: t.label,
      sortOrder: i + 1,
      isActive: true,
    }));
  }, [leaveTypesQuery.data]);

  const leaveTypeLabel = useMemo(() => {
    const map = new Map(
      leaveTypes.map((t) => [t.code, t.label || t.code] as const),
    );
    return (code: string) => map.get(code) ?? code;
  }, [leaveTypes]);

  const computedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    const start = parseLocalDate(form.startDate);
    const end = parseLocalDate(form.endDate);
    if (!start || !end || start > end) return null;
    return inclusiveDays(start, end);
  }, [form.startDate, form.endDate]);

  const createMut = useMutation({
    mutationFn: () =>
      leavesApi.create({
        candidateId: form.candidateId,
        leaveTypeCode: form.leaveTypeCode,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      }),
    onSuccess: async () => {
      resetForm();
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function resetForm() {
    setForm(emptyForm);
    setSelectedCandidate(null);
    setError(null);
  }

  function openDialog() {
    resetForm();
    const today = todayIso();
    setForm({
      ...emptyForm,
      startDate: today,
      endDate: today,
      leaveTypeCode: leaveTypes[0]?.code ?? '',
    });
    setCreateOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.candidateId) {
      setError('Select a candidate to continue.');
      return;
    }
    if (computedDays == null) {
      setError('End date must be on or after the start date.');
      return;
    }
    createMut.mutate();
  }

  function applyPreset(kind: 'today' | 'tomorrow' | 'week') {
    const today = todayIso();
    if (kind === 'today') {
      setForm((f) => ({ ...f, startDate: today, endDate: today }));
      return;
    }
    if (kind === 'tomorrow') {
      const t = addDaysIso(today, 1);
      setForm((f) => ({ ...f, startDate: t, endDate: t }));
      return;
    }
    setForm((f) => ({
      ...f,
      startDate: today,
      endDate: addDaysIso(today, 4),
    }));
  }

  // Default leave type when lookups load while dialog is open
  useEffect(() => {
    if (createOpen && !form.leaveTypeCode && leaveTypes[0]?.code) {
      setForm((f) => ({ ...f, leaveTypeCode: leaveTypes[0].code }));
    }
  }, [createOpen, form.leaveTypeCode, leaveTypes]);

  const rows = listQuery.data?.items ?? [];
  const hasFilters = Boolean(status || clientId);

  return (
    <div>
      <PageHeader
        eyebrow="Presence"
        title="Leave"
        description="Search a candidate, pick dates, and mark leave in a few steps."
        actions={
          <button type="button" className={btnPrimary} onClick={openDialog}>
            Mark leave
          </button>
        }
      />

      <FilterBar columns={4}>
        <Select
          id="leave-status"
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
          id="leave-client"
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
        <div className="flex items-end sm:col-span-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!hasFilters}
            onClick={() => {
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
          {apiErrorMessage(listQuery.error, 'Could not load leave records')}
        </Alert>
      )}
      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No matching leave' : 'No leave records yet'}
          description={
            hasFilters
              ? 'Try clearing filters or mark leave for another candidate.'
              : 'Use Mark leave to record time off for an active candidate.'
          }
        />
      ) : (
        !listQuery.isLoading && (
          <div className={tableWrap}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={thClass}>Leave ID</th>
                  <th className={thClass}>Candidate</th>
                  <th className={thClass}>Client</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Dates</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    className={clickableRowClass}
                    onClick={() => setSelectedLeave(l)}
                  >
                    <td className={tdClass}>
                      <PublicId value={l.publicId} />
                    </td>
                    <td className={tdClass}>
                      {l.candidate?.fullName ?? '—'}
                    </td>
                    <td className={tdClass}>
                      {l.candidate?.client?.name ?? '—'}
                    </td>
                    <td className={tdClass}>
                      {leaveTypeLabel(l.leaveTypeCode)}
                    </td>
                    <td className={tdClass}>
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </td>
                    <td className={tdClass}>
                      <StatusPill status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Dialog
        open={Boolean(selectedLeave)}
        title="Leave details"
        wide
        onClose={() => setSelectedLeave(null)}
      >
        {selectedLeave && (
          <DetailGrid>
            <DetailField
              label="Leave ID"
              value={<PublicId value={selectedLeave.publicId} />}
            />
            <DetailField
              label="Candidate ID"
              value={<PublicId value={selectedLeave.candidate?.publicId} />}
            />
            <DetailField
              label="Candidate name"
              value={selectedLeave.candidate?.fullName}
            />
            <DetailField
              label="Client"
              value={selectedLeave.candidate?.client?.name}
            />
            <DetailField
              label="Leave type"
              value={leaveTypeLabel(selectedLeave.leaveTypeCode)}
            />
            <DetailField
              label="Leave from date"
              value={formatDate(selectedLeave.startDate)}
            />
            <DetailField
              label="Leave to date"
              value={formatDate(selectedLeave.endDate)}
            />
            <DetailField
              label="Number of days"
              value={selectedLeave.days ?? '—'}
            />
            <DetailField
              label="Leave status"
              value={<StatusPill status={selectedLeave.status} />}
            />
            <DetailField
              label="Approved by"
              value={selectedLeave.approver?.fullName}
            />
            <DetailField
              label="Remarks"
              value={selectedLeave.reason}
              className="sm:col-span-2"
            />
          </DetailGrid>
        )}
      </Dialog>

      <Dialog
        open={createOpen}
        title="Mark leave"
        wide
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <CandidateCombobox
            required
            value={form.candidateId}
            selected={selectedCandidate}
            onChange={(c) => {
              setSelectedCandidate(c);
              setForm((f) => ({ ...f, candidateId: c?.id ?? '' }));
            }}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="leave-type">
                Leave type *
              </label>
              <select
                id="leave-type"
                className={fieldClass}
                required
                value={form.leaveTypeCode}
                onChange={(e) =>
                  setForm({ ...form, leaveTypeCode: e.target.value })
                }
              >
                <option value="">Select type</option>
                {leaveTypes.map((t) => (
                  <option key={t.id || t.code} value={t.code}>
                    {t.label || t.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={labelClass}>Quick dates</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['today', 'Today'],
                    ['tomorrow', 'Tomorrow'],
                    ['week', 'Next 5 days'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className="rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="leave-start"
              label="From *"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm((f) => ({
                  ...f,
                  startDate,
                  endDate:
                    f.endDate && f.endDate < startDate ? startDate : f.endDate,
                }));
              }}
            />
            <Input
              id="leave-end"
              label="To *"
              type="date"
              required
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
            />
            <div>
              <p className={labelClass}>Days</p>
              <div className="flex h-[42px] items-center rounded-lg border border-dashed border-border bg-muted/30 px-3 text-sm font-semibold tabular-nums text-slate-deep">
                {computedDays != null ? computedDays : '—'}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Calculated automatically
              </p>
            </div>
          </div>

          <Input
            id="leave-reason"
            label="Remarks (optional)"
            placeholder="Short note for approvers"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Submit for approval'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
