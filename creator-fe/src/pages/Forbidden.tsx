import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Forbidden() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h1" color="text.secondary" sx={{ fontWeight: 700 }}>
        403
      </Typography>
      <Typography variant="h5" gutterBottom>
        Access denied.
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Your account does not have permission to use this tool.
      </Typography>
    </Box>
  );
}
