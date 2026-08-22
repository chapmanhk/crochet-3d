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
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f7f0e6']} />
      <ambientLight intensity={1} />
      <gridHelper args={[20, 20, '#ddd4c8', '#ebe4da']} position={[0, -0.01, 0]} />
      <SceneControls />
      <SceneStitchRenderer />
    </Canvas>
  );
}
