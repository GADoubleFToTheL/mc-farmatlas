import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { initStore, useStoreReady } from '../db/store';
import { BuildPage } from '../features/build/BuildPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { FarmPage } from '../features/farm/FarmPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

/**
 * Hash-Routing (…/mc-farmatlas/#/farm/xyz): GitHub Pages kennt keine
 * Server-Weiterleitungen, mit Hash gibt es beim Neuladen kein 404.
 */
export function App() {
  const ready = useStoreReady();
  useEffect(() => {
    void initStore();
  }, []);

  // Kurz warten, bis Favoriten und Einstellungen geladen sind – sonst flackert die Übersicht.
  if (!ready) return null;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CatalogPage />} />
          <Route path="farm/:id/bauen" element={<BuildPage />} />
          <Route path="farm/:id/:tab?" element={<FarmPage />} />
          <Route path="einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
