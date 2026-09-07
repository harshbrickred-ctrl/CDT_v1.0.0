import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, lookupsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import StatusPill from '../components/ui/StatusPill';
import Alert from '../components/ui/Alert';
import { tableWrap, tdClass, thClass } from '../components/ui/styles';

export default function SettingsLookupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const listQuery = useQuery({
    queryKey: ['lookups', 'all'],
    queryFn: () => lookupsApi.listAll(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const rows = listQuery.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Lookups"
        description="Reference values for employment status, locations, leave types, feedback, and more."
      />

      {listQuery.isLoading && <Spinner />}
      {listQuery.isError && (
        <Alert tone="error">{apiErrorMessage(listQuery.error)}</Alert>
      )}

      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No lookup values"
          description="Run the database seed to populate master lists."
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Type</th>
                <th className={thClass}>Code</th>
                <th className={thClass}>Label</th>
                <th className={thClass}>Sort</th>
                <th className={thClass}>Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id || row.code}`} className="group">
                  <td className={`${tdClass} font-mono text-xs`}>
                    {row.type ?? '—'}
                  </td>
                  <td className={`${tdClass} font-mono text-xs`}>{row.code}</td>
                  <td className={tdClass}>{row.label}</td>
                  <td className={tdClass}>{row.sortOrder ?? '—'}</td>
                  <td className={tdClass}>
                    <StatusPill
                      status={row.isActive === false ? 'RELEASED' : 'ACTIVE'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
