import React from 'react';
import Sidebar from '../Navigation/Sidebar';
import Box from '@mui/material/Box';

const Authenticated: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Box sx={{ display: 'flex', width: '100vw' }}>
      <Sidebar />
      <Box>{children}</Box>
    </Box>
  );
};

export default Authenticated;
