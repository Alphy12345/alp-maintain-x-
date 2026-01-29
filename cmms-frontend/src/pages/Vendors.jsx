import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookUser } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Paper,
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

const API_BASE_URL = 'http://172.18.100.31:8000';

const Vendors = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`, {
        headers: { accept: 'application/json' },
      });
      setVendors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = vendors || [];
    if (!q) return rows;
    return rows.filter((v) => String(v?.name || '').toLowerCase().includes(q));
  }, [query, vendors]);

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this vendor?');
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/vendors/${id}`, {
        headers: { accept: '*/*' },
      });
      await fetchVendors();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete vendor');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          Vendors
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            placeholder="Search Vendors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={() => navigate('/vendors/create')}
            startIcon={<Plus size={18} />}
          >
            New Vendor
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={() => fetchVendors()}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ minHeight: 640 }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">Loading vendors…</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ minHeight: 640, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center', maxWidth: 520 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookUser size={40} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>
                Start adding Vendors to your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click the "New Vendor" button to get started
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {filtered.length} vendor(s)
              </Typography>
              <Button size="small" variant="text" onClick={() => fetchVendors()}>
                Refresh
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>{v.name}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="text" onClick={() => navigate(`/vendors/${v.id}/edit`)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" variant="text" onClick={() => handleDelete(v.id)}>
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Stack>
  );
};

export default Vendors;
