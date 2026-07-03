import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth, ForbiddenError } from '../api/links';
import { AuthContext } from '../hooks/useAuth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth()
      .catch((e) => { if (e instanceof ForbiddenError) navigate('/403'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleError = useCallback((e: unknown) => {
    if (e instanceof ForbiddenError) navigate('/403');
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ handleError }}>
      {children}
    </AuthContext.Provider>
  );
}
