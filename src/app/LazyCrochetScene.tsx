import { lazy, Suspense } from 'react';
import { SCENE_BACKGROUND } from './sceneConstants';

const CrochetScene = lazy(() =>
  import('@scene/CrochetScene').then((module) => ({ default: module.CrochetScene })),
);

export function LazyCrochetScene() {
  return (
    <Suspense
      fallback={
        <div
          className="canvas-loading"
          role="status"
          aria-live="polite"
          style={{ background: SCENE_BACKGROUND }}
        >
          Loading 3D preview…
        </div>
      }
    >
      <CrochetScene />
    </Suspense>
  );
}
