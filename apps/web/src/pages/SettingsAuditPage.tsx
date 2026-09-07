import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, auditApi } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { tableWrap, tdClass, thClass } from '../components/ui/styles';

export default function SettingsAuditPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const listQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.list({ pageSize: 100 }),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const rows = listQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Audit log"
        description="Immutable trail for approvals, releases, and health changes."
      />

      {listQuery.isLoading && <Spinner />}
      {listQuery.isError && (
        <Alert tone="error">{apiErrorMessage(listQuery.error)}</Alert>
      )}

      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Actions that mutate approvals or engagement health will show here."
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Actor</th>
                <th className={thClass}>Action</th>
                <th className={thClass}>Entity</th>
                <th className={thClass}>Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="group">
                  <td className={`${tdClass} font-mono text-xs`}>
                    {formatDate(row.createdAt)}
                  </td>
                  <td className={tdClass}>
                    {row.actorName || row.actorEmail || row.actorUserId || '—'}
                  </td>
                  <td className={`${tdClass} font-mono text-xs`}>
                    {row.action ?? '—'}
                  </td>
                  <td className={`${tdClass} font-mono text-xs`}>
                    {[row.entityType, row.entityId].filter(Boolean).join(' · ') ||
                      '—'}
                  </td>
                  <td className={tdClass}>{row.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
