/**
 * PlanPreview Component
 * Displays formatted markdown preview of the plan content
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface PlanPreviewProps {
  content: string;
}

interface ParsedPlan {
  name?: string;
  version?: string;
  waves?: Array<{
    id: string;
    stories?: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export function PlanPreview({ content }: PlanPreviewProps): React.ReactElement {
  const { t } = useTranslation('planning');

  const parsedPlan = useMemo<ParsedPlan | null>(() => {
    if (!content.trim()) return null;

    try {
      // Simple YAML parsing for preview
      const lines = content.split('\n');
      const plan: ParsedPlan = {};
      let currentWave: ParsedPlan['waves'][0] | null = null;
      let currentStory: ParsedPlan['waves'][0]['stories'][0] | null = null;

      for (const line of lines) {
        const trimmed = line.trim();

        // Parse top-level fields
        if (trimmed.startsWith('name:')) {
          plan.name = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('version:')) {
          plan.version = trimmed.substring(8).trim();
        }

        // Parse waves
        else if (trimmed.startsWith('- id:') && line.startsWith('  ')) {
          // New wave
          const id = trimmed.substring(5).trim();
          currentWave = { id, stories: [] };
          if (!plan.waves) plan.waves = [];
          plan.waves.push(currentWave);
          currentStory = null;
        }

        // Parse stories
        else if (trimmed.startsWith('- id:') && line.startsWith('      ')) {
          // New story
          const id = trimmed.substring(5).trim();
          currentStory = { id, title: '' };
          if (currentWave) {
            if (!currentWave.stories) currentWave.stories = [];
            currentWave.stories.push(currentStory);
          }
        } else if (trimmed.startsWith('title:') && currentStory) {
          currentStory.title = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('description:') && currentStory) {
          currentStory.description = trimmed.substring(12).trim();
        }
      }

      return plan;
    } catch {
      return null;
    }
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-muted-foreground font-medium">
          {t('planning:editor.preview.empty')}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {t('planning:editor.preview.emptyDescription')}
        </p>
      </div>
    );
  }

  if (!parsedPlan) {
    return (
      <div className="flex flex-col h-full p-4">
        <h3 className="text-sm font-semibold mb-4">{t('planning:editor.preview.title')}</h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4">{t('planning:editor.preview.title')}</h3>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        {/* Plan header */}
        {parsedPlan.name && (
          <div>
            <h2 className="text-xl font-bold">{parsedPlan.name}</h2>
            {parsedPlan.version && (
              <p className="text-sm text-muted-foreground">Version {parsedPlan.version}</p>
            )}
          </div>
        )}

        {/* Waves and stories */}
        {parsedPlan.waves && parsedPlan.waves.length > 0 && (
          <div className="space-y-6">
            {parsedPlan.waves.map((wave) => (
              <div key={wave.id} className="border-l-2 border-primary pl-4">
                <h3 className="text-lg font-semibold text-primary mb-3">{wave.id}</h3>
                {wave.stories && wave.stories.length > 0 && (
                  <ul className="space-y-2">
                    {wave.stories.map((story) => (
                      <li key={story.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {story.id}
                          </span>
                          <span className="font-medium">{story.title}</span>
                        </div>
                        {story.description && (
                          <p className="text-sm text-muted-foreground ml-16">
                            {story.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
