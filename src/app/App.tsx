import { CrochetScene } from '@scene/CrochetScene';
import { InfoPanel } from './InfoPanel';
import { Toolbar } from './Toolbar';
import './styles.css';

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-canvas">
        Skip to 3D canvas
      </a>
      <Toolbar />
      <InfoPanel />
      <main className="canvas-shell">
        <CrochetScene />
      </main>
    </div>
  );
}
