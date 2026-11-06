import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { isSoundUnlocked, unlockSound } from '@/shared/lib/chime';

/** Asks for the tap browsers need before a screen left open can make a sound. */
export function SoundHint() {
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState(isSoundUnlocked);

  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      unlockSound();
      setUnlocked(true);
    };
    // On click, not on press: if this button vanished mid-press, the release would
    // land on whatever is underneath and the user's first tap would be lost or misfire.
    window.addEventListener('click', unlock, { once: true });
    return () => window.removeEventListener('click', unlock);
  }, [unlocked]);

  if (unlocked) return null;
  return (
    // Floating, so that it does not move the screen's content when it goes away.
    <Button
      variant="outline"
      size="lg"
      className="fixed bottom-20 left-1/2 z-40 h-12 -translate-x-1/2 px-4 text-foreground shadow-lg md:bottom-4"
    >
      <BellRing />
      {t('common.enableSound')}
    </Button>
  );
}
