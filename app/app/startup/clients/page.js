'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Plus, RefreshCcw } from 'lucide-react';
import ClientForm from '@/components/ClientForm';
import { api } from '@/lib/api';
import { DataTable } from '@/components/data-table';
import { useRouter } from 'next/navigation';

export default function StartupClientsPage() {
  const [showClientForm, setShowClientForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const normalizeList = useCallback((data) => {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    if (Array.isArray(data.clients)) return data.clients;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true); 
    setError('');
    try {
      const res = await api.get('/client', {}, true);
      const data = res?.data ?? res ?? [];
      setClients(normalizeList(data));
      console.log(normalizeList(data));
    } catch (err) {
      setError(err?.message || 'Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeList]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientSuccess = useCallback(() => {
    setSuccess('Client created successfully.');
    setShowClientForm(false);
    setTimeout(() => setSuccess(''), 3000);
    fetchClients();
  }, [fetchClients]);

  const formatCurrency = useCallback((value, currency = 'INR') => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '-';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: String(currency || 'INR'),
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return String(n);
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        id: 'client',
        header: 'Client',
        type: 'text',
        searchable: true,
        accessorFn: (row) => row?.name ?? '',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row?.name || '-'}</div>
            <div className="text-xs text-muted-foreground truncate">{row?.email || ''}</div>
          </div>
        ),
      },
      {
        id: 'college',
        header: 'College',
        type: 'text',
        searchable: true,
        accessorFn: (row) => row?.college?.name ?? '',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row?.college?.name || '-'}</div>
            <div className="text-xs text-muted-foreground truncate">{row?.college?.code || ''}</div>
          </div>
        ),
      },
      {
        id: 'plan',
        header: 'Plan',
        type: 'text',
        searchable: true,
        accessorFn: (row) => row?.college?.subscription?.plan?.name ?? '',
        cell: ({ row }) => row?.college?.subscription?.plan?.name || '-',
      },
      {
        id: 'status',
        header: 'Subscription',
        type: 'text',
        searchable: false,
        cell: ({ row }) => {
          const status = row?.college?.subscription?.status || '—';
          const colors =
            status === 'trial'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
              : status === 'active'
              ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
              : 'bg-muted text-muted-foreground border-border';
          return (
            <span className={`text-xs px-2 py-1 rounded border ${colors}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'billingCycle',
        header: 'Billing',
        type: 'text',
        searchable: false,
        accessorFn: (row) => row?.college?.subscription?.billingCycle ?? '',
      },
      {
        id: 'amount',
        header: 'Amount',
        type: 'text',
        searchable: false,
        cell: ({ row }) =>
          formatCurrency(
            row?.college?.subscription?.amount,
            row?.college?.subscription?.currency
          ),
      },
      {
        id: 'active',
        header: 'Active',
        type: 'boolean',
        searchable: false,
        accessorFn: (row) => Boolean(row?.isActive),
        formatOptions: { trueLabel: 'Yes', falseLabel: 'No' },
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded border ${
              row?.isActive
                ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {row?.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ],
    [formatCurrency]
  );

  const getId = useCallback((row) => row?._id ?? row?.id ?? row?.clientId ?? '', []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients (New Colleges)</h1>
          <p className="text-muted-foreground mt-2">Manage new college clients</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={fetchClients}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowClientForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Client
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4">
        {loading && clients.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No clients found.</p>
            <p className="text-sm text-muted-foreground">Create a new client to get started.</p>
          </div>
        ) : (
          <DataTable
            data={clients}
            columns={columns}
            loading={loading}
            searchable={true}
            filterable={false}
            sortable={false}
            showColumnVisibility={true}
            showSettings={false}
            storageKey="startup-clients-table-v2"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage="No clients available"
            onRowClick={(row) => {
              const id = getId(row);
              if (!id) return;
              router.push(`/app/startup/clients/${id}`);
            }}
          />
        )}
      </div>

      <ClientForm
        open={showClientForm}
        onOpenChange={setShowClientForm}
        onSuccess={handleClientSuccess}
      />
    </div>
  );
}
