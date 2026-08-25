import { lazy, Suspense } from 'react';
import type { StitchNode } from '@engine/index';

const DrapePreviewLayer = lazy(() =>
  import('./preview/DrapePreviewLayer').then((module) => ({
    default: module.DrapePreviewLayer,
  })),
);

interface LazyDrapePreviewProps {
  stitches: StitchNode[];
  enabled: boolean;
}

/**
 * Lazy-loads the Rapier drape preview layer only when `enabled` is true.
 * Keeps the `rapier` chunk off the critical path until the user toggles preview on.
 */
export function LazyDrapePreview({ stitches, enabled }: LazyDrapePreviewProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DrapePreviewLayer stitches={stitches} />
    </Suspense>
  );
}
