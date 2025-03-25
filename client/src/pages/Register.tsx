import { Box, Button, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import axiosInstance from '../axiosInstance'

const Register = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const handleRegister = async () => {
    try {
        const response = await axiosInstance.post('/api/v1/register', {
            email,
            password
        })
        alert(response.data.message)
    } catch (error) {
        console.log(error)
    }
  }

  return (
    <Box>
      <Typography variant="h1">Register</Typography>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button variant="contained" onClick={handleRegister}>Register</Button>
    </Box>
  )
}

export default Register