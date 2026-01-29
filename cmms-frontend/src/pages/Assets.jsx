import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Filter, Search, Power, Wrench, CheckCircle, QrCode, ChevronDown } from 'lucide-react';
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
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const Assets = () => {
  const { locations } = useStore();
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetModalMode, setAssetModalMode] = useState('create');
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [barcodeManual, setBarcodeManual] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    locationId: '',
    criticality: '',
    status: 'running',
    description: '',
    year: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    teamsInCharge: '',
    barcode: '',
    assetType: '',
    vendorId: '',
    parts: '',
    parentAssetId: '',
  });
  const [filters, setFilters] = useState({
    criticality: '',
    status: '',
    assetId: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const criticalityOptions = useMemo(() => {
    const set = new Set();
    for (const a of (assets || [])) {
      if (a.criticality) set.add(a.criticality);
    }
    return [...set].sort();
  }, [assets]);

  const filteredAssets = (assets || []).filter((asset) => {
    const q = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !q
      || (asset.name || '').toLowerCase().includes(q)
      || (asset.description || '').toLowerCase().includes(q);

    const matchesCriticality = !filters.criticality || asset.criticality === filters.criticality;
    const matchesStatus = !filters.status || asset.status === filters.status;
    const matchesAsset = !filters.assetId || asset.id === filters.assetId;

    return (
      matchesSearch
      && matchesCriticality
      && matchesStatus
      && matchesAsset
    );
  });

  const getLocationName = (locationId) => {
    const list = Array.isArray(locations) ? locations : [];
    const location = list.find(l => l.id === locationId);
    if (location?.name) return location.name;
    if (typeof locationId === 'string' && locationId.trim()) return locationId;
    return 'Unknown Location';
  };

  const fetchAssets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/assets`, {
        headers: { accept: 'application/json' },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((a) => ({
        id: a.id,
        name: a.asset_name,
        locationId: a.location,
        criticality: a.criticality,
        description: a.description,
        manufacturer: a.manufacturer,
        model: a.model,
        serialNumber: a.model_serial_no,
        year: a.year,
        assetType: a.asset_type,
        vendorId: a.vendor_id,
        status: (a.status || a.asset_status || a.state || 'running'),
      }));
      setAssets(mapped);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchAssets();
    fetchVendors();
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      running: { color: 'success', label: 'Running', icon: CheckCircle },
      down: { color: 'error', label: 'Down', icon: Power },
      maintenance: { color: 'warning', label: 'Under Maintenance', icon: Wrench }
    };
    
    const config = variants[status] || { color: 'default', label: String(status || 'Unknown') };
    const Icon = config.icon;
    return (
      <Chip
        size="small"
        color={config.color}
        variant="outlined"
        label={config.label}
        icon={Icon ? <Icon size={16} /> : undefined}
      />
    );
  };

  const handleRowClick = (asset) => {
    setSelectedAsset(asset);
  };

  const handleStatusChange = async (assetId, newStatus) => {
    if (!assetId) return;
    setError('');
    setSaving(true);
    try {
      const payload = { status: newStatus, asset_status: newStatus, state: newStatus };
      await axios.patch(`${API_BASE_URL}/assets/${assetId}`, payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      await fetchAssets();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to update asset status');
    } finally {
      setSaving(false);
    }
  };

  const generateBarcode = () => `BC-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

  const resetCreateForm = () => {
    setBarcodeManual(false);
    setCreateForm({
      name: '',
      locationId: '',
      criticality: '',
      status: 'running',
      description: '',
      year: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      teamsInCharge: '',
      barcode: generateBarcode(),
      assetType: '',
      vendorId: '',
      parts: '',
      parentAssetId: '',
    });
  };

  const openCreateAssetModal = () => {
    setAssetModalMode('create');
    setEditingAssetId(null);
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openEditAssetModal = (asset) => {
    if (!asset) return;
    setAssetModalMode('edit');
    setEditingAssetId(asset.id);
    setBarcodeManual(false);
    setCreateForm({
      name: asset.name || '',
      locationId: asset.locationId ? String(asset.locationId) : '',
      criticality: asset.criticality ? String(asset.criticality) : '',
      status: asset.status ? String(asset.status) : 'running',
      description: asset.description ? String(asset.description) : '',
      year: asset.year ? String(asset.year) : '',
      manufacturer: asset.manufacturer ? String(asset.manufacturer) : '',
      model: asset.model ? String(asset.model) : '',
      serialNumber: asset.serialNumber ? String(asset.serialNumber) : '',
      teamsInCharge: asset.teamsInCharge ? String(asset.teamsInCharge) : '',
      barcode: asset.barcode ? String(asset.barcode) : generateBarcode(),
      assetType: asset.assetType ? String(asset.assetType) : '',
      vendorId: asset.vendorId ? String(asset.vendorId) : '',
      parts: asset.parts ? String(asset.parts) : '',
      parentAssetId: asset.parentAssetId ? String(asset.parentAssetId) : '',
    });
    setShowCreateModal(true);
  };

  const handleCreateAsset = async () => {
    const assetName = String(createForm.name || '').trim();
    if (!assetName) return;

    const location = getLocationName(createForm.locationId);
    const year = createForm.year ? parseInt(createForm.year, 10) : new Date().getFullYear();
    const vendorId = createForm.vendorId ? parseInt(createForm.vendorId, 10) : undefined;

    setSaving(true);
    setError('');
    try {
      const payload = {
        asset_name: assetName,
        location: location === 'Unknown Location' ? '' : location,
        criticality: String(createForm.criticality || ''),
        status: String(createForm.status || 'running'),
        description: String(createForm.description || ''),
        manufacturer: String(createForm.manufacturer || ''),
        model: String(createForm.model || ''),
        model_serial_no: String(createForm.serialNumber || ''),
        year,
        asset_type: String(createForm.assetType || ''),
        vendor_id: vendorId,
      };

      if (assetModalMode === 'edit' && editingAssetId) {
        await axios.patch(
          `${API_BASE_URL}/assets/${editingAssetId}`,
          payload,
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/assets`,
          payload,
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      }
      setShowCreateModal(false);
      resetCreateForm();
      await fetchAssets();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || (assetModalMode === 'edit' ? 'Failed to update asset' : 'Failed to create asset'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    const ok = window.confirm('Delete this asset?');
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/assets/${assetId}`, {
        headers: { accept: '*/*' },
      });
      if (selectedAsset?.id === assetId) setSelectedAsset(null);
      await fetchAssets();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete asset');
    }
  };

  const handleEditAsset = (asset) => {
    openEditAssetModal(asset);
  };

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Assets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and monitor all physical assets
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreateAssetModal} startIcon={<Plus size={18} />}>
          Add Asset
        </Button>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={() => fetchAssets()}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      {/* KPI Cards */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Total Assets</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{assets.length}</Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: '999px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} color="#fff" />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Running</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main' }}>
                  {assets.filter((a) => a.status === 'running').length}
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: '999px', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} color="#fff" />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Down</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'error.main' }}>
                  {assets.filter((a) => a.status === 'down').length}
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: '999px', bgcolor: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Power size={22} color="#fff" />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Maintenance</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'warning.main' }}>
                  {assets.filter((a) => a.status === 'maintenance').length}
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: '999px', bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wrench size={22} color="#fff" />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip icon={<Filter size={16} />} label="Filters" variant="outlined" />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                displayEmpty
                value={filters.criticality}
                onChange={(e) => setFilters((p) => ({ ...p, criticality: e.target.value }))}
              >
                <MenuItem value="">Criticality</MenuItem>
                {criticalityOptions.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                displayEmpty
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              >
                <MenuItem value="">Status</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="down">Down</MenuItem>
                <MenuItem value="maintenance">Under Maintenance</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                displayEmpty
                value={filters.assetId}
                onChange={(e) => setFilters((p) => ({ ...p, assetId: e.target.value }))}
              >
                <MenuItem value="">Asset</MenuItem>
                {(assets || []).map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              onClick={() => setFilters({ criticality: '', status: '', assetId: '' })}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Assets Table */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Assets ({filteredAssets.length})
          </Typography>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Asset Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Asset Type</TableCell>
                <TableCell>Criticality</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">Loading…</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">No assets found.</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && filteredAssets.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => handleRowClick(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{getLocationName(row.locationId)}</TableCell>
                  <TableCell>{row.assetType || '—'}</TableCell>
                  <TableCell>{row.criticality || '—'}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="text" onClick={() => handleEditAsset(row)}>
                        Edit
                      </Button>
                      <Button size="small" color="error" variant="text" onClick={() => handleDeleteAsset(row.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Asset Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
          setAssetModalMode('create');
          setEditingAssetId(null);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{assetModalMode === 'edit' ? 'Edit Asset' : 'New Asset'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Asset Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Location</Typography>
                  <Select
                    displayEmpty
                    value={createForm.locationId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, locationId: e.target.value }))}
                  >
                    <MenuItem value="">Select Location</MenuItem>
                    {(locations || []).map((location) => (
                      <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Criticality</Typography>
                  <Select
                    displayEmpty
                    value={createForm.criticality}
                    onChange={(e) => setCreateForm((p) => ({ ...p, criticality: e.target.value }))}
                  >
                    <MenuItem value="">Select criticality</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Status</Typography>
                  <Select
                    value={createForm.status}
                    onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <MenuItem value="running">Running</MenuItem>
                    <MenuItem value="down">Down</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Year"
                  type="number"
                  value={createForm.year}
                  onChange={(e) => setCreateForm((p) => ({ ...p, year: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Manufacturer"
                  value={createForm.manufacturer}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCreateForm((p) => ({ ...p, manufacturer: next, model: next.trim() ? p.model : '' }));
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Model"
                  value={createForm.model}
                  onChange={(e) => setCreateForm((p) => ({ ...p, model: e.target.value }))}
                  disabled={!createForm.manufacturer.trim()}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Serial Number"
                  value={createForm.serialNumber}
                  onChange={(e) => setCreateForm((p) => ({ ...p, serialNumber: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Teams in Charge"
                  value={createForm.teamsInCharge}
                  onChange={(e) => setCreateForm((p) => ({ ...p, teamsInCharge: e.target.value }))}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>QR Code/Barcode</Typography>
              <Grid container spacing={2} alignItems="stretch">
                <Grid item xs={12} md={7}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Button
                        size="small"
                        variant={barcodeManual ? 'contained' : 'outlined'}
                        onClick={() => {
                          setBarcodeManual(true);
                          setCreateForm((p) => ({ ...p, barcode: p.barcode || generateBarcode() }));
                        }}
                      >
                        Input Manually
                      </Button>
                      <Button
                        size="small"
                        variant={!barcodeManual ? 'contained' : 'outlined'}
                        onClick={() => {
                          setBarcodeManual(false);
                          setCreateForm((p) => ({ ...p, barcode: generateBarcode() }));
                        }}
                      >
                        Use Generated
                      </Button>
                    </Stack>
                    <TextField
                      label="Barcode"
                      value={createForm.barcode}
                      onChange={(e) => setCreateForm((p) => ({ ...p, barcode: e.target.value }))}
                      disabled={!barcodeManual}
                      fullWidth
                      helperText={!barcodeManual ? `Generated: ${createForm.barcode}` : ''}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                      <QrCode size={64} color="#9CA3AF" />
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', wordBreak: 'break-word' }}>
                        {createForm.barcode || '—'}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Asset Type"
                  value={createForm.assetType}
                  onChange={(e) => setCreateForm((p) => ({ ...p, assetType: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Vendor</Typography>
                  <Select
                    displayEmpty
                    value={createForm.vendorId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, vendorId: e.target.value }))}
                  >
                    <MenuItem value="">Select Vendor</MenuItem>
                    {(vendors || []).map((v) => (
                      <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Parts"
                  value={createForm.parts}
                  onChange={(e) => setCreateForm((p) => ({ ...p, parts: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Parent Asset</Typography>
                  <Select
                    displayEmpty
                    value={createForm.parentAssetId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, parentAssetId: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {(assets || []).map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setShowCreateModal(false);
              resetCreateForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAsset}
            disabled={!createForm.name.trim() || saving || (assetModalMode === 'edit' && !editingAssetId)}
          >
            {saving ? (assetModalMode === 'edit' ? 'Saving…' : 'Creating…') : (assetModalMode === 'edit' ? 'Save' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Asset Detail Modal */}
      <Dialog
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{`Asset: ${selectedAsset?.name || ''}`}</DialogTitle>
        <DialogContent dividers>
          {selectedAsset ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
                {getStatusBadge(selectedAsset.status)}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="outlined" onClick={() => { setSelectedAsset(null); openEditAssetModal(selectedAsset); }}>
                    Edit
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => handleDeleteAsset(selectedAsset.id)}>
                    Delete
                  </Button>
                  {selectedAsset.status === 'running' ? (
                    <Button color="warning" variant="contained" onClick={() => handleStatusChange(selectedAsset.id, 'maintenance')}>
                      Schedule Maintenance
                    </Button>
                  ) : null}
                  {selectedAsset.status === 'down' ? (
                    <Button variant="contained" onClick={() => handleStatusChange(selectedAsset.id, 'maintenance')}>
                      Start Repair
                    </Button>
                  ) : null}
                  {selectedAsset.status === 'maintenance' ? (
                    <Button variant="contained" onClick={() => handleStatusChange(selectedAsset.id, 'running')}>
                      Mark as Running
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography>{getLocationName(selectedAsset.locationId)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                  <Typography>{selectedAsset.serialNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Manufacturer</Typography>
                  <Typography>{selectedAsset.manufacturer || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Model</Typography>
                  <Typography>{selectedAsset.model || 'N/A'}</Typography>
                </Grid>
              </Grid>

              {selectedAsset.description ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Description</Typography>
                  <Typography color="text.secondary">{selectedAsset.description}</Typography>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAsset(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default Assets;
