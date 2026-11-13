import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';

/**
 * Hash-Routing (…/mc-farmatlas/#/farm/xyz): GitHub Pages kennt keine
 * Server-Weiterleitungen, mit Hash gibt es beim Neuladen kein 404.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
