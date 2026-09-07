import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  candidatesApi,
  deliveryReviewsApi,
  leavesApi,
  timesheetsApi,
} from '../lib/api';
import { clientFeedbackLabel, formatDate, formatPct } from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import StatusPill from '../components/ui/StatusPill';
import HealthBadge from '../components/ui/HealthBadge';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Alert from '../components/ui/Alert';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type Tab = 'leave' | 'timesheets' | 'reviews' | 'timeline';

export default function CandidateDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('leave');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['candidates', id],
    queryFn: () => candidatesApi.get(id),
    enabled: Boolean(id),
  });

  const candidate = detailQuery.data;
  const candidateKey = candidate?.id ?? id;

  const leaveQuery = useQuery({
    queryKey: ['leaves', { candidateId: candidateKey }],
    queryFn: () => leavesApi.list({ candidateId: candidateKey, pageSize: 50 }),
    enabled: Boolean(candidateKey) && tab === 'leave',
  });

  const tsQuery = useQuery({
    queryKey: ['timesheets', { candidateId: candidateKey }],
    queryFn: () =>
      timesheetsApi.list({ candidateId: candidateKey, pageSize: 50 }),
    enabled: Boolean(candidateKey) && tab === 'timesheets',
  });

  const reviewQuery = useQuery({
    queryKey: ['delivery-reviews', { candidateId: candidateKey }],
    queryFn: () =>
      deliveryReviewsApi.list({ candidateId: candidateKey, pageSize: 50 }),
    enabled: Boolean(candidateKey) && tab === 'reviews',
  });

  const timelineQuery = useQuery({
    queryKey: ['candidates', candidateKey, 'timeline'],
    queryFn: () => candidatesApi.timeline(candidateKey),
    enabled: Boolean(candidateKey) && tab === 'timeline',
  });

  const releaseMut = useMutation({
    mutationFn: () =>
      candidatesApi.release(candidateKey, {
        effectiveDate,
        reason: reason || undefined,
      }),
    onSuccess: async () => {
      setReleaseOpen(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function onRelease(e: FormEvent) {
    e.preventDefault();
    if (!effectiveDate) {
      setError('End date is required to release a candidate.');
      return;
    }
    setError(null);
    releaseMut.mutate();
  }

  if (detailQuery.isLoading) return <Spinner />;
  if (detailQuery.isError || !candidate) {
    return (
      <EmptyState
        title="Candidate not found"
        description={apiErrorMessage(detailQuery.error, 'Unable to load candidate.')}
        action={
          <Link to="/candidates" className={btnSecondary}>
            Back to list
          </Link>
        }
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'leave', label: 'Leave' },
    { id: 'timesheets', label: 'Timesheets' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/candidates"
          className="text-sm font-medium text-muted-foreground transition hover:text-primary"
        >
          ← Candidates
        </Link>
      </div>

      <PageHeader
        eyebrow="Candidate"
        title={candidate.fullName}
        description="Overview, leave, timesheets, and delivery reviews."
        actions={
          candidate.status === 'ACTIVE' ? (
            <button
              type="button"
              className={btnDanger}
              onClick={() => setReleaseOpen(true)}
            >
              Release
            </button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <PublicId value={candidate.publicId} />
        <span>·</span>
        <span>{candidate.client?.name ?? candidate.clientName ?? '—'}</span>
        <StatusPill status={candidate.status} />
        {candidate.health && <HealthBadge health={candidate.health} />}
      </div>

      <Card accent className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Candidate ID
          </p>
          <p className="mt-1 text-sm font-medium">
            <PublicId value={candidate.publicId} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Client
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.client?.name ?? candidate.clientName ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Project / Account
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.projectAccount ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Role
          </p>
          <p className="mt-1 text-sm font-medium">{candidate.roleTitle ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Client reporting manager
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.clientReportingManager ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Account manager
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.accountManager?.fullName ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Billing type
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.billingType ?? 'HOURLY'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hourly rate
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.hourlyRate != null
              ? `${candidate.hourlyRate} ${candidate.currency ?? 'INR'}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monthly fixed amount
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.monthlyFixedAmount != null
              ? `${candidate.monthlyFixedAmount} ${candidate.currency ?? 'INR'}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Max billable hours
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.maxBillableHours ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hours per day
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.hoursPerDay ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Client start date
          </p>
          <p className="mt-1 text-sm font-medium">{formatDate(candidate.joinedOn)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Contract end date
          </p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(candidate.contractEndDate)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Work location
          </p>
          <p className="mt-1 text-sm font-medium">
            {candidate.workLocation ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Employment status
          </p>
          <p className="mt-1">
            <StatusPill status={candidate.status} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 text-sm font-medium">{candidate.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mobile
          </p>
          <p className="mt-1 text-sm font-medium">{candidate.mobile ?? '—'}</p>
        </div>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as Tab)} />

      {tab === 'leave' && (
        <TabTable
          loading={leaveQuery.isLoading}
          empty="No leave records for this candidate."
          headers={['ID', 'Type', 'Dates', 'Days', 'Status']}
          rows={(leaveQuery.data?.items ?? []).map((l) => [
            <PublicId key="id" value={l.publicId} />,
            l.leaveTypeCode,
            `${formatDate(l.startDate)} → ${formatDate(l.endDate)}`,
            l.days ?? '—',
            <StatusPill key="st" status={l.status} />,
          ])}
        />
      )}

      {tab === 'timesheets' && (
        <TabTable
          loading={tsQuery.isLoading}
          empty="No timesheets yet."
          headers={['ID', 'Month', 'Worked', 'Leave', 'Attendance', 'Status']}
          rows={(tsQuery.data?.items ?? []).map((t) => [
            <PublicId key="id" value={t.publicId} />,
            t.yearMonth,
            t.daysWorked ?? '—',
            t.leaveDays ?? t.approvedLeaveDays ?? '—',
            formatPct(t.attendancePct),
            <StatusPill key="st" status={t.status} />,
          ])}
        />
      )}

      {tab === 'reviews' && (
        <TabTable
          loading={reviewQuery.isLoading}
          empty="No delivery reviews yet."
          headers={['ID', 'Month', 'Health', 'Feedback', 'Utilization']}
          rows={(reviewQuery.data?.items ?? []).map((r) => [
            <PublicId key="id" value={r.publicId} />,
            r.yearMonth,
            <HealthBadge key="h" health={r.engagementHealth} />,
            clientFeedbackLabel(r.clientFeedback),
            r.timesheetMissing ? (
              <span key="m" className="text-xs text-warning">
                No timesheet
              </span>
            ) : (
              formatPct(r.utilizationPct)
            ),
          ])}
        />
      )}

      {tab === 'timeline' && (
        <>
          {timelineQuery.isLoading && <Spinner />}
          {(timelineQuery.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="No timeline events"
              description="Leave, timesheets, and reviews will show here when the API exposes a timeline."
            />
          ) : (
            <ul className="space-y-3">
              {(timelineQuery.data?.items ?? []).map((ev, i) => (
                <li key={ev.id ?? i}>
                  <Card className="!p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {ev.title ?? ev.type ?? 'Event'}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ev.at ?? ev.date)}
                      </span>
                    </div>
                    {(ev.summary || ev.publicId) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ev.publicId && (
                          <PublicId value={ev.publicId} className="mr-2" />
                        )}
                        {ev.summary}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog
        open={releaseOpen}
        title="Release candidate"
        onClose={() => {
          setReleaseOpen(false);
          setError(null);
        }}
      >
        <form onSubmit={onRelease} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Releasing {candidate.fullName} (
            <PublicId value={candidate.publicId} />). End date is required.
          </p>
          <div>
            <label className={labelClass} htmlFor="end-date">
              End date
            </label>
            <input
              id="end-date"
              type="date"
              required
              className={fieldClass}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="release-reason">
              Reason
            </label>
            <textarea
              id="release-reason"
              className={fieldClass}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setReleaseOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={releaseMut.isPending || !effectiveDate}
            >
              {releaseMut.isPending ? 'Releasing…' : 'Confirm release'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function TabTable({
  loading,
  empty,
  headers,
  rows,
}: {
  loading: boolean;
  empty: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (loading) return <Spinner />;
  if (rows.length === 0) {
    return <EmptyState title={empty} />;
  }
  return (
    <div className={tableWrap}>
      <table className="min-w-full">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className={thClass}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="group">
              {cells.map((cell, j) => (
                <td key={j} className={tdClass}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
