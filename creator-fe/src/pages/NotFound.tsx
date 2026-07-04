import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link, useSearchParams } from 'react-router-dom';

export default function NotFound() {
  const [params] = useSearchParams();
  const slug = params.get('slug');

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h1" color="text.secondary" sx={{ fontWeight: 700 }}>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        {slug
          ? `The link "${slug}" doesn't exist or has been deleted.`
          : 'Page not found.'}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        It may have expired, been removed, or never existed.
      </Typography>
      <Button variant="contained" component={Link} to="/create" sx={{ mt: 3 }}>
        Create a New Link
      </Button>
    </Box>
  );
}
