import { Html } from '@react-three/drei';
import { getWorkingStitchLabel } from '@engine/index';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import { getNextAttachmentPoint } from './attachmentPoints';

export function AttachmentPointPicker() {
  const {
    stitches,
    nextAttachmentTargetId,
    addWorkingStitchAt,
    canAddStitch,
    selectedStitchType,
    foundationType,
  } = usePatternStore(
    useShallow((state) => ({
      stitches: state.stitches,
      nextAttachmentTargetId: state.nextAttachmentTargetId,
      addWorkingStitchAt: state.addWorkingStitchAt,
      canAddStitch: state.canAddStitch,
      selectedStitchType: state.selectedStitchType,
      foundationType: state.foundationType,
    })),
  );

  if (!canAddStitch || !nextAttachmentTargetId) {
    return null;
  }

  const attachmentPoint = getNextAttachmentPoint(
    stitches,
    nextAttachmentTargetId,
    selectedStitchType,
    foundationType,
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
        aria-label={`Place next ${getWorkingStitchLabel(selectedStitchType)} stitch`}
        onClick={() => addWorkingStitchAt(attachmentPoint.attachToId)}
      />
    </Html>
  );
}
