import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, Play, GitBranch, Bolt } from 'lucide-react';
import Button from '../components/Button';
import {
  Box,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

const Automations = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('enabled');

  const automations = useMemo(
    () => [
      { id: 'a1', name: 'Automation 1', status: 'enabled' },
      { id: 'a2', name: 'Automation 2', status: 'enabled' },
      { id: 'a3', name: 'Automation 3', status: 'disabled' },
    ],
    []
  );

  const filtered = useMemo(
    () => automations.filter((a) => a.status === tab),
    [automations, tab]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Automations</Typography>
        <Button onClick={() => navigate('/automations/create')}>
          <Plus size={16} style={{ marginRight: 8 }} />
          New Automation
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth" sx={{ px: 1, pt: 1 }}>
              <Tab value="enabled" label="Enabled" />
              <Tab value="disabled" label="Disabled" />
            </Tabs>
            <Divider />

            <Box sx={{ p: 1.5 }}>
              <List disablePadding>
                {filtered.map((a) => (
                  <ListItemButton
                    key={a.id}
                    sx={{
                      mb: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 44, mt: 0.25 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '999px',
                          bgcolor: 'primary.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Zap size={16} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                          {a.name}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                          <Box sx={{ height: 8, width: 64, borderRadius: 99, bgcolor: 'primary.100' }} />
                          <Box sx={{ height: 8, width: 48, borderRadius: 99, bgcolor: 'primary.50' }} />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper
            variant="outlined"
            sx={{
              minHeight: 540,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 520 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                <Box sx={{ width: 40, height: 40, borderRadius: '999px', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={16} />
                </Box>
                <Box sx={{ width: 56, height: 56, borderRadius: '999px', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitBranch size={22} />
                </Box>
                <Box sx={{ width: 40, height: 40, borderRadius: '999px', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bolt size={16} />
                </Box>
              </Stack>

              <Typography variant="h6" sx={{ mt: 3, fontWeight: 800 }}>
                Start building automated workflows
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use conditions to trigger tasks and optimize your maintenance operations.
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Button onClick={() => navigate('/automations/create')}>
                  <Plus size={16} style={{ marginRight: 8 }} />
                  New Automation
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Automations;
