import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'

const AuthContext = createContext(null)
function removeLegacyAuthentication() {
  ;[sessionStorage, localStorage].forEach((storage) => {
    storage.removeItem('financial-platform-token')
    storage.removeItem('financial-platform-user')
    storage.removeItem('financial-platform-token-expires-at')
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    removeLegacyAuthentication()
    apiRequest('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const expire = () => {
      setUser(null)
    }
    window.addEventListener('financial-platform-auth-expired', expire)
    return () => window.removeEventListener('financial-platform-auth-expired', expire)
  }, [])

  function storeAuthentication(response) {
    setUser(response.user)
    return response.user
  }

  async function login(email, password, rememberMe = false) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    })
    return storeAuthentication(response)
  }

  async function register(businessName, fullName, email, password) {
    return storeAuthentication(
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ businessName, fullName, email, password }),
      }),
    )
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  function updateBusinessName(businessName) {
    setUser((currentUser) => {
      const updated = { ...currentUser, businessName }
      return updated
    })
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateBusinessName }),
    [user, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
