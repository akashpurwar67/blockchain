import axios from 'axios';

// Clear cookies to avoid "Request Header Fields Too Large" error
const clearCookies = () => {
  document.cookie.split(';').forEach((c) => {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
  });
};

// Configure Axios globally
const configureAxios = () => {
  // Clear cookies on app startup
  clearCookies();

  // Set default config for all requests
  axios.defaults.withCredentials = false;
  axios.defaults.headers.common['Content-Type'] = 'application/json';

  // Add request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Ensure withCredentials is false for all requests
      config.withCredentials = false;
      // Ensure Content-Type is set
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle specific errors
      if (error.response?.status === 431) {
        console.error('Request Header Fields Too Large - clearing cookies');
        clearCookies();
      }
      return Promise.reject(error);
    }
  );
};

export default configureAxios;
