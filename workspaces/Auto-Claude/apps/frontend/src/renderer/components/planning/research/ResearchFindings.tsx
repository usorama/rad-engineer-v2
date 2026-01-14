/**
 * ResearchFindings Component
 * Displays findings from completed research agents
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/card';
import { Badge } from '../../ui/badge';

export interface ResearchFinding {
  id: string;
  title: string;
  content: string;
  category: 'context' | 'requirements' | 'research' | 'analysis';
}

export interface ResearchFindingsProps {
  findings: ResearchFinding[];
  agentName?: string;
}

export function ResearchFindings({ findings, agentName }: ResearchFindingsProps): React.ReactElement {
  const { t } = useTranslation('planning');

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            {t('planning:research.findings.noFindings')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {agentName && (
        <h3 className="text-lg font-semibold">
          {t('planning:research.findings.title')} - {agentName}
        </h3>
      )}
      {findings.map((finding) => (
        <Card key={finding.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">{finding.title}</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">
                {t(`planning:research.findings.category.${finding.category}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="whitespace-pre-wrap">
              {finding.content}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
