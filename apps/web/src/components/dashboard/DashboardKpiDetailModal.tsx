import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Dialog from '../ui/Dialog';
import EmptyState from '../ui/EmptyState';
import Alert from '../ui/Alert';
import { apiErrorMessage, dashboardApi } from '../../lib/api';
import type {
  DashboardKpiDetailColumn,
  DashboardKpiDetailRow,
  DashboardKpiId,
} from '../../lib/types';
import { tableWrap, tdClass, thClass } from '../ui/styles';

const CANDIDATE_COLUMNS: DashboardKpiDetailColumn[] = [
  { key: 'publicId', label: 'ID' },
  { key: 'name', label: 'Candidate' },
  { key: 'client', label: 'Client' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'releasedAt', label: 'Released / end' },
];

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatYearMonthLabel(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return yearMonth;
  return `${MONTH_LABELS[monthIndex]} ${match[1]}`;
}

function entityHref(row: DashboardKpiDetailRow) {
  if (!row.entityType || !row.entityId) return null;
  switch (row.entityType) {
    case 'candidate':
    case 'review':
      return `/candidates/${row.entityId}`;
    case 'invoice':
      return '/invoices';
    case 'leave':
      return '/leave';
    case 'timesheet':
      return '/timesheets';
    default:
      return null;
  }
}

function linkableColumnKey(key: string) {
  return key === 'name' || key === 'candidate' || key === 'publicId';
}

function resolveMonthKey(row: DashboardKpiDetailRow): string | null {
  if (typeof row.yearMonth === 'string' && row.yearMonth) return row.yearMonth;
  if (typeof row.id === 'string' && /^\d{4}-\d{2}$/.test(row.id)) return row.id;
  return null;
}

export default function DashboardKpiDetailModal({
  kpiId,
  title,
  params,
  open,
  onClose,
}: {
  kpiId: DashboardKpiId | null;
  title: string;
  params: Record<string, string>;
  open: boolean;
  onClose: () => void;
}) {
  const [detailMonth, setDetailMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setDetailMonth(null);
  }, [open]);

  useEffect(() => {
    setDetailMonth(null);
  }, [kpiId]);

  const isMissingTs = kpiId === 'missing-ts';

  const detailQuery = useQuery({
    queryKey: ['dashboard', 'kpi-detail', kpiId, params],
    queryFn: () => dashboardApi.kpiDetail({ kpi: kpiId!, ...params }),
    enabled: open && kpiId != null,
  });

  const detail = detailQuery.data;

  const display = useMemo(() => {
    if (!detail) {
      return {
        title,
        columns: [] as DashboardKpiDetailColumn[],
        rows: [] as DashboardKpiDetailRow[],
        showingMonths: false,
      };
    }

    if (isMissingTs && detailMonth) {
      const fromMap = detail.candidatesByMonth?.[detailMonth] ?? null;
      const rows =
        fromMap ??
        (detail.view === 'candidates' && detail.detailMonth === detailMonth
          ? detail.rows
          : []);
      return {
        title: `Missing Timesheets — ${formatYearMonthLabel(detailMonth)}`,
        columns: CANDIDATE_COLUMNS,
        rows,
        showingMonths: false,
      };
    }

    return {
      title: detail.title || title,
      columns: detail.columns,
      rows: detail.rows,
      showingMonths: isMissingTs && detail.view === 'months',
    };
  }, [detail, detailMonth, isMissingTs, title]);

  function handleClose() {
    setDetailMonth(null);
    onClose();
  }

  function openMonth(monthKey: string) {
    setDetailMonth(monthKey);
  }

  return (
    <Dialog open={open} title={display.title} onClose={handleClose} wide>
      {isMissingTs && detailMonth && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setDetailMonth(null)}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to months
          </button>
        </div>
      )}

      {detailQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      )}

      {detailQuery.isError && (
        <Alert tone="error">
          {apiErrorMessage(detailQuery.error, 'Could not load details')}
        </Alert>
      )}

      {detail && display.rows.length === 0 && (
        <EmptyState
          title="No records"
          description="Nothing matches this KPI for the current filters."
        />
      )}

      {detail && display.rows.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                {display.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${thClass} ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {display.rows.map((row) => {
                const href = entityHref(row);
                const monthKey = resolveMonthKey(row);
                const isMonthRow = display.showingMonths && monthKey != null;

                return (
                  <tr
                    key={row.id}
                    className={`group transition-colors hover:bg-muted/40 ${
                      isMonthRow ? 'cursor-pointer' : ''
                    }`}
                    onClick={
                      isMonthRow ? () => openMonth(monthKey) : undefined
                    }
                    onKeyDown={
                      isMonthRow
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openMonth(monthKey);
                            }
                          }
                        : undefined
                    }
                    tabIndex={isMonthRow ? 0 : undefined}
                    role={isMonthRow ? 'button' : undefined}
                  >
                    {display.columns.map((col) => {
                      const value = row[col.key];
                      const displayValue =
                        value == null || value === '' ? '—' : String(value);
                      const isLink =
                        !isMonthRow && href && linkableColumnKey(col.key);
                      return (
                        <td
                          key={col.key}
                          className={`${tdClass} ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                        >
                          {isLink ? (
                            <Link
                              to={href}
                              className="font-medium text-primary hover:underline"
                              onClick={handleClose}
                            >
                              {displayValue}
                            </Link>
                          ) : isMonthRow && col.key === 'month' ? (
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMonth(monthKey);
                              }}
                            >
                              {displayValue}
                            </button>
                          ) : (
                            displayValue
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {display.rows.length >= 200 && !display.showingMonths && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing up to 200 records. Refine filters to narrow results.
            </p>
          )}
          {display.showingMonths && (
            <p className="mt-3 text-xs text-muted-foreground">
              Select a month to see candidates missing that timesheet.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
