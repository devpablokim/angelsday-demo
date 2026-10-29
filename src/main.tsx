import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/patterns.css';
import './styles/customer.css';
import './styles/landing.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createDemoStore } from './data/demoStore';
import { ENV, type DataStore } from './data/store';

async function boot() {
  let store: DataStore;
  if (ENV.mode === 'firebase') {
    const { createFirebaseStore } = await import('./data/firebaseStore');
    store = createFirebaseStore();
  } else {
    store = createDemoStore();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  );
}

void boot();
