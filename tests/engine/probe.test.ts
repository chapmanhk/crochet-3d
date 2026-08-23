import { describe, it } from 'vitest';
import { Pattern, StitchType } from './src/engine/index';

describe('probe', () => {
  it('deadlock after decrease', () => {
    const p = new Pattern();
    p.addFoundationChain(4);
    p.startNewRow();
    p.addDecrease(StitchType.SINGLE_CROCHET);
    p.addDecrease(StitchType.SINGLE_CROCHET);
    console.log('canStartNewRow after row1', p.canStartNewRow());
    p.startNewRow();
    console.log('row2 canAdd', p.canAddWorkingStitch(StitchType.SINGLE_CROCHET));
    console.log('row2 canStartNewRow', p.canStartNewRow());
    console.log('row2 stitch count', p.getRowStitchCount(2));
  });
});
