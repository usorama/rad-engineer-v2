import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ConditionResult {
  condition: string;
  passed: boolean;
  error: string | null;
}

interface VerificationResult {
  contractId: string;
  contractName: string;
  timestamp: number;
  preconditionsResults: ConditionResult[];
  postconditionsResults: ConditionResult[];
  invariantsResults: ConditionResult[];
  overallStatus: 'passed' | 'failed';
}

interface VerificationResultsProps {
  result: VerificationResult;
}

const VerificationResults: React.FC<VerificationResultsProps> = ({ result }) => {
  const { t } = useTranslation(['verification']);

  const totalConditions =
    result.preconditionsResults.length +
    result.postconditionsResults.length +
    result.invariantsResults.length;

  const failedConditions = [
    ...result.preconditionsResults,
    ...result.postconditionsResults,
    ...result.invariantsResults
  ].filter((c) => !c.passed).length;

  const renderCondition = (condition: ConditionResult, index: number) => (
    <div
      key={index}
      data-testid={`condition-${index}`}
      data-status={condition.passed ? 'passed' : 'failed'}
      className="flex items-start gap-2 py-2"
    >
      {condition.passed ? (
        <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p
          className={
            condition.passed ? 'text-foreground' : 'text-destructive font-medium'
          }
        >
          {condition.condition}
        </p>
        {!condition.passed && condition.error && (
          <p className="text-sm text-muted-foreground mt-1">{condition.error}</p>
        )}
      </div>
    </div>
  );

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('verification:results.title')}</h2>
          <p className="text-lg text-muted-foreground mt-1">{result.contractName}</p>
        </div>
        <Badge
          variant={result.overallStatus === 'passed' ? 'success' : 'destructive'}
          className="text-sm px-3 py-1"
        >
          {t(`verification:results.status.${result.overallStatus}`)}
        </Badge>
      </div>

      {/* Timestamp */}
      <div className="text-sm text-muted-foreground">
        {t('verification:results.timestamp')}:{' '}
        {new Date(result.timestamp).toLocaleString()}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('verification:results.summary')}
          </p>
          <p className="text-2xl font-bold">
            {totalConditions} {t('verification:results.conditionsTested')}
          </p>
        </div>
        {failedConditions > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">
              {t('verification:results.failureCount')}
            </p>
            <p className="text-2xl font-bold text-destructive">{failedConditions}</p>
          </div>
        )}
      </div>

      {/* Preconditions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {t('verification:results.preconditions')}
          <Badge variant="outline" className="text-xs">
            {result.preconditionsResults.length}
          </Badge>
        </h3>
        <div className="space-y-1 pl-2 border-l-2 border-border">
          {result.preconditionsResults.length > 0 ? (
            result.preconditionsResults.map((condition, idx) =>
              renderCondition(condition, idx)
            )
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No preconditions defined
            </p>
          )}
        </div>
      </div>

      {/* Postconditions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {t('verification:results.postconditions')}
          <Badge variant="outline" className="text-xs">
            {result.postconditionsResults.length}
          </Badge>
        </h3>
        <div className="space-y-1 pl-2 border-l-2 border-border">
          {result.postconditionsResults.length > 0 ? (
            result.postconditionsResults.map((condition, idx) =>
              renderCondition(condition, idx + result.preconditionsResults.length)
            )
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No postconditions defined
            </p>
          )}
        </div>
      </div>

      {/* Invariants */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {t('verification:results.invariants')}
          <Badge variant="outline" className="text-xs">
            {result.invariantsResults.length}
          </Badge>
        </h3>
        <div className="space-y-1 pl-2 border-l-2 border-border">
          {result.invariantsResults.length > 0 ? (
            result.invariantsResults.map((condition, idx) =>
              renderCondition(
                condition,
                idx +
                  result.preconditionsResults.length +
                  result.postconditionsResults.length
              )
            )
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No invariants defined
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export { VerificationResults };
export type { VerificationResult, ConditionResult };
