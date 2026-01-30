import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Bell, MoreVertical, UserCircle2 } from 'lucide-react';
import { Button, Card } from '../components';
import {
  Box,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

const Messages = () => {
  const [tab, setTab] = useState('messages');
  const [search, setSearch] = useState('');

  const conversations = useMemo(() => {
    return [
      {
        id: 'C-ALL',
        title: 'All Team',
        subtitle: 'Organization-wide conversation',
        updatedLabel: 'Yesterday',
      },
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.title} ${c.subtitle}`.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Messages</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
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
            New Message
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Card>
            <Tabs
              value={tab}
              onChange={(_e, v) => setTab(v)}
              variant="fullWidth"
              sx={{ px: 1, pt: 1 }}
            >
              <Tab value="messages" label="Messages" />
              <Tab value="threads" label="Threads" />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                Direct Messages
              </Typography>
              <List disablePadding>
                {filtered.map((c) => (
                  <ListItemButton key={c.id} sx={{ mb: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '999px',
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UserCircle2 size={22} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                            {c.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {c.updatedLabel}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {c.subtitle}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '999px',
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCircle2 size={22} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>All Team</Typography>
                  <Button variant="text" size="small">View Conversation Information</Button>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" title="Notifications">
                  <Bell size={18} />
                </IconButton>
                <IconButton size="small" title="More">
                  <MoreVertical size={18} />
                </IconButton>
              </Stack>
            </Stack>
            <Divider />

            <Box sx={{ px: 3, py: 8 }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    height: 96,
                    width: 96,
                    borderRadius: '999px',
                    bgcolor: 'primary.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ height: 56, width: 56, borderRadius: '999px', bgcolor: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Start adding conversations</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click the New Message button in the top right to get started
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />
            <Box sx={{ px: 2, py: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                Go ahead and write the first message!
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
                <TextField multiline minRows={2} placeholder="Write a message..." fullWidth />
                <Button variant="secondary">Send</Button>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Messages UI is a placeholder layout (no backend/websocket yet).
        </Typography>
      </motion.div>
    </Stack>
  );
};

export default Messages;
