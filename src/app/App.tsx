import { CrochetScene, SCENE_BACKGROUND } from '@scene/CrochetScene';
import { InfoPanel } from './InfoPanel';
import { Toolbar } from './Toolbar';
import './styles.css';

export function App() {
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
      <main className="canvas-shell">
        <div
          id="main-canvas"
          className="canvas-focus-target"
          tabIndex={-1}
          aria-label="3D pattern preview. Stitch status and instructions are in the pattern information panel."
        >
          <CrochetScene />
        </div>
      </main>
    </div>
  );
}
