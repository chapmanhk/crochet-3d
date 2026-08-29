import { type RefObject } from 'react';
import { type RapierRigidBody, useSpringJoint } from '@react-three/rapier';
import type { DrapeEdge } from './buildDrapeGraph';

interface DrapeSpringEdgeProps {
  bodyA: RefObject<RapierRigidBody>;
  bodyB: RefObject<RapierRigidBody>;
  edge: DrapeEdge;
}

/** Rapier spring between two drape proxy bodies. */
export function DrapeSpringEdge({ bodyA, bodyB, edge }: DrapeSpringEdgeProps) {
  useSpringJoint(bodyA, bodyB, [
    [0, 0, 0],
    [0, 0, 0],
    edge.restLength,
    edge.stiffness,
    edge.damping,
  ]);

  return null;
}
