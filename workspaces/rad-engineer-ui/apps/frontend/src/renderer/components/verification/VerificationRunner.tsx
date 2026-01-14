import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { VerificationResults, type VerificationResult } from './VerificationResults';
import { Play, Clock } from 'lucide-react';

interface Contract {
  id: string;
  name: string;
  status: string;
  createdAt: number;
}

const VerificationRunner: React.FC = () => {
  const { t } = useTranslation(['verification', 'common']);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load contracts and history on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load contracts
        const contractsResult = await window.api.vac.getAllContracts();
        if (Array.isArray(contractsResult)) {
          setContracts(contractsResult);
        }

        // Load verification history
        const historyResult = await window.api.vac.getVerificationHistory();
        if (Array.isArray(historyResult)) {
          setHistory(historyResult);
        }
      } catch (err) {
        console.error('Failed to load verification data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRunVerification = async () => {
    if (!selectedContractId) return;

    setIsRunning(true);
    setError(null);
    setCurrentResult(null);

    try {
      const result = await window.api.vac.runVerification(selectedContractId);

      if (result.success && result.data) {
        setCurrentResult(result.data);
        // Add to history
        setHistory((prev) => [result.data, ...prev]);
      } else {
        setError(result.error || t('verification:runner.error'));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('verification:runner.error')
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleHistoryItemClick = (result: VerificationResult) => {
    setCurrentResult(result);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('common:labels.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Runner Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('verification:runner.title')}
        </h2>

        <div className="flex items-end gap-4">
          {/* Contract Selector */}
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              {t('verification:runner.selectContract')}
            </label>
            <Select
              value={selectedContractId}
              onValueChange={setSelectedContractId}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('verification:runner.selectContract')}
                />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Run Button */}
          <Button
            onClick={handleRunVerification}
            disabled={!selectedContractId || isRunning}
            className="min-w-[180px]"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                {t('verification:runner.running')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('verification:runner.runVerification')}
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </Card>

      {/* Current Results */}
      {currentResult && (
        <div>
          <VerificationResults result={currentResult} />
        </div>
      )}

      {/* Verification History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('verification:runner.history.title')}
        </h3>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t('verification:runner.history.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleHistoryItemClick(result)}
                className="p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{result.contractName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      result.overallStatus === 'passed'
                        ? 'text-success'
                        : 'text-destructive'
                    }`}
                  >
                    {t(`verification:results.status.${result.overallStatus}`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export { VerificationRunner };
