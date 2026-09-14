import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, clientsApi, usersApi } from '../lib/api';
import type { Client } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import Spinner from '../components/ui/Spinner';
import StatusPill from '../components/ui/StatusPill';
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

const emptyForm = {
  name: '',
  code: '',
  isActive: true,
  deliveryOwnerUserIds: [] as string[],
  accountOwnerUserIds: [] as string[],
};

function ownerNames(
  owners?: Array<{ fullName: string }> | null,
): string {
  if (!owners?.length) return '—';
  return owners.map((o) => o.fullName).join(', ');
}

export default function ClientsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'for-client-owners'],
    queryFn: () => usersApi.list({ pageSize: 200 }),
    enabled: open && isAdmin,
  });

  const deliveryOwners = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((u) => u.role === 'DELIVERY_OWNER'),
    [usersQuery.data],
  );
  const accountOwners = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((u) => u.role === 'ACCOUNT_OWNER'),
    [usersQuery.data],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        code: form.code || undefined,
        isActive: form.isActive,
      };
      if (isAdmin) {
        payload.deliveryOwnerUserIds = form.deliveryOwnerUserIds;
        payload.accountOwnerUserIds = form.accountOwnerUserIds;
      }
      if (editing) {
        return clientsApi.update(editing.id, payload);
      }
      return clientsApi.create(payload);
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code ?? '',
      isActive: c.isActive !== false,
      deliveryOwnerUserIds: (c.deliveryOwners ?? []).map((o) => o.id),
      accountOwnerUserIds: (c.accountOwners ?? []).map((o) => o.id),
    });
    setError(null);
    setOpen(true);
  }

  function toggleId(
    key: 'deliveryOwnerUserIds' | 'accountOwnerUserIds',
    id: string,
  ) {
    setForm((prev) => {
      const set = new Set(prev[key]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, [key]: [...set] };
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMut.mutate();
  }

  const rows = listQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Clients"
        description="Normalized client master used across candidates and dashboards."
        actions={
          <button type="button" className={btnPrimary} onClick={openCreate}>
            New client
          </button>
        }
      />

      {error && !open && <Alert tone="error">{error}</Alert>}

      {listQuery.isLoading && <Spinner />}
      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No clients"
          description="Add a client before creating candidates."
          action={
            <button type="button" className={btnPrimary} onClick={openCreate}>
              New client
            </button>
          }
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Code</th>
                <th className={thClass}>Delivery owners</th>
                <th className={thClass}>Account owners</th>
                <th className={thClass}>Active</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="group">
                  <td className={`${tdClass} font-medium`}>{c.name}</td>
                  <td className={`${tdClass} font-mono text-xs`}>
                    {c.code ?? '—'}
                  </td>
                  <td className={tdClass}>{ownerNames(c.deliveryOwners)}</td>
                  <td className={tdClass}>{ownerNames(c.accountOwners)}</td>
                  <td className={tdClass}>
                    <StatusPill
                      status={c.isActive === false ? 'RELEASED' : 'ACTIVE'}
                    />
                  </td>
                  <td className={tdClass}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => {
                          if (
                            window.confirm(`Soft-delete client “${c.name}”?`)
                          ) {
                            deleteMut.mutate(c.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        title={editing ? 'Edit client' : 'Create client'}
        onClose={() => setOpen(false)}
        size="wide"
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={fieldClass}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Code</label>
            <input
              className={fieldClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            Active
          </label>

          {isAdmin && (
            <>
              <div>
                <p className={labelClass}>Delivery owners</p>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {deliveryOwners.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No delivery owners found.
                    </p>
                  ) : (
                    deliveryOwners.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.deliveryOwnerUserIds.includes(u.id)}
                          onChange={() =>
                            toggleId('deliveryOwnerUserIds', u.id)
                          }
                        />
                        {u.fullName}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className={labelClass}>Account owners</p>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {accountOwners.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No account owners found.
                    </p>
                  ) : (
                    accountOwners.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.accountOwnerUserIds.includes(u.id)}
                          onChange={() =>
                            toggleId('accountOwnerUserIds', u.id)
                          }
                        />
                        {u.fullName}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
