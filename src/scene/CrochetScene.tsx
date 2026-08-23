import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useSyncExternalStore } from 'react';
import { SceneStitchRenderer } from './SceneStitchRenderer';

export const SCENE_BACKGROUND = '#f7f0e6';

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
  return (
    <Canvas
      camera={{ position: [4, 4, 8], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: SCENE_BACKGROUND }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneControls />
      <SceneStitchRenderer />
    </Canvas>
  );
}
