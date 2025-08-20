import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

const SignOut = ({ setIsLoggedIn }) => {
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')

    setIsLoggedIn(false) // Set logged-out status
    navigate('/') // Redirect to home or login page
  }, [setIsLoggedIn, navigate])

  return null
}

SignOut.propTypes = {
  setIsLoggedIn: PropTypes.func.isRequired,
}

export default SignOut