import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
        clinten.dev
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        A personal URL shortener.
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" size="large" component={Link} to="/create">
          Create a Link
        </Button>
        <Button variant="outlined" size="large" component={Link} to="/list">
          Manage Links
        </Button>
      </Box>
    </Box>
  );
}
