import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Bell, Shield, Building, Mail, Phone } from 'lucide-react';
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Card, CardHeader, CardBody, Button } from '../components';
import useStore from '../store/useStore';

const Settings = () => {
  const { users, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState('organization');
  const [formData, setFormData] = useState({
    // Organization settings
    organizationName: '',
    organizationEmail: '',
    organizationPhone: '',
    organizationAddress: '',
    
    // User settings
    userName: currentUser?.name || '',
    userEmail: currentUser?.email || '',
    userRole: currentUser?.role || 'viewer',
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    workOrderAlerts: true,
    pmReminders: true,
    lowStockAlerts: true,
    systemUpdates: false
  });

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSimpleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (section) => {
    // Mock save functionality
    alert(`${section} settings saved successfully!`);
  };

  const tabs = [
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'users', label: 'User Management', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your organization and user preferences
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.id}
              value={tab.id}
              label={tab.label}
              icon={<Icon size={18} />}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
          );
        })}
      </Tabs>

      {/* Organization Settings */}
      {activeTab === 'organization' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Organization Information</Typography>
            </CardHeader>
            <CardBody>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Organization Name"
                      value={formData.organizationName}
                      onChange={(e) => handleSimpleChange('organizationName', e.target.value)}
                      fullWidth
                      InputProps={{ startAdornment: <Box sx={{ mr: 1, display: 'flex' }}><Building size={18} /></Box> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email Address"
                      type="email"
                      value={formData.organizationEmail}
                      onChange={(e) => handleSimpleChange('organizationEmail', e.target.value)}
                      fullWidth
                      InputProps={{ startAdornment: <Box sx={{ mr: 1, display: 'flex' }}><Mail size={18} /></Box> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Phone Number"
                      value={formData.organizationPhone}
                      onChange={(e) => handleSimpleChange('organizationPhone', e.target.value)}
                      fullWidth
                      InputProps={{ startAdornment: <Box sx={{ mr: 1, display: 'flex' }}><Phone size={18} /></Box> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Address"
                      value={formData.organizationAddress}
                      onChange={(e) => handleSimpleChange('organizationAddress', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" justifyContent="flex-end">
                  <Button onClick={() => handleSave('Organization')}>
                    <Save size={16} style={{ marginRight: 8 }} />
                    Save Organization Settings
                  </Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Stack spacing={3}>
            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Add New User</Typography>
              </CardHeader>
              <CardBody>
                <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField label="Full Name" placeholder="Enter full name" fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Email Address" type="email" placeholder="Enter email address" fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <Select defaultValue="viewer">
                          <MenuItem value="viewer">Viewer</MenuItem>
                          <MenuItem value="technician">Technician</MenuItem>
                          <MenuItem value="admin">Administrator</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Stack direction="row" justifyContent="flex-end">
                    <Button>
                      <User size={16} style={{ marginRight: 8 }} />
                      Add User
                    </Button>
                  </Stack>
                </Stack>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Existing Users</Typography>
              </CardHeader>
              <CardBody>
                <Stack spacing={1.5}>
                  {users.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No users yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {users.map((u) => (
                        <Paper key={u.id} variant="outlined" sx={{ p: 2 }}>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '999px',
                                  bgcolor: 'action.hover',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}
                              >
                                {(u.name || 'U').trim().slice(0, 1).toUpperCase()}
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                                  {u.name || 'User'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {u.email}
                                </Typography>
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                              <Chip
                                size="small"
                                label={u.role}
                                color={u.role === 'admin' ? 'secondary' : (u.role === 'technician' ? 'info' : 'default')}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={u.status}
                                color={u.status === 'active' ? 'success' : 'error'}
                                variant="outlined"
                              />
                              <Button variant="secondary">Edit</Button>
                              <Button variant="secondary">Remove</Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        </motion.div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Notification Preferences</Typography>
            </CardHeader>
            <CardBody>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Notification Channels</Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.emailNotifications}
                          onChange={(e) => handleSimpleChange('emailNotifications', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Email Notifications</Typography>
                          <Typography variant="caption" color="text.secondary">Receive notifications via email</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.pushNotifications}
                          onChange={(e) => handleSimpleChange('pushNotifications', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Push Notifications</Typography>
                          <Typography variant="caption" color="text.secondary">Receive browser push notifications</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Notification Types</Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.workOrderAlerts}
                          onChange={(e) => handleSimpleChange('workOrderAlerts', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Work Order Alerts</Typography>
                          <Typography variant="caption" color="text.secondary">Notifications for new and updated work orders</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.pmReminders}
                          onChange={(e) => handleSimpleChange('pmReminders', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>PM Reminders</Typography>
                          <Typography variant="caption" color="text.secondary">Reminders for scheduled preventive maintenance</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.lowStockAlerts}
                          onChange={(e) => handleSimpleChange('lowStockAlerts', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Low Stock Alerts</Typography>
                          <Typography variant="caption" color="text.secondary">Alerts when inventory items are low</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={formData.systemUpdates}
                          onChange={(e) => handleSimpleChange('systemUpdates', e.target.checked)}
                        />
                      )}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>System Updates</Typography>
                          <Typography variant="caption" color="text.secondary">Notifications about system updates and maintenance</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                </Box>

                <Stack direction="row" justifyContent="flex-end">
                  <Button onClick={() => handleSave('Notification')}>
                    <Save size={16} style={{ marginRight: 8 }} />
                    Save Notification Settings
                  </Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Security Settings</Typography>
            </CardHeader>
            <CardBody>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Password Policy</Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Require Strong Passwords</Typography>
                          <Typography variant="caption" color="text.secondary">Enforce minimum password complexity</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Password Expiry</Typography>
                          <Typography variant="caption" color="text.secondary">Require password change every 90 days</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Session Management</Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Session Timeout</Typography>
                          <Typography variant="caption" color="text.secondary">Automatically log out after 2 hours of inactivity</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Two-Factor Authentication</Typography>
                          <Typography variant="caption" color="text.secondary">Require 2FA for all users</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Access Control</Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={<Switch />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>IP Whitelist</Typography>
                          <Typography variant="caption" color="text.secondary">Restrict access to specific IP addresses</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label={(
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Audit Logging</Typography>
                          <Typography variant="caption" color="text.secondary">Log all user activities and system changes</Typography>
                        </Box>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                </Box>

                <Stack direction="row" justifyContent="flex-end">
                  <Button onClick={() => handleSave('Security')}>
                    <Save size={16} style={{ marginRight: 8 }} />
                    Save Security Settings
                  </Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </motion.div>
      )}
    </Stack>
  );
};

export default Settings;
