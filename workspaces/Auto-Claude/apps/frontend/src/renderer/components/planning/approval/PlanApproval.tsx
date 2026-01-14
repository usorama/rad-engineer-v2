/**
 * PlanApproval Component
 * Main approval container with approve/reject actions and confirmation dialogs
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../ui/dialog';
import { PlanSummary } from './PlanSummary';
import { CommentsPanel } from './CommentsPanel';
import type { ImplementationPlan } from '../../../../shared/types';

export interface PlanApprovalProps {
  plan: ImplementationPlan;
  onApprove: (comments?: string) => void;
  onReject: (comments?: string) => void;
}

type ConfirmDialogType = 'approve' | 'reject' | null;

export function PlanApproval({ plan, onApprove, onReject }: PlanApprovalProps): React.ReactElement {
  const { t } = useTranslation(['planning']);
  const [comments, setComments] = useState('');
  const [dialogType, setDialogType] = useState<ConfirmDialogType>(null);

  const handleApproveClick = () => {
    setDialogType('approve');
  };

  const handleRejectClick = () => {
    setDialogType('reject');
  };

  const handleConfirmApprove = () => {
    setDialogType(null);
    onApprove(comments.trim() || undefined);
  };

  const handleConfirmReject = () => {
    setDialogType(null);
    onReject(comments.trim() || undefined);
  };

  const handleDialogClose = () => {
    setDialogType(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('planning:approval.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('planning:approval.description')}
        </p>
      </div>

      {/* Plan Summary */}
      <PlanSummary plan={plan} />

      {/* Comments Panel */}
      <CommentsPanel value={comments} onChange={setComments} />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="destructive" onClick={handleRejectClick} size="lg">
          {t('planning:approval.buttons.reject')}
        </Button>
        <Button variant="default" onClick={handleApproveClick} size="lg">
          {t('planning:approval.buttons.approve')}
        </Button>
      </div>

      {/* Confirmation Dialog - Approve */}
      <Dialog open={dialogType === 'approve'} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('planning:approval.dialog.approve.title')}</DialogTitle>
            <DialogDescription>
              {t('planning:approval.dialog.approve.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('planning:approval.dialog.approve.warning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              {t('planning:approval.buttons.cancel')}
            </Button>
            <Button variant="default" onClick={handleConfirmApprove}>
              {t('planning:approval.buttons.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Reject */}
      <Dialog open={dialogType === 'reject'} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('planning:approval.dialog.reject.title')}</DialogTitle>
            <DialogDescription>
              {t('planning:approval.dialog.reject.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-destructive">
              {t('planning:approval.dialog.reject.warning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              {t('planning:approval.buttons.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              {t('planning:approval.buttons.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
