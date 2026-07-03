import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth, ForbiddenError } from '../api/links';
import { AuthContext } from '../hooks/useAuth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden'>('loading');

  useEffect(() => {
    checkAuth()
      .then(() => setStatus('ok'))
      .catch((e) => {
        if (e instanceof ForbiddenError) {
          setStatus('forbidden');
          navigate('/403');
        } else {
          setStatus('ok');
        }
      });
  }, [navigate]);

  const handleError = useCallback((e: unknown) => {
    if (e instanceof ForbiddenError) {
      setStatus('forbidden');
      navigate('/403');
    }
  }, [navigate]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'forbidden') return null;

  return (
    <AuthContext.Provider value={{ handleError }}>
      {children}
    </AuthContext.Provider>
  );
}
