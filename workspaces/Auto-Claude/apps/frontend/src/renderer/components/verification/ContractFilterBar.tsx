import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export interface ContractFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'verified' | 'pending' | 'failed';
  onStatusFilterChange: (status: 'all' | 'verified' | 'pending' | 'failed') => void;
}

export function ContractFilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}: ContractFilterBarProps): JSX.Element {
  const { t } = useTranslation('verification');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search input */}
      <div className="flex-1 max-w-sm">
        <Input
          type="text"
          placeholder={t('contracts.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Status filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange('all')}
        >
          {t('contracts.status.all')}
        </Button>
        <Button
          variant={statusFilter === 'verified' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange('verified')}
        >
          {t('contracts.status.verified')}
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange('pending')}
        >
          {t('contracts.status.pending')}
        </Button>
        <Button
          variant={statusFilter === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange('failed')}
        >
          {t('contracts.status.failed')}
        </Button>
      </div>
    </div>
  );
}
