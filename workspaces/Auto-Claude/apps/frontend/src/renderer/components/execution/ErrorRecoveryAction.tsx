import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

interface ErrorRecoveryActionProps {
  type: 'retryWave' | 'retryTask' | 'restoreCheckpoint';
  onConfirm: () => void;
  disabled?: boolean;
  checkpointName?: string;
}

const ErrorRecoveryAction: React.FC<ErrorRecoveryActionProps> = ({
  type,
  onConfirm,
  disabled = false,
  checkpointName,
}) => {
  const { t } = useTranslation('execution');

  const getButtonConfig = () => {
    switch (type) {
      case 'retryWave':
        return {
          label: t('errorRecovery.actions.retryWave'),
          variant: 'destructive' as const,
          title: t('errorRecovery.confirm.retryWaveTitle'),
          message: t('errorRecovery.confirm.retryWaveMessage'),
        };
      case 'retryTask':
        return {
          label: t('errorRecovery.actions.retryTask'),
          variant: 'warning' as const,
          title: t('errorRecovery.confirm.retryTaskTitle'),
          message: t('errorRecovery.confirm.retryTaskMessage'),
        };
      case 'restoreCheckpoint':
        return {
          label: t('errorRecovery.actions.restoreCheckpoint'),
          variant: 'secondary' as const,
          title: t('errorRecovery.confirm.restoreCheckpointTitle'),
          message: t('errorRecovery.confirm.restoreCheckpointMessage', {
            checkpoint: checkpointName || '',
          }),
        };
    }
  };

  const config = getButtonConfig();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={config.variant} disabled={disabled} size="sm">
          {config.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('errorRecovery.confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('errorRecovery.confirm.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ErrorRecoveryAction;
