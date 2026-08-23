import {
  StitchDefinitions,
  WORKING_STITCH_TYPES,
  getWorkingStitchLabel,
} from '@engine/index';
import type { WorkingStitchType } from '@engine/index';

interface StitchTypeSelectorProps {
  value: WorkingStitchType;
  onChange: (type: WorkingStitchType) => void;
}

export function StitchTypeSelector({ value, onChange }: StitchTypeSelectorProps) {
  return (
    <div className="stitch-type-selector" role="group" aria-label="Stitch type">
      {WORKING_STITCH_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`btn${value === type ? ' primary' : ''}`}
          aria-pressed={value === type}
          aria-label={StitchDefinitions[type].name}
          title={StitchDefinitions[type].name}
          onClick={() => onChange(type)}
        >
          {getWorkingStitchLabel(type).toUpperCase()}
        </button>
      ))}
    </div>
  );
}
