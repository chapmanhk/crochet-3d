import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { usePatternStore } from '@store/patternStore';
import { StitchRenderer } from './StitchRenderer';

export function SceneStitchRenderer() {
  const stitches = usePatternStore((state) => state.stitches);
  const yarnColor = usePatternStore((state) => state.yarnColor);
  const scene = useThree((state) => state.scene);
  const renderer = useMemo(() => new StitchRenderer(), []);

  useEffect(() => {
    scene.add(renderer.group);
    return () => {
      scene.remove(renderer.group);
      renderer.dispose();
    };
  }, [renderer, scene]);

  useEffect(() => {
    renderer.sync(stitches);
  }, [renderer, stitches]);

  useEffect(() => {
    renderer.setYarnColor(yarnColor);
  }, [renderer, yarnColor]);

  useEffect(() => {
    const handleResize = () => {
      renderer.updateOutlineSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderer]);

  return null;
}
