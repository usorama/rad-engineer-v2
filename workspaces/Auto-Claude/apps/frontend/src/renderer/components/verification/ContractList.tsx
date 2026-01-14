import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export interface VACContract {
  id: string;
  name: string;
  status: 'verified' | 'pending' | 'failed';
  createdAt: number;
  preconditions: string[];
  postconditions: string[];
  invariants: string[];
}

export interface ContractListProps {
  contracts: VACContract[];
}

export function ContractList({ contracts }: ContractListProps): JSX.Element {
  const { t } = useTranslation('verification');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusVariant = (status: VACContract['status']) => {
    switch (status) {
      case 'verified':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('contracts.noResults')}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => {
        const isExpanded = expandedId === contract.id;
        const displayedPreconditions = isExpanded ? contract.preconditions : contract.preconditions.slice(0, 2);
        const displayedPostconditions = isExpanded ? contract.postconditions : contract.postconditions.slice(0, 2);
        const displayedInvariants = isExpanded ? contract.invariants : contract.invariants.slice(0, 2);

        return (
          <Card
            key={contract.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => toggleExpand(contract.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{contract.name}</CardTitle>
                <Badge variant={getStatusVariant(contract.status)}>
                  {t(`contracts.status.${contract.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Preconditions */}
              <div>
                <h4 className="text-sm font-semibold mb-1">
                  {t('contracts.preconditions')}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {displayedPreconditions.map((condition, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Postconditions */}
              <div>
                <h4 className="text-sm font-semibold mb-1">
                  {t('contracts.postconditions')}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {displayedPostconditions.map((condition, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invariants */}
              <div>
                <h4 className="text-sm font-semibold mb-1">
                  {t('contracts.invariants')}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {displayedInvariants.map((invariant, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      {invariant}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
