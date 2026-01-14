/**
 * MethodCatalog - Grid view of BMAD methods
 *
 * Displays methods in a responsive grid with filtering capabilities
 * Supports search query and domain filtering
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MethodCard, type BMADMethod } from './MethodCard';

interface MethodCatalogProps {
  methods: BMADMethod[];
  onSelect: (method: BMADMethod) => void;
  searchQuery?: string;
  domainFilter?: string;
  selectedMethodId?: string;
}

export function MethodCatalog({
  methods,
  onSelect,
  searchQuery = '',
  domainFilter = 'all',
  selectedMethodId
}: MethodCatalogProps) {
  const { t } = useTranslation(['learning']);

  // Filter methods based on search query and domain
  const filteredMethods = useMemo(() => {
    let filtered = methods;

    // Apply domain filter
    if (domainFilter && domainFilter !== 'all') {
      filtered = filtered.filter((method) => method.domain === domainFilter);
    }

    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (method) =>
          method.name.toLowerCase().includes(query) ||
          method.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [methods, searchQuery, domainFilter]);

  if (filteredMethods.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('learning:methodSelector.catalog.noMethods')}</p>
      </div>
    );
  }

  return (
    <div role="list" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredMethods.map((method) => (
        <div key={method.id} role="listitem">
          <MethodCard
            method={method}
            onSelect={onSelect}
            isSelected={selectedMethodId === method.id}
          />
        </div>
      ))}
    </div>
  );
}
