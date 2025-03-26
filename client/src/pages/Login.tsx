  import { Box, Button, Container, TextField, Typography, Divider } from '@mui/material'
  import { useState } from 'react'
  import axiosInstance from '../axiosInstance'
  import { Link, useNavigate } from 'react-router-dom'
  import Image from '../assets/images/login.jpg'
  import { GoogleLogin } from '@react-oauth/google'

  const Login = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')

    const handleLogin = async () => {
      try {
          await axiosInstance.post('/api/v1/login', {
              email,
              password
          })
          navigate('/dashboard')
      } catch (error) {
          console.log(error)
      }
    }

    const handleGoogleSuccess = async (credentialResponse: any) => {
      try {
        await axiosInstance.post('/api/v1/google-login', {
          credential: credentialResponse.credential
        });
        navigate('/dashboard');
      } catch (error) {
        console.log(error);
      }
    };

    return (
      <Box sx={{paddingTop: "64px", display: "flex", justifyContent: "center", alignItems: "center", width: "100vw", height: "100vh"}}>
        <Box sx={{backgroundImage: `url(${Image})`, backgroundSize: "cover", backgroundPosition: "center", width: "50%", height: "100%", borderRadius: "0 24px 24px 0", display: "flex",
            justifyContent: "center",
            alignItems: "center"}}>
          <Box sx={{
            background: 'rgba(255, 255, 255, 0.27)',
            borderRadius: '24px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '20px',
            margin: 'auto',
            width: "50%",
            height: "30%",
            display: "flex",
            gap: "20px",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <Typography variant="h6">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</Typography>
          </Box>
        </Box>
        <Box sx={{width: "50%", height: "100%", borderRadius: "24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
          <Container sx={{display: "flex", flexDirection: "column", gap: "20px", width: "70%", margin: "auto"}}>
            <Typography variant="h4" sx={{textAlign: "center"}}>Welcome Back</Typography>
            <TextField 
              label="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px'
                }
              }} 
            />
            <TextField 
              label="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px'
                }
              }} 
            />
            <Button onClick={handleLogin} variant="contained" sx={{borderRadius: "24px"}}>Login</Button>
            <Container sx={{display: "flex", justifyContent: "center"}}>
              <Typography variant="body2">Don't have an account? <Link to="/register">Register</Link></Typography>
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
    )
  }

  export default Login