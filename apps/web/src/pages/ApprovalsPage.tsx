import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  leavesApi,
  timesheetsApi,
} from '../lib/api';
import { candidateLabel, formatDate, formatPct } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Tabs from '../components/ui/Tabs';
import Alert from '../components/ui/Alert';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type Tab = 'leave' | 'timesheet';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('leave');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canAct = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_OWNER';

  const leaveQuery = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.list({ status: 'PENDING', pageSize: 100 }),
  });

  const tsQuery = useQuery({
    queryKey: ['timesheets', 'pending'],
    queryFn: () =>
      timesheetsApi.list({ approvalStatus: 'PENDING', pageSize: 100 }),
  });

  const leaveMut = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'approve' | 'reject';
    }) => {
      if (action === 'approve') return leavesApi.approve(id);
      const reason = window.prompt('Rejection reason (optional)') ?? undefined;
      return leavesApi.reject(id, reason);
    },
    onSuccess: async (_data, variables) => {
      setError(null);
      setSuccess(
        variables.action === 'approve'
          ? 'Leave approved.'
          : 'Leave rejected.',
      );
      await qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err) => {
      setSuccess(null);
      setError(apiErrorMessage(err));
    },
  });

  const tsMut = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'approve' | 'reject';
    }) => {
      if (action === 'approve') return timesheetsApi.approve(id);
      const reason = window.prompt('Rejection reason (optional)') ?? undefined;
      return timesheetsApi.reject(id, reason);
    },
    onSuccess: async (_data, variables) => {
      setError(null);
      setSuccess(
        variables.action === 'approve'
          ? 'Timesheet approved and draft invoice created.'
          : 'Timesheet rejected.',
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['timesheets'] }),
        qc.invalidateQueries({ queryKey: ['invoices'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
    onError: (err) => {
      setSuccess(null);
      setError(apiErrorMessage(err));
    },
  });

  const leaveRows = leaveQuery.data?.items ?? [];
  const tsRows = tsQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Workflow"
        title="Approvals"
        description="Pending leave and timesheet decisions for Account Owner and Admin."
      />

      {!canAct && (
        <Alert tone="info">
          You can view pending items; approve/reject requires Account Owner or
          ADMIN.
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'leave', label: 'Pending leave' },
          { id: 'timesheet', label: 'Pending timesheet' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="info">{success}</Alert>}

      {tab === 'leave' && (
        <>
          {leaveQuery.isLoading && <Spinner />}
          {!leaveQuery.isLoading && leaveRows.length === 0 ? (
            <EmptyState
              title="No pending leave"
              description="Approved and rejected leave will leave this queue."
            />
          ) : (
            <div className={tableWrap}>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={thClass}>ID</th>
                    <th className={thClass}>Candidate</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Dates</th>
                    <th className={thClass}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRows.map((l) => (
                    <tr key={l.id} className="group">
                      <td className={tdClass}>
                        <PublicId value={l.publicId} />
                      </td>
                      <td className={tdClass}>
                        {l.candidate
                          ? candidateLabel(l.candidate)
                          : l.candidateId}
                      </td>
                      <td className={tdClass}>{l.leaveTypeCode}</td>
                      <td className={tdClass}>
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={!canAct || leaveMut.isPending}
                            onClick={() =>
                              leaveMut.mutate({ id: l.id, action: 'approve' })
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            disabled={!canAct || leaveMut.isPending}
                            onClick={() =>
                              leaveMut.mutate({ id: l.id, action: 'reject' })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'timesheet' && (
        <>
          {tsQuery.isLoading && <Spinner />}
          {!tsQuery.isLoading && tsRows.length === 0 ? (
            <EmptyState
              title="No pending timesheets"
              description="Submitted timesheets awaiting Account Owner approval appear here."
            />
          ) : (
            <div className={tableWrap}>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={thClass}>ID</th>
                    <th className={thClass}>Candidate</th>
                    <th className={thClass}>Month</th>
                    <th className={thClass}>Attendance</th>
                    <th className={thClass}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tsRows.map((t) => (
                    <tr key={t.id} className="group">
                      <td className={tdClass}>
                        <PublicId value={t.publicId} />
                      </td>
                      <td className={tdClass}>
                        {t.candidate
                          ? candidateLabel(t.candidate)
                          : t.candidateId}
                      </td>
                      <td className={tdClass}>{t.yearMonth}</td>
                      <td className={tdClass}>{formatPct(t.attendancePct)}</td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={!canAct || tsMut.isPending}
                            onClick={() =>
                              tsMut.mutate({ id: t.id, action: 'approve' })
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={btnSecondary}
                            disabled={!canAct || tsMut.isPending}
                            onClick={() =>
                              tsMut.mutate({ id: t.id, action: 'reject' })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
