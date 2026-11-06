import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useHeldValue } from '@/shared/lib/use-held-value';
import { ErrorText } from './ErrorText';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const heldTitle = useHeldValue(open ? title : null);
  const heldDescription = useHeldValue(open ? (description ?? '') : null);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{heldTitle}</AlertDialogTitle>
          {heldDescription && (
            <AlertDialogDescription>{heldDescription}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <ErrorText error={error} />
        <AlertDialogFooter>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
