import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useState } from 'react'
import { toast } from 'sonner'
import { createLink, type Link } from '../api/links'

export default function Create() {
  const [destination, setDestination] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Link | null>(null)

  const shortUrl = result ? `https://clinten.dev/${result.slug}` : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const link = await createLink({
        destination,
        customSlug: customSlug || undefined,
      })
      setResult(link)
      toast.success('Short link created!')
      setDestination('')
      setCustomSlug('')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shortUrl)
    toast.success('Copied to clipboard!')
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Create a Short Link
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }} component="form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Destination URL"
            placeholder="https://example.com/very/long/url"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            fullWidth
            type="url"
          />
          <TextField
            label="Custom Slug (optional)"
            placeholder="MY7SLUG"
            value={customSlug}
            onChange={(e) => {
              const clean = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 7)
              setCustomSlug(clean)
            }}
            fullWidth
            helperText="Up to 7 characters, letters and numbers only. Leave blank to auto-generate."
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? 'Creating...' : 'Create Link'}
          </Button>
        </Box>
      </Paper>

      {result && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'success.light' }}>
          <Typography variant="subtitle2" color="success.contrastText" gutterBottom>
            Your short link is ready!
          </Typography>
          <FormControl sx={{ m: 1, width: '50ch' }} variant="outlined">
            <OutlinedInput
              id={'short-link'}
              type={'text'}
              value={shortUrl}
              readOnly
              fullWidth
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Copy short link to clipboard"
                    onClick={handleCopy}
                    edge="end"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
        </Paper>
      )}
    </Box>
  )
}