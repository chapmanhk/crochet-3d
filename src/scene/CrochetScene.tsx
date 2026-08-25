import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useSyncExternalStore } from 'react';
import { usePatternStore } from '@store/patternStore';
import { AttachmentPointPicker } from './AttachmentPointPicker';
import { LazyDrapePreview } from './LazyDrapePreview';
import { SceneStitchRenderer } from './SceneStitchRenderer';

/** Keep in sync with `SCENE_BACKGROUND` in `src/app/sceneConstants.ts`. */
const SCENE_BACKGROUND = '#f7f0e6';

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getReducedMotionPreference(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function SceneControls() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false,
  );

  return <OrbitControls makeDefault enableDamping={!prefersReducedMotion} />;
}

export function CrochetScene() {
  const stitches = usePatternStore((state) => state.stitches);
  const drapePreviewEnabled = usePatternStore((state) => state.drapePreviewEnabled);

  return (
    <Canvas
      camera={{ position: [3.2, 2.2, 5.5], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: SCENE_BACKGROUND }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneControls />
      <SceneStitchRenderer />
      <LazyDrapePreview stitches={stitches} enabled={drapePreviewEnabled} />
      <AttachmentPointPicker />
    </Canvas>
  );
}
