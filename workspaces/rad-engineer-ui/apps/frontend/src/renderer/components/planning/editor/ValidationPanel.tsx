/**
 * ValidationPanel Component
 * Displays validation errors and warnings for plan content
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationPanelProps {
  validation: ValidationResult | null;
  isValidating: boolean;
}

export function ValidationPanel({
  validation,
  isValidating
}: ValidationPanelProps): React.ReactElement {
  const { t } = useTranslation('planning');

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('planning:editor.validation.title')}</h3>
        {isValidating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('planning:editor.validation.validating')}</span>
          </div>
        )}
      </div>

      {!isValidating && validation && (
        <>
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-success font-medium">
                  {t('planning:editor.validation.valid')}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  {t('planning:editor.validation.invalid')}
                </span>
              </>
            )}
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{t('planning:editor.validation.errors')}</span>
              </div>
              <ul className="space-y-1 ml-6">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive list-disc">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('planning:editor.validation.warnings')}</span>
              </div>
              <ul className="space-y-1 ml-6">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-warning list-disc">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No issues message */}
          {validation.valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('planning:editor.validation.noErrors')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('planning:editor.validation.noWarnings')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
