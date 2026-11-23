import './styles.css';
import { mountFeasibility } from './ui/feasibility';

const dispose = mountFeasibility();
if (import.meta.hot) import.meta.hot.dispose(dispose);
