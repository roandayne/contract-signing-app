import axios from 'axios';
import { Navigate } from 'react-router-dom';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.response.use(function (response) {
  return response;
}, function (error) {
  console.log("THIS",error)
  if (error.status === 401) {
    Navigate({to: '/login'})
  }
  return Promise.reject(error);
});

export default axiosInstance;
