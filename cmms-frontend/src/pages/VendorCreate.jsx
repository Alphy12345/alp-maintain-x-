import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paperclip, Plus } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const VendorCreate = () => {
  const navigate = useNavigate();
  const params = useParams();
  const vendorId = params?.id;
  const isEdit = Boolean(vendorId);
  const { locations, assets, inventory } = useStore();

  const filesInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [assetOptionsApi, setAssetOptionsApi] = useState([]);
  const [partOptionsApi, setPartOptionsApi] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locations: '',
    assets: '',
    parts: '',
  });

  const [contacts, setContacts] = useState([]);

  const locationOptions = useMemo(() => locations || [], [locations]);
  const assetOptions = useMemo(() => {
    if ((assetOptionsApi || []).length > 0) return assetOptionsApi;
    return assets || [];
  }, [assetOptionsApi, assets]);
  const partOptions = useMemo(() => {
    if ((partOptionsApi || []).length > 0) return partOptionsApi;
    return inventory || [];
  }, [partOptionsApi, inventory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const updateContact = (id, patch) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { id: `c${Date.now()}`, name: '', email: '', phone: '' },
    ]);
  };

  useEffect(() => {
    if (!isEdit) return;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_BASE_URL}/vendors/${vendorId}`, {
          headers: { accept: 'application/json' },
        });
        const v = res?.data || {};
        setFormData((p) => ({
          ...p,
          name: v?.name ?? '',
          description: v?.description ?? '',
          locations: v?.locations ?? v?.location_id ?? '',
          assets: v?.assets ?? v?.asset_id ?? '',
          parts: v?.parts ?? v?.part_id ?? '',
        }));

        const apiContacts = v?.contacts;
        if (Array.isArray(apiContacts)) {
          setContacts(apiContacts.map((c) => ({
            id: c?.id ? String(c.id) : `c${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: c?.name ?? '',
            email: c?.email ?? '',
            phone: c?.phone ?? '',
          })));
        }
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load vendor');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isEdit, vendorId]);

  useEffect(() => {
    const run = async () => {
      setLoadingOptions(true);
      try {
        const [assetsRes, partsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } }),
          axios.get(`${API_BASE_URL}/parts`, { headers: { accept: 'application/json' } }),
        ]);

        if (assetsRes.status === 'fulfilled') {
          setAssetOptionsApi(Array.isArray(assetsRes.value?.data) ? assetsRes.value.data : []);
        } else {
          setAssetOptionsApi([]);
        }

        if (partsRes.status === 'fulfilled') {
          setPartOptionsApi(Array.isArray(partsRes.value?.data) ? partsRes.value.data : []);
        } else {
          setPartOptionsApi([]);
        }
      } catch {
        setAssetOptionsApi([]);
        setPartOptionsApi([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    run();
  }, []);

  const openFilesPicker = () => {
    try {
      filesInputRef.current?.click();
    } catch {
      // noop
    }
  };

  const onFilesSelected = (e) => {
    const list = Array.from(e?.target?.files || []);
    if (list.length === 0) return;
    setAttachedFiles((prev) => {
      const next = [...(prev || [])];
      list.forEach((f) => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (next.some((x) => x.key === key)) return;
        next.push({ key, file: f });
      });
      return next;
    });
    try {
      e.target.value = '';
    } catch {
      // noop
    }
  };

  const removeAttachedFile = (key) => {
    setAttachedFiles((prev) => (prev || []).filter((x) => x.key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = String(formData.name || '').trim();
    if (!name) return;

    setSaving(true);
    setError('');
    try {
      const payload = isEdit
        ? {
          name,
          description: formData.description,
          locations: formData.locations,
          location_id: formData.locations || null,
          assets: formData.assets,
          asset_id: formData.assets || null,
          parts: formData.parts,
          part_id: formData.parts || null,
          contacts,
        }
        : {
          name,
        };

      if (isEdit) {
        try {
          await axios.patch(
            `${API_BASE_URL}/vendors/${vendorId}`,
            payload,
            {
              headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          );
        } catch (ePatch) {
          const status = ePatch?.response?.status;
          if (status === 422 || status === 400) {
            await axios.patch(
              `${API_BASE_URL}/vendors/${vendorId}`,
              { name },
              {
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              },
            );
          } else {
            throw ePatch;
          }
        }
      } else {
        await axios.post(
          `${API_BASE_URL}/vendors`,
          payload,
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      }
      navigate('/vendors');
    } catch (e2) {
      setError(e2?.response?.data?.detail || e2?.message || (isEdit ? 'Failed to update vendor' : 'Failed to create vendor'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            {isEdit ? 'Edit Vendor' : 'New Vendor'}
          </Typography>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Vendor Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                fullWidth
              />

              {isEdit ? (
                <>
                  <TextField
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    minRows={4}
                    fullWidth
                  />

                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Contact List
                      </Typography>
                      <Button type="button" variant="outlined" onClick={addContact} startIcon={<Plus size={18} />}>
                        New Contact
                      </Button>
                    </Stack>

                    {contacts.length > 0 ? (
                      <Stack spacing={1.5}>
                        {contacts.map((c) => (
                          <Paper key={c.id} variant="outlined" sx={{ p: 2 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  label="Name"
                                  value={c.name}
                                  onChange={(e) => updateContact(c.id, { name: e.target.value })}
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  label="Email"
                                  type="email"
                                  value={c.email}
                                  onChange={(e) => updateContact(c.id, { email: e.target.value })}
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  label="Phone"
                                  value={c.phone}
                                  onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Stack direction="row" justifyContent="flex-end">
                                  <Button type="button" color="error" variant="text" onClick={() => removeContact(c.id)}>
                                    Remove contact
                                  </Button>
                                </Stack>
                              </Grid>
                            </Grid>
                          </Paper>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Files
                    </Typography>
                    <input
                      ref={filesInputRef}
                      type="file"
                      multiple
                      onChange={onFilesSelected}
                      style={{ display: 'none' }}
                    />
                    <Button type="button" variant="outlined" onClick={openFilesPicker} startIcon={<Paperclip size={18} />}>
                      Attach files
                    </Button>

                    {attachedFiles.length > 0 ? (
                      <Stack spacing={1}>
                        {attachedFiles.map((x) => (
                          <Paper key={x.key} variant="outlined" sx={{ p: 1.5 }}>
                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  {x.file?.name || 'File'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {x.file?.type || 'file'} • {Math.round((x.file?.size || 0) / 1024)} KB
                                </Typography>
                              </Box>
                              <Button type="button" color="error" variant="text" onClick={() => removeAttachedFile(x.key)}>
                                Remove
                              </Button>
                            </Stack>
                          </Paper>
                        ))}
                        <Typography variant="caption" color="text.secondary">
                          Files are selected in the UI.
                        </Typography>
                      </Stack>
                    ) : null}
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel id="vendor-locations-label">Locations</InputLabel>
                        <Select
                          labelId="vendor-locations-label"
                          label="Locations"
                          name="locations"
                          value={formData.locations}
                          onChange={handleChange}
                        >
                          <MenuItem value="">None</MenuItem>
                          {locationOptions.map((l) => (
                            <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel id="vendor-assets-label">Assets</InputLabel>
                        <Select
                          labelId="vendor-assets-label"
                          label="Assets"
                          name="assets"
                          value={formData.assets}
                          onChange={handleChange}
                        >
                          <MenuItem value="">{loadingOptions ? 'Loading…' : 'None'}</MenuItem>
                          {assetOptions.map((a) => (
                            <MenuItem key={a.id} value={a.id}>{a.asset_name || a.name || String(a.id)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel id="vendor-parts-label">Parts</InputLabel>
                        <Select
                          labelId="vendor-parts-label"
                          label="Parts"
                          name="parts"
                          value={formData.parts}
                          onChange={handleChange}
                        >
                          <MenuItem value="">{loadingOptions ? 'Loading…' : 'None'}</MenuItem>
                          {partOptions.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.name || p.part_name || String(p.id)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </>
              ) : null}

              <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
                <Button type="button" variant="text" onClick={() => navigate('/vendors')}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving || loading}>
                  {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create')}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Box>
  );
};

export default VendorCreate;
