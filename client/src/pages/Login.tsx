import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import Image from '../assets/images/login.jpg';
import { GoogleLogin } from '@react-oauth/google';

const validationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password should be at least 6 characters'),
});

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await axiosInstance.post('/api/v1/login', data);
      navigate('/dashboard');
    } catch (error) {
      alert(error);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await axiosInstance.post('/api/v1/google-login', {
        credential: credentialResponse.credential,
      });
      navigate('/dashboard');
    } catch (error) {
      alert(error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100vh',
        width: '100vw',
      }}
    >
      <Box
        sx={{
          backgroundImage: `url(${Image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: { xs: '100%', md: '50%' },
          height: { xs: '30vh', sm: 'inherit' },
          borderRadius: { xs: '0 0 24px 24px', md: '0 24px 24px 0' },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.27)',
            borderRadius: '24px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '20px',
            margin: 'auto',
            width: { xs: '80%', sm: '60%', md: '50%' },
            height: { xs: '60%', md: '30%' },
            display: 'flex',
            gap: '20px',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
              textAlign: 'center',
            }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam,
            quos.
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          minHeight: { xs: '70vh', md: '100%' },
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: { xs: 4, md: 0 },
        }}
      >
        <Container
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: { xs: '90%', sm: '70%', md: '70%' },
            margin: 'auto',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
            }}
          >
            Welcome Back
          </Typography>
          <TextField
            label="Email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ borderRadius: '24px' }}
          >
            Login
          </Button>
          <Container sx={{ display: 'flex', justifyContent: 'center' }}>
            <Typography variant="body2">
              Don't have an account? <Link to="/register">Register</Link>
            </Typography>
          </Container>
          <Divider>OR</Divider>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                console.log('Login Failed');
              }}
            />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Login;
