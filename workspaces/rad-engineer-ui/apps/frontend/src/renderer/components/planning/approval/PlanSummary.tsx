/**
 * PlanSummary Component
 * Displays plan statistics (subtasks count, phases count, estimated effort)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import type { ImplementationPlan } from '../../../../shared/types';

export interface PlanSummaryProps {
  plan: ImplementationPlan;
}

export function PlanSummary({ plan }: PlanSummaryProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  // Calculate total subtasks across all phases
  const totalSubtasks = plan.phases.reduce((sum, phase) => sum + phase.subtasks.length, 0);

  // Calculate estimated effort (2 hours per subtask)
  const estimatedHours = totalSubtasks * 2;

  // Get plan title (support both 'title' and 'feature' properties)
  const planTitle = plan.title || plan.feature || 'Untitled Plan';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('planning:approval.summary.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Plan Title */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{planTitle}</h3>
            <p className="text-sm text-muted-foreground mt-1">{plan.workflow_type}</p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* Total Subtasks */}
            <div className="flex flex-col items-center p-4 bg-accent rounded-lg">
              <span className="text-3xl font-bold text-primary">{totalSubtasks}</span>
              <span className="text-sm text-muted-foreground mt-1">
                {t('planning:approval.summary.subtasks')}
              </span>
            </div>

            {/* Phases Count */}
            <div className="flex flex-col items-center p-4 bg-accent rounded-lg">
              <span className="text-3xl font-bold text-primary">{plan.phases.length}</span>
              <span className="text-sm text-muted-foreground mt-1">
                {t('planning:approval.summary.phases')}
              </span>
            </div>

            {/* Estimated Effort */}
            <div className="flex flex-col items-center p-4 bg-accent rounded-lg">
              <span className="text-3xl font-bold text-primary">{estimatedHours}</span>
              <span className="text-sm text-muted-foreground mt-1">
                {t('planning:approval.summary.effort')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('planning:approval.summary.hours', { count: estimatedHours })}
              </span>
            </div>
          </div>

          {/* Final Acceptance Criteria */}
          {plan.final_acceptance && plan.final_acceptance.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Acceptance Criteria</h4>
              <ul className="space-y-1">
                {plan.final_acceptance.map((criteria, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="mr-2">•</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
