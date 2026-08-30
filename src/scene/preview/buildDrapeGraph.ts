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

function selectWorkingStitches(stitches: StitchNode[]): StitchNode[] {
  const working = stitches.filter((stitch) => stitch.row > 0);
  const rows = [...groupStitchesByRow(working).entries()].sort(([left], [right]) => left - right);
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
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
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

export function buildDrapeGraphFingerprint(stitches: StitchNode[]): string {
  return stitches.map((stitch) => stitch.id).join(',');
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

  const workingStitches = selectWorkingStitches(stitches);

  for (const stitch of workingStitches) {
    nodes.set(stitch.id, {
      id: stitch.id,
      position: getDrapeStitchTopPosition(stitch, stitchById, foundationType),
      fixed: false,
    });
  }

  const ensureAnchor = (parent: StitchNode): DrapeNode => {
    const id = anchorNodeId(parent.id);
    const existing = nodes.get(id);
    if (existing) {
      return existing;
    }

    const anchor: DrapeNode = {
      id,
      position: getDrapeLoopAnchorPosition(parent, foundationType),
      fixed: true,
    };
    nodes.set(id, anchor);
    return anchor;
  };

  for (const stitch of workingStitches) {
    const stitchNode = nodes.get(stitch.id)!;

    const addAttachment = (attachToId: string | null | undefined, kind: DrapeEdgeKind) => {
      if (!attachToId) {
        return;
      }
      const target = stitchById.get(attachToId);
      if (!target) {
        return;
      }
      const anchor = ensureAnchor(target);
      edges.push(createEdge(stitch.id, anchor.id, kind, stitchNode.position, anchor.position));
    };

    addAttachment(stitch.attachToId, 'loop');
    addAttachment(stitch.secondaryAttachToId, 'secondary');
  }

  const byRow = groupStitchesByRow(workingStitches);
  for (const rowStitches of byRow.values()) {
    const sorted = [...rowStitches].sort((left, right) => left.column - right.column);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = nodes.get(sorted[index - 1]!.id);
      const current = nodes.get(sorted[index]!.id);
      if (previous && current) {
        edges.push(
          createEdge(previous.id, current.id, 'post', previous.position, current.position),
        );
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
  };
}
