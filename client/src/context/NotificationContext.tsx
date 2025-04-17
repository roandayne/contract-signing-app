import React, { createContext, useContext, useState } from 'react';
import Notification from '../components/CustomMui/Notification';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface NotificationContextType {
  showNotification: (message: string, severity: Severity) => void;
  hasError: boolean;
  setHasError: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [hasError, setHasError] = useState(false);

  const showNotification = (message: string, severity: Severity) => {
    setMessage(message);
    setSeverity(severity);
    setOpen(true);
    if (severity === 'error') {
      setHasError(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (severity !== 'error') {
      setHasError(false);
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hasError, setHasError }}>
      {children}
      <Notification
        open={open}
        message={message}
        severity={severity}
        onClose={handleClose}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 