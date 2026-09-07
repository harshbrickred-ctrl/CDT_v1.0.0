import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  candidatesApi,
  clientsApi,
  lookupsApi,
  usersApi,
} from '../lib/api';
import { formatDate } from '../lib/format';
import { labelFromOptions, WORK_LOCATION_OPTIONS } from '../lib/masterLists';
import type { Candidate } from '../lib/types';
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
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

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
    accountManagerUserId: form.accountManagerUserId || undefined,
    billingType: form.billingType as 'HOURLY' | 'FIXED',
    hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
    monthlyFixedAmount: form.monthlyFixedAmount
      ? Number(form.monthlyFixedAmount)
      : undefined,
    maxBillableHours: form.maxBillableHours
      ? Number(form.maxBillableHours)
      : undefined,
    hoursPerDay: form.hoursPerDay ? Number(form.hoursPerDay) : undefined,
    currency: form.currency || undefined,
    joinedOn: form.joinedOn || undefined,
    contractEndDate: form.contractEndDate || undefined,
    workLocation: form.workLocation || undefined,
    email: form.email || undefined,
    mobile: form.mobile || undefined,
  };
}

export default function CandidatesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('ACTIVE');
  const [clientId, setClientId] = useState('');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'account-managers'],
    queryFn: () => usersApi.list({ pageSize: 200 }),
    enabled: createOpen,
  });

  const workLocationsQuery = useQuery({
    queryKey: ['lookups', 'WORK_LOCATION'],
    queryFn: () => lookupsApi.list('WORK_LOCATION'),
    enabled: createOpen || !!selectedCandidate,
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

  const accountManagers = (usersQuery.data?.items ?? []).filter(
    (u) => u.role === 'ACCOUNT_MANAGER',
  );

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

  const createMut = useMutation({
    mutationFn: () => candidatesApi.create(optionalFields(form)),
    onSuccess: async () => {
      setCreateOpen(false);
      setForm(emptyForm);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMut.mutate();
  }

  function resetDialog() {
    setForm(emptyForm);
    setError(null);
  }

  const rows = listQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Roster"
        title="Candidates"
        description="Deployed delivery roster with public IDs."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              resetDialog();
              setCreateOpen(true);
            }}
          >
            New candidate
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
            {(clientsQuery.data?.items ?? []).map((c) => (
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
          title="No candidates"
          description="Create a candidate to start leave, timesheets, and reviews."
          action={
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                resetDialog();
                setCreateOpen(true);
              }}
            >
              New candidate
            </button>
          }
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Candidate ID</th>
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
        title="Candidate details"
        wide
        onClose={() => setSelectedCandidate(null)}
      >
        {selectedCandidate && (
          <>
            <DetailGrid>
              <DetailField
                label="Candidate ID"
                value={<PublicId value={selectedCandidate.publicId} />}
              />
              <DetailField
                label="Candidate name"
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
                label="Account manager"
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
              <DetailField
                label="Hours per day"
                value={selectedCandidate.hoursPerDay}
              />
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
            <div className="mt-6 flex justify-end border-t border-border/70 pt-4">
              <Link
                to={`/candidates/${selectedCandidate.publicId || selectedCandidate.id}`}
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
        open={createOpen}
        title="Create candidate"
        wide
        onClose={() => {
          setCreateOpen(false);
          resetDialog();
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Candidate ID
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assigned automatically on save (e.g. CD-00001). Not editable.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cand-name">
                Candidate name *
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
              id="cand-client"
              label="Client *"
              required
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              <option value="">Select client</option>
              {(clientsQuery.data?.items ?? []).map((c) => (
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
              label="Account manager"
              value={form.accountManagerUserId}
              onChange={(e) =>
                setForm({ ...form, accountManagerUserId: e.target.value })
              }
            >
              <option value="">Select account manager</option>
              {accountManagers.map((u) => (
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

            <Input
              id="cand-currency"
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />

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
                New candidates are created as Active.
              </p>
            </div>
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
                setCreateOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Creating…' : 'Create candidate'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
