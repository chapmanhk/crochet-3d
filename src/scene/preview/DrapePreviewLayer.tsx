import { createRef, useMemo, useRef, type RefObject } from 'react';
import { BallCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { StitchNode } from '@engine/index';
import { buildDrapeGraph } from './buildDrapeGraph';
import { DrapeSpringEdge } from './DrapeSpringEdge';

const DRAPED_NODE_RADIUS = 0.035;
const DRAPED_NODE_MASS = 0.04;

interface DrapePreviewLayerProps {
  stitches: StitchNode[];
}

/**
 * Rapier drape preview: spring-linked stitch proxies with loop + post constraints.
 * Illustrative hang feedback — not strand-accurate yarn simulation.
 */
export function DrapePreviewLayer({ stitches }: DrapePreviewLayerProps) {
  const graph = useMemo(() => buildDrapeGraph(stitches), [stitches]);
  const nodeRefsCache = useRef(new Map<string, RefObject<RapierRigidBody>>());

  const nodeRefs = useMemo(() => {
    const refs = new Map<string, RefObject<RapierRigidBody>>();
    const previous = nodeRefsCache.current;
    for (const node of graph.nodes) {
      refs.set(
        node.id,
        (previous.get(node.id) ?? createRef<RapierRigidBody>()) as RefObject<RapierRigidBody>,
      );
    }
    nodeRefsCache.current = refs;
    return refs;
  }, [graph]);

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <Physics gravity={[0, -2.8, 0]} timeStep={1 / 60}>
      {graph.nodes.map((node) => {
        const dynamicProps = node.fixed
          ? {}
          : { linearDamping: 2.2, angularDamping: 1.4, mass: DRAPED_NODE_MASS };

        return (
          <RigidBody
            key={node.id}
            ref={nodeRefs.get(node.id)!}
            position={node.position}
            type={node.fixed ? 'fixed' : 'dynamic'}
            colliders={false}
            {...dynamicProps}
          >
            <BallCollider args={[DRAPED_NODE_RADIUS]} />
          </RigidBody>
        );
      })}
      {graph.edges.map((edge) => {
        const bodyA = nodeRefs.get(edge.fromId);
        const bodyB = nodeRefs.get(edge.toId);
        if (!bodyA || !bodyB) {
          return null;
        }

        return (
          <DrapeSpringEdge
            key={edge.id}
            bodyA={bodyA as RefObject<RapierRigidBody>}
            bodyB={bodyB as RefObject<RapierRigidBody>}
            edge={edge}
          />
        );
      })}
    </Physics>
  );
}
