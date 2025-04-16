import { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setUser, logout } from '../redux/features/user/userSlice';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);

  const checkAuth = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/auth/check');
      dispatch(setUser(response.data.user));
    } catch (error) {
      dispatch(logout());
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return { user, loading };
};
