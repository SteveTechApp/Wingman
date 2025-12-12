import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProjectProvider } from './context/ProjectContext';
import { UserProvider } from './context/UserContext';
import { GenerationProvider } from './context/GenerationContext';
import { Toaster } from 'react-hot-toast';

const container = document.getElementById('root');
if (!container) throw new Error("Root element not found");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <ProjectProvider>
          <GenerationProvider>
            <App />
            <Toaster position="bottom-right" />
          </GenerationProvider>
        </ProjectProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);