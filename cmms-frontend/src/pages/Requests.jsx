import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Upload, X, ArrowRight } from 'lucide-react';
import { Button, Badge, Modal } from '../components';
import {
  Box,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Button as MuiButton,
} from '@mui/material';
import useStore from '../store/useStore';

const Requests = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    requests,
    assets,
    locations,
    users,
    currentUser,
    addRequest,
    updateRequest,
    deleteRequest,
    addUser,
    addLocation,
    addAsset,
    convertRequestToWorkOrder,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [activeTab, setActiveTab] = useState('open');
  const [sortBy, setSortBy] = useState('created_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    asset: ''
  });

  const fileInputRef = useRef(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    locationName: '',
    assetName: '',
    requester: '',
    priority: 'low',
    attachments: [],
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('new') === '1';
    if (shouldOpen) {
      setShowCreateModal(true);
      params.delete('new');
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const normalize = (s) => (s || '').trim().toLowerCase();

  const getAssetName = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset?.name || 'Unknown Asset';
  };

  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const getRequesterName = (requesterId) => {
    const user = users.find(u => u.id === requesterId);
    return user?.name || 'Unknown';
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: 'warning', label: 'Open' },
      in_review: { variant: 'info', label: 'In Review' },
      approved: { variant: 'primary', label: 'Approved' },
      rejected: { variant: 'danger', label: 'Rejected' },
      completed: { variant: 'success', label: 'Completed' },
      cancelled: { variant: 'danger', label: 'Cancelled' },
      converted: { variant: 'info', label: 'Converted' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: { variant: 'default', label: 'Low' },
      medium: { variant: 'info', label: 'Medium' },
      high: { variant: 'warning', label: 'High' },
      critical: { variant: 'danger', label: 'Critical' }
    };

    const config = variants[priority] || { variant: 'default', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isDoneStatus = (status) => status === 'completed' || status === 'cancelled' || status === 'rejected' || status === 'converted';

  const filteredRequests = requests
    .filter((r) => {
      const matchesSearch = (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab = activeTab === 'done' ? isDoneStatus(r.status) : !isDoneStatus(r.status);

      const matchesStatus = !filters.status || r.status === filters.status;
      const matchesPriority = !filters.priority || r.priority === filters.priority;
      const matchesAsset = !filters.asset || r.assetId === filters.asset;

      return matchesSearch && matchesTab && matchesStatus && matchesPriority && matchesAsset;
    })
    .sort((a, b) => {
      if (sortBy === 'created_desc') return new Date(b.createdAt || '1970-01-01').getTime() - new Date(a.createdAt || '1970-01-01').getTime();
      if (sortBy === 'created_asc') return new Date(a.createdAt || '1970-01-01').getTime() - new Date(b.createdAt || '1970-01-01').getTime();
      if (sortBy === 'priority_desc') {
        const rank = { critical: 4, high: 3, medium: 2, low: 1 };
        return (rank[b.priority] || 0) - (rank[a.priority] || 0);
      }
      if (sortBy === 'priority_asc') {
        const rank = { critical: 4, high: 3, medium: 2, low: 1 };
        return (rank[a.priority] || 0) - (rank[b.priority] || 0);
      }
      return 0;
    });

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || null;

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      locationName: '',
      assetName: '',
      requester: '',
      priority: 'low',
      attachments: [],
    });
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const addAttachments = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const mapped = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          id: `ATT-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        };
      })
    );

    setCreateForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...mapped],
    }));
  };

  const removeAttachment = (id) => {
    setCreateForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== id),
    }));
  };

  const handleCreate = () => {
    const title = createForm.title.trim();
    if (!title) return;

    const locationName = createForm.locationName.trim();
    const assetName = createForm.assetName.trim();
    const requesterText = createForm.requester.trim();

    let location = null;
    if (locationName) {
      location = locations.find((l) => normalize(l.name) === normalize(locationName)) || null;
      if (!location) {
        location = addLocation({ name: locationName, type: 'site' });
      }
    }

    let asset = null;
    if (assetName) {
      asset = assets.find((a) => normalize(a.name) === normalize(assetName)) || null;
      if (!asset) {
        asset = addAsset({
          name: assetName,
          category: 'Uncategorized',
          locationId: location?.id || '',
          status: 'running',
        });
      }
    }

    let requesterUser = null;
    if (requesterText) {
      requesterUser = users.find((u) => normalize(u.email) === normalize(requesterText) || normalize(u.name) === normalize(requesterText)) || null;
      if (!requesterUser) {
        const looksLikeEmail = requesterText.includes('@');
        requesterUser = addUser({
          name: looksLikeEmail ? requesterText.split('@')[0] : requesterText,
          email: looksLikeEmail ? requesterText : '',
          role: 'viewer',
        });
      }
    }

    const created = addRequest({
      title,
      description: createForm.description.trim(),
      locationId: location?.id || '',
      assetId: asset?.id || '',
      priority: createForm.priority,
      status: 'open',
      requesterId: requesterUser?.id || currentUser?.id || 'system',
      createdBy: requesterUser?.id || currentUser?.id || 'system',
      createdAt: new Date().toISOString(),
      attachments: createForm.attachments || [],
    });

    setShowCreateModal(false);
    resetCreateForm();
    setActiveTab('open');
    setSelectedRequestId(created.id);
  };

  const handleConvert = (requestId) => {
    const created = convertRequestToWorkOrder(requestId);
    if (!created) return;
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Requests</Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search Requests"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ display: { xs: 'none', md: 'block' }, width: 320 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button onClick={() => { resetCreateForm(); setShowCreateModal(true); }}>
            <Plus size={16} style={{ marginRight: 8 }} />
            New Request
          </Button>
        </Stack>
      </Stack>

      {/* Mobile search */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <TextField
          size="small"
          placeholder="Search Requests"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter chips + Tabs */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip size="small" icon={<SlidersHorizontal size={16} />} label="Filters" variant="outlined" sx={{ fontWeight: 700 }} />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filters.asset}
                displayEmpty
                onChange={(e) => setFilters({ ...filters, asset: e.target.value })}
              >
                <MenuItem value="">Asset</MenuItem>
                {assets.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={filters.priority}
                displayEmpty
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <MenuItem value="">Priority</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filters.status}
                displayEmpty
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="converted">Converted</MenuItem>
              </Select>
            </FormControl>

            <MuiButton
              type="button"
              variant="text"
              color="inherit"
              onClick={() => setFilters({ status: '', priority: '', asset: '' })}
            >
              Clear
            </MuiButton>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={activeTab}
              onChange={(_e, v) => {
                if (!v) return;
                setActiveTab(v);
                setSelectedRequestId(null);
              }}
            >
              <ToggleButton value="open">Open</ToggleButton>
              <ToggleButton value="done">Done</ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="created_desc">Sort: Newest</MenuItem>
                <MenuItem value="created_asc">Sort: Oldest</MenuItem>
                <MenuItem value="priority_desc">Sort: Priority (High - Low)</MenuItem>
                <MenuItem value="priority_asc">Sort: Priority (Low - High)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Split view */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {activeTab === 'done' ? 'Done' : 'Open'} ({filteredRequests.length})
              </Typography>
            </Box>
            <Divider />

            <Box sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {filteredRequests.length === 0 ? (
                <Stack spacing={1} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '999px', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    You don't have any requests
                  </Typography>
                  <MuiButton type="button" variant="text" onClick={() => setShowCreateModal(true)}>
                    Create the first request
                  </MuiButton>
                </Stack>
              ) : (
                <List disablePadding>
                  {filteredRequests.map((r) => {
                    const isSelected = r.id === selectedRequestId;
                    return (
                      <ListItemButton
                        key={r.id}
                        selected={isSelected}
                        onClick={() => setSelectedRequestId(r.id)}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <ListItemText
                          primary={(
                            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                                  {r.title || 'Request'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {r.id} - {r.assetId ? getAssetName(r.assetId) : 'No asset'} - {r.locationId ? getLocationName(r.locationId) : 'No location'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  Requested by {r.requesterId ? getRequesterName(r.requesterId) : 'Unknown'}
                                </Typography>
                              </Box>
                              <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                                {getPriorityBadge(r.priority)}
                                <Typography variant="caption" color="text.secondary">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                          )}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: '65vh' }}>
            {!selectedRequest ? (
              <Stack spacing={0.5} alignItems="center" justifyContent="center" sx={{ minHeight: '65vh', p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Select a request</Typography>
                <Typography variant="body2" color="text.secondary">Details will appear here.</Typography>
              </Stack>
            ) : (
              <Stack spacing={3} sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">{selectedRequest.id}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                      {selectedRequest.title || 'Request'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      {getStatusBadge(selectedRequest.status)}
                      {getPriorityBadge(selectedRequest.priority)}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    {selectedRequest.status !== 'converted' && !isDoneStatus(selectedRequest.status) && (
                      <Button
                        variant="secondary"
                        onClick={() => updateRequest(selectedRequest.id, { status: 'in_review' })}
                      >
                        In Review
                      </Button>
                    )}

                    {selectedRequest.status !== 'converted' && !isDoneStatus(selectedRequest.status) && (
                      <Button onClick={() => updateRequest(selectedRequest.id, { status: 'approved' })}>
                        Approve
                      </Button>
                    )}

                    {selectedRequest.status === 'approved' && (
                      <Button variant="success" onClick={() => handleConvert(selectedRequest.id)}>
                        <ArrowRight size={16} style={{ marginRight: 8 }} />
                        Convert to Work Order
                      </Button>
                    )}

                    {selectedRequest.status !== 'converted' && selectedRequest.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        onClick={() => updateRequest(selectedRequest.id, { status: 'completed' })}
                      >
                        Mark Completed
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      onClick={() => {
                        deleteRequest(selectedRequest.id);
                        setSelectedRequestId(null);
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Asset</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedRequest.assetId ? getAssetName(selectedRequest.assetId) : 'Not set'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Location</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedRequest.locationId ? getLocationName(selectedRequest.locationId) : 'Not set'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Requester</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedRequest.requesterId ? getRequesterName(selectedRequest.requesterId) : 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Created</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : 'Unknown'}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Description</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedRequest.description || 'No description'}
                  </Typography>
                </Box>

                {selectedRequest.convertedWorkOrderId && (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Converted Work Order</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedRequest.convertedWorkOrderId}</Typography>
                  </Paper>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Files</Typography>
                    <Grid container spacing={1.5} sx={{ mt: 1 }}>
                      {selectedRequest.attachments.map((a) => {
                        const isImage = typeof a?.type === 'string' && a.type.startsWith('image/');
                        return (
                          <Grid item xs={6} md={4} key={a.id}>
                            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                              {isImage ? (
                                <Box component="img" src={a.dataUrl} alt={a.name} sx={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: 96, px: 2, textAlign: 'center' }}>
                                  <Typography variant="caption" color="text.secondary">{a.name}</Typography>
                                </Stack>
                              )}
                              <Box sx={{ px: 1, py: 0.75 }}>
                                <Typography variant="caption" noWrap title={a.name}>{a.name}</Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        title="New Request"
        size="xl"
      >
        <Stack spacing={3}>
          <TextField
            label="What do you need? (Required)"
            value={createForm.title}
            onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Describe the request"
            fullWidth
            multiline
            minRows={2}
          />

          <Box>
            <Box
              component="input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              sx={{ display: 'none' }}
              onChange={(e) => {
                addAttachments(e.target.files);
                e.target.value = '';
              }}
            />

            <Paper
              variant="outlined"
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(false);
                addAttachments(e.dataTransfer.files);
              }}
              sx={{
                p: 3,
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: isDraggingFiles ? 'primary.main' : 'divider',
                bgcolor: isDraggingFiles ? 'action.hover' : 'background.default',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Stack spacing={1} alignItems="center" textAlign="center">
                <Box sx={{ width: 40, height: 40, borderRadius: '999px', bgcolor: 'background.paper', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={18} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Add or drag pictures
                </Typography>
                <Typography variant="caption" color="text.secondary">PNG, JPG, GIF</Typography>
              </Stack>
            </Paper>

            {createForm.attachments && createForm.attachments.length > 0 && (
              <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                {createForm.attachments.map((a) => (
                  <Grid item xs={6} md={3} key={a.id}>
                    <Paper variant="outlined" sx={{ position: 'relative', overflow: 'hidden' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(a.id);
                        }}
                        aria-label="Remove"
                        title="Remove"
                        sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
                      >
                        <X size={16} />
                      </IconButton>
                      <Box component="img" src={a.dataUrl} alt={a.name} sx={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                      <Box sx={{ px: 1, py: 0.75 }}>
                        <Typography variant="caption" noWrap title={a.name}>{a.name}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <TextField
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Add a description"
            fullWidth
            multiline
            minRows={4}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={createForm.locationName}
                onChange={(e) => setCreateForm((p) => ({ ...p, locationName: e.target.value }))}
                placeholder="Start typing..."
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Asset"
                value={createForm.assetName}
                onChange={(e) => setCreateForm((p) => ({ ...p, assetName: e.target.value }))}
                placeholder="Start typing..."
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Requested by"
                value={createForm.requester}
                onChange={(e) => setCreateForm((p) => ({ ...p, requester: e.target.value }))}
                placeholder="Type name or email address"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Request</Button>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default Requests;
