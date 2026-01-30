import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, Table, Modal } from '../components';
import {
  Box,
  FormControl,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import useStore from '../store/useStore';

const Inventory = () => {
  const { inventory, updateInventoryStock } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    stockLevel: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesStockLevel = !filters.stockLevel || 
      (filters.stockLevel === 'low' && item.currentStock <= item.minStockLevel) ||
      (filters.stockLevel === 'normal' && item.currentStock > item.minStockLevel);
    
    return matchesSearch && matchesCategory && matchesStockLevel;
  });

  const getStockBadge = (current, min) => {
    if (current <= min) {
      return <Badge variant="danger">Low Stock</Badge>;
    } else if (current <= min * 1.5) {
      return <Badge variant="warning">Reorder Soon</Badge>;
    } else {
      return <Badge variant="success">In Stock</Badge>;
    }
  };

  const getStockStatus = (current, min, max) => {
    const percentage = (current / max) * 100;
    if (percentage <= 25) return { color: 'error', width: percentage };
    if (percentage <= 50) return { color: 'warning', width: percentage };
    if (percentage <= 75) return { color: 'info', width: percentage };
    return { color: 'success', width: percentage };
  };

  const categories = [...new Set(inventory.map(item => item.category))];
  const lowStockItems = inventory.filter(item => item.currentStock <= item.minStockLevel);

  const columns = [
    {
      key: 'name',
      title: 'Item Name',
      sortable: true
    },
    {
      key: 'partNumber',
      title: 'Part Number',
      sortable: true
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true
    },
    {
      key: 'currentStock',
      title: 'Current Stock',
      render: (value, row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 800 }}>{value}</Typography>
          {getStockBadge(value, row.minStockLevel)}
        </Stack>
      ),
      sortable: true
    },
    {
      key: 'minStockLevel',
      title: 'Min Level',
      sortable: true
    },
    {
      key: 'unitCost',
      title: 'Unit Cost',
      format: 'currency',
      sortable: true
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true
    }
  ];

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleStockUpdate = (itemId, newStock) => {
    updateInventoryStock(itemId, parseInt(newStock));
  };

  const stockInputRef = useRef(null);

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Inventory</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage parts and supplies inventory
          </Typography>
        </Box>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Add Item
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
                      Total Items
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{inventory.length}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'info.main', color: 'common.white', display: 'flex' }}>
                    <Package size={22} />
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
                      Low Stock Items
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'error.main' }}>{lowStockItems.length}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'error.main', color: 'common.white', display: 'flex' }}>
                    <AlertTriangle size={22} />
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
                      Total Value
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                      ${inventory.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'success.main', color: 'common.white', display: 'flex' }}>
                    <TrendingUp size={22} />
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
                      Categories
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{categories.length}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'secondary.main', color: 'common.white', display: 'flex' }}>
                    <Package size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>
      </Grid>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <Stack direction="row" spacing={1} alignItems="center">
              <AlertTriangle size={20} color="#ef4444" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Low Stock Alert</Typography>
            </Stack>
          </CardHeader>
          <CardBody>
            <Grid container spacing={2}>
              {lowStockItems.map(item => {
                const pct = Math.min((item.currentStock / item.maxStockLevel) * 100, 100);
                return (
                  <Grid item xs={12} md={6} lg={4} key={item.id}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light', bgcolor: 'action.hover' }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                            {item.name}
                          </Typography>
                          <Badge variant="danger">Low Stock</Badge>
                        </Stack>

                        <Stack direction="row" spacing={2} justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Current: <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{item.currentStock}</Box>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min: <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{item.minStockLevel}</Box>
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 8, borderRadius: 999, bgcolor: 'divider', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'error.main' } }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardBody>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardBody>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search inventory items..."
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
                <Select
                  value={filters.category}
                  displayEmpty
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={filters.stockLevel}
                  displayEmpty
                  onChange={(e) => setFilters({ ...filters, stockLevel: e.target.value })}
                >
                  <MenuItem value="">All Stock Levels</MenuItem>
                  <MenuItem value="low">Low Stock</MenuItem>
                  <MenuItem value="normal">Normal Stock</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Inventory Items ({filteredInventory.length})
          </Typography>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns}
            data={filteredInventory}
            onRowClick={handleRowClick}
            sortable
          />
        </CardBody>
      </Card>

      {/* Add Item Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Inventory Item"
        size="lg"
      >
        <Stack spacing={2}>
          <TextField label="Item Name" placeholder="Enter item name" fullWidth size="small" />

          <TextField label="Description" placeholder="Describe the item" fullWidth size="small" multiline minRows={3} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Part Number" placeholder="Enter part number" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select displayEmpty defaultValue="">
                  <MenuItem value="">Select Category</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField label="Unit" placeholder="e.g., pieces, gallons, kg" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Unit Cost" type="number" inputProps={{ step: 0.01 }} placeholder="0.00" fullWidth size="small" />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField label="Current Stock" type="number" placeholder="0" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Min Stock Level" type="number" placeholder="0" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Max Stock Level" type="number" placeholder="0" fullWidth size="small" />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField label="Location" placeholder="Storage location" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Supplier" placeholder="Supplier name" fullWidth size="small" />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>
              Add Item
            </Button>
          </Stack>
        </Stack>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`Inventory Item: ${selectedItem?.name}`}
        size="xl"
      >
        {selectedItem && (
          <Stack spacing={3}>
            {/* Stock Status */}
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Stock Level</Typography>
                {getStockBadge(selectedItem.currentStock, selectedItem.minStockLevel)}
              </Stack>

              {(() => {
                const status = getStockStatus(selectedItem.currentStock, selectedItem.minStockLevel, selectedItem.maxStockLevel);
                const pct = Math.min(status.width, 100);
                const barColor =
                  status.color === 'error'
                    ? 'error.main'
                    : status.color === 'warning'
                      ? 'warning.main'
                      : status.color === 'info'
                        ? 'info.main'
                        : 'success.main';

                return (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 14, borderRadius: 999, bgcolor: 'divider', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: barColor } }}
                    />
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">Current: {selectedItem.currentStock}</Typography>
                      <Typography variant="caption" color="text.secondary">Min: {selectedItem.minStockLevel}</Typography>
                      <Typography variant="caption" color="text.secondary">Max: {selectedItem.maxStockLevel}</Typography>
                    </Stack>
                  </>
                );
              })()}
            </Box>

            {/* Quick Stock Update */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Quick Stock Update</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <TextField
                  inputRef={stockInputRef}
                  type="number"
                  defaultValue={selectedItem.currentStock}
                  size="small"
                  fullWidth
                />
                <Box>
                  <Button onClick={() => {
                    const nextValue = stockInputRef.current?.value;
                    if (nextValue !== undefined && nextValue !== null) {
                      handleStockUpdate(selectedItem.id, nextValue);
                    }
                  }}>
                    Update
                  </Button>
                </Box>
              </Stack>
            </Box>

            {/* Item Information */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Item Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Part Number</Typography>
                  <Typography variant="body2">{selectedItem.partNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Category</Typography>
                  <Typography variant="body2">{selectedItem.category}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Unit</Typography>
                  <Typography variant="body2">{selectedItem.unit}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Unit Cost</Typography>
                  <Typography variant="body2">${selectedItem.unitCost.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Location</Typography>
                  <Typography variant="body2">{selectedItem.location || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Supplier</Typography>
                  <Typography variant="body2">{selectedItem.supplier || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Total Value</Typography>
                  <Typography variant="body2">${(selectedItem.currentStock * selectedItem.unitCost).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Last Updated</Typography>
                  <Typography variant="body2">{new Date(selectedItem.lastUpdated).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Description */}
            {selectedItem.description && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                <Typography variant="body2" color="text.secondary">{selectedItem.description}</Typography>
              </Paper>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default Inventory;
