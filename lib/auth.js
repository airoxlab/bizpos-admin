import { supabase } from './supabase'

export const signIn = async (email, password) => {
  try {
    // Query your custom users table directly
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password) // Direct password comparison (no hashing)
      .single()

    if (error || !data) {
      return { data: null, error: { message: 'Invalid login credentials' } }
    }

    // Store user info in localStorage for session
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data))
    }

    return { data: { user: data }, error: null }
  } catch (err) {
    return { data: null, error: { message: 'Login failed' } }
  }
}

export const signOut = async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
  }
  return { error: null }
}

export const getUser = async () => {
  if (typeof window !== 'undefined') {
    const userString = localStorage.getItem('user')
    return userString ? JSON.parse(userString) : null
  }
  return null
}

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}