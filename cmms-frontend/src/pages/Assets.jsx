import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Search, Power, Wrench, CheckCircle, QrCode, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { Card, CardHeader, CardBody, Button, Badge, Table, Modal } from '../components';
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
      running: { variant: 'success', label: 'Running', icon: CheckCircle },
      down: { variant: 'danger', label: 'Down', icon: Power },
      maintenance: { variant: 'warning', label: 'Under Maintenance', icon: Wrench }
    };
    
    const config = variants[status] || { variant: 'default', label: status };
    return (
      <div className="flex items-center space-x-1">
        {config.icon && <config.icon className="w-4 h-4" />}
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    );
  };

  const columns = [
    {
      key: 'name',
      title: 'Asset Name',
      sortable: true
    },
    {
      key: 'locationId',
      title: 'Location',
      render: (value) => getLocationName(value)
    },
    {
      key: 'assetType',
      title: 'Asset Type',
      sortable: true
    },
    {
      key: 'criticality',
      title: 'Criticality',
      sortable: true
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_value, row) => (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditAsset(row);
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAsset(row.id);
            }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all physical assets</p>
        </div>
        <Button onClick={openCreateAssetModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => fetchAssets()}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hover>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{assets.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {assets.filter(a => a.status === 'running').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Down</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {assets.filter(a => a.status === 'down').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <Power className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {assets.filter(a => a.status === 'maintenance').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardBody>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                <Filter className="h-4 w-4 text-gray-400" />
                Filters
              </div>

              <div className="relative">
                <select
                  value={filters.criticality}
                  onChange={(e) => setFilters((p) => ({ ...p, criticality: e.target.value }))}
                  className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700"
                >
                  <option value="">Criticality</option>
                  {criticalityOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700"
                >
                  <option value="">Status</option>
                  <option value="running">Running</option>
                  <option value="down">Down</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={filters.assetId}
                  onChange={(e) => setFilters((p) => ({ ...p, assetId: e.target.value }))}
                  className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700"
                >
                  <option value="">Asset</option>
                  {(assets || []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ criticality: '', status: '', assetId: '' })}
                  className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Assets ({filteredAssets.length})
          </h3>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns}
            data={filteredAssets}
            onRowClick={handleRowClick}
            sortable
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Create Asset Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); setAssetModalMode('create'); setEditingAssetId(null); }}
        title={assetModalMode === 'edit' ? 'Edit Asset' : 'New Asset'}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter Asset Name (Required)"
            />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="relative">
                <select
                  value={createForm.locationId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, locationId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Criticality</label>
              <div className="relative">
                <select
                  value={createForm.criticality}
                  onChange={(e) => setCreateForm((p) => ({ ...p, criticality: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Start typing...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="relative">
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="running">Running</option>
                  <option value="down">Down</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={createForm.year}
                onChange={(e) => setCreateForm((p) => ({ ...p, year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Start typing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <div className="relative">
                <input
                  type="text"
                  value={createForm.manufacturer}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCreateForm((p) => ({ ...p, manufacturer: next, model: next.trim() ? p.model : '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Start typing to search or customize..."
                />
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={createForm.model}
                onChange={(e) => setCreateForm((p) => ({ ...p, model: e.target.value }))}
                disabled={!createForm.manufacturer.trim()}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 ${!createForm.manufacturer.trim() ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                placeholder={createForm.manufacturer ? 'Enter model' : 'Enter manufacturer first'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={createForm.serialNumber}
                onChange={(e) => setCreateForm((p) => ({ ...p, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter serial number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Teams in Charge</label>
              <input
                type="text"
                value={createForm.teamsInCharge}
                onChange={(e) => setCreateForm((p) => ({ ...p, teamsInCharge: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Start typing..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">QR Code/Barcode</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">Barcode will be generated</div>
                <div className="mt-2 text-sm text-primary-600">or</div>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeManual(true);
                    setCreateForm((p) => ({ ...p, barcode: p.barcode || generateBarcode() }));
                  }}
                  className="mt-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  Input Manually
                </button>
                {barcodeManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeManual(false);
                      setCreateForm((p) => ({ ...p, barcode: generateBarcode() }));
                    }}
                    className="mt-1 ml-3 text-sm text-gray-600 hover:text-gray-700"
                  >
                    Use Generated
                  </button>
                )}
                <div className="mt-2">
                  <input
                    type="text"
                    value={createForm.barcode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, barcode: e.target.value }))}
                    disabled={!barcodeManual}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 ${barcodeManual ? 'bg-white' : 'bg-gray-50 text-gray-500'}`}
                    placeholder="Enter barcode"
                  />
                  {!barcodeManual && (
                    <div className="mt-1 text-xs text-gray-500">Generated: {createForm.barcode}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-40 w-40 bg-white border border-gray-200 rounded-md shadow-sm flex flex-col items-center justify-center gap-2">
                  <QrCode className="h-20 w-20 text-gray-300" />
                  <div className="text-[10px] text-gray-500 px-2 text-center break-words">{createForm.barcode || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Types</label>
              <div className="relative">
                <input
                  type="text"
                  value={createForm.assetType}
                  onChange={(e) => setCreateForm((p) => ({ ...p, assetType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Start typing..."
                />
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendors</label>
              <div className="relative">
                <select
                  value={createForm.vendorId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, vendorId: e.target.value }))}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parts</label>
              <input
                type="text"
                value={createForm.parts}
                onChange={(e) => setCreateForm((p) => ({ ...p, parts: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Start typing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Asset</label>
              <div className="relative">
                <select
                  value={createForm.parentAssetId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, parentAssetId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Start typing...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAsset} disabled={!createForm.name.trim() || saving || (assetModalMode === 'edit' && !editingAssetId)}>
              {saving ? (assetModalMode === 'edit' ? 'Saving…' : 'Creating…') : (assetModalMode === 'edit' ? 'Save' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset Detail Modal */}
      <Modal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={`Asset: ${selectedAsset?.name}`}
        size="xl"
      >
        {selectedAsset && (
          <div className="space-y-6">
            {/* Status and Actions */}
            <div className="flex items-center justify-between">
              {getStatusBadge(selectedAsset.status)}
              <div className="flex space-x-2">
                <Button variant="secondary" onClick={() => { setSelectedAsset(null); openEditAssetModal(selectedAsset); }}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => handleDeleteAsset(selectedAsset.id)}>
                  Delete
                </Button>
                {selectedAsset.status === 'running' && (
                  <Button variant="warning" onClick={() => handleStatusChange(selectedAsset.id, 'maintenance')}>
                    Schedule Maintenance
                  </Button>
                )}
                {selectedAsset.status === 'down' && (
                  <Button onClick={() => handleStatusChange(selectedAsset.id, 'maintenance')}>
                    Start Repair
                  </Button>
                )}
                {selectedAsset.status === 'maintenance' && (
                  <Button onClick={() => handleStatusChange(selectedAsset.id, 'running')}>
                    Mark as Running
                  </Button>
                )}
              </div>
            </div>

            {/* Asset Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Category</h4>
                <p className="text-gray-600">{selectedAsset.category}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Location</h4>
                <p className="text-gray-600">{getLocationName(selectedAsset.locationId)}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Serial Number</h4>
                <p className="text-gray-600">{selectedAsset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Model</h4>
                <p className="text-gray-600">{selectedAsset.model || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Manufacturer</h4>
                <p className="text-gray-600">{selectedAsset.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Install Date</h4>
                <p className="text-gray-600">
                  {selectedAsset.installDate ? new Date(selectedAsset.installDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Last Maintenance</h4>
                <p className="text-gray-600">
                  {selectedAsset.lastMaintenanceDate ? new Date(selectedAsset.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Next Maintenance</h4>
                <p className="text-gray-600">
                  {selectedAsset.nextMaintenanceDate ? new Date(selectedAsset.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Description */}
            {selectedAsset.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{selectedAsset.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assets;
