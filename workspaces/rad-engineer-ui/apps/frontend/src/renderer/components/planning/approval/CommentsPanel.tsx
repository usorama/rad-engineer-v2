/**
 * CommentsPanel Component
 * Textarea for adding comments/feedback before approval or rejection
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';

const MAX_COMMENT_LENGTH = 1000;

export interface CommentsPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function CommentsPanel({ value, onChange }: CommentsPanelProps): React.ReactElement {
  const { t } = useTranslation(['planning']);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce max length
    if (newValue.length <= MAX_COMMENT_LENGTH) {
      onChange(newValue);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('planning:approval.comments.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={t('planning:approval.comments.placeholder')}
            className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
            aria-label={t('planning:approval.comments.title')}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {t('planning:approval.comments.characterCount', {
                count: value.length,
                max: MAX_COMMENT_LENGTH
              })}
            </span>
            {value.length >= MAX_COMMENT_LENGTH && (
              <span className="text-xs text-destructive">
                {t('planning:approval.comments.maxLength', { max: MAX_COMMENT_LENGTH })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
