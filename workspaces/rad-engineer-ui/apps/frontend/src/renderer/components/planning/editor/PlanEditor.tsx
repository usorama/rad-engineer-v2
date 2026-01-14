/**
 * PlanEditor Component
 * Main container with editor/preview split and validation
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import { YAMLEditor } from './YAMLEditor';
import { ValidationPanel, type ValidationResult } from './ValidationPanel';
import { PlanPreview } from './PlanPreview';

export interface PlanEditorProps {
  projectId: string;
  planId?: string;
  initialContent?: string;
  onSave: (planId: string) => void;
  onCancel?: () => void;
}

export function PlanEditor({
  projectId,
  planId,
  initialContent = '',
  onSave,
  onCancel
}: PlanEditorProps): React.ReactElement {
  const { t } = useTranslation('planning');

  // State
  const [content, setContent] = useState(initialContent);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Validate plan content (debounced)
  const validatePlan = useCallback(
    async (planContent: string) => {
      if (!planContent.trim()) {
        setValidation(null);
        return;
      }

      try {
        setIsValidating(true);
        setError(null);

        const result = await window.api.planning.validatePlan(projectId, planContent);

        if (!result.success) {
          setError(
            t('planning:editor.errors.validationFailed', {
              error: result.error || t('common:errors.unknownError')
            })
          );
          return;
        }

        setValidation(result.data as ValidationResult);
      } catch (err) {
        setError(t('planning:editor.errors.genericError'));
      } finally {
        setIsValidating(false);
      }
    },
    [projectId, t]
  );

  // Handle content change with debounced validation
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer for validation
      const timer = setTimeout(() => {
        validatePlan(newContent);
      }, 500); // 500ms debounce

      setDebounceTimer(timer);
    },
    [debounceTimer, validatePlan]
  );

  // Initial validation
  useEffect(() => {
    if (initialContent) {
      validatePlan(initialContent);
    }
  }, []); // Run only on mount

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      let result;
      if (planId) {
        // Update existing plan
        result = await window.api.planning.updatePlan(projectId, planId, content);
      } else {
        // Create new plan
        result = await window.api.planning.savePlan(projectId, content);
      }

      if (!result.success) {
        setError(
          t('planning:editor.errors.saveFailed', {
            error: result.error || t('common:errors.unknownError')
          })
        );
        return;
      }

      // Get planId from result (for new plans)
      const savedPlanId = planId || (result.data as { planId: string }).planId;
      onSave(savedPlanId);
    } catch (err) {
      setError(t('planning:editor.errors.genericError'));
    } finally {
      setIsSaving(false);
    }
  };

  const isContentEmpty = content.trim() === '';
  const canSave = !isContentEmpty && !isValidating && !isSaving && validation?.valid !== false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">{t('planning:editor.title')}</h1>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Main content - Editor and Preview side by side */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Left: Editor and Validation */}
          <div className="flex flex-col gap-4 h-full overflow-y-auto">
            <YAMLEditor
              value={content}
              onChange={handleContentChange}
              readOnly={isSaving}
            />
            <ValidationPanel validation={validation} isValidating={isValidating} />
          </div>

          {/* Right: Preview */}
          <div className="border rounded-lg bg-card overflow-y-auto">
            <PlanPreview content={content} />
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="p-6 border-t flex items-center justify-between">
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              {t('planning:editor.actions.cancel')}
            </Button>
          )}
        </div>

        <Button onClick={handleSave} disabled={!canSave}>
          {isSaving ? t('planning:editor.actions.saving') : t('planning:editor.actions.save')}
        </Button>
      </div>
    </div>
  );
}
