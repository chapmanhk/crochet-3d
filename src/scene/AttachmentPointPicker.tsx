import { Html } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import { getNextAttachmentPoint } from './attachmentPoints';

export function AttachmentPointPicker() {
  const {
    stitches,
    nextAttachmentTargetId,
    addSingleCrochetAt,
    canAddSingleCrochet,
  } = usePatternStore(
    useShallow((state) => ({
      stitches: state.stitches,
      nextAttachmentTargetId: state.nextAttachmentTargetId,
      addSingleCrochetAt: state.addSingleCrochetAt,
      canAddSingleCrochet: state.canAddSingleCrochet,
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
        onClick={() => addSingleCrochetAt(attachmentPoint.attachToId)}
      />
    </Html>
  );
}
