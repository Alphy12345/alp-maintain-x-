import React, { useMemo, useState } from 'react';
import { Edit2, MoreVertical, Plus, Search, Tag, Trash2 } from 'lucide-react';
import axios from 'axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const iconColors = [
  { bg: 'warning.light', fg: 'warning.dark', border: 'warning.light' },
  { bg: 'warning.light', fg: 'warning.dark', border: 'warning.light' },
  { bg: 'primary.light', fg: 'primary.dark', border: 'primary.light' },
  { bg: 'secondary.light', fg: 'secondary.dark', border: 'secondary.light' },
  { bg: 'success.light', fg: 'success.dark', border: 'success.light' },
  { bg: 'error.light', fg: 'error.dark', border: 'error.light' },
  { bg: 'info.light', fg: 'info.dark', border: 'info.light' },
  { bg: 'success.light', fg: 'success.dark', border: 'success.light' },
];

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
};

const Categories = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(categories?.[0]?.id || '');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = categories || [];
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const selected = useMemo(() => {
    const list = categories || [];
    return list.find((c) => c.id === selectedId) || list[0] || null;
  }, [categories, selectedId]);

  const openCreate = () => {
    setNewName('');
    setShowCreate(true);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const created = addCategory({ name, createdBy: 'System' });
    setSelectedId(created.id);
    setShowCreate(false);
  };

  const openEdit = () => {
    setEditName(selected?.name || '');
    setShowEdit(true);
  };

  const handleEdit = () => {
    const name = editName.trim();
    if (!selected?.id || !name) return;
    updateCategory(selected.id, { name });
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    const ok = window.confirm('Delete this category?');
    if (!ok) return;
    setError('');
    setDeleting(true);
    try {
      const idStr = String(selected.id);
      const isNumericId = /^\d+$/.test(idStr);
      if (isNumericId) {
        await axios.delete(`${API_BASE_URL}/categories/${idStr}`, {
          headers: { accept: '*/*' },
        });
      }
      deleteCategory(selected.id);

      const remaining = (categories || []).filter((c) => c.id !== selected.id);
      setSelectedId(remaining?.[0]?.id || '');
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          Categories
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Categories"
            size="small"
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

          <Button variant="contained" onClick={openCreate} startIcon={<Plus size={18} />}>
            New Category
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="error.main">{error}</Typography>
            <Button color="error" onClick={() => setError('')} size="small">Dismiss</Button>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <List disablePadding>
              {filtered.map((c, idx) => {
                const active = c.id === (selected?.id || '');
                const clr = iconColors[idx % iconColors.length];

                return (
                  <React.Fragment key={c.id}>
                    <ListItemButton selected={active} onClick={() => setSelectedId(c.id)}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '999px',
                            width: 36,
                            height: 36,
                            bgcolor: clr.bg,
                            color: clr.fg,
                            border: '1px solid',
                            borderColor: clr.border,
                          }}
                        >
                          <Tag size={16} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText primary={c.name} primaryTypographyProps={{ fontWeight: 700 }} />
                    </ListItemButton>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No categories found
                  </Typography>
                </Box>
              ) : null}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ minHeight: 220 }}>
            {selected ? (
              <>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {selected.name}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button variant="outlined" onClick={openEdit} startIcon={<Edit2 size={16} />}>
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDelete}
                        disabled={deleting}
                        startIcon={<Trash2 size={16} />}
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </Button>
                      <IconButton aria-label="more" size="small">
                        <MoreVertical size={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
                <Divider />

                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created by{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {selected.createdBy || 'System'}
                    </Box>{' '}
                    on{' '}
                    <Box component="span" sx={{ color: 'text.primary' }}>
                      {formatDateTime(selected.createdAt)}
                    </Box>
                  </Typography>
                </Box>

                <Box sx={{ px: 2, pb: 3 }}>
                  <Button variant="outlined">Use in New Work Order</Button>
                </Box>
              </>
            ) : (
              <Box sx={{ p: 4 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Select a category
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showEdit} onClose={() => setShowEdit(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={!editName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default Categories;
