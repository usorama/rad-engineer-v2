/**
 * VerificationReport - Certificate of authenticity view
 * Phase 7: Frontend UI Integration
 *
 * Displays:
 * - Overall verification status
 * - Step-by-step verification results
 * - Quality gate results
 * - Export functionality
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldCheck, ShieldAlert, CheckCircle, XCircle, Download, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface StepVerification {
  stepId: string;
  stepName: string;
  preconditions: { total: number; passed: number };
  postconditions: { total: number; passed: number };
  verified: boolean;
}

interface QualityGate {
  name: string;
  passed: boolean;
  value?: string | number;
}

interface VerificationReportProps {
  sessionId: string;
  status: 'verified' | 'failed' | 'partial';
  certaintyScore: number;
  steps: StepVerification[];
  qualityGates: QualityGate[];
  generatedAt: string;
  onExportJson?: () => void;
  onExportPdf?: () => void;
  onShareLink?: () => void;
  loading?: boolean;
}

const VerificationReport: React.FC<VerificationReportProps> = ({
  sessionId,
  status,
  certaintyScore,
  steps,
  qualityGates,
  generatedAt,
  onExportJson,
  onExportPdf,
  onShareLink,
  loading,
}) => {
  const { t } = useTranslation(['execution', 'common']);

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <ShieldCheck className="h-16 w-16 text-green-500" />;
      case 'failed':
        return <ShieldAlert className="h-16 w-16 text-red-500" />;
      case 'partial':
        return <Shield className="h-16 w-16 text-amber-500" />;
      default:
        return <Shield className="h-16 w-16 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verified':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'partial':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'border-muted bg-muted/20';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'verified':
        return t('execution:verification.statusVerified');
      case 'failed':
        return t('execution:verification.statusFailed');
      case 'partial':
        return t('execution:verification.statusPartial');
      default:
        return t('execution:verification.statusUnknown');
    }
  };

  const getCertaintyColor = () => {
    if (certaintyScore >= 90) return 'text-green-600';
    if (certaintyScore >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {t('common:labels.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Certificate Header */}
      <div className={cn('rounded-xl border-2 p-8 text-center', getStatusColor())}>
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>

        <h2 className="text-2xl font-bold mb-2">
          {t('execution:verification.title')}
        </h2>

        <div className="text-4xl font-bold mb-2">
          {getStatusText()}
        </div>

        <div className={cn('text-xl font-semibold', getCertaintyColor())}>
          {t('execution:verification.certaintyScore')}: {certaintyScore}%
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {t('execution:verification.generatedAt')}: {formatDate(generatedAt)}
        </div>

        <div className="mt-2 text-xs text-muted-foreground font-mono">
          {sessionId}
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex flex-wrap justify-center gap-2">
        {onExportJson && (
          <Button variant="outline" size="sm" onClick={onExportJson}>
            <Download className="mr-2 h-4 w-4" />
            {t('execution:verification.downloadJson')}
          </Button>
        )}
        {onExportPdf && (
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            {t('execution:verification.downloadPdf')}
          </Button>
        )}
        {onShareLink && (
          <Button variant="outline" size="sm" onClick={onShareLink}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('execution:verification.shareLink')}
          </Button>
        )}
      </div>

      {/* Step Verification Summary */}
      <div className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">
          {t('execution:verification.stepVerification')}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">{t('execution:verification.step')}</th>
                <th className="py-2 text-center font-medium">{t('execution:verification.preconditions')}</th>
                <th className="py-2 text-center font-medium">{t('execution:verification.postconditions')}</th>
                <th className="py-2 text-center font-medium">{t('execution:verification.status')}</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.stepId} className="border-b">
                  <td className="py-3">
                    <div className="font-medium">{step.stepName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{step.stepId}</div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={step.preconditions.passed === step.preconditions.total ? 'text-green-600' : 'text-amber-600'}>
                      {step.preconditions.passed}/{step.preconditions.total}
                    </span>
                    {step.preconditions.total > 0 && (
                      <div className="flex justify-center mt-1 gap-0.5">
                        {Array.from({ length: step.preconditions.total }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-2 w-2 rounded-full',
                              i < step.preconditions.passed ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <span className={step.postconditions.passed === step.postconditions.total ? 'text-green-600' : 'text-amber-600'}>
                      {step.postconditions.passed}/{step.postconditions.total}
                    </span>
                    {step.postconditions.total > 0 && (
                      <div className="flex justify-center mt-1 gap-0.5">
                        {Array.from({ length: step.postconditions.total }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-2 w-2 rounded-full',
                              i < step.postconditions.passed ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {step.verified ? (
                      <CheckCircle className="h-5 w-5 text-green-500 inline" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Gates */}
      <div className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">
          {t('execution:verification.qualityGates')}
        </h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {qualityGates.map((gate, index) => (
            <div
              key={index}
              className={cn(
                'rounded-lg border p-3 text-center',
                gate.passed
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              )}
            >
              <div className="flex justify-center mb-2">
                {gate.passed ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="font-medium text-sm">{gate.name}</div>
              {gate.value !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">{gate.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold">{steps.length}</div>
          <div className="text-sm text-muted-foreground">{t('execution:verification.totalSteps')}</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {steps.filter((s) => s.verified).length}
          </div>
          <div className="text-sm text-muted-foreground">{t('execution:verification.verifiedSteps')}</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold">
            {qualityGates.length}
          </div>
          <div className="text-sm text-muted-foreground">{t('execution:verification.totalGates')}</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {qualityGates.filter((g) => g.passed).length}
          </div>
          <div className="text-sm text-muted-foreground">{t('execution:verification.passedGates')}</div>
        </div>
      </div>
    </div>
  );
};

export default VerificationReport;
