import { lazy, Suspense, useEffect } from 'react';
import type { StitchNode } from '@engine/index';
import { FoundationType } from '@engine/index';

const DrapePreviewLayer = lazy(() =>
  import('./preview/DrapePreviewLayer').then((module) => ({
    default: module.DrapePreviewLayer,
  })),
);

interface LazyDrapePreviewProps {
  stitches: StitchNode[];
  foundationType: FoundationType;
  enabled: boolean;
  onReady?: () => void;
}

function DrapePreviewReady({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return null;
}

/**
 * Lazy-loads the Rapier drape preview layer only when `enabled` is true.
 * Keeps the `rapier` chunk off the critical path until the user toggles preview on.
 */
export function LazyDrapePreview({
  stitches,
  foundationType,
  enabled,
  onReady,
}: LazyDrapePreviewProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DrapePreviewLayer stitches={stitches} foundationType={foundationType} />
      <DrapePreviewReady onReady={onReady} />
    </Suspense>
  );
}
