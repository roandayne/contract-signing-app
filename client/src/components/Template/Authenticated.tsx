import React from 'react';
import Box from '@mui/material/Box';
import { useAuth } from '../../hooks/useAuth';
import { CircularProgress } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '../Navigation/Sidebar';

const Authenticated: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <Box sx={{ display: 'flex', width: '100vw' }}>
      <Sidebar />
      <Box>{children}</Box>
    </Box>
  );
};

export default Authenticated;
