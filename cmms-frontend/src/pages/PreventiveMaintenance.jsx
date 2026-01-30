import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, Table, Modal } from '../components';
import {
  Box,
  Chip,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import useStore from '../store/useStore';

const PreventiveMaintenance = () => {
  const { pmSchedules, assets, users, addPMSchedule, updatePMSchedule } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPM, setSelectedPM] = useState(null);
  const [filters, setFilters] = useState({
    asset: '',
    frequency: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPMSchedules = pmSchedules.filter(pm => {
    const matchesSearch = pm.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsset = !filters.asset || pm.assetId === filters.asset;
    const matchesFrequency = !filters.frequency || pm.frequency === filters.frequency;
    const matchesStatus = !filters.status || (filters.status === 'active' ? pm.isActive : !pm.isActive);
    
    return matchesSearch && matchesAsset && matchesFrequency && matchesStatus;
  });

  const getAssetName = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset?.name || 'Unknown Asset';
  };

  const getAssigneeName = (assigneeId) => {
    const user = users.find(u => u.id === assigneeId);
    return user?.name || 'Unassigned';
  };

  const getFrequencyBadge = (frequency) => {
    const variants = {
      daily: { variant: 'info', label: 'Daily' },
      weekly: { variant: 'primary', label: 'Weekly' },
      monthly: { variant: 'success', label: 'Monthly' },
      quarterly: { variant: 'warning', label: 'Quarterly' },
      yearly: { variant: 'danger', label: 'Yearly' }
    };
    
    const config = variants[frequency] || { variant: 'default', label: frequency };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 
      <Badge variant="success">Active</Badge> : 
      <Badge variant="default">Inactive</Badge>;
  };

  const getDueStatus = (nextDue) => {
    const now = new Date();
    const dueDate = new Date(nextDue);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { variant: 'danger', label: 'Overdue', icon: AlertTriangle };
    } else if (daysUntilDue <= 7) {
      return { variant: 'warning', label: 'Due Soon', icon: Clock };
    } else {
      return { variant: 'success', label: 'On Schedule', icon: CheckCircle };
    }
  };

  const columns = [
    {
      key: 'title',
      title: 'Title',
      sortable: true
    },
    {
      key: 'assetId',
      title: 'Asset',
      render: (value) => getAssetName(value)
    },
    {
      key: 'frequency',
      title: 'Frequency',
      render: (value) => getFrequencyBadge(value)
    },
    {
      key: 'nextDue',
      title: 'Next Due',
      render: (value) => {
        const status = getDueStatus(value);
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            {status.icon ? <status.icon size={16} /> : null}
            <Typography variant="body2">{new Date(value).toLocaleDateString()}</Typography>
            <Badge variant={status.variant} size="sm">{status.label}</Badge>
          </Stack>
        );
      },
      sortable: true
    },
    {
      key: 'assigneeId',
      title: 'Assignee',
      render: (value) => getAssigneeName(value)
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value) => getStatusBadge(value)
    }
  ];

  const handleRowClick = (pm) => {
    setSelectedPM(pm);
  };

  const handleToggleStatus = (pmId) => {
    const pm = pmSchedules.find(p => p.id === pmId);
    if (pm) {
      updatePMSchedule(pmId, { isActive: !pm.isActive });
    }
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Preventive Maintenance</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage scheduled maintenance tasks
          </Typography>
        </Box>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Create PM Schedule
        </Button>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Total PM Schedules
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{pmSchedules.length}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'info.main', color: 'common.white', display: 'flex' }}>
                    <Calendar size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Active Schedules
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'success.main' }}>
                      {pmSchedules.filter(pm => pm.isActive).length}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'success.main', color: 'common.white', display: 'flex' }}>
                    <CheckCircle size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Due This Week
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'warning.main' }}>
                      {pmSchedules.filter(pm => {
                        const now = new Date();
                        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return pm.isActive && new Date(pm.nextDue) <= weekFromNow;
                      }).length}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'warning.main', color: 'common.white', display: 'flex' }}>
                    <Clock size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Overdue
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'error.main' }}>
                      {pmSchedules.filter(pm => {
                        return pm.isActive && new Date(pm.nextDue) < new Date();
                      }).length}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'error.main', color: 'common.white', display: 'flex' }}>
                    <AlertTriangle size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Upcoming PM Schedule</Typography>
        </CardHeader>
        <CardBody>
          <Grid container spacing={1.5}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Grid item xs={12} md={12 / 7} key={day}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textAlign: 'center', display: 'block' }}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + i);
              const isCurrentMonth = date.getMonth() === new Date().getMonth();

              const pmForDay = pmSchedules.filter(pm =>
                pm.isActive && new Date(pm.nextDue).toDateString() === date.toDateString()
              );

              return (
                <Grid item xs={12} md={12 / 7} key={i}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      minHeight: 80,
                      bgcolor: isCurrentMonth ? 'background.paper' : 'action.hover',
                      borderColor: pmForDay.length > 0 ? 'primary.light' : 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {date.getDate()}
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {pmForDay.map(pm => (
                        <Chip
                          key={pm.id}
                          label={pm.title}
                          size="small"
                          title={pm.title}
                          sx={{
                            justifyContent: 'flex-start',
                            maxWidth: '100%',
                            '& .MuiChip-label': { px: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
                          }}
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardBody>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardBody>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search PM schedules..."
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
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select value={filters.asset} displayEmpty onChange={(e) => setFilters({ ...filters, asset: e.target.value })}>
                  <MenuItem value="">All Assets</MenuItem>
                  {assets.map(asset => (
                    <MenuItem key={asset.id} value={asset.id}>{asset.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select value={filters.frequency} displayEmpty onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}>
                  <MenuItem value="">All Frequencies</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select value={filters.status} displayEmpty onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      {/* PM Schedules Table */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            PM Schedules ({filteredPMSchedules.length})
          </Typography>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns}
            data={filteredPMSchedules}
            onRowClick={handleRowClick}
            sortable
          />
        </CardBody>
      </Card>

      {/* Create PM Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create PM Schedule"
        size="lg"
      >
        <Stack spacing={2}>
          <TextField
            label="Title"
            size="small"
            placeholder="Enter PM schedule title"
          />

          <TextField
            label="Description"
            size="small"
            multiline
            minRows={3}
            placeholder="Describe the PM schedule"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select defaultValue="" displayEmpty>
                  <MenuItem value="">Select Asset</MenuItem>
                  {assets.map(asset => (
                    <MenuItem key={asset.id} value={asset.id}>{asset.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select defaultValue="daily">
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select defaultValue="" displayEmpty>
                  <MenuItem value="">Select Assignee</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Next Due Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Checklist Items</Typography>
            <TextField size="small" placeholder="Add checklist item" />
            <TextField size="small" placeholder="Add checklist item" />
          </Stack>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>
              Create PM Schedule
            </Button>
          </Stack>
        </Stack>
      </Modal>

      {/* PM Detail Modal */}
      <Modal
        isOpen={!!selectedPM}
        onClose={() => setSelectedPM(null)}
        title={`PM Schedule: ${selectedPM?.title}`}
        size="xl"
      >
        {selectedPM && (
          <Stack spacing={3}>
            {/* Status and Actions */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={1.5} alignItems="center">
                {getStatusBadge(selectedPM.isActive)}
                {getFrequencyBadge(selectedPM.frequency)}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={selectedPM.isActive ? 'warning' : 'success'}
                  onClick={() => handleToggleStatus(selectedPM.id)}
                >
                  {selectedPM.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Stack>
            </Stack>

            {/* PM Information */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Asset</Typography>
                <Typography variant="body2" color="text.secondary">{getAssetName(selectedPM.assetId)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Assignee</Typography>
                <Typography variant="body2" color="text.secondary">{getAssigneeName(selectedPM.assigneeId)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Frequency</Typography>
                <Typography variant="body2" color="text.secondary">{selectedPM.frequency}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Next Due</Typography>
                <Typography variant="body2" color="text.secondary">{new Date(selectedPM.nextDue).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Last Completed</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPM.lastCompleted ? new Date(selectedPM.lastCompleted).toLocaleDateString() : 'Never'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Created</Typography>
                <Typography variant="body2" color="text.secondary">{new Date(selectedPM.createdAt).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>

            {/* Description */}
            {selectedPM.description && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                <Typography variant="body2" color="text.secondary">{selectedPM.description}</Typography>
              </Box>
            )}

            {/* Checklist */}
            {selectedPM.checklist && selectedPM.checklist.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Checklist</Typography>
                <Stack spacing={0.75}>
                  {selectedPM.checklist.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      control={<Checkbox checked={item.completed} disabled />}
                      label={
                        <Typography
                          variant="body2"
                          sx={{
                            color: item.completed ? 'text.secondary' : 'text.primary',
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >
                          {item.text}
                        </Typography>
                      }
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default PreventiveMaintenance;
