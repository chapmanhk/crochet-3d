import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { SceneStitchRenderer } from './SceneStitchRenderer';

export function CrochetScene() {
  return (
    <Canvas
      id="main-canvas"
      camera={{ position: [4, 4, 8], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f4f1ea']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} />
      <gridHelper args={[20, 20, '#d8d2c8', '#e8e2d8']} position={[0, -0.01, 0]} />
      <OrbitControls makeDefault enableDamping />
      <SceneStitchRenderer />
    </Canvas>
  );
}
