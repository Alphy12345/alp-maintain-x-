import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Plus } from 'lucide-react';
import Button from '../components/Button';
import {
  Box,
  Divider,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const AutomationCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerAsset: '',
    triggerMeter: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/automations');
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Button variant="text" onClick={() => navigate('/automations')}>
          <ChevronLeft size={16} style={{ marginRight: 8 }} />
          New Automation
        </Button>

        <Button type="submit" form="automation-create-form">Create</Button>
      </Stack>

      <Box component="form" id="automation-create-form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Automation name (Required)"
            fullWidth
            size="small"
          />

          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            minRows={3}
            placeholder="What will this automation do?"
            fullWidth
            size="small"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Trigger
            </Typography>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, bgcolor: 'primary.50' }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>When: Meter Reading</Typography>
                <IconButton size="small" title="Remove">
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
              <Divider />

              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.75 }}>
                      Asset
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select name="triggerAsset" value={formData.triggerAsset} onChange={handleChange} displayEmpty>
                        <MenuItem value="">Start typing...</MenuItem>
                        <MenuItem value="asset1">Asset 1</MenuItem>
                        <MenuItem value="asset2">Asset 2</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.75 }}>
                      Meter
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        name="triggerMeter"
                        value={formData.triggerMeter}
                        onChange={handleChange}
                        displayEmpty
                        required
                      >
                        <MenuItem value="">Start typing...</MenuItem>
                        <MenuItem value="meter1">Meter 1</MenuItem>
                        <MenuItem value="meter2">Meter 2</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              <Divider />
              <Box sx={{ px: 2, py: 1.5 }}>
                <Button type="button" variant="text">
                  <Plus size={16} style={{ marginRight: 8 }} />
                  Add Trigger
                </Button>
              </Box>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Conditions
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Button type="button" variant="text">
                <Plus size={16} style={{ marginRight: 8 }} />
                Add Condition
              </Button>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Actions
            </Typography>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Button type="button" variant="text" fullWidth>
                Create a Work Order
              </Button>
              <Divider />
              <Button type="button" variant="text" fullWidth>
                Change Asset Status
              </Button>
              <Divider />
              <Button type="button" variant="text" fullWidth>
                Send a Notification
              </Button>
            </Paper>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default AutomationCreate;
