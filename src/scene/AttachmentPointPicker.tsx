import { Html } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import { getNextAttachmentPoint } from './attachmentPoints';

export function AttachmentPointPicker() {
  const {
    stitches,
    nextAttachmentTargetId,
    addWorkingStitchAt,
    canAddSingleCrochet,
  } = usePatternStore(
    useShallow((state) => ({
      stitches: state.stitches,
      nextAttachmentTargetId: state.nextAttachmentTargetId,
      addWorkingStitchAt: state.addWorkingStitchAt,
      canAddSingleCrochet: state.canAddStitch,
    })),
  );

  if (!canAddSingleCrochet || !nextAttachmentTargetId) {
    return null;
  }

  const attachmentPoint = getNextAttachmentPoint(
    stitches,
    nextAttachmentTargetId,
  );

  if (!attachmentPoint) {
    return null;
  }

  const { x, y, z } = attachmentPoint.position;

  return (
    <Html position={[x, y, z]} center style={{ pointerEvents: 'auto' }}>
      <button
        type="button"
        className="attachment-point"
        data-testid="attachment-point"
        aria-label="Place next single crochet stitch"
        onClick={() => addWorkingStitchAt(attachmentPoint.attachToId)}
      />
    </Html>
  );
}
