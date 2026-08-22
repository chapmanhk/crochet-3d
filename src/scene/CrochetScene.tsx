import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useSyncExternalStore } from 'react';
import { SceneStitchRenderer } from './SceneStitchRenderer';

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
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f4f1ea']} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff8ef', '#d4c8b8', 0.45]} />
      <directionalLight position={[5, 8, 4]} intensity={1.15} castShadow />
      <gridHelper args={[20, 20, '#d8d2c8', '#e8e2d8']} position={[0, -0.01, 0]} />
      <SceneControls />
      <SceneStitchRenderer />
    </Canvas>
  );
}
