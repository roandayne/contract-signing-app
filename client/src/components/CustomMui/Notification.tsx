import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface NotificationProps {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  open: boolean;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, severity, open, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity={severity}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Notification;
