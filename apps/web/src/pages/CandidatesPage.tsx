import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  candidatesApi,
  clientsApi,
  lookupsApi,
} from '../lib/api';
import { scopeClientsForUser } from '../lib/client-scope';
import { formatDate } from '../lib/format';
import { labelFromOptions, WORK_LOCATION_OPTIONS } from '../lib/masterLists';
import type { Candidate } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import Spinner from '../components/ui/Spinner';
import FilterBar from '../components/ui/FilterBar';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { DetailField, DetailGrid, clickableRowClass } from '../components/ui/DetailGrid';
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

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR' },
  { value: 'DOLLAR', label: 'Dollar' },
] as const;

const emptyForm = {
  fullName: '',
  clientId: '',
  projectAccount: '',
  roleTitle: '',
  clientReportingManager: '',
  accountManagerUserId: '',
  billingType: 'HOURLY',
  hourlyRate: '',
  monthlyFixedAmount: '',
  maxBillableHours: '',
  hoursPerDay: '8',
  currency: 'INR',
  joinedOn: '',
  contractEndDate: '',
  workLocation: '',
  email: '',
  mobile: '',
};

function optionalFields(form: typeof emptyForm) {
  return {
    clientId: form.clientId,
    fullName: form.fullName,
    projectAccount: form.projectAccount || undefined,
    roleTitle: form.roleTitle || undefined,
    clientReportingManager: form.clientReportingManager || undefined,
    accountManagerUserId: form.accountManagerUserId || null,
    billingType: form.billingType as 'HOURLY' | 'FIXED',
    hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
    monthlyFixedAmount: form.monthlyFixedAmount
      ? Number(form.monthlyFixedAmount)
      : undefined,
    maxBillableHours: form.maxBillableHours
      ? Number(form.maxBillableHours)
      : undefined,
    hoursPerDay:
      form.billingType === 'FIXED'
        ? undefined
        : form.hoursPerDay
          ? Number(form.hoursPerDay)
          : undefined,
    currency: form.currency || undefined,
    joinedOn: form.joinedOn || undefined,
    contractEndDate: form.contractEndDate || undefined,
    workLocation: form.workLocation || undefined,
    email: form.email || undefined,
    mobile: form.mobile || undefined,
  };
}

function candidateToForm(c: Candidate): typeof emptyForm {
  return {
    fullName: c.fullName ?? '',
    clientId: c.clientId ?? c.client?.id ?? '',
    projectAccount: c.projectAccount ?? '',
    roleTitle: c.roleTitle ?? '',
    clientReportingManager: c.clientReportingManager ?? '',
    accountManagerUserId: c.accountManagerUserId ?? c.accountManager?.id ?? '',
    billingType: (c.billingType as string) || 'HOURLY',
    hourlyRate: c.hourlyRate != null ? String(c.hourlyRate) : '',
    monthlyFixedAmount:
      c.monthlyFixedAmount != null ? String(c.monthlyFixedAmount) : '',
    maxBillableHours:
      c.maxBillableHours != null ? String(c.maxBillableHours) : '',
    hoursPerDay: c.hoursPerDay != null ? String(c.hoursPerDay) : '8',
    currency:
      c.currency === 'USD' || c.currency === 'DOLLAR'
        ? 'DOLLAR'
        : (c.currency ?? 'INR'),
    joinedOn: c.joinedOn ? String(c.joinedOn).slice(0, 10) : '',
    contractEndDate: c.contractEndDate
      ? String(c.contractEndDate).slice(0, 10)
      : '',
    workLocation: c.workLocation ?? '',
    email: c.email ?? '',
    mobile: c.mobile ?? '',
  };
}

export default function CandidatesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('ACTIVE');
  const [clientId, setClientId] = useState('');
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(
    null,
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const canManage =
    user?.role === 'ADMIN' || user?.role === 'DELIVERY_OWNER';

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const scopedClients = useMemo(
    () =>
      scopeClientsForUser(
        clientsQuery.data?.items ?? [],
        user?.ownedClientIds,
      ),
    [clientsQuery.data?.items, user?.ownedClientIds],
  );

  const workLocationsQuery = useQuery({
    queryKey: ['lookups', 'WORK_LOCATION'],
    queryFn: () => lookupsApi.list('WORK_LOCATION'),
    enabled: formOpen || !!selectedCandidate,
  });

  const workLocations = useMemo(() => {
    const items = workLocationsQuery.data?.items ?? [];
    if (items.length) return items;
    return WORK_LOCATION_OPTIONS.map((o, i) => ({
      id: o.code,
      code: o.code,
      label: o.label,
      sortOrder: i + 1,
      isActive: true,
    }));
  }, [workLocationsQuery.data]);

  const workLocationLabel = (code?: string | null) =>
    labelFromOptions(workLocations, code);

  const selectedClient = useMemo(
    () => scopedClients.find((c) => c.id === form.clientId) ?? null,
    [scopedClients, form.clientId],
  );

  const accountOwnersForClient = selectedClient?.accountOwners ?? [];

  const listQuery = useQuery({
    queryKey: ['candidates', { status, clientId, q }],
    queryFn: () =>
      candidatesApi.list({
        status: status || undefined,
        clientId: clientId || undefined,
        q: q || undefined,
        pageSize: 100,
      }),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const body = optionalFields(form);
      if (editingCandidate) {
        return candidatesApi.update(editingCandidate.id, body);
      }
      return candidatesApi.create(body);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditingCandidate(null);
      setForm(emptyForm);
      setError(null);
      setSelectedCandidate(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => candidatesApi.remove(id),
    onSuccess: async () => {
      setSelectedCandidate(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveMut.mutate();
  }

  function resetDialog() {
    setForm(emptyForm);
    setEditingCandidate(null);
    setError(null);
  }

  function openCreate() {
    resetDialog();
    setFormOpen(true);
  }

  function openEdit(c: Candidate) {
    setSelectedCandidate(null);
    setEditingCandidate(c);
    setForm(candidateToForm(c));
    setError(null);
    setFormOpen(true);
  }

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    let cancelled = false;
    candidatesApi
      .get(editId)
      .then((c) => {
        if (cancelled) return;
        openEdit(c);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('edit');
            return next;
          },
          { replace: true },
        );
      })
      .catch(() => {
        /* ignore invalid edit id */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  function onClientChange(nextClientId: string) {
    const client =
      scopedClients.find((c) => c.id === nextClientId) ?? null;
    const aos = client?.accountOwners ?? [];
    setForm((prev) => ({
      ...prev,
      clientId: nextClientId,
      accountManagerUserId:
        aos.length === 1
          ? aos[0].id
          : aos.some((a) => a.id === prev.accountManagerUserId)
            ? prev.accountManagerUserId
            : '',
    }));
  }

  const rows = listQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Roster"
        title="Employees"
        description="Deployed delivery roster with public IDs."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => openCreate()}
          >
            New employee
          </button>
        }
      />

      <FilterBar>
        <div>
          <label className={labelClass} htmlFor="cand-search">
            Search
          </label>
          <input
            id="cand-search"
            className={fieldClass}
            placeholder="Search name or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cand-status">
            Employment status
          </label>
          <select
            id="cand-status"
            className={fieldClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RELEASED">Released</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="cand-client">
            Client
          </label>
          <select
            id="cand-client"
            className={fieldClass}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">All clients</option>
            {scopedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {listQuery.isLoading && <Spinner />}
      {listQuery.isError && (
        <Alert tone="error">{apiErrorMessage(listQuery.error)}</Alert>
      )}

      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No employees"
          description="Create an employee to start leave, timesheets, and reviews."
          action={
            <button
              type="button"
              className={btnPrimary}
              onClick={() => openCreate()}
            >
              New employee
            </button>
          }
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Employee ID</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Client</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className={clickableRowClass}
                  onClick={() => setSelectedCandidate(c)}
                >
                  <td className={tdClass}>
                    <PublicId value={c.publicId} />
                  </td>
                  <td className={tdClass}>{c.fullName}</td>
                  <td className={tdClass}>
                    {c.client?.name ?? c.clientName ?? '—'}
                  </td>
                  <td className={tdClass}>
                    <StatusPill status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(selectedCandidate)}
        title="Employee details"
        wide
        onClose={() => setSelectedCandidate(null)}
      >
        {selectedCandidate && (
          <>
            <DetailGrid>
              <DetailField
                label="Employee ID"
                value={<PublicId value={selectedCandidate.publicId} />}
              />
              <DetailField
                label="Employee name"
                value={selectedCandidate.fullName}
              />
              <DetailField
                label="Client"
                value={
                  selectedCandidate.client?.name ?? selectedCandidate.clientName
                }
              />
              <DetailField
                label="Project / Account"
                value={selectedCandidate.projectAccount}
              />
              <DetailField
                label="Role"
                value={selectedCandidate.roleTitle}
              />
              <DetailField
                label="Client reporting manager"
                value={selectedCandidate.clientReportingManager}
              />
              <DetailField
                label="Account owner"
                value={selectedCandidate.accountManager?.fullName}
              />
              <DetailField
                label="Billing type"
                value={selectedCandidate.billingType ?? 'HOURLY'}
              />
              <DetailField
                label="Hourly rate"
                value={
                  selectedCandidate.hourlyRate != null
                    ? `${selectedCandidate.hourlyRate} ${selectedCandidate.currency ?? 'INR'}`
                    : undefined
                }
              />
              <DetailField
                label="Monthly fixed amount"
                value={
                  selectedCandidate.monthlyFixedAmount != null
                    ? `${selectedCandidate.monthlyFixedAmount} ${selectedCandidate.currency ?? 'INR'}`
                    : undefined
                }
              />
              <DetailField
                label="Max billable hours"
                value={selectedCandidate.maxBillableHours}
              />
              {selectedCandidate.billingType !== 'FIXED' && (
                <DetailField
                  label="Hours per day"
                  value={selectedCandidate.hoursPerDay}
                />
              )}
              <DetailField
                label="Client start date"
                value={formatDate(selectedCandidate.joinedOn)}
              />
              <DetailField
                label="Contract end date"
                value={formatDate(selectedCandidate.contractEndDate)}
              />
              <DetailField
                label="Work location"
                value={workLocationLabel(selectedCandidate.workLocation)}
              />
              <DetailField
                label="Employment status"
                value={<StatusPill status={selectedCandidate.status} />}
              />
              <DetailField
                label="Email"
                value={selectedCandidate.email}
              />
              <DetailField
                label="Mobile"
                value={selectedCandidate.mobile}
              />
            </DetailGrid>
            <div className="mt-6 flex justify-end gap-2 border-t border-border/70 pt-4">
              {canManage && (
                <button
                  type="button"
                  className={btnDanger}
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (!selectedCandidate) return;
                    if (
                      !window.confirm(
                        `Delete employee “${selectedCandidate.fullName}”? This cannot be undone from the list.`,
                      )
                    ) {
                      return;
                    }
                    deleteMut.mutate(selectedCandidate.id);
                  }}
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => openEdit(selectedCandidate)}
                >
                  Edit
                </button>
              )}
              <Link
                to={`/employees/${selectedCandidate.publicId || selectedCandidate.id}`}
                className={btnPrimary}
                onClick={() => setSelectedCandidate(null)}
              >
                Open full profile
              </Link>
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={formOpen}
        title={editingCandidate ? 'Edit employee' : 'Create employee'}
        wide
        onClose={() => {
          setFormOpen(false);
          resetDialog();
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {!editingCandidate && (
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Employee ID
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assigned automatically on save (e.g. CD-00001). Not editable.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cand-name">
                Employee name *
              </label>
              <input
                id="cand-name"
                className={fieldClass}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            <Select
              id="cand-form-client"
              label="Client *"
              required
              value={form.clientId}
              onChange={(e) => onClientChange(e.target.value)}
            >
              <option value="">Select client</option>
              {scopedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              id="cand-project"
              label="Project / Account"
              value={form.projectAccount}
              onChange={(e) =>
                setForm({ ...form, projectAccount: e.target.value })
              }
            />

            <Input
              id="cand-role"
              label="Role"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />

            <Input
              id="cand-crm"
              label="Client reporting manager"
              value={form.clientReportingManager}
              onChange={(e) =>
                setForm({ ...form, clientReportingManager: e.target.value })
              }
            />

            <Select
              id="cand-am"
              label="Account owner"
              value={form.accountManagerUserId}
              onChange={(e) =>
                setForm({ ...form, accountManagerUserId: e.target.value })
              }
            >
              <option value="">
                {form.clientId
                  ? 'Select account owner'
                  : 'Select a client first'}
              </option>
              {accountOwnersForClient.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>

            <Select
              id="cand-billing"
              label="Billing type *"
              required
              value={form.billingType}
              onChange={(e) =>
                setForm({ ...form, billingType: e.target.value })
              }
            >
              <option value="HOURLY">Hourly</option>
              <option value="FIXED">Fixed</option>
            </Select>

            {form.billingType === 'HOURLY' ? (
              <Input
                id="cand-rate"
                label="Hourly rate"
                type="number"
                min={0}
                step={0.01}
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm({ ...form, hourlyRate: e.target.value })
                }
              />
            ) : (
              <Input
                id="cand-fixed"
                label="Monthly fixed amount *"
                type="number"
                min={0}
                step={0.01}
                required
                value={form.monthlyFixedAmount}
                onChange={(e) =>
                  setForm({ ...form, monthlyFixedAmount: e.target.value })
                }
              />
            )}

            <Input
              id="cand-max-hours"
              label="Max billable hours (optional)"
              type="number"
              min={0}
              step={0.5}
              value={form.maxBillableHours}
              onChange={(e) =>
                setForm({ ...form, maxBillableHours: e.target.value })
              }
            />

            {form.billingType !== 'FIXED' && (
              <Input
                id="cand-hours"
                label="Hours per day"
                type="number"
                min={0}
                step={0.5}
                value={form.hoursPerDay}
                onChange={(e) =>
                  setForm({ ...form, hoursPerDay: e.target.value })
                }
              />
            )}

            <Select
              id="cand-currency"
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Input
              id="cand-start"
              label="Client start date"
              type="date"
              value={form.joinedOn}
              onChange={(e) => setForm({ ...form, joinedOn: e.target.value })}
            />

            <Input
              id="cand-end"
              label="Contract end date"
              type="date"
              value={form.contractEndDate}
              onChange={(e) =>
                setForm({ ...form, contractEndDate: e.target.value })
              }
            />

            <Select
              id="cand-location"
              label="Work location"
              value={form.workLocation}
              onChange={(e) =>
                setForm({ ...form, workLocation: e.target.value })
              }
            >
              <option value="">Select location</option>
              {workLocations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </Select>

            {!editingCandidate && (
              <div>
                <label className={labelClass} htmlFor="cand-employment">
                  Employment status
                </label>
                <input
                  id="cand-employment"
                  className={`${fieldClass} bg-muted/40 text-muted-foreground`}
                  value="Active"
                  readOnly
                  disabled
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  New employees are created as Active.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Contact (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="cand-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                id="cand-mobile"
                label="Mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
          </div>

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setFormOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? 'Saving…'
                : editingCandidate
                  ? 'Save changes'
                  : 'Create employee'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
