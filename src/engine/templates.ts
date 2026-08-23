import { Pattern } from './Pattern';
import {
  StitchType,
  type PatternSnapshot,
} from './types';

export type TemplateId = 'coaster' | 'swatch';

export interface PatternTemplate {
  id: TemplateId;
  name: string;
  description: string;
}

export const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    id: 'coaster',
    name: 'Coaster',
    description: 'Chain 12, then 4 rows of single crochet.',
  },
  {
    id: 'swatch',
    name: 'Swatch',
    description: 'Chain 8 with sc, hdc, and dc rows for practice.',
  },
];

function buildSnapshot(setup: (pattern: Pattern) => void): PatternSnapshot {
  const pattern = new Pattern();
  setup(pattern);
  return pattern.getSnapshot();
}

export function createTemplateSnapshot(templateId: TemplateId): PatternSnapshot {
  switch (templateId) {
    case 'coaster':
      return buildSnapshot((pattern) => {
        pattern.addFoundationChain(12);
        pattern.startNewRow();
        for (let row = 0; row < 4; row += 1) {
          for (let stitch = 0; stitch < 12; stitch += 1) {
            pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
          }
          if (row < 3) {
            pattern.startNewRow();
          }
        }
      });
    case 'swatch':
      return buildSnapshot((pattern) => {
        pattern.addFoundationChain(8);
        pattern.startNewRow();
        for (let stitch = 0; stitch < 8; stitch += 1) {
          pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
        }
        pattern.startNewRow();
        for (let stitch = 0; stitch < 8; stitch += 1) {
          pattern.addWorkingStitch(StitchType.HALF_DOUBLE_CROCHET);
        }
        pattern.startNewRow();
        for (let stitch = 0; stitch < 8; stitch += 1) {
          pattern.addWorkingStitch(StitchType.DOUBLE_CROCHET);
        }
      });
    default:
      throw new Error(`Unknown template: ${templateId satisfies never}`);
  }
}

export function getTemplateById(templateId: TemplateId): PatternTemplate {
  const template = PATTERN_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }
  return template;
}
