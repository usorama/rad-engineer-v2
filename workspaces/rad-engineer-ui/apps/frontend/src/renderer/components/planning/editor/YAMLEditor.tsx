/**
 * YAMLEditor Component
 * Simple textarea-based YAML editor with character count
 */
import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface YAMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function YAMLEditor({
  value,
  onChange,
  placeholder,
  readOnly = false
}: YAMLEditorProps): React.ReactElement {
  const { t } = useTranslation('planning');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const characterCount = value.length;
  const effectivePlaceholder = placeholder || t('planning:editor.yaml.placeholder');

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="yaml-editor" className="text-sm font-medium">
          {t('planning:editor.yaml.label')}
        </label>
        <span className="text-xs text-muted-foreground">
          {t('planning:editor.yaml.characters', { count: characterCount })}
        </span>
      </div>

      <textarea
        ref={textareaRef}
        id="yaml-editor"
        className="flex-1 w-full p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={effectivePlaceholder}
        readOnly={readOnly}
        spellCheck={false}
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
