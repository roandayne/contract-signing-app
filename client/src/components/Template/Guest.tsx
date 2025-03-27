import React from 'react';
import Box from '@mui/material/Box';
import Navbar from '../Navigation/Navbar';

const Guest: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100vw',
      }}
    >
      <Navbar />
      <Box>{children}</Box>
    </Box>
  );
};

export default Guest;
