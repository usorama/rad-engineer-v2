/**
 * IntakeSummary Component
 * Reviews all answers before submission
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import type { IntakeQuestion } from './IntakeStep';

export interface IntakeSummaryProps {
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  onEdit: (questionIndex: number) => void;
}

export function IntakeSummary({
  questions,
  answers,
  onEdit
}: IntakeSummaryProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t('planning:intake.summary.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('planning:intake.summary.description')}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const answer = answers[question.id] || '';
          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('planning:intake.summary.question', { number: index + 1 })}
                    </CardTitle>
                    <CardDescription className="text-base font-medium text-foreground">
                      {question.question}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(index)}
                    aria-label={`${t('planning:intake.buttons.edit')} ${question.question}`}
                  >
                    {t('planning:intake.buttons.edit')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('planning:intake.summary.answer')}</p>
                  {answer ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answer}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t('planning:intake.summary.noAnswer')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
