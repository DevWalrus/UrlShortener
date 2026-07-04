import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MuiLink from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { forbidden } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            clinten.dev
          </Typography>
          {!forbidden && (
            <>
              <Button color="inherit" component={Link} to="/">Home</Button>
              <Button color="inherit" component={Link} to="/create">Create</Button>
              <Button color="inherit" component={Link} to="/list">Links</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          Clinten Hopkins ·
          {' '}
          <MuiLink
            href="https://github.com/DevWalrus/UrlShortener/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            GPL-3.0
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}
