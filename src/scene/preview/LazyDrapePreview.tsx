import { lazy, Suspense } from 'react';
import type { StitchNode } from '@engine/index';

const DrapePreviewLayer = lazy(() =>
  import('@scene/preview/DrapePreviewLayer').then((module) => ({
    default: module.DrapePreviewLayer,
  })),
);

interface LazyDrapePreviewProps {
  stitches: StitchNode[];
  enabled: boolean;
}

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
