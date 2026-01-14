import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContractFilterBar } from './ContractFilterBar';
import { ContractList, VACContract } from './ContractList';

export function ContractExplorer(): JSX.Element {
  const { t } = useTranslation('verification');
  const [contracts, setContracts] = useState<VACContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<VACContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'failed'>('all');

  // Load contracts from IPC
  useEffect(() => {
    const loadContracts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await window.api.vac.getAllContracts();
        setContracts(result);
        setFilteredContracts(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadContracts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = contracts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((contract) =>
        contract.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((contract) => contract.status === statusFilter);
    }

    setFilteredContracts(filtered);
  }, [searchTerm, statusFilter, contracts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('contracts.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{t('contracts.error')}</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <h3 className="text-lg font-semibold">{t('contracts.empty.title')}</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {t('contracts.empty.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('contracts.title')}</h2>
        <p className="text-muted-foreground">{t('contracts.description')}</p>
      </div>

      <ContractFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <ContractList contracts={filteredContracts} />
    </div>
  );
}
