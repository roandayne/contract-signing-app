import React from 'react';
import Sidebar from '../Navigation/Sidebar';
import Box from '@mui/material/Box';
import { useAuth } from '../../hooks/useAuth';
import { CircularProgress } from '@mui/material';

const Authenticated: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loading } = useAuth();

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

  return (
    <Box sx={{ display: 'flex', width: '100vw' }}>
      <Sidebar />
      <Box>{children}</Box>
    </Box>
  );
};

export default Authenticated;
