import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Filter,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = 'http://172.18.100.31:8000';

const PartsInventory = () => {
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openFilter, setOpenFilter] = useState('');
  const [filters, setFilters] = useState({ needsRestock: false, assetId: '', vendorId: '' });
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({
    name: '',
    units_in_stock: '',
    minimum_in_stock: '',
    unit_cost: '',
    description: '',
    part_type: '',
    location: '',
    vendor_id: '',
  });

  const vendorById = useMemo(() => {
    const map = new Map();
    for (const v of vendors) map.set(v.id, v);
    return map;
  }, [vendors]);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`, {
        headers: { accept: 'application/json' },
      });
      setVendors(Array.isArray(res.data) ? res.data : []);
    } catch {
      setVendors([]);
    }
  };

  const fetchFilterOptions = async () => {
    setLoadingFilterOptions(true);
    try {
      const [assetsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } }),
      ]);

      if (assetsRes.status === 'fulfilled') setAssets(Array.isArray(assetsRes.value?.data) ? assetsRes.value.data : []);
      else setAssets([]);
    } catch {
      setAssets([]);
    } finally {
      setLoadingFilterOptions(false);
    }
  };

  const fetchParts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/parts`, {
        headers: { accept: 'application/json' },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setParts(rows);
      setSelectedPart((prev) => {
        if (!prev) return null;
        return rows.find((p) => p.id === prev.id) || null;
      });
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchFilterOptions();
    fetchParts();
  }, []);

  const openCreate = () => {
    setMode('create');
    setForm({
      name: '',
      units_in_stock: '',
      minimum_in_stock: '',
      unit_cost: '',
      description: '',
      part_type: '',
      location: '',
      vendor_id: '',
    });
    setShowModal(true);
  };

  const openEdit = (part) => {
    setMode('edit');
    setSelectedPart(part);
    setForm({
      name: part?.name ?? '',
      units_in_stock: String(part?.units_in_stock ?? ''),
      minimum_in_stock: String(part?.minimum_in_stock ?? ''),
      unit_cost: String(part?.unit_cost ?? ''),
      description: part?.description ?? '',
      part_type: part?.part_type ?? '',
      location: part?.location ?? '',
      vendor_id: part?.vendor_id ? String(part.vendor_id) : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (partId) => {
    const ok = window.confirm('Delete this part?');
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/parts/${partId}`, {
        headers: { accept: '*/*' },
      });
      if (selectedPart?.id === partId) setSelectedPart(null);
      await fetchParts();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete part');
    }
  };

  const handleSubmit = async () => {
    const name = String(form.name || '').trim();
    if (!name) return;

    const payload = {
      name,
      units_in_stock: Number(form.units_in_stock || 0),
      minimum_in_stock: Number(form.minimum_in_stock || 0),
      unit_cost: Number(form.unit_cost || 0),
      description: String(form.description || ''),
      part_type: String(form.part_type || ''),
      location: String(form.location || ''),
      vendor_id: form.vendor_id ? Number(form.vendor_id) : undefined,
    };

    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        const created = await axios.post(`${API_BASE_URL}/parts`, payload, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        setShowModal(false);
        await fetchParts();
        const next = created?.data;
        if (next?.id) setSelectedPart(next);
      } else {
        await axios.patch(`${API_BASE_URL}/parts/${selectedPart.id}`, payload, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        setShowModal(false);
        await fetchParts();
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to save part');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = parts || [];

    if (filters.needsRestock) {
      list = list.filter((p) => Number(p?.units_in_stock) <= Number(p?.minimum_in_stock));
    }
    if (filters.vendorId) {
      const id = String(filters.vendorId);
      list = list.filter((p) => String(p?.vendor_id || '') === id);
    }
    if (filters.assetId) {
      const id = String(filters.assetId);
      list = list.filter((p) => String(p?.asset_id || p?.assetId || '') === id);
    }

    if (!q) return list;
    return list.filter((p) => {
      const vendorName = vendorById.get(p.vendor_id)?.name || '';
      const hay = `${p.name || ''} ${p.part_type || ''} ${p.location || ''} ${vendorName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [parts, search, vendorById, filters]);

  const anyFilterActive = Boolean(filters.needsRestock || filters.assetId || filters.vendorId);

  const isEmpty = filtered.length === 0;

  const assetMenuAnchorRef = useRef(null);
  const vendorMenuAnchorRef = useRef(null);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Parts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {String(filtered.length)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Parts"
            size="small"
            sx={{ width: { xs: '100%', sm: 280 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={openCreate} startIcon={<Plus size={18} />}>
            New Part
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={() => fetchParts()}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<Filter size={16} />}
              label="Needs Restock"
              variant={filters.needsRestock ? 'filled' : 'outlined'}
              color={filters.needsRestock ? 'primary' : 'default'}
              onClick={() => setFilters((p) => ({ ...p, needsRestock: !p.needsRestock }))}
            />

            <Box>
              <Chip
                ref={assetMenuAnchorRef}
                clickable
                label={filters.assetId ? 'Asset: Filtered' : 'Asset'}
                variant={filters.assetId ? 'filled' : 'outlined'}
                color={filters.assetId ? 'primary' : 'default'}
                onClick={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
                onDelete={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
                deleteIcon={<ChevronDown size={16} />}
              />
              <Menu
                anchorEl={assetMenuAnchorRef.current}
                open={openFilter === 'asset'}
                onClose={() => setOpenFilter('')}
                PaperProps={{ sx: { maxHeight: 320, width: 320 } }}
              >
                <MenuItem
                  onClick={() => {
                    setFilters((p) => ({ ...p, assetId: '' }));
                    setOpenFilter('');
                  }}
                >
                  Any
                </MenuItem>
                {loadingFilterOptions && assets.length === 0 ? (
                  <MenuItem disabled>Loading…</MenuItem>
                ) : null}
                {!loadingFilterOptions && assets.length === 0 ? (
                  <MenuItem disabled>No assets</MenuItem>
                ) : null}
                {assets.map((a) => (
                  <MenuItem
                    key={a.id}
                    onClick={() => {
                      setFilters((p) => ({ ...p, assetId: String(a.id) }));
                      setOpenFilter('');
                    }}
                  >
                    {a.asset_name || a.name || String(a.id)}
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            <Box>
              <Chip
                ref={vendorMenuAnchorRef}
                clickable
                label={filters.vendorId ? 'Vendor: Filtered' : 'Vendor'}
                variant={filters.vendorId ? 'filled' : 'outlined'}
                color={filters.vendorId ? 'primary' : 'default'}
                onClick={() => setOpenFilter(openFilter === 'vendor' ? '' : 'vendor')}
                onDelete={() => setOpenFilter(openFilter === 'vendor' ? '' : 'vendor')}
                deleteIcon={<ChevronDown size={16} />}
              />
              <Menu
                anchorEl={vendorMenuAnchorRef.current}
                open={openFilter === 'vendor'}
                onClose={() => setOpenFilter('')}
                PaperProps={{ sx: { maxHeight: 320, width: 320 } }}
              >
                <MenuItem
                  onClick={() => {
                    setFilters((p) => ({ ...p, vendorId: '' }));
                    setOpenFilter('');
                  }}
                >
                  Any
                </MenuItem>
                {vendors.map((v) => (
                  <MenuItem
                    key={v.id}
                    onClick={() => {
                      setFilters((p) => ({ ...p, vendorId: String(v.id) }));
                      setOpenFilter('');
                    }}
                  >
                    {v.name || String(v.id)}
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {anyFilterActive ? (
              <Button
                size="small"
                onClick={() => {
                  setFilters({ needsRestock: false, assetId: '', vendorId: '' });
                  setOpenFilter('');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </Stack>

          <Button size="small" startIcon={<Settings2 size={16} />} disabled>
            My Filters
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Sort by: <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Name</Box> ·{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Ascending</Box>
              </Typography>
              <IconButton size="small" aria-label="sort">
                <SlidersHorizontal size={18} />
              </IconButton>
            </Box>
            <Divider />

            <Box sx={{ p: 2 }}>
              {isEmpty ? (
                <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '999px', bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" align="center" sx={{ fontWeight: 800 }}>
                      Start adding Parts
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary">
                      Click the New Part button to get started
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {loading ? (
                    <Typography variant="body2" color="text.secondary">Loading parts…</Typography>
                  ) : (
                    filtered.map((p) => {
                      const active = selectedPart?.id === p.id;
                      const vendorName = vendorById.get(p.vendor_id)?.name || '—';
                      const needsRestock = Number(p.units_in_stock) <= Number(p.minimum_in_stock);

                      return (
                        <ListItemButton
                          key={p.id}
                          selected={active}
                          onClick={() => setSelectedPart(p)}
                          sx={{
                            borderRadius: 2,
                            border: 1,
                            borderColor: active ? 'primary.main' : 'divider',
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                                  {p.name}
                                </Typography>
                                {needsRestock ? (
                                  <Chip size="small" color="error" label="Restock" />
                                ) : null}
                              </Stack>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {vendorName} · {p.part_type || '—'}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      );
                    })
                  )}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ minHeight: 260 }}>
            <Box sx={{ p: 2 }}>
              {!selectedPart ? (
                <Typography variant="body2" color="text.secondary">
                  Select a part to view details
                </Typography>
              ) : (
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap">
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {selectedPart.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vendor: {vendorById.get(selectedPart.vendor_id)?.name || '—'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => openEdit(selectedPart)}>
                        Edit
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleDelete(selectedPart.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Units in stock</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.units_in_stock}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Minimum in stock</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.minimum_in_stock}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Unit cost</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.unit_cost}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Part type</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.part_type || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Location</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.location || '—'}</Typography>
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedPart.description || '—'}</Typography>
                  </Box>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{mode === 'create' ? 'New Part' : 'Edit Part'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              autoFocus
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Units in stock"
                  type="number"
                  value={form.units_in_stock}
                  onChange={(e) => setForm((p) => ({ ...p, units_in_stock: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Minimum in stock"
                  type="number"
                  value={form.minimum_in_stock}
                  onChange={(e) => setForm((p) => ({ ...p, minimum_in_stock: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Unit cost"
                  type="number"
                  value={form.unit_cost}
                  onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <Select
                    displayEmpty
                    value={form.vendor_id}
                    onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))}
                    renderValue={(val) => {
                      if (!val) return 'Select Vendor';
                      const found = vendors.find((v) => String(v.id) === String(val));
                      return found?.name || String(val);
                    }}
                  >
                    <MenuItem value="">Select Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v.id} value={String(v.id)}>{v.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Part type"
                  value={form.part_type}
                  onChange={(e) => setForm((p) => ({ ...p, part_type: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Location"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  fullWidth
                />
              </Grid>
            </Grid>

            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !String(form.name || '').trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PartsInventory;
