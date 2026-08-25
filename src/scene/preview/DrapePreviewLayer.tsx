import { useMemo } from 'react';
import { BallCollider, Physics, RigidBody } from '@react-three/rapier';
import type { StitchNode } from '@engine/index';
import { VISUAL_ROW_HEIGHT } from '../stitchRealism';

const DRAPED_NODE_RADIUS = 0.04;
const DRAPED_NODE_MASS = 0.05;

interface DrapePreviewLayerProps {
  stitches: StitchNode[];
}

export function DrapePreviewLayer({ stitches }: DrapePreviewLayerProps) {
  const nodes = useMemo(
    () =>
      stitches
        .filter((stitch) => stitch.row > 0)
        .map((stitch) => ({
          id: stitch.id,
          position: [
            stitch.position.x,
            stitch.row * VISUAL_ROW_HEIGHT + 0.05,
            stitch.position.z,
          ] as [number, number, number],
        })),
    [stitches],
  );

  if (nodes.length === 0) {
    return null;
  }

  return (
    <Physics gravity={[0, -2.4, 0]} timeStep="vary" paused={false}>
      {nodes.map((node) => (
        <RigidBody
          key={node.id}
          position={node.position}
          colliders={false}
          linearDamping={2.5}
          angularDamping={1.5}
          mass={DRAPED_NODE_MASS}
        >
          <BallCollider args={[DRAPED_NODE_RADIUS]} />
        </RigidBody>
      ))}
    </Physics>
  );
}
