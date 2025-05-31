import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom'
import { CssBaseline, Container, CircularProgress, Grid, Paper, Button, TextField, Typography, Box } from '@mui/material'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
// import type { UI } from './data/uiConfigTypes'
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
  if (user && allowed === false) {
    signOut(auth)
    return <Navigate to="/login" state={{ from: location }} replace />
  }
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
      <Paper sx={{ backgroundColor: "#0c637f", padding: 4, borderRadius: 2 }}>
      <h2>Login</h2>
      <form onSubmit={handleEmailLogin} style={{ marginBottom: 24 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          variant="filled"
          slotProps={{
            input: { style: { background: "#efefcf", color: "#000000" } },
            inputLabel: { style: { color: "#000000" } }
          }}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          variant="filled"
          slotProps={{
            input: { style: { background: "#efefcf", color: "#000000" } },
            inputLabel: { style: { color: "#000000" } }
          }}
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
          {loading ? 'Signing in...' : 'Login'}
        </Button>
      </form>
      <Button
        onClick={handleLogin}
        variant="contained"
        
        fullWidth
        disabled={loading}
        sx={{ mb: 2, color:"#000000", backgroundColor:"#ffce54", '&:hover':{backgroundColor:"#ffdf78"}}}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  )
}

const uiButtonColors: string[] = [
  "#5d9cec","#ed5565","#48cfad",
  "#ffce54","#ac92ec","#fc6e51",
  "#4fc1e9","#ec87c0","#a0d468"
];
// "#0cb0a9", "#f78c6b", "#118ab2", 
//   "#ffd166", "#0c637f", "#83d483", 
//   "#073b4c", "#06d6a0", "#ef476f"

function Home() {
  const navigate = useNavigate()
  const uiNames = getUINames();
  const [user, setUser] = useState(auth.currentUser)
  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])
  return (
    <Box sx={{ position: 'relative', overflowY: 'auto' }}>
      {user && (
        <Button
          onClick={() => signOut(auth)}
          variant="contained"
          color="primary"
          sx={{ position: 'fixed', top: 24, right: 24, zIndex: 1300, textTransform: 'none' }}
        >
          Log Out
        </Button>
      )}
      <Typography variant="h4" sx={{ textAlign: 'center', mb: 4, color: "#ffffff" }}>Select a UI</Typography>
      <Grid container spacing={4} justifyContent="center">
        {uiNames.map((uiName, idx) => (
          <Grid key={uiName} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button
              variant="contained"
              sx={{
                width: 180,
                height: 180,
                fontSize: 24,
                borderRadius: 4,
                textTransform: 'none',
                backgroundColor: uiButtonColors[idx % uiButtonColors.length],
                color: '#000000',
                '&:hover': {
                  backgroundColor: uiButtonColors[idx % uiButtonColors.length],
                  opacity: 0.9,
                }
              }}
              onClick={() => navigate(`/ui/${uiName}`)}
            >
              {uiName}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

function Navbar() {
  const [user, setUser] = useState(auth.currentUser)
  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])
  const location = useLocation();
  // Hide Navbar on UI page
  if (location.pathname.startsWith('/ui/')) return null;
  return (
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <Button variant="contained" color="primary" href="/" sx={{ textTransform: 'none' }}>Home</Button>
      {user && <button onClick={() => signOut(auth)}>Sign Out</button>}
    </nav>
  )
}

function UIpageRouteWrapper() {
  const { uiName } = useParams<{ uiName: string }>()
  const navigate = useNavigate();
  if (!uiName) return <div>Missing UI name</div>
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <Button
        variant="contained"
        color="primary"
        sx={{ position: 'fixed', top: 24, right: 24, zIndex: 1300, textTransform: 'none' }}
        onClick={() => navigate('/')}
      >
        Home
      </Button>
      <UIpage selectedUI={uiName} />
    </Box>
  )
}

function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isHome = location.pathname === '/';
  return (
    <>
      <CssBaseline />
      {!isLogin && !isHome && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/ui/:uiName" element={<RequireAuth><UIpageRouteWrapper /></RequireAuth>} />
      </Routes>
    </>
  )
}

export default App
