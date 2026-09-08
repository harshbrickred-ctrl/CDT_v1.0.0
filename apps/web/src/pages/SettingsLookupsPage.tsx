import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, lookupsApi } from '../lib/api';
import type { LookupValue } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import StatusPill from '../components/ui/StatusPill';
import Alert from '../components/ui/Alert';
import Dialog from '../components/ui/Dialog';
import Button from '../components/ui/Button';
import {
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

type EditForm = {
  label: string;
  sortOrder: string;
  isActive: boolean;
};

type CreateForm = {
  typeId: string;
  code: string;
  label: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyCreate = (): CreateForm => ({
  typeId: '',
  code: '',
  label: '',
  sortOrder: '0',
  isActive: true,
});

export default function SettingsLookupsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<LookupValue | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>({
    label: '',
    sortOrder: '0',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['lookups', 'all'],
    queryFn: () => lookupsApi.listAll(),
    enabled: isAdmin,
  });

  const typesQuery = useQuery({
    queryKey: ['lookups', 'types'],
    queryFn: () => lookupsApi.listTypes(),
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: () =>
      lookupsApi.createValue({
        typeId: createForm.typeId,
        code: createForm.code.trim().toUpperCase(),
        label: createForm.label.trim(),
        sortOrder: Number(createForm.sortOrder) || 0,
        isActive: createForm.isActive,
      }),
    onSuccess: async () => {
      setCreateOpen(false);
      setCreateForm(emptyCreate());
      setError(null);
      await qc.invalidateQueries({ queryKey: ['lookups'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editRow?.id) throw new Error('Missing lookup id');
      return lookupsApi.updateValue(editRow.id, {
        label: editForm.label.trim(),
        sortOrder: Number(editForm.sortOrder) || 0,
        isActive: editForm.isActive,
      });
    },
    onSuccess: async () => {
      setEditRow(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['lookups'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const typeOptions = useMemo(
    () =>
      (typesQuery.data ?? []).map((t) => ({
        id: t.id,
        code: t.code,
      })),
    [typesQuery.data],
  );

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  function openCreate() {
    setError(null);
    setCreateForm(emptyCreate());
    setCreateOpen(true);
  }

  function openEdit(row: LookupValue) {
    setError(null);
    setEditRow(row);
    setEditForm({
      label: row.label,
      sortOrder: String(row.sortOrder ?? 0),
      isActive: row.isActive !== false,
    });
  }

  function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!createForm.typeId) {
      setError('Select a lookup type.');
      return;
    }
    if (!createForm.code.trim()) {
      setError('Enter a code.');
      return;
    }
    if (!createForm.label.trim()) {
      setError('Enter a label.');
      return;
    }
    createMut.mutate();
  }

  function onEditSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editForm.label.trim()) {
      setError('Enter a label.');
      return;
    }
    updateMut.mutate();
  }

  const rows = listQuery.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Lookups"
        description="Reference values for employment status, locations, leave types, feedback, and more."
        actions={
          <button type="button" className={btnPrimary} onClick={openCreate}>
            Add value
          </button>
        }
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
        !listQuery.isLoading && (
          <div className={tableWrap}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Code</th>
                  <th className={thClass}>Label</th>
                  <th className={thClass}>Sort</th>
                  <th className={thClass}>Active</th>
                  <th className={thClass}>Actions</th>
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
                    <td className={tdClass}>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Dialog
        open={createOpen}
        title="Add lookup value"
        onClose={() => {
          if (createMut.isPending) return;
          setCreateOpen(false);
          setError(null);
        }}
      >
        <form onSubmit={onCreateSubmit} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="lookup-type">
              Type *
            </label>
            <select
              id="lookup-type"
              className={fieldClass}
              required
              value={createForm.typeId}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, typeId: e.target.value }))
              }
            >
              <option value="">Select type</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="lookup-code">
              Code *
            </label>
            <input
              id="lookup-code"
              className={fieldClass}
              required
              value={createForm.code}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, code: e.target.value }))
              }
              placeholder="e.g. COMPASSIONATE"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="lookup-label">
              Label *
            </label>
            <input
              id="lookup-label"
              className={fieldClass}
              required
              value={createForm.label}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, label: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="lookup-sort">
              Sort order
            </label>
            <input
              id="lookup-sort"
              type="number"
              min={0}
              className={fieldClass}
              value={createForm.sortOrder}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-deep">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Active (shown in forms)
          </label>

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={createMut.isPending}
              onClick={() => {
                setCreateOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Add value'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editRow)}
        title={editRow ? `Edit ${editRow.code}` : 'Edit lookup value'}
        onClose={() => {
          if (updateMut.isPending) return;
          setEditRow(null);
          setError(null);
        }}
      >
        {editRow && (
          <form onSubmit={onEditSubmit} className="space-y-3">
            <div>
              <p className={labelClass}>Type</p>
              <p className="font-mono text-sm text-muted-foreground">
                {editRow.type ?? '—'}
              </p>
            </div>
            <div>
              <p className={labelClass}>Code</p>
              <p className="font-mono text-sm text-muted-foreground">
                {editRow.code}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Code cannot be changed after create.
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="edit-lookup-label">
                Label *
              </label>
              <input
                id="edit-lookup-label"
                className={fieldClass}
                required
                value={editForm.label}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit-lookup-sort">
                Sort order
              </label>
              <input
                id="edit-lookup-sort"
                type="number"
                min={0}
                className={fieldClass}
                value={editForm.sortOrder}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-deep">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active (shown in forms)
            </label>

            {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={updateMut.isPending}
                onClick={() => {
                  setEditRow(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
