import axios from 'axios';
import { Navigate } from 'react-router-dom';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    Accept: '*/*',
  },
});

// List of public endpoints that don't require authentication
const publicEndpoints = [
  /^\/api\/v1\/forms\/[^/]+$/,  // GET form by ID
  /^\/api\/v1\/forms\/[^/]+\/submit$/,  // POST form submission
];

axiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    // Check if the request URL matches any public endpoint
    const isPublicEndpoint = publicEndpoints.some(pattern => 
      pattern.test(error.config.url)
    );

    // Only redirect to login for non-public endpoints
    if (error.status === 401 && !isPublicEndpoint) {
      Navigate({ to: '/login' });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
