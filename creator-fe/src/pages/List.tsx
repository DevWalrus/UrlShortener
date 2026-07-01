import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { deleteLink, listDeletedLinks, listLinks, type Link } from '../api/links'
import ConfirmDialog from '../components/ConfirmDialog'

export default function List() {
  const [tab, setTab] = useState(0)
  const [active, setActive] = useState<Link[]>([])
  const [deleted, setDeleted] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null)

  async function loadLinks() {
    setLoading(true)
    try {
      const [a, d] = await Promise.all([listLinks(), listDeletedLinks()])
      setActive(a)
      setDeleted(d)
    } catch {
      toast.error('Failed to load links')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, [])

  async function handleDelete() {
    if (!confirmSlug) return
    try {
      await deleteLink(confirmSlug)
      toast.success(`${confirmSlug} deleted`)
      await loadLinks()
    } catch {
      toast.error('Failed to delete link')
    } finally {
      setConfirmSlug(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700 }}
      >
        Manage Links
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Active (${active.length})`} />
        <Tab label={`Deleted (${deleted.length})`} />
      </Tabs>

      {tab === 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Slug</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell align="center">Hits</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {active.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                  No active links
                </TableCell>
              </TableRow>
            )}
            {active.map((link) => (
              <TableRow key={link.slug}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label={link.slug} size="small" />
                    <Tooltip title="Open short link">
                      <IconButton
                        size="small"
                        href={`https://clinten.dev/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={link.destination}>
                    <span>{link.destination}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">{link.hitCount}</TableCell>
                <TableCell>{formatDate(link.createdAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Delete">
                    <IconButton color="error" onClick={() => setConfirmSlug(link.slug)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === 1 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Slug</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell align="center">Hits</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Deleted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deleted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                  No deleted links
                </TableCell>
              </TableRow>
            )}
            {deleted.map((link) => (
              <TableRow key={link.slug} sx={{ opacity: 0.6 }}>
                <TableCell>
                  <Chip label={link.slug} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={link.destination}>
                    <span>{link.destination}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">{link.hitCount}</TableCell>
                <TableCell>{formatDate(link.createdAt)}</TableCell>
                <TableCell>{link.deletedAt ? formatDate(link.deletedAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!confirmSlug}
        title="Delete link?"
        message={`Are you sure you want to delete ${confirmSlug}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmSlug(null)}
      />
    </Box>
  )
}