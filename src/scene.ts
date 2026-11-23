import './styles.css';
import { createApplication } from './app/createApplication';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas #game introuvable.');

const application = createApplication(canvas);
if (import.meta.hot) import.meta.hot.dispose(() => application.dispose());
