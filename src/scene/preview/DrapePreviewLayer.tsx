import { createRef, useMemo, useRef, type RefObject } from 'react';
import { Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { StitchNode } from '@engine/index';
import { FoundationType } from '@engine/index';
import { buildDrapeGraph } from './buildDrapeGraph';
import { DrapeSpringEdge } from './DrapeSpringEdge';

const DRAPED_NODE_MASS = 0.04;

interface DrapePreviewLayerProps {
  stitches: StitchNode[];
  foundationType: FoundationType;
}

/**
 * Rapier drape preview: spring-linked stitch proxies with loop + post constraints.
 * Illustrative hang feedback — not strand-accurate yarn simulation.
 */
export function DrapePreviewLayer({ stitches, foundationType }: DrapePreviewLayerProps) {
  const { graph, simulationKey } = useMemo(
    () => ({
      graph: buildDrapeGraph(stitches, foundationType),
      simulationKey: `${foundationType}:${stitches.map((stitch) => stitch.id).join(',')}`,
    }),
    [stitches, foundationType],
  );
  const nodeRefs = useRef(new Map<string, RefObject<RapierRigidBody | null>>());

  const getNodeRef = (id: string): RefObject<RapierRigidBody | null> => {
    const cache = nodeRefs.current;
    let ref = cache.get(id);
    if (!ref) {
      ref = createRef<RapierRigidBody>();
      cache.set(id, ref);
    }
    return ref;
  };

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <Physics key={simulationKey} gravity={[0, -2.8, 0]} timeStep={1 / 60}>
      {graph.nodes.map((node) => (
        <RigidBody
          key={node.id}
          ref={getNodeRef(node.id)}
          position={node.position}
          type={node.fixed ? 'fixed' : 'dynamic'}
          colliders={false}
          {...(node.fixed
            ? {}
            : { linearDamping: 2.2, angularDamping: 1.4, mass: DRAPED_NODE_MASS })}
        />
      ))}
      {graph.edges.map((edge) => (
        <DrapeSpringEdge
          key={edge.id}
          bodyA={getNodeRef(edge.fromId) as RefObject<RapierRigidBody>}
          bodyB={getNodeRef(edge.toId) as RefObject<RapierRigidBody>}
          edge={edge}
        />
      ))}
    </Physics>
  );
}
