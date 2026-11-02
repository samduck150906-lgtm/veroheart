// Test-only entry, never imported by the production build. No real account/session.
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import Comparison from '../../src/pages/Comparison';
import { useStore } from '../../src/store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../../src/types';
import '../../src/index.css';
import '../../src/styles/veroro-design.css';
import { searchProductsPage } from '../../src/lib/supabase';

localStorage.setItem('vero_entry_gate_done', '1');
const profile = { ...DEFAULT_USER_PET_PROFILE, id: 'fixture-pet', name: '합성 반려동물',
  allergies: new URLSearchParams(location.search).has('fixtureAllergy') ? ['닭'] : [] };
useStore.setState({ profile, pets: [profile], isLoggedIn: true, userId: null, isInitializing: false,
  comparisonList: ['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003'],
  // Synthetic profile injection replaces hosted Auth bootstrap only. Product
  // SDK requests, store loaders, router and rendered application remain real.
  initApp: async () => { await useStore.getState().fetchProducts(); },
});
const comparison = location.pathname === '/__fixture/comparison';
if (comparison) useStore.setState({ products: (await searchProductsPage('')).products });
createRoot(document.getElementById('root')!).render(<HelmetProvider>
  {comparison ? <MemoryRouter><Comparison /></MemoryRouter> : <App />}
</HelmetProvider>);
