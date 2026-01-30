import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Grid,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = 'http://172.18.100.31:8000';

const Locations = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/locations`, {
        headers: { accept: 'application/json' },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setLocations(rows);
      if (!selectedLocationId && rows[0]?.id) setSelectedLocationId(rows[0].id);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return locations;
    return (locations || []).filter((l) => {
      const name = (l.name || '').toLowerCase();
      const address = (l.address || '').toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  }, [locations, searchTerm]);

  const selectedLocation = useMemo(() => {
    const found = (locations || []).find((l) => l.id === selectedLocationId);
    return found || (locations || [])[0] || null;
  }, [locations, selectedLocationId]);

  const assetsAtLocation = useMemo(() => {
    if (!selectedLocation) return [];
    return Array.isArray(selectedLocation.assets) ? selectedLocation.assets : [];
  }, [selectedLocation]);

  const handleDelete = async (locationId) => {
    const ok = window.confirm('Delete this location?');
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/locations/${locationId}`, {
        headers: { accept: '*/*' },
      });
      if (selectedLocationId === locationId) setSelectedLocationId('');
      await fetchLocations();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete location');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Locations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage locations, teams in charge, and assigned assets.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            placeholder="Search Locations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={() => navigate('/locations/create')} startIcon={<Plus size={18} />}>
            New Location
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" action={(
          <Button color="inherit" size="small" onClick={() => fetchLocations()}>
            Retry
          </Button>
        )}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ minHeight: 640 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Locations
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {loading ? 'Loading…' : `${filteredLocations.length} location(s)`}
              </Typography>
            </Box>

            <List disablePadding>
              {(filteredLocations || []).map((l) => {
                const active = l.id === (selectedLocation?.id || selectedLocationId);
                return (
                  <ListItemButton
                    key={l.id}
                    selected={active}
                    onClick={() => setSelectedLocationId(l.id)}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemText
                      primary={l.name}
                      secondary={l.address || ''}
                      primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                );
              })}

              {(!loading && (filteredLocations || []).length === 0) ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No locations found</Typography>
                </Box>
              ) : null}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ minHeight: 640, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
                  {selectedLocation?.name || 'Location'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {selectedLocation?.address || ''}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Pencil size={18} />}
                  onClick={() => selectedLocation?.id && navigate(`/locations/${selectedLocation.id}/edit`)}
                  disabled={!selectedLocation?.id}
                >
                  Edit
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => selectedLocation?.id && handleDelete(selectedLocation.id)}
                  disabled={!selectedLocation?.id}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ p: 2, flex: 1 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{selectedLocation?.description || '-'}</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="overline" color="text.secondary">Team in Charge</Typography>
                    <Typography variant="body2">{selectedLocation?.team?.team_name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="overline" color="text.secondary">Vendor</Typography>
                    <Typography variant="body2">
                      {(selectedLocation?.vendors || []).length
                        ? (selectedLocation.vendors || []).map((v) => v.name).join(', ')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="overline" color="text.secondary">Assets ({assetsAtLocation.length})</Typography>
                  {assetsAtLocation.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No assets assigned to this location</Typography>
                  ) : (
                    <Paper variant="outlined" sx={{ mt: 1 }}>
                      <List disablePadding>
                        {assetsAtLocation.slice(0, 10).map((a) => (
                          <ListItemButton
                            key={a.id}
                            disabled
                            sx={{ '&.Mui-disabled': { opacity: 1 }, py: 1.25 }}
                          >
                            <ListItemText
                              primary={a.asset_name}
                              secondary={[a.asset_type || '', a.status || ''].filter(Boolean).join(' • ')}
                              primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                              secondaryTypographyProps={{ noWrap: true }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Locations;
