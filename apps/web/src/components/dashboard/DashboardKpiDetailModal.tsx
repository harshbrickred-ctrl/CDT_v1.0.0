import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Dialog from '../ui/Dialog';
import EmptyState from '../ui/EmptyState';
import Alert from '../ui/Alert';
import { apiErrorMessage, dashboardApi } from '../../lib/api';
import type { DashboardKpiDetail, DashboardKpiId } from '../../lib/types';
import { tableWrap, tdClass, thClass } from '../ui/styles';

function entityHref(row: DashboardKpiDetail['rows'][number]) {
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
  const detailQuery = useQuery({
    queryKey: ['dashboard', 'kpi-detail', kpiId, params],
    queryFn: () =>
      dashboardApi.kpiDetail({ kpi: kpiId!, ...params }),
    enabled: open && kpiId != null,
  });

  const detail = detailQuery.data;

  return (
    <Dialog open={open} title={title} onClose={onClose} wide>
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

      {detail && detail.rows.length === 0 && (
        <EmptyState
          title="No records"
          description="Nothing matches this KPI for the current filters."
        />
      )}

      {detail && detail.rows.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                {detail.columns.map((col) => (
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
              {detail.rows.map((row) => {
                const href = entityHref(row);
                return (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    {detail.columns.map((col) => {
                      const value = row[col.key];
                      const display =
                        value == null || value === '' ? '—' : String(value);
                      const isLink = href && linkableColumnKey(col.key);
                      return (
                        <td
                          key={col.key}
                          className={`${tdClass} ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                        >
                          {isLink ? (
                            <Link
                              to={href}
                              className="font-medium text-primary hover:underline"
                              onClick={onClose}
                            >
                              {display}
                            </Link>
                          ) : (
                            display
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {detail.rows.length >= 200 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing up to 200 records. Refine filters to narrow results.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
