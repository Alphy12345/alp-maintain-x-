import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Filter, Plus, Search, Trash2, Type, Rows3, SquarePen, Hash, DollarSign, List, ListChecks, ScanSearch, CheckSquare, X } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List as MuiList,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Modal } from '../components';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const Procedures = () => {
  const { bumpProceduresVersion } = useStore();
  const [search, setSearch] = useState('');

  const parseConfigOptions = (cfg) => {
    if (!cfg) return [];
    if (typeof cfg === 'string') {
      try {
        const parsed = JSON.parse(cfg);
        const opts = Array.isArray(parsed?.options) ? parsed.options : [];
        return opts.map((x) => String(x ?? '')).filter(Boolean);
      } catch {
        return [];
      }
    }
    if (cfg && typeof cfg === 'object') {
      const opts = Array.isArray(cfg?.options) ? cfg.options : [];
      return opts.map((x) => String(x ?? '')).filter(Boolean);
    }
    return [];
  };

  const [procedures, setProcedures] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [inspectionValues, setInspectionValues] = useState({});
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openFilter, setOpenFilter] = useState('');
  const [filters, setFilters] = useState({ categoryId: '', assetId: '' });
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({ name: '', description: '', asset_id: '', sections: [] });

  const [typeMenuOpenForId, setTypeMenuOpenForId] = useState(null);
  const [typeSearch, setTypeSearch] = useState('');

  const newItemId = () => `it-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const fieldTypeOptions = [
    { key: 'checkbox', label: 'Checkbox', Icon: CheckSquare },
    { key: 'text', label: 'Text Field', Icon: Rows3 },
    { key: 'number', label: 'Number Field', Icon: Hash },
    { key: 'amount', label: 'Amount ($)', Icon: DollarSign },
    { key: 'multiple_choice', label: 'Multiple Choice', Icon: List },
    { key: 'checklist', label: 'Checklist', Icon: ListChecks },
    { key: 'inspection_check', label: 'Inspection Check', Icon: ScanSearch },
  ];

  const ensureOptionsIfNeeded = (it) => {
    const ft = String(it?.field_type || 'text');
    if (ft === 'multiple_choice' || ft === 'checklist') {
      const options = Array.isArray(it?.options) ? it.options : [];
      return { ...it, options: options.length ? options : ['Option 1'] };
    }
    if (ft === 'inspection_check') {
      return { ...it, options: [] };
    }
    return { ...it, options: Array.isArray(it?.options) ? it.options : [] };
  };

  const normalizeItems = (items) => {
    const list = Array.isArray(items) ? items : [];

    if (list.length > 0 && (list[0]?.fields !== undefined || list[0]?.title !== undefined)) {
      const normalized = [];
      list.forEach((sec, secIdx) => {
        const sectionId = sec?.id || newItemId();
        normalized.push({
          id: sectionId,
          type: 'section',
          title: sec?.title ?? '',
          description: sec?.description ?? '',
        });

        const fields = Array.isArray(sec?.fields) ? sec.fields : [];
        fields.forEach((f) => {
          const cfg = f?.config;
          const cfgOptions = parseConfigOptions(cfg);
          const legacyOptions = Array.isArray(f?.options) ? f.options : [];
          normalized.push({
            id: f?.id || newItemId(),
            type: 'field',
            label: f?.label ?? '',
            field_type: f?.field_type ?? 'text',
            required: Boolean(f?.required),
            value: f?.value ?? '',
            options: cfgOptions.length ? cfgOptions : legacyOptions,
          });
        });
      });

      return normalized;
    }

    return list.map((it) => {
      const type = String(it?.type || it?.kind || 'field');
      if (type === 'heading') {
        return {
          id: it?.id || newItemId(),
          type: 'heading',
          text: it?.text ?? it?.title ?? '',
        };
      }
      if (type === 'section') {
        return {
          id: it?.id || newItemId(),
          type: 'section',
          title: it?.title ?? it?.text ?? '',
          description: it?.description ?? '',
        };
      }
      return {
        id: it?.id || newItemId(),
        type: 'field',
        label: it?.label ?? it?.name ?? it?.field_name ?? '',
        field_type: it?.field_type ?? it?.input_type ?? 'text',
        required: Boolean(it?.required),
        value: it?.value ?? '',
        options: Array.isArray(it?.options)
          ? it.options
          : (Array.isArray(it?.choices) ? it.choices : (Array.isArray(it?.items) ? it.items : [])),
      };
    });
  };

  const builderItemsToApiSections = (items) => {
    const list = Array.isArray(items) ? items : [];
    const sections = [];

    let current = null;
    let sectionOrder = 0;
    const pushCurrent = () => {
      if (!current) return;
      sectionOrder += 1;
      sections.push({
        title: String(current.title || '').trim(),
        description: String(current.description || '').trim() || null,
        order: sectionOrder,
        fields: current.fields,
      });
      current = null;
    };

    const ensureDefaultSection = () => {
      if (current) return;
      current = { title: 'General', description: null, fields: [] };
    };

    list.forEach((it) => {
      if (it?.type === 'section') {
        pushCurrent();
        current = {
          title: it?.title ?? '',
          description: it?.description ?? null,
          fields: [],
        };
        return;
      }

      if (it?.type === 'heading') {
        pushCurrent();
        current = {
          title: it?.text ?? '',
          description: null,
          fields: [],
        };
        return;
      }

      if (it?.type === 'field') {
        ensureDefaultSection();
        const fields = current.fields;
        const order = fields.length + 1;
        const required = it?.required ? 1 : 0;
        const options = Array.isArray(it?.options) ? it.options : [];
        const fieldType = String(it?.field_type || 'text');
        const cleanOptions = (fieldType === 'multiple_choice' || fieldType === 'checklist')
          ? options
            .map((o) => {
              if (typeof o === 'string') return o;
              if (o && typeof o === 'object') return o.label ?? o.value ?? o.name ?? '';
              return '';
            })
            .map((s) => String(s ?? '').trim())
            .filter(Boolean)
          : [];
        const config = (fieldType === 'multiple_choice' || fieldType === 'checklist')
          ? JSON.stringify({ options: cleanOptions })
          : null;
        fields.push({
          label: it?.label ?? '',
          field_type: fieldType,
          order,
          required,
          help_text: null,
          config,
        });
      }
    });

    pushCurrent();
    return sections;
  };

  const assetsById = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.id, a);
    return map;
  }, [assets]);

  const fetchAssets = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/assets`, {
        headers: { accept: 'application/json' },
      });
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAssets([]);
    }
  };

  const fetchFilterOptions = async () => {
    setLoadingFilterOptions(true);
    try {
      const [catsRes, assetsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/categories`, { headers: { accept: 'application/json' } }),
        axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } }),
      ]);

      if (catsRes.status === 'fulfilled') setCategories(Array.isArray(catsRes.value?.data) ? catsRes.value.data : []);
      else setCategories([]);

      if (assetsRes.status === 'fulfilled') setAssets(Array.isArray(assetsRes.value?.data) ? assetsRes.value.data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoadingFilterOptions(false);
    }
  };

  const fetchProcedures = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/procedures`, {
        headers: { accept: 'application/json' },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setProcedures(rows);
      setSelectedProcedure((prev) => {
        if (!prev) return null;
        return rows.find((p) => p.id === prev.id) || null;
      });
      return rows;
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load procedures');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchProcedures();
  }, []);

  useEffect(() => {
    const proc = selectedProcedure;
    if (!proc) {
      setInspectionValues({});
      setFieldValues({});
      return;
    }

    const next = {};
    const nextValues = {};
    const secs = Array.isArray(proc?.sections) ? proc.sections : [];
    secs.forEach((sec) => {
      const fields = Array.isArray(sec?.fields) ? sec.fields : [];
      fields.forEach((f) => {
        const key = String(f?.id || `${f?.label}-${f?.order}`);
        const ft = String(f?.field_type || 'text');

        if (ft === 'inspection_check') {
          next[key] = String(f?.value || '');
          return;
        }

        if (ft === 'checkbox') {
          const v = String(f?.value ?? '').toLowerCase();
          nextValues[key] = Boolean(f?.value === true || f?.value === 1 || v === '1' || v === 'true' || v === 'yes' || v === 'on');
          return;
        }

        if (ft === 'checklist') {
          if (Array.isArray(f?.value)) {
            nextValues[key] = f.value;
            return;
          }
          if (typeof f?.value === 'string') {
            const s = f.value.trim();
            nextValues[key] = s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
            return;
          }
          nextValues[key] = [];
          return;
        }

        nextValues[key] = f?.value ?? '';
      });
    });

    setInspectionValues(next);
    setFieldValues(nextValues);
  }, [selectedProcedure]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = procedures || [];

    const hasValue = (p, value, keys) => {
      const val = String(value || '').trim();
      if (!val) return true;
      const lower = val.toLowerCase();
      return (keys || []).some((k) => {
        const raw = p?.[k];
        if (raw === undefined || raw === null) return false;
        if (Array.isArray(raw)) return raw.map((x) => String(x ?? '').toLowerCase()).includes(lower);
        return String(raw).toLowerCase().includes(lower);
      });
    };

    if (filters.categoryId) {
      list = list.filter((p) => hasValue(p, filters.categoryId, ['category_id', 'categoryId', 'category', 'category_ids', 'categories']));
    }
    if (filters.assetId) {
      list = list.filter((p) => hasValue(p, filters.assetId, ['asset_id', 'assetId', 'assets']));
    }

    if (!q) return list;
    return list.filter((p) => {
      const assetName = assetsById.get(p.asset_id)?.asset_name || '';
      const hay = `${p.name || ''} ${p.description || ''} ${assetName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [procedures, search, assetsById, filters]);

  const anyFilterActive = Boolean(filters.categoryId || filters.assetId);

  const openCreate = () => {
    setMode('create');
    setForm({ name: '', description: '', asset_id: '', sections: [] });
    setShowModal(true);
  };

  const openEdit = async (proc) => {
    setMode('edit');
    setSelectedProcedure(proc);
    setForm({
      name: proc?.name ?? '',
      description: proc?.description ?? '',
      asset_id: proc?.asset_id ? String(proc.asset_id) : '',
      sections: normalizeItems(proc?.sections),
    });
    setShowModal(true);

    try {
      const id = String(proc?.id || '').trim();
      if (!id) return;
      const res = await axios.get(`${API_BASE_URL}/procedures/${id}`, {
        headers: { accept: 'application/json' },
      });
      const latest = res?.data;
      if (!latest) return;
      setProcedures((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const found = list.some((p) => String(p?.id) === String(latest?.id));
        if (!found) return list;
        return list.map((p) => (String(p?.id) === String(latest?.id) ? latest : p));
      });
      setSelectedProcedure(latest);
      setForm({
        name: latest?.name ?? '',
        description: latest?.description ?? '',
        asset_id: latest?.asset_id ? String(latest.asset_id) : '',
        sections: normalizeItems(latest?.sections),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!showModal) return;
    if (mode !== 'create') return;
    if ((Array.isArray(form.sections) ? form.sections : []).length > 0) return;

    setForm((p) => {
      const current = Array.isArray(p.sections) ? p.sections : [];
      if (current.length > 0) return p;
      return {
        ...p,
        sections: [
          {
            id: newItemId(),
            type: 'field',
            label: '',
            field_type: 'text',
            required: false,
            options: [],
          },
        ],
      };
    });
  }, [showModal, mode]);

  const addBuilderItem = (type) => {
    setForm((p) => {
      const next = Array.isArray(p.sections) ? [...p.sections] : [];
      if (type === 'heading') {
        next.push({ id: newItemId(), type: 'heading', text: '' });
      } else if (type === 'section') {
        next.push({ id: newItemId(), type: 'section', title: '' });
      } else {
        next.push({ id: newItemId(), type: 'field', label: '', field_type: 'text', required: false, value: '', options: [] });
      }
      return { ...p, sections: next };
    });
  };

  const addCheckboxItem = () => {
    setForm((p) => {
      const next = Array.isArray(p.sections) ? [...p.sections] : [];
      next.push({ id: newItemId(), type: 'field', label: '', field_type: 'checkbox', required: false, value: '', options: [] });
      return { ...p, sections: next };
    });
  };

  const updateBuilderItem = (id, patch) => {
    setForm((p) => ({
      ...p,
      sections: (Array.isArray(p.sections) ? p.sections : []).map((it) => {
        if (it?.id !== id) return it;
        const next = { ...it, ...patch };
        return it?.type === 'field' ? ensureOptionsIfNeeded(next) : next;
      }),
    }));
  };

  const addOption = (id) => {
    setForm((p) => ({
      ...p,
      sections: (Array.isArray(p.sections) ? p.sections : []).map((it) => {
        if (it?.id !== id) return it;
        const existing = Array.isArray(it?.options) ? it.options : [];
        const next = [...existing, `Option ${existing.length + 1}`];
        return { ...it, options: next };
      }),
    }));
  };

  const updateOption = (id, idx, value) => {
    setForm((p) => ({
      ...p,
      sections: (Array.isArray(p.sections) ? p.sections : []).map((it) => {
        if (it?.id !== id) return it;
        const existing = Array.isArray(it?.options) ? it.options : [];
        const next = existing.map((o, i) => (i === idx ? value : o));
        return { ...it, options: next };
      }),
    }));
  };

  const removeOption = (id, idx) => {
    setForm((p) => ({
      ...p,
      sections: (Array.isArray(p.sections) ? p.sections : []).map((it) => {
        if (it?.id !== id) return it;
        const existing = Array.isArray(it?.options) ? it.options : [];
        const next = existing.filter((_o, i) => i !== idx);
        return { ...it, options: next.length ? next : ['Option 1'] };
      }),
    }));
  };

  const removeBuilderItem = (id) => {
    setForm((p) => ({
      ...p,
      sections: (Array.isArray(p.sections) ? p.sections : []).filter((it) => it?.id !== id),
    }));
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this procedure?');
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/procedures/${id}`, {
        headers: { accept: '*/*' },
      });
      if (selectedProcedure?.id === id) setSelectedProcedure(null);
      await fetchProcedures();
      bumpProceduresVersion();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete procedure');
    }
  };

  const handleSave = async () => {
    const name = String(form.name || '').trim();
    if (!name) return;
    const cleanSections = builderItemsToApiSections(form.sections);
    const payload = {
      name,
      description: String(form.description || ''),
      asset_id: form.asset_id ? Number(form.asset_id) : null,
      sections: cleanSections,
    };

    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        const created = await axios.post(`${API_BASE_URL}/procedures`, payload, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const next = created?.data;
        if (next?.id) {
          setProcedures((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const without = list.filter((p) => String(p?.id) !== String(next.id));
            return [next, ...without];
          });
          setSelectedProcedure(next);
        }
        bumpProceduresVersion();
        setShowModal(false);
      } else {
        const updated = await axios.patch(`${API_BASE_URL}/procedures/${selectedProcedure.id}`,
          {
            name: payload.name,
            description: payload.description,
            asset_id: payload.asset_id,
            sections: payload.sections,
          },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
        const next = updated?.data;
        if (next && Object.keys(next).length > 0) {
          setProcedures((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((p) => (String(p?.id) === String(next?.id) ? next : p));
          });
          setSelectedProcedure(next);
        } else {
          await fetchProcedures();
        }
        bumpProceduresVersion();
        setShowModal(false);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to save procedure');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Procedure Library
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Procedure templates"
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={openCreate} startIcon={<Plus size={18} />}>
            Add Procedure
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={() => fetchProcedures()}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          icon={<Filter size={16} />}
          label={filters.categoryId ? `Category: ${filters.categoryId}` : 'Category'}
          variant={filters.categoryId ? 'filled' : 'outlined'}
          onClick={() => setOpenFilter(openFilter === 'category' ? '' : 'category')}
        />
        <Chip
          label={filters.assetId ? `Asset: ${filters.assetId}` : 'Asset'}
          variant={filters.assetId ? 'filled' : 'outlined'}
          onClick={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
        />
        {anyFilterActive ? (
          <Chip
            icon={<X size={16} />}
            label="Clear Filters"
            variant="outlined"
            onClick={() => { setFilters({ categoryId: '', assetId: '' }); setOpenFilter(''); }}
          />
        ) : null}
      </Stack>

      {/* Keep existing popover logic for now (category/asset) */}
      {openFilter === 'category' ? (
        <Paper variant="outlined" sx={{ p: 1, maxWidth: 360 }}>
          <MuiList dense>
            <ListItemButton onClick={() => { setFilters((p) => ({ ...p, categoryId: '' })); setOpenFilter(''); }}>
              <ListItemText primary="Any" />
            </ListItemButton>
            {loadingFilterOptions && categories.length === 0 ? (
              <ListItemText sx={{ px: 2, py: 1 }} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} primary="Loading…" />
            ) : null}
            {!loadingFilterOptions && categories.length === 0 ? (
              <ListItemText sx={{ px: 2, py: 1 }} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} primary="No categories" />
            ) : null}
            {categories.map((c) => (
              <ListItemButton key={c.id} onClick={() => { setFilters((p) => ({ ...p, categoryId: String(c.id) })); setOpenFilter(''); }}>
                <ListItemText primary={c.name || String(c.id)} />
              </ListItemButton>
            ))}
          </MuiList>
        </Paper>
      ) : null}

      {openFilter === 'asset' ? (
        <Paper variant="outlined" sx={{ p: 1, maxWidth: 360 }}>
          <MuiList dense>
            <ListItemButton onClick={() => { setFilters((p) => ({ ...p, assetId: '' })); setOpenFilter(''); }}>
              <ListItemText primary="Any" />
            </ListItemButton>
            {loadingFilterOptions && assets.length === 0 ? (
              <ListItemText sx={{ px: 2, py: 1 }} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} primary="Loading…" />
            ) : null}
            {!loadingFilterOptions && assets.length === 0 ? (
              <ListItemText sx={{ px: 2, py: 1 }} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} primary="No assets" />
            ) : null}
            {assets.map((a) => (
              <ListItemButton key={a.id} onClick={() => { setFilters((p) => ({ ...p, assetId: String(a.id) })); setOpenFilter(''); }}>
                <ListItemText primary={a.asset_name || a.name || String(a.id)} />
              </ListItemButton>
            ))}
          </MuiList>
        </Paper>
      ) : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined">
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Procedures ({filtered.length})
              </Typography>
            </Stack>
            <Divider />
            <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loading ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary">Loading procedures…</Typography>
                </Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ px: 3, py: 8 }}>
                  <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 80, height: 80, borderRadius: '999px', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={40} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Start adding Procedures</Typography>
                      <Typography variant="body2" color="text.secondary">Click Add Procedure to get started</Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <MuiList disablePadding>
                  {filtered.map((p) => {
                    const active = selectedProcedure?.id === p.id;
                    const assetName = assetsById.get(p.asset_id)?.asset_name || '—';
                    return (
                      <ListItemButton
                        key={p.id}
                        selected={active}
                        onClick={() => setSelectedProcedure(p)}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <ListItemText
                          primary={p.name}
                          secondary={assetName}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                    );
                  })}
                </MuiList>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: '60vh' }}>
            {!selectedProcedure ? (
              <Box sx={{ height: '100%', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">Select a procedure to view details</Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedProcedure.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Asset: {assetsById.get(selectedProcedure.asset_id)?.asset_name || '—'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => openEdit(selectedProcedure)}>Edit</Button>
                    <Button variant="outlined" color="error" onClick={() => handleDelete(selectedProcedure.id)}>Delete</Button>
                  </Stack>
                </Stack>

                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{selectedProcedure.description || '—'}</Typography>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">Sections</Typography>
                  {Array.isArray(selectedProcedure.sections) && selectedProcedure.sections.length > 0 ? (
                    <Stack spacing={1.5}>
                      {selectedProcedure.sections
                        .slice()
                        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
                        .map((sec) => {
                          const fields = Array.isArray(sec?.fields) ? sec.fields : [];
                          return (
                            <Paper key={sec?.id || `${sec?.title}-${sec?.order}`} variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {sec?.title || 'Untitled section'}
                              </Typography>
                              {sec?.description ? (
                                <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
                                  {sec.description}
                                </Typography>
                              ) : null}

                              {fields.length > 0 ? (
                                <Stack spacing={1} sx={{ mt: 1.5 }}>
                                  {fields
                                    .slice()
                                    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
                                    .map((f) => {
                                      const cfgOptions = parseConfigOptions(f?.config);
                                      const options = cfgOptions.length ? cfgOptions : (Array.isArray(f?.options) ? f.options : []);
                                      const fieldType = String(f?.field_type || 'text');
                                      const fieldKey = String(f?.id || `${f?.label}-${f?.order}`);
                                      const selected = String(inspectionValues?.[fieldKey] || '');
                                      const rawValue = fieldKey in (fieldValues || {}) ? fieldValues[fieldKey] : (f?.value ?? '');

                                      return (
                                        <Paper
                                          key={f?.id || `${f?.label}-${f?.order}`}
                                          variant="outlined"
                                          sx={{ p: 2, bgcolor: 'grey.50', borderColor: 'grey.200' }}
                                        >
                                          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                              {f?.label || 'Untitled field'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {fieldType}
                                            </Typography>
                                          </Stack>

                                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                            {Number(f?.required) ? 'Required' : 'Optional'}
                                          </Typography>
                                          {f?.help_text ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                              {f.help_text}
                                            </Typography>
                                          ) : null}
                                          {options.length > 0 ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                              Options: {options.join(', ')}
                                            </Typography>
                                          ) : null}

                                          {fieldType === 'text' ? (
                                            <TextField
                                              sx={{ mt: 1.5 }}
                                              size="small"
                                              fullWidth
                                              multiline
                                              minRows={3}
                                              value={String(rawValue ?? '')}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                setFieldValues((p) => ({ ...(p || {}), [fieldKey]: v }));
                                              }}
                                            />
                                          ) : null}

                                          {fieldType === 'number' || fieldType === 'amount' ? (
                                            <TextField
                                              sx={{ mt: 1.5 }}
                                              size="small"
                                              fullWidth
                                              type="number"
                                              value={rawValue === null || rawValue === undefined ? '' : String(rawValue)}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                setFieldValues((p) => ({ ...(p || {}), [fieldKey]: v }));
                                              }}
                                              InputProps={
                                                fieldType === 'amount'
                                                  ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
                                                  : undefined
                                              }
                                            />
                                          ) : null}

                                          {fieldType === 'checkbox' ? (
                                            <Box sx={{ mt: 1.5 }}>
                                              <FormControlLabel
                                                control={(
                                                  <Checkbox
                                                    size="small"
                                                    checked={Boolean(rawValue)}
                                                    onChange={(e) => {
                                                      const v = e.target.checked;
                                                      setFieldValues((p) => ({ ...(p || {}), [fieldKey]: v }));
                                                    }}
                                                  />
                                                )}
                                                label="Checked"
                                              />
                                            </Box>
                                          ) : null}

                                          {fieldType === 'multiple_choice' ? (
                                            <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                                              <Select
                                                value={String(rawValue ?? '')}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  setFieldValues((p) => ({ ...(p || {}), [fieldKey]: v }));
                                                }}
                                                displayEmpty
                                              >
                                                <MenuItem value="">Select…</MenuItem>
                                                {options.map((opt) => (
                                                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                                ))}
                                              </Select>
                                            </FormControl>
                                          ) : null}

                                          {fieldType === 'checklist' ? (
                                            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                                              {options.map((opt) => {
                                                const list = Array.isArray(rawValue) ? rawValue : [];
                                                const checked = list.includes(opt);
                                                return (
                                                  <FormControlLabel
                                                    key={opt}
                                                    control={(
                                                      <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                          const next = new Set(Array.isArray(rawValue) ? rawValue : []);
                                                          if (e.target.checked) next.add(opt);
                                                          else next.delete(opt);
                                                          setFieldValues((p) => ({ ...(p || {}), [fieldKey]: Array.from(next) }));
                                                        }}
                                                      />
                                                    )}
                                                    label={opt}
                                                  />
                                                );
                                              })}
                                              {options.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">No options</Typography>
                                              ) : null}
                                            </Stack>
                                          ) : null}

                                          {fieldType === 'inspection_check' ? (
                                            <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                                              <Grid item xs={12} sm={4}>
                                                <Button
                                                  fullWidth
                                                  type="button"
                                                  variant={selected === 'pass' ? 'contained' : 'outlined'}
                                                  color="success"
                                                  onClick={() => setInspectionValues((p) => ({ ...p, [fieldKey]: 'pass' }))}
                                                >
                                                  Pass
                                                </Button>
                                              </Grid>
                                              <Grid item xs={12} sm={4}>
                                                <Button
                                                  fullWidth
                                                  type="button"
                                                  variant={selected === 'flag' ? 'contained' : 'outlined'}
                                                  color="warning"
                                                  onClick={() => setInspectionValues((p) => ({ ...p, [fieldKey]: 'flag' }))}
                                                >
                                                  Flag
                                                </Button>
                                              </Grid>
                                              <Grid item xs={12} sm={4}>
                                                <Button
                                                  fullWidth
                                                  type="button"
                                                  variant={selected === 'fail' ? 'contained' : 'outlined'}
                                                  color="error"
                                                  onClick={() => setInspectionValues((p) => ({ ...p, [fieldKey]: 'fail' }))}
                                                >
                                                  Fail
                                                </Button>
                                              </Grid>
                                            </Grid>
                                          ) : null}
                                        </Paper>
                                      );
                                    })}
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No fields</Typography>
                              )}
                            </Paper>
                          );
                        })}
                    </Stack>
                  ) : (
                    <Typography variant="body2">0</Typography>
                  )}
                </Stack>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={mode === 'create' ? 'New Procedure' : 'Edit Procedure'}
        size="xl"
      >
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            fullWidth
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />

          <FormControl fullWidth>
            <InputLabel id="procedure-asset-label">Asset</InputLabel>
            <Select
              labelId="procedure-asset-label"
              label="Asset"
              value={form.asset_id}
              onChange={(e) => setForm((p) => ({ ...p, asset_id: e.target.value }))}
            >
              <MenuItem value="">Select Asset</MenuItem>
              {assets.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.asset_name || a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={9}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Procedure Builder
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {(Array.isArray(form.sections) ? form.sections : []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Add items from the right panel.</Typography>
                  ) : null}

                  {(Array.isArray(form.sections) ? form.sections : []).map((it) => (
                    <Paper key={it.id} variant="outlined" sx={{ p: 2 }}>
                      {it.type === 'field' ? (
                        <Stack spacing={2}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                size="small"
                                value={it.label}
                                onChange={(e) => updateBuilderItem(it.id, { label: e.target.value })}
                                placeholder="Field Name"
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={6} sx={{ position: 'relative' }}>
                              <Box
                                component="button"
                                type="button"
                                onClick={() => {
                                  setTypeMenuOpenForId((prev) => (prev === it.id ? null : it.id));
                                  setTypeSearch('');
                                }}
                                sx={{
                                  width: '100%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1,
                                  px: 1.5,
                                  py: 1,
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.primary' }}>
                                  {(() => {
                                    const cfg = fieldTypeOptions.find((x) => x.key === it.field_type) || fieldTypeOptions[1];
                                    const Icon = cfg.Icon;
                                    return (
                                      <>
                                        <Icon size={16} />
                                        {cfg.label}
                                      </>
                                    );
                                  })()}
                                </Stack>
                                <ChevronDown size={16} />
                              </Box>

                              {typeMenuOpenForId === it.id && (
                                <Paper
                                  elevation={8}
                                  sx={{
                                    position: 'absolute',
                                    zIndex: 20,
                                    mt: 1,
                                    width: '100%',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box sx={{ px: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                      <TextField
                                        size="small"
                                        value={typeSearch}
                                        onChange={(e) => setTypeSearch(e.target.value)}
                                        placeholder="Search"
                                        fullWidth
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <Search size={16} />
                                            </InputAdornment>
                                          ),
                                        }}
                                      />
                                  </Box>

                                  <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                                    {fieldTypeOptions
                                      .filter((x) => x.label.toLowerCase().includes(typeSearch.trim().toLowerCase()))
                                      .map((x) => {
                                        const Icon = x.Icon;
                                        const active = x.key === it.field_type;
                                        return (
                                          <Box
                                            component="button"
                                            key={x.key}
                                            type="button"
                                            onClick={() => {
                                              updateBuilderItem(it.id, { field_type: x.key });
                                              setTypeMenuOpenForId(null);
                                            }}
                                            sx={{
                                              width: '100%',
                                              px: 1.5,
                                              py: 1,
                                              textAlign: 'left',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 1,
                                              fontSize: 14,
                                              border: 0,
                                              bgcolor: active ? 'action.selected' : 'transparent',
                                              cursor: 'pointer',
                                              '&:hover': { bgcolor: 'action.hover' },
                                            }}
                                          >
                                            <Icon size={16} />
                                            {x.label}
                                          </Box>
                                        );
                                      })}
                                  </Box>
                                </Paper>
                              )}
                            </Grid>
                          </Grid>

                          {it.field_type === 'text' && (
                            <TextField
                              value={it.value ?? ''}
                              onChange={(e) => updateBuilderItem(it.id, { value: e.target.value })}
                              placeholder="Text will be entered here"
                              fullWidth
                              multiline
                              minRows={3}
                              size="small"
                            />
                          )}

                          {it.field_type === 'number' && (
                            <TextField
                              type="number"
                              value={it.value ?? ''}
                              onChange={(e) => updateBuilderItem(it.id, { value: e.target.value })}
                              placeholder="Number will be entered here"
                              fullWidth
                              size="small"
                            />
                          )}

                          {it.field_type === 'amount' && (
                            <TextField
                              type="number"
                              value={it.value ?? ''}
                              onChange={(e) => updateBuilderItem(it.id, { value: e.target.value })}
                              placeholder="Amount will be entered here"
                              fullWidth
                              size="small"
                              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            />
                          )}

                          {it.field_type === 'checkbox' && (
                            <Stack spacing={1}>
                              <FormControlLabel
                                control={<Checkbox size="small" />}
                                label={it.label?.trim() ? it.label : 'Checkbox'}
                              />
                              <Button type="button" variant="text" onClick={addCheckboxItem}>
                                Add Checkbox
                              </Button>
                            </Stack>
                          )}

                          {(it.field_type === 'multiple_choice' || it.field_type === 'checklist') && (
                            <Stack spacing={1}>
                              {(Array.isArray(it.options) ? it.options : []).map((opt, idx) => (
                                <Stack key={`${it.id}-opt-${idx}`} direction="row" spacing={1} alignItems="center">
                                  <TextField
                                    size="small"
                                    value={opt}
                                    onChange={(e) => updateOption(it.id, idx, e.target.value)}
                                    placeholder={`Option ${idx + 1}`}
                                    fullWidth
                                  />
                                  <IconButton type="button" onClick={() => removeOption(it.id, idx)} size="small" aria-label="Remove option">
                                    <X size={18} />
                                  </IconButton>
                                </Stack>
                              ))}
                              <Button type="button" variant="text" onClick={() => addOption(it.id)}>
                                Add Option
                              </Button>
                            </Stack>
                          )}

                          {it.field_type === 'inspection_check' && (
                            <Grid container spacing={1.5}>
                              <Grid item xs={12} sm={4}>
                                <Button
                                  fullWidth
                                  type="button"
                                  variant={it.value === 'pass' ? 'contained' : 'outlined'}
                                  color="success"
                                  onClick={() => updateBuilderItem(it.id, { value: 'pass' })}
                                >
                                  Pass
                                </Button>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Button
                                  fullWidth
                                  type="button"
                                  variant={it.value === 'flag' ? 'contained' : 'outlined'}
                                  color="warning"
                                  onClick={() => updateBuilderItem(it.id, { value: 'flag' })}
                                >
                                  Flag
                                </Button>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Button
                                  fullWidth
                                  type="button"
                                  variant={it.value === 'fail' ? 'contained' : 'outlined'}
                                  color="error"
                                  onClick={() => updateBuilderItem(it.id, { value: 'fail' })}
                                >
                                  Fail
                                </Button>
                              </Grid>
                            </Grid>
                          )}

                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <FormControlLabel
                              control={(
                                <Checkbox
                                  size="small"
                                  checked={Boolean(it.required)}
                                  onChange={(e) => updateBuilderItem(it.id, { required: e.target.checked })}
                                />
                              )}
                              label="Required"
                            />

                            <Button type="button" variant="text" color="inherit" onClick={() => removeBuilderItem(it.id)} startIcon={<Trash2 size={18} />}>
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      ) : null}

                      {it.type === 'heading' ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <TextField
                            size="small"
                            value={it.text}
                            onChange={(e) => updateBuilderItem(it.id, { text: e.target.value })}
                            placeholder="Heading"
                            fullWidth
                          />
                          <Button type="button" variant="text" color="inherit" onClick={() => removeBuilderItem(it.id)} startIcon={<Trash2 size={18} />}>
                            Remove
                          </Button>
                        </Stack>
                      ) : null}

                      {it.type === 'section' ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <TextField
                            size="small"
                            value={it.title}
                            onChange={(e) => updateBuilderItem(it.id, { title: e.target.value })}
                            placeholder="Section Title"
                            fullWidth
                          />
                          <Button type="button" variant="text" color="inherit" onClick={() => removeBuilderItem(it.id)} startIcon={<Trash2 size={18} />}>
                            Remove
                          </Button>
                        </Stack>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  New Item
                </Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Button type="button" variant="outlined" onClick={() => addBuilderItem('field')} startIcon={<SquarePen size={18} />}>
                    Field
                  </Button>
                  <Button type="button" variant="outlined" onClick={() => addBuilderItem('heading')} startIcon={<Type size={18} />}>
                    Heading
                  </Button>
                  <Button type="button" variant="outlined" onClick={() => addBuilderItem('section')} startIcon={<Rows3 size={18} />}>
                    Section
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button variant="outlined" color="inherit" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || !String(form.name || '').trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default Procedures;
