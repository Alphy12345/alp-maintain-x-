import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = 'http://172.18.100.31:8000';

const LocationCreate = () => {
  const navigate = useNavigate();
  const params = useParams();
  const locationId = params?.id ? parseInt(params.id, 10) : null;
  const mode = locationId ? 'edit' : 'create';

  const [teams, setTeams] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    teamId: '',
    vendorId: '',
    assetIds: [],
  });

  const teamOptions = useMemo(() => (Array.isArray(teams) ? teams : []), [teams]);
  const vendorOptions = useMemo(() => (Array.isArray(vendors) ? vendors : []), [vendors]);
  const assetOptions = useMemo(() => (Array.isArray(assets) ? assets : []), [assets]);

  React.useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [teamsRes, vendorsRes, assetsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/teams`, { headers: { accept: 'application/json' } }),
          axios.get(`${API_BASE_URL}/vendors`, { headers: { accept: 'application/json' } }),
          axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } }),
        ]);
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);
        setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
      } catch {
        setTeams([]);
        setVendors([]);
        setAssets([]);
      }
    };

    fetchOptions();
  }, []);

  React.useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) return;
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_BASE_URL}/locations/${locationId}`, {
          headers: { accept: 'application/json' },
        });
        const l = res?.data;
        setFormData({
          name: l?.name || '',
          address: l?.address || '',
          description: l?.description || '',
          teamId: l?.team_id ? String(l.team_id) : '',
          vendorId: Array.isArray(l?.vendors) && l.vendors[0]?.id ? String(l.vendors[0].id) : '',
          assetIds: Array.isArray(l?.assets) ? l.assets.map((a) => String(a.id)) : [],
        });
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load location');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [locationId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'assetIds') {
      const next = Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean);
      setFormData((p) => ({ ...p, assetIds: next }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const save = async () => {
      const name = String(formData.name || '').trim();
      if (!name) return;
      setSaving(true);
      setError('');
      try {
        const payload = {
          name,
          address: String(formData.address || '').trim() || null,
          description: String(formData.description || '').trim() || null,
          team_id: formData.teamId ? parseInt(formData.teamId, 10) : null,
          vendor_ids: formData.vendorId ? [parseInt(formData.vendorId, 10)] : [],
          asset_ids: Array.isArray(formData.assetIds)
            ? formData.assetIds.filter(Boolean).map((id) => parseInt(id, 10))
            : [],
        };

        if (mode === 'edit' && locationId) {
          await axios.patch(`${API_BASE_URL}/locations/${locationId}`, payload, {
            headers: { accept: 'application/json', 'Content-Type': 'application/json' },
          });
        } else {
          await axios.post(`${API_BASE_URL}/locations`, payload, {
            headers: { accept: 'application/json', 'Content-Type': 'application/json' },
          });
        }
        navigate('/locations');
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to save location');
      } finally {
        setSaving(false);
      }
    };

    save();
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 920, mx: 'auto' }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          {mode === 'edit' ? 'Edit Location' : 'New Location'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage location details and assign a team/vendor.
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
          <TextField
            label="Location Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={loading || saving}
            required
            fullWidth
          />

          <TextField
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={loading || saving}
            fullWidth
          />

          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={loading || saving}
            fullWidth
            multiline
            minRows={3}
          />

          <FormControl fullWidth disabled={loading || saving}>
            <InputLabel id="location-team-label">Team in Charge</InputLabel>
            <Select
              labelId="location-team-label"
              label="Team in Charge"
              name="teamId"
              value={formData.teamId}
              onChange={handleChange}
            >
              <MenuItem value="">None</MenuItem>
              {teamOptions.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.team_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={loading || saving}>
            <InputLabel id="location-vendor-label">Vendor</InputLabel>
            <Select
              labelId="location-vendor-label"
              label="Vendor"
              name="vendorId"
              value={formData.vendorId}
              onChange={handleChange}
            >
              <MenuItem value="">None</MenuItem>
              {vendorOptions.map((v) => (
                <MenuItem key={v.id} value={String(v.id)}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={loading || saving}>
            <InputLabel id="location-asset-label">Assets</InputLabel>
            <Select
              labelId="location-asset-label"
              label="Assets"
              multiple
              name="assetIds"
              value={formData.assetIds}
              onChange={handleChange}
              renderValue={(selected) => {
                const ids = Array.isArray(selected) ? selected : [];
                const byId = new Map(assetOptions.map((a) => [String(a.id), a]));
                const names = ids
                  .map((id) => byId.get(String(id))?.asset_name)
                  .filter(Boolean);
                return names.join(', ');
              }}
            >
              {assetOptions.map((a) => (
                <MenuItem key={a.id} value={String(a.id)}>
                  {a.asset_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="text" onClick={() => navigate('/locations')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading || saving}>
              {mode === 'edit' ? 'Save' : 'Create'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default LocationCreate;
