import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Filter, Plus, Search } from 'lucide-react';
import { Button, Card } from '../components';
import { Box, Chip, InputAdornment, Stack, TextField, Typography } from '@mui/material';

const WorkOrderTemplates = () => {
  const [search, setSearch] = useState('');

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Work Order Templates</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Work Order Templates"
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

          <Button>
            <Plus size={16} style={{ marginRight: 8 }} />
            New Work Order Template
            <ChevronDown size={16} style={{ marginLeft: 8 }} />
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip icon={<Filter size={16} />} label="Location" variant="outlined" clickable />
        <Chip label="Asset" variant="outlined" clickable />
        <Chip label="Asset Types" variant="outlined" clickable />
        <Chip label="Category" variant="outlined" clickable />
        <Chip label="Procedure" variant="outlined" clickable />
      </Stack>

      <Card>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                height: 96,
                width: 96,
                borderRadius: 3,
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ height: 56, width: 56, borderRadius: 2, bgcolor: 'primary.main' }} />
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Create your first Work Order Template
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Get Work Orders created in half the time by using a template instead of filling the same fields over and over again.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Card>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Work Order Templates UI is a placeholder layout.
        </Typography>
      </motion.div>
    </Stack>
  );
};

export default WorkOrderTemplates;
