import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom'
import { CssBaseline, Container, CircularProgress, Grid, Button, TextField, Typography } from '@mui/material'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import type { UI } from './data/uiConfigTypes'
import './App.css'
import UIpage from './pages/UIpage'
import { getUINames } from './data/getUI'

// Firebase config (replace with your own config for production)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()
const db = getFirestore(app, 'promptor-db')

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(auth.currentUser)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Check Firestore for user email
        const q = query(collection(db, 'users'), where('email', '==', user.email))
        const querySnapshot = await getDocs(q)
        setAllowed(!querySnapshot.empty)
      } else {
        setAllowed(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading || (user && allowed === null)) return <Container sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Container>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user && allowed === false) return <Container sx={{ textAlign: 'center', mt: 8 }}><h2>Access Denied</h2><p>Your account is not authorized to use this app.</p></Container>
  return <>{children}</>
}

function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (auth.currentUser) return <Navigate to={from} replace />

  return (
    <Container sx={{ textAlign: 'center', mt: 8, maxWidth: 400 }}>
      <h2>Login</h2>
      <form onSubmit={handleEmailLogin} style={{ marginBottom: 24 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? 'Signing in...' : 'Sign in with Email'}
        </Button>
      </form>
      <Button
        onClick={handleLogin}
        variant="outlined"
        color="primary"
        fullWidth
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Container>
  )
}

function Home() {
  const navigate = useNavigate()
  // Get all available UI names from getUI (assuming getUI.keys() or similar)
  const uiNames = getUINames();
  
  return (
    <>
      <h2>Select a UI</h2>
      <Grid container spacing={4} justifyContent="center">
        {uiNames.map((uiName) => (
          <Grid key={uiName} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button
              variant="contained"
              sx={{ width: 180, height: 180, fontSize: 24, borderRadius: 4, textTransform: 'none' }}
              onClick={() => navigate(`/ui/${uiName}`)}
            >
              {uiName}
            </Button>
          </Grid>
        ))}
      </Grid>
    </>
  )
}

function About() {
  return <h2>About Page (Protected)</h2>
}

function Navbar() {
  const [user, setUser] = useState(auth.currentUser)
  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])
  return (
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <a href="/">Home</a>
      <a href="/about">About</a>
      {user && <button onClick={() => signOut(auth)}>Sign Out</button>}
    </nav>
  )
}

function UIpageRouteWrapper() {
  const { uiName } = useParams<{ uiName: string }>()
  if (!uiName) return <div>Missing UI name</div>
  return <UIpage selectedUI={uiName} />
}

function App() {
  return (
    <>
      <CssBaseline />
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
        <Route path="/ui/:uiName" element={<RequireAuth><UIpageRouteWrapper /></RequireAuth>} />
      </Routes>
    </>
  )
}

export default App
