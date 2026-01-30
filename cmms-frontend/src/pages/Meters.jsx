import React, { useState } from 'react';
import { Plus, Search, Filter, Paperclip, Camera } from 'lucide-react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import {
  Box,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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

const Meters = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    meterName: '',
    description: '',
    measurementUnit: '',
    asset: '',
    location: '',
    readingFrequency: '',
    additionalInfo: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
    setShowAddModal(false);
    setFormData({
      meterName: '',
      description: '',
      measurementUnit: '',
      asset: '',
      location: '',
      readingFrequency: '',
      additionalInfo: ''
    });
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Meters</Typography>
          <Typography variant="body2" color="text.secondary">Manage meters and measurements</Typography>
        </Box>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Add New Meter
        </Button>
      </Stack>

      {/* Search and Filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search meters..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="secondary">
          <Filter size={16} style={{ marginRight: 8 }} />
          Filter
        </Button>
      </Stack>

      {/* Table */}
      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Meter Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Measurement Unit</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Asset</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Reading Frequency</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No meters found. Click "Add New Meter" to create your first meter.
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Meter Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Meter"
        size="lg"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Meter Name"
                  name="meterName"
                  value={formData.meterName}
                  onChange={handleInputChange}
                  required
                  size="small"
                  fullWidth
                  placeholder="Enter meter name"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Measurement Unit"
                  name="measurementUnit"
                  value={formData.measurementUnit}
                  onChange={handleInputChange}
                  required
                  size="small"
                  fullWidth
                  placeholder="e.g., kWh, PSI, Liters"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Enter meter description"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Select
                    name="asset"
                    value={formData.asset}
                    displayEmpty
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Select an asset</MenuItem>
                    <MenuItem value="asset1">Asset 1</MenuItem>
                    <MenuItem value="asset2">Asset 2</MenuItem>
                    <MenuItem value="asset3">Asset 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Select
                    name="location"
                    value={formData.location}
                    displayEmpty
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Select a location</MenuItem>
                    <MenuItem value="location1">Location 1</MenuItem>
                    <MenuItem value="location2">Location 2</MenuItem>
                    <MenuItem value="location3">Location 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <Select
                    name="readingFrequency"
                    value={formData.readingFrequency}
                    displayEmpty
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Select frequency</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Additional Info"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleInputChange}
              size="small"
              fullWidth
              multiline
              minRows={3}
              placeholder="Enter additional information"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Attachments</Typography>
              <Paper variant="outlined" sx={{ p: 2.5, borderStyle: 'dashed', textAlign: 'center' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                  <Button type="button" variant="secondary">
                    <Camera size={18} style={{ marginRight: 8 }} />
                    Add Pictures
                  </Button>
                  <Button type="button" variant="secondary">
                    <Paperclip size={18} style={{ marginRight: 8 }} />
                    Add Files
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upload images or documents related to this meter
                </Typography>
              </Paper>
            </Box>

            <Divider />

            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </Stack>
  );
};

export default Meters;
