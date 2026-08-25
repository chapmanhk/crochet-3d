import { LazyCrochetScene, SCENE_BACKGROUND } from './LazyCrochetScene';
import { InfoPanel } from './InfoPanel';
import { OnboardingDialog } from './OnboardingDialog';
import { Toolbar } from './Toolbar';
import { usePatternAutosave } from './usePatternAutosave';
import './styles.css';

export function App() {
  usePatternAutosave();

  return (
    <div
      className="app-shell"
      style={{ ['--scene-background' as string]: SCENE_BACKGROUND }}
    >
      <a className="skip-link" href="#main-canvas">
        Skip to 3D canvas
      </a>
      <Toolbar />
      <InfoPanel />
      <OnboardingDialog />
      <main className="canvas-shell">
        <div
          id="main-canvas"
          className="canvas-focus-target"
          tabIndex={-1}
          aria-label="3D pattern preview. Stitch status and instructions are in the pattern information panel."
        >
          <LazyCrochetScene />
        </div>
      </main>
    </div>
  );
}
