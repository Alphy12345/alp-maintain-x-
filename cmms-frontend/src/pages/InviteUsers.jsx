import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Link2, Plus } from 'lucide-react';
import {
  Box,
  Button,
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

const InviteUsers = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([
    { id: 'r1', fullName: '', contact: '', accountType: 'full' },
  ]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `r${Date.now()}`, fullName: '', contact: '', accountType: 'full' },
    ]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/teams-users');
  };

  return (
    <Stack spacing={2.5}>
      <Button
        variant="text"
        color="inherit"
        onClick={() => navigate('/teams-users')}
        startIcon={<ChevronLeft size={18} />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Invite Users
      </Button>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {rows.map((r) => (
              <Grid key={r.id} container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Full Name"
                    value={r.fullName}
                    onChange={(e) => updateRow(r.id, { fullName: e.target.value })}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Mobile Phone Number or Email"
                    value={r.contact}
                    onChange={(e) => updateRow(r.id, { contact: e.target.value })}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={10} md={3}>
                  <FormControl fullWidth>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      Account Type
                    </Typography>
                    <Select
                      value={r.accountType}
                      onChange={(e) => updateRow(r.id, { accountType: e.target.value })}
                      size="small"
                    >
                      <MenuItem value="full">Full User</MenuItem>
                      <MenuItem value="limited">Limited User</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={2} md={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton
                      aria-label="Remove"
                      onClick={() => removeRow(r.id)}
                      size="small"
                    >
                      <X size={18} />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            ))}

            <Box>
              <Button type="button" variant="outlined" onClick={addRow} startIcon={<Plus size={18} />}>
                Add another
              </Button>
            </Box>

            <Stack spacing={1.5} sx={{ pt: 1, maxWidth: 480 }}>
              <Button type="submit" variant="contained" disabled fullWidth>
                Send Invites
              </Button>
              <Button type="button" variant="outlined" fullWidth startIcon={<Link2 size={18} />}>
                Get an invite link to share
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
};

export default InviteUsers;
