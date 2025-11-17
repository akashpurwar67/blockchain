import React from 'react';
import ReactDOM from 'react-dom/client';
import configureAxios from './config/axiosConfig';
import App from './App';
import './index.css';

// Configure Axios globally
configureAxios();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
