import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  clientsApi,
  deliveryReviewsApi,
} from '../lib/api';
import {
  candidateLabel,
  clientFeedbackLabel,
  currentYearMonth,
  formatDate,
  formatPct,
} from '../lib/format';
import type { Candidate, DeliveryReview } from '../lib/types';
import {
  CLIENT_FEEDBACK_OPTIONS,
  ENGAGEMENT_HEALTH_OPTIONS,
} from '../lib/masterLists';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import HealthBadge from '../components/ui/HealthBadge';
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
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type ReviewForm = {
  candidateId: string;
  yearMonth: string;
  reviewDate: string;
  clientFeedback: string;
  engagementHealth: string;
  escalationNotes: string;
};

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptyForm = (): ReviewForm => ({
  candidateId: '',
  yearMonth: currentYearMonth(),
  reviewDate: todayIsoDate(),
  clientFeedback: 'GOOD',
  engagementHealth: 'ON_TRACK',
  escalationNotes: '',
});

function monthLabel(yearMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function DeliveryReviewsPage() {
  const qc = useQueryClient();
  const [yearMonthFilter, setYearMonthFilter] = useState(currentYearMonth());
  const [clientId, setClientId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DeliveryReview | null>(null);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['delivery-reviews', 'list', yearMonthFilter, clientId],
    queryFn: () =>
      deliveryReviewsApi.list({
        yearMonth: yearMonthFilter || undefined,
        clientId: clientId || undefined,
        pageSize: 200,
      }),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const needsEscalationNotes =
    form.engagementHealth === 'AT_RISK' || form.engagementHealth === 'ESCALATED';

  const upsertMut = useMutation({
    mutationFn: () =>
      deliveryReviewsApi.upsert({
        candidateId: form.candidateId,
        yearMonth: form.yearMonth,
        reviewDate: form.reviewDate,
        clientFeedback: form.clientFeedback,
        engagementHealth: form.engagementHealth,
        escalationNotes: form.escalationNotes.trim() || undefined,
      }),
    onSuccess: async () => {
      setError(null);
      setCreateOpen(false);
      setForm(emptyForm());
      await qc.invalidateQueries({ queryKey: ['delivery-reviews'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  useEffect(() => {
    if (createOpen) {
      setForm(emptyForm());
      setSelectedCandidate(null);
      setError(null);
    }
  }, [createOpen]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.candidateId) {
      setError('Select a candidate.');
      return;
    }
    if (needsEscalationNotes && !form.escalationNotes.trim()) {
      setError('Escalation notes are required when health is At Risk or Escalated.');
      return;
    }
    setError(null);
    upsertMut.mutate();
  }

  const rows = listQuery.data?.items ?? [];
  const clients = clientsQuery.data?.items ?? [];

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return (id?: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [clients]);

  return (
    <div>
      <PageHeader
        eyebrow="Engagement"
        title="Delivery reviews"
        description="Monthly engagement health with utilization from approved timesheets."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Record review
          </Button>
        }
      />

      <FilterBar>
        <Input
          id="dr-month"
          label="Review period"
          type="month"
          value={yearMonthFilter}
          onChange={(e) => setYearMonthFilter(e.target.value)}
        />
        <Select
          id="dr-client"
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {listQuery.isLoading && <Spinner />}
      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No delivery reviews"
          description="Record monthly engagement health for active deployments."
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Delivery ID</th>
                <th className={thClass}>Candidate</th>
                <th className={thClass}>Client</th>
                <th className={thClass}>Review period</th>
                <th className={thClass}>Health</th>
                <th className={thClass}>Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={clickableRowClass}
                  onClick={() => setSelected(r)}
                >
                  <td className={tdClass}>
                    <PublicId value={r.publicId} />
                  </td>
                  <td className={tdClass}>
                    {r.candidate ? candidateLabel(r.candidate) : r.candidateId}
                  </td>
                  <td className={tdClass}>
                    {r.candidate?.client?.name ?? clientName(r.candidate?.clientId)}
                  </td>
                  <td className={tdClass}>{monthLabel(r.yearMonth)}</td>
                  <td className={tdClass}>
                    <HealthBadge health={r.engagementHealth} />
                  </td>
                  <td className={tdClass}>
                    {r.timesheetMissing ? (
                      <span className="text-xs text-warning">No timesheet</span>
                    ) : (
                      formatPct(r.utilizationPct)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Delivery review"
        wide
      >
        {selected && (
          <DetailGrid>
            <DetailField label="Delivery ID" value={<PublicId value={selected.publicId} />} />
            <DetailField
              label="Candidate ID"
              value={selected.candidate?.publicId ?? '—'}
            />
            <DetailField
              label="Candidate name"
              value={selected.candidate?.fullName ?? '—'}
            />
            <DetailField
              label="Client"
              value={
                selected.candidate?.client?.name ??
                clientName(selected.candidate?.clientId)
              }
            />
            <DetailField
              label="Role"
              value={selected.candidate?.roleTitle ?? '—'}
            />
            <DetailField
              label="Review period"
              value={monthLabel(selected.yearMonth)}
            />
            <DetailField
              label="Utilization % (from timesheet)"
              value={
                selected.timesheetMissing
                  ? 'Timesheet missing'
                  : formatPct(selected.utilizationPct)
              }
            />
            <DetailField
              label="Client feedback"
              value={clientFeedbackLabel(selected.clientFeedback)}
            />
            <DetailField
              label="Engagement health"
              value={<HealthBadge health={selected.engagementHealth} />}
            />
            <DetailField
              label="Escalation notes"
              value={selected.escalationNotes ?? '—'}
              className="sm:col-span-2"
            />
            <DetailField
              label="Reviewed by"
              value={selected.reviewer?.fullName ?? '—'}
            />
            <DetailField
              label="Review date"
              value={formatDate(selected.reviewDate)}
            />
          </DetailGrid>
        )}
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Record delivery review"
        wide
      >
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Candidate</label>
            <CandidateCombobox
              required
              value={form.candidateId}
              selected={selectedCandidate}
              onChange={(c) => {
                setSelectedCandidate(c);
                setForm({ ...form, candidateId: c?.id ?? '' });
              }}
              status="ACTIVE"
            />
          </div>

          <Input
            id="dr-form-month"
            label="Review period"
            type="month"
            required
            value={form.yearMonth}
            onChange={(e) => setForm({ ...form, yearMonth: e.target.value })}
          />

          <Input
            id="dr-form-date"
            label="Review date"
            type="date"
            required
            value={form.reviewDate}
            onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
          />

          <Select
            id="dr-form-feedback"
            label="Client feedback"
            required
            value={form.clientFeedback}
            onChange={(e) =>
              setForm({ ...form, clientFeedback: e.target.value })
            }
          >
            {CLIENT_FEEDBACK_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            id="dr-form-health"
            label="Engagement health"
            required
            value={form.engagementHealth}
            onChange={(e) =>
              setForm({ ...form, engagementHealth: e.target.value })
            }
          >
            {ENGAGEMENT_HEALTH_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>

          <div className="sm:col-span-2">
            <label className={labelClass}>
              Escalation notes{' '}
              {needsEscalationNotes && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <textarea
              className={`${fieldClass} ${needsEscalationNotes ? 'border-warning/50 focus:border-warning focus:ring-warning/30' : ''}`}
              rows={3}
              required={needsEscalationNotes}
              value={form.escalationNotes}
              onChange={(e) =>
                setForm({ ...form, escalationNotes: e.target.value })
              }
              placeholder={
                needsEscalationNotes
                  ? 'Required for At Risk / Escalated'
                  : 'Optional'
              }
            />
          </div>

          {error && (
            <div className="sm:col-span-2">
              <Alert tone="error" className="!mb-0">
                {error}
              </Alert>
            </div>
          )}

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              type="submit"
              className={btnPrimary}
              disabled={upsertMut.isPending}
            >
              {upsertMut.isPending ? 'Saving…' : 'Save review'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
