/**
 * IntakeWizard Component
 * Multi-step wizard for planning intake with progress tracking
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { IntakeStep, type IntakeQuestion } from './IntakeStep';
import { IntakeSummary } from './IntakeSummary';

export interface IntakeWizardProps {
  projectId: string;
  onComplete: (specId: string) => void;
  onCancel?: () => void;
}

interface IntakeData {
  questions: IntakeQuestion[];
}

export function IntakeWizard({
  projectId,
  onComplete,
  onCancel
}: IntakeWizardProps): React.ReactElement {
  const { t } = useTranslation(['planning', 'common']);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  // Load questions on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await window.api.planning.startIntake(projectId);

        if (!result.success) {
          setError(t('planning:intake.errors.initializationFailed', {
            error: result.error || t('common:errors.unknownError')
          }));
          return;
        }

        const data = result.data as IntakeData;
        setQuestions(data.questions);

        // Initialize empty answers
        const initialAnswers: Record<string, string> = {};
        data.questions.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError(t('planning:intake.errors.genericError'));
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, [projectId, t]);

  // Handlers
  const handleAnswerChange = (answer: string) => {
    const currentQuestion = questions[currentStep];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false);
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleEdit = (questionIndex: number) => {
    setShowSummary(false);
    setCurrentStep(questionIndex);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await window.api.planning.submitAnswers(projectId, answers);

      if (!result.success) {
        setError(t('planning:intake.errors.submissionFailed', {
          error: result.error || t('common:errors.unknownError')
        }));
        return;
      }

      const data = result.data as { specId: string };
      onComplete(data.specId);
    } catch (err) {
      setError(t('planning:intake.errors.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed values
  const currentAnswer = questions.length > 0 ? answers[questions[currentStep]?.id] || '' : '';
  const isAnswerEmpty = currentAnswer.trim() === '';
  const progressValue = questions.length > 0
    ? ((currentStep + 1) / questions.length) * 100
    : 0;

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('planning:intake.wizard.loading')}</p>
      </div>
    );
  }

  // Render error state
  if (error && questions.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === questions.length - 1;
  const showBackButton = currentStep > 0 || showSummary;

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="p-6 border-b space-y-4">
        <h1 className="text-2xl font-bold">{t('planning:intake.wizard.title')}</h1>

        {!showSummary && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('planning:intake.wizard.progressLabel', {
                    current: currentStep + 1,
                    total: questions.length
                  })}
                </span>
                <span className="font-medium">{Math.round(progressValue)}%</span>
              </div>
              <Progress
                value={progressValue}
                aria-valuenow={currentStep + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
                aria-label={t('planning:intake.wizard.progressAriaLabel', {
                  current: currentStep + 1,
                  total: questions.length
                })}
              />
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {showSummary ? (
          <IntakeSummary
            questions={questions}
            answers={answers}
            onEdit={handleEdit}
          />
        ) : (
          questions.length > 0 && (
            <IntakeStep
              question={questions[currentStep]}
              answer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              questionNumber={currentStep + 1}
            />
          )
        )}
      </div>

      {/* Footer with actions */}
      <div className="p-6 border-t flex items-center justify-between">
        <div>
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t('planning:intake.buttons.cancel')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              {t('planning:intake.buttons.back')}
            </Button>
          )}

          {showSummary ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('planning:intake.wizard.submitting')
                : t('planning:intake.buttons.submit')}
            </Button>
          ) : isLastStep ? (
            <Button
              onClick={handleNext}
              disabled={isAnswerEmpty}
            >
              {t('planning:intake.buttons.review')}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isAnswerEmpty}
            >
              {t('planning:intake.buttons.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
