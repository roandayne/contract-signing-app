import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { Box } from '@mui/material';
import Guest from './components/Template/Guest';
import Authenticated from './components/Template/Authenticated';
import Contracts from './pages/Contracts';
import Submissions from './pages/Submissions';

function App() {
  return (
    <Box>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route
          path="/login"
          element={
            <Guest>
              <Login />
            </Guest>
          }
        />
        <Route
          path="/register"
          element={
            <Guest>
              <Register />
            </Guest>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Authenticated>
              <Dashboard />
            </Authenticated>
          }
        />
        <Route
          path="/contracts"
          element={
            <Authenticated>
              <Contracts />
            </Authenticated>
          }
        />
        <Route
          path="/submissions"
          element={
            <Authenticated>
              <Submissions />
            </Authenticated>
          }
        />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Box>
  );
}

export default App;
