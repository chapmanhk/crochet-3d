import type { StitchNode } from './types';
import { cloneStitchNode } from './StitchNode';

export class StitchGraph {
  private readonly stitches = new Map<string, StitchNode>();

  add(stitch: StitchNode): void {
    this.stitches.set(stitch.id, cloneStitchNode(stitch));
  }

  get(id: string): StitchNode | undefined {
    const stitch = this.stitches.get(id);
    return stitch ? cloneStitchNode(stitch) : undefined;
  }

  getAll(): StitchNode[] {
    return [...this.stitches.values()]
      .map(cloneStitchNode)
      .sort((a, b) => a.row - b.row || a.column - b.column);
  }

  getByRow(row: number): StitchNode[] {
    const rowStitches: StitchNode[] = [];

    for (const stitch of this.stitches.values()) {
      if (stitch.row === row) {
        rowStitches.push(cloneStitchNode(stitch));
      }
    }

    return rowStitches.sort((a, b) => a.column - b.column);
  }

  count(): number {
    return this.stitches.size;
  }

  clear(): void {
    this.stitches.clear();
  }
}
