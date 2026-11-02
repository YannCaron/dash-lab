import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'dash-lab/style.css';
import { DemoApplication } from './DemoApplication';
import './demo.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoApplication />} />
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
