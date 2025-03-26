import { Button } from '@mui/material'
import axiosInstance from '../axiosInstance'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const navigate = useNavigate()
  const handleLogout = async () => {
    try {
      await axiosInstance.delete('/api/v1/logout')
      navigate('/login')
    } catch (error) {
      console.log(error)
    }
  }
  return (
    <div>
      Dashboard
      <Button onClick={handleLogout}>Logout</Button>
      </div>
  )
}

export default Dashboard