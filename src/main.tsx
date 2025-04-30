import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import InitWasm from './components/InitWasm';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* BASE_URL は vite の base オプションがそのまま入る */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>   {/* ★ 変更 */}
      <InitWasm />
    </BrowserRouter>
  </React.StrictMode>
);
