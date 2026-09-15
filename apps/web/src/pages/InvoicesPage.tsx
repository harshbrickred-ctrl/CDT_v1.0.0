import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, invoicesApi } from '../lib/api';
import { candidateLabel, toIsoCurrency } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import type { Invoice } from '../lib/types';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Tabs from '../components/ui/Tabs';
import Alert from '../components/ui/Alert';
import StatusPill from '../components/ui/StatusPill';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type Tab =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'PAID'
  | 'REJECTED';

function formatAmount(amount: number, currency: string) {
  const iso = toIsoCurrency(currency);
  return new Intl.NumberFormat(iso === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: iso,
    maximumFractionDigits: 2,
  }).format(amount);
}

function invoiceBreakdown(inv: Invoice) {
  const type = inv.billingType ?? 'HOURLY';
  const lop = inv.lopDays ?? 0;
  const billableDays = inv.billableDays ?? Math.max(0, inv.workingDays - lop);
  const hours = inv.billableHours ?? inv.daysWorked * inv.hoursPerDay;
  if (type === 'FIXED') {
    const fixed = inv.monthlyFixedAmount ?? inv.amount;
    return `Fixed ${fixed} × ${billableDays}/${inv.workingDays}d (LOP ${lop})`;
  }
  const cap =
    inv.maxBillableHours != null ? ` · cap ${inv.maxBillableHours}h` : '';
  return `Hourly ${inv.hourlyRate} × ${hours}h (LOP ${lop}${cap})`;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('PENDING_REVIEW');
  const [error, setError] = useState<string | null>(null);
  const canReview =
    user?.role === 'ADMIN' || user?.role === 'ACCOUNT_OWNER';

  const listQuery = useQuery({
    queryKey: ['invoices', tab],
    queryFn: () => invoicesApi.list({ status: tab, pageSize: 100 }),
  });

  const reviewMut = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'approve' | 'reject' | 'send' | 'markPaid';
    }) => {
      if (action === 'approve') return invoicesApi.approve(id);
      if (action === 'send') return invoicesApi.send(id);
      if (action === 'markPaid') return invoicesApi.markPaid(id);
      const reason = window.prompt('Rejection reason (optional)') ?? undefined;
      return invoicesApi.reject(id, reason);
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const rows = listQuery.data?.items ?? [];
  const showActions =
    canReview &&
    (tab === 'PENDING_REVIEW' || tab === 'APPROVED' || tab === 'SENT');

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Review budget invoices and manage billing lifecycle."
      />

      {!canReview && (
        <Alert tone="info">
          Invoice review requires Account Owner or ADMIN.
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'PENDING_REVIEW', label: 'Draft' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'SENT', label: 'Sent' },
          { id: 'PAID', label: 'Paid' },
          { id: 'REJECTED', label: 'Rejected' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {listQuery.isLoading && <Spinner />}
      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No invoices in this queue"
          description="Draft invoices are created automatically when a timesheet is approved. Legacy approved timesheets without an invoice can still use Generate on the Timesheets page."
        />
      ) : (
        !listQuery.isLoading && (
          <div className={tableWrap}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={thClass}>Invoice ID</th>
                  <th className={thClass}>Candidate</th>
                  <th className={thClass}>Month</th>
                  <th className={thClass}>Calculation</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Status</th>
                  {showActions && <th className={thClass}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((inv: Invoice) => (
                  <tr key={inv.id} className="group">
                    <td className={tdClass}>
                      <PublicId value={inv.publicId} />
                    </td>
                    <td className={tdClass}>
                      {inv.candidate
                        ? candidateLabel(inv.candidate)
                        : inv.candidateId}
                    </td>
                    <td className={tdClass}>{inv.yearMonth}</td>
                    <td className={`${tdClass} text-xs text-muted-foreground`}>
                      {invoiceBreakdown(inv)}
                    </td>
                    <td className={tdClass}>
                      {formatAmount(inv.amount, inv.currency)}
                    </td>
                    <td className={tdClass}>
                      <StatusPill status={inv.status} />
                    </td>
                    {showActions && (
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          {tab === 'PENDING_REVIEW' && (
                            <>
                              <button
                                type="button"
                                className={btnPrimary}
                                disabled={reviewMut.isPending}
                                onClick={() =>
                                  reviewMut.mutate({
                                    id: inv.id,
                                    action: 'approve',
                                  })
                                }
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className={btnDanger}
                                disabled={reviewMut.isPending}
                                onClick={() =>
                                  reviewMut.mutate({
                                    id: inv.id,
                                    action: 'reject',
                                  })
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {tab === 'APPROVED' && (
                            <button
                              type="button"
                              className={btnSecondary}
                              disabled={reviewMut.isPending}
                              onClick={() =>
                                reviewMut.mutate({ id: inv.id, action: 'send' })
                              }
                            >
                              Send
                            </button>
                          )}
                          {tab === 'SENT' && (
                            <button
                              type="button"
                              className={btnPrimary}
                              disabled={reviewMut.isPending}
                              onClick={() =>
                                reviewMut.mutate({
                                  id: inv.id,
                                  action: 'markPaid',
                                })
                              }
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
