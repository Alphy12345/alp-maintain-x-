import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Filter,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import axios from 'axios';
import { Button, Card, Modal } from '../components';

const API_BASE_URL = 'http://172.18.100.31:8000';

const chipBase =
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Parts</h1>
          <div className="text-sm text-gray-600">00</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Parts"
              className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Part
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => fetchParts()}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, needsRestock: !p.needsRestock }))}
                className={`${chipBase} ${filters.needsRestock ? 'border-primary-300 text-primary-700' : ''}`}
              >
              <Filter className="h-4 w-4 text-gray-400" />
              Needs Restock
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
                className={`${chipBase} ${filters.assetId ? 'border-primary-300 text-primary-700' : ''}`}
              >
                Asset
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {openFilter === 'asset' ? (
                <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, assetId: '' })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Any
                    </button>
                    {loadingFilterOptions && assets.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
                    ) : null}
                    {!loadingFilterOptions && assets.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No assets</div>
                    ) : null}
                    {assets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setFilters((p) => ({ ...p, assetId: String(a.id) })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {a.asset_name || a.name || String(a.id)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'vendor' ? '' : 'vendor')}
                className={`${chipBase} ${filters.vendorId ? 'border-primary-300 text-primary-700' : ''}`}
              >
                Vendor
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {openFilter === 'vendor' ? (
                <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, vendorId: '' })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Any
                    </button>
                    {vendors.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setFilters((p) => ({ ...p, vendorId: String(v.id) })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {v.name || String(v.id)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {anyFilterActive ? (
              <button
                type="button"
                onClick={() => { setFilters({ needsRestock: false, assetId: '', vendorId: '' }); setOpenFilter(''); }}
                className={chipBase}
              >
                Clear Filters
              </button>
            ) : null}
          </div>

          <button type="button" className={chipBase}>
            <Settings2 className="h-4 w-4 text-gray-400" />
            My Filters
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">Sort by: <span className="text-gray-900">Name</span> · <span className="text-gray-900">Ascending Order</span></div>
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          </div>

          <div className="px-6 py-16">
            {isEmpty ? (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-xl bg-primary-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Start adding Parts</div>
                  <div className="text-sm text-gray-600">Click the New Part button in the top right to get started</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {loading ? (
                  <div className="text-sm text-gray-600">Loading parts…</div>
                ) : (
                  filtered.map((p) => {
                    const active = selectedPart?.id === p.id;
                    const vendorName = vendorById.get(p.vendor_id)?.name || '—';
                    const needsRestock = Number(p.units_in_stock) <= Number(p.minimum_in_stock);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPart(p)}
                        className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                          active ? 'border-primary-400 bg-transparent' : 'border-gray-200 bg-transparent hover:bg-gray-50/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                          {needsRestock ? (
                            <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">Restock</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {vendorName} · {p.part_type || '—'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-8">
          <div className="px-6 py-16">
            {!selectedPart ? (
              <div className="text-sm text-gray-500">Select a part to view details</div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{selectedPart.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Vendor: {vendorById.get(selectedPart.vendor_id)?.name || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => openEdit(selectedPart)}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => handleDelete(selectedPart.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Units in stock</div>
                    <div className="text-sm text-gray-900">{selectedPart.units_in_stock}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Minimum in stock</div>
                    <div className="text-sm text-gray-900">{selectedPart.minimum_in_stock}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Unit cost</div>
                    <div className="text-sm text-gray-900">{selectedPart.unit_cost}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Part type</div>
                    <div className="text-sm text-gray-900">{selectedPart.part_type || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="text-sm text-gray-900">{selectedPart.location || '—'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="text-sm text-gray-900">{selectedPart.description || '—'}</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={mode === 'create' ? 'New Part' : 'Edit Part'}
        size="lg"
      >
        <div className="space-y-4">
          {error ? (
            <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Part name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units in stock</label>
              <input
                type="number"
                value={form.units_in_stock}
                onChange={(e) => setForm((p) => ({ ...p, units_in_stock: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum in stock</label>
              <input
                type="number"
                value={form.minimum_in_stock}
                onChange={(e) => setForm((p) => ({ ...p, minimum_in_stock: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit cost</label>
              <input
                type="number"
                value={form.unit_cost}
                onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <div className="relative">
                <select
                  value={form.vendor_id}
                  onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part type</label>
              <input
                value={form.part_type}
                onChange={(e) => setForm((p) => ({ ...p, part_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !String(form.name || '').trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartsInventory;
