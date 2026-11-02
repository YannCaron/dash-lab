import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Workbench } from 'dash-lab';
import 'dash-lab/style.css';
import { HelloWorld } from './plugins/hello-world';
import './demo.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Workbench title="dash-lab">
              <HelloWorld />
            </Workbench>
          }
        />
        <Route
          path="*"
          element={
            <main>
              <h1>Page not found</h1>
              <a href="/">Return to the demo</a>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
