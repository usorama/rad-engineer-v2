/**
 * IntakeStep Component
 * Renders individual question step with input field
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';

export interface IntakeQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea';
}

export interface IntakeStepProps {
  question: IntakeQuestion;
  answer: string;
  onAnswerChange: (answer: string) => void;
  questionNumber: number;
}

export function IntakeStep({
  question,
  answer,
  onAnswerChange,
  questionNumber
}: IntakeStepProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onAnswerChange(e.target.value);
  };

  const placeholder = question.type === 'textarea'
    ? t('planning:intake.step.textareaPlaceholder')
    : t('planning:intake.step.textPlaceholder');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`question-${question.id}`} className="text-base font-medium">
          {question.question}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('planning:intake.step.answerRequired')}
        </p>
      </div>

      {question.type === 'textarea' ? (
        <Textarea
          id={`question-${question.id}`}
          value={answer}
          onChange={handleChange}
          placeholder={placeholder}
          className="min-h-[150px]"
          aria-required="true"
        />
      ) : (
        <Input
          id={`question-${question.id}`}
          type="text"
          value={answer}
          onChange={handleChange}
          placeholder={placeholder}
          aria-required="true"
        />
      )}
    </div>
  );
}
