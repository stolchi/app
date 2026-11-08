import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** A code the courier's phone camera opens as a route. */
export function CourierQrDialog({
  open,
  onOpenChange,
  number,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number: string;
  url: string;
}) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    // The QR library is only needed here, so it loads with the first code.
    void import('qrcode').then(({ toDataURL }) =>
      toDataURL(url, { width: 320, margin: 2 }).then((data) => {
        if (!stopped) setImage(data);
      }),
    );
    return () => {
      stopped = true;
    };
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('location.qrTitle', { number })}</DialogTitle>
          <DialogDescription>{t('location.qrHint')}</DialogDescription>
        </DialogHeader>
        {image ? (
          <img
            src={image}
            alt={t('location.qr')}
            width={320}
            height={320}
            className="mx-auto size-72 rounded-xl border bg-white"
          />
        ) : (
          <div className="mx-auto size-72 animate-pulse rounded-xl bg-muted" />
        )}
      </DialogContent>
    </Dialog>
  );
}
