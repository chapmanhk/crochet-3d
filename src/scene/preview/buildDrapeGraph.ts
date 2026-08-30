import type { StitchNode } from '@engine/index';
import { FoundationType, groupStitchesByRow } from '@engine/index';
import { getDrapeLoopAnchorPosition, getDrapeStitchTopPosition } from '../stitchGeometry';

export type DrapeEdgeKind = 'post' | 'loop' | 'secondary';

export interface DrapeNode {
  id: string;
  position: [number, number, number];
  /** Fixed anchors hold parent loop attachment points. */
  fixed: boolean;
}

export interface DrapeEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: DrapeEdgeKind;
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface DrapeGraph {
  nodes: DrapeNode[];
  edges: DrapeEdge[];
}

export const DRAPE_SPRING_TUNING = {
  post: { stiffness: 900, damping: 12 },
  loop: { stiffness: 220, damping: 9 },
  secondary: { stiffness: 160, damping: 8 },
} as const;

export const MAX_DRAPE_SIMULATION_NODES = 200;

const ATTACHMENTS: ReadonlyArray<{
  kind: Exclude<DrapeEdgeKind, 'post'>;
  getId: (stitch: StitchNode) => string | null | undefined;
}> = [
  { kind: 'loop', getId: (stitch) => stitch.attachToId },
  { kind: 'secondary', getId: (stitch) => stitch.secondaryAttachToId },
];

function selectWorkingStitches(stitches: StitchNode[]): StitchNode[] {
  const rows = [...groupStitchesByRow(stitches.filter((stitch) => stitch.row > 0)).entries()].sort(
    ([left], [right]) => left - right,
  );
  const selected: StitchNode[] = [];

  for (const [, rowStitches] of rows) {
    if (selected.length + rowStitches.length > MAX_DRAPE_SIMULATION_NODES) {
      break;
    }
    selected.push(...rowStitches);
  }

  return selected;
}

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function anchorNodeId(stitchId: string): string {
  return `anchor-${stitchId}`;
}

function createEdge(
  fromId: string,
  toId: string,
  kind: DrapeEdgeKind,
  fromPos: [number, number, number],
  toPos: [number, number, number],
): DrapeEdge {
  const tuning = DRAPE_SPRING_TUNING[kind];
  return {
    id: `${kind}:${fromId}->${toId}`,
    fromId,
    toId,
    kind,
    restLength: Math.max(distance(fromPos, toPos), 0.02),
    stiffness: tuning.stiffness,
    damping: tuning.damping,
  };
}

/**
 * Build a coarse stitch joint graph for Rapier drape preview.
 * Post springs link same-row neighbors; loop springs link each stitch to its parent loop anchor.
 */
export function buildDrapeGraph(
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): DrapeGraph {
  if (stitches.length === 0) {
    return { nodes: [], edges: [] };
  }

  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const nodes = new Map<string, DrapeNode>();
  const edges: DrapeEdge[] = [];
  const byRow = groupStitchesByRow(selectWorkingStitches(stitches));

  const ensureAnchor = (parent: StitchNode): DrapeNode => {
    const id = anchorNodeId(parent.id);
    let anchor = nodes.get(id);
    if (!anchor) {
      anchor = {
        id,
        position: getDrapeLoopAnchorPosition(parent, foundationType),
        fixed: true,
      };
      nodes.set(id, anchor);
    }
    return anchor;
  };

  for (const rowStitches of byRow.values()) {
    const sorted = [...rowStitches].sort((left, right) => left.column - right.column);

    for (let index = 0; index < sorted.length; index += 1) {
      const stitch = sorted[index]!;
      const stitchNode: DrapeNode = {
        id: stitch.id,
        position: getDrapeStitchTopPosition(stitch, stitchById, foundationType),
        fixed: false,
      };
      nodes.set(stitch.id, stitchNode);

      for (const { kind, getId } of ATTACHMENTS) {
        const attachToId = getId(stitch);
        if (!attachToId) {
          continue;
        }
        const target = stitchById.get(attachToId);
        if (!target) {
          continue;
        }
        const anchor = ensureAnchor(target);
        edges.push(createEdge(stitch.id, anchor.id, kind, stitchNode.position, anchor.position));
      }

      const previous = sorted[index - 1];
      if (previous) {
        const previousNode = nodes.get(previous.id)!;
        edges.push(
          createEdge(previous.id, stitch.id, 'post', previousNode.position, stitchNode.position),
        );
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
  };
}
