import React, { useEffect, useMemo, useState } from 'react';
import { Search, MoreVertical, Plus } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button as MuiButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = 'http://172.18.100.31:8000';

const TeamsUsers = () => {
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ user_name: '', password: '', role: 'admin' });
  const [savingUser, setSavingUser] = useState(false);
  const [userMode, setUserMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMode, setTeamMode] = useState('create');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ team_name: '', description: '' });
  const [savingTeam, setSavingTeam] = useState(false);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamUserLinks, setTeamUserLinks] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [editingMembership, setEditingMembership] = useState(null);
  const [editingNewUserId, setEditingNewUserId] = useState('');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/users`, {
        headers: { accept: 'application/json' },
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUsersError(e?.response?.data?.detail || e?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (tab !== 'users') return;
    fetchUsers();
  }, [tab]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    setTeamsError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/teams`, {
        headers: { accept: 'application/json' },
      });
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setTeamsError(e?.response?.data?.detail || e?.message || 'Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (tab !== 'teams') return;
    fetchTeams();
    fetchUsers();
  }, [tab]);

  const fetchTeamUserLinks = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/team-users`, {
        headers: { accept: 'application/json' },
      });
      setTeamUserLinks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTeamUserLinks([]);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      const [teamRes, linksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/team-users/teams/${teamId}`, {
          headers: { accept: 'application/json' },
        }),
        axios.get(`${API_BASE_URL}/team-users`, {
          headers: { accept: 'application/json' },
        }),
      ]);
      const team = teamRes?.data;
      const members = Array.isArray(team?.users) ? team.users : [];
      setTeamMembers(members);
      setTeamUserLinks(Array.isArray(linksRes?.data) ? linksRes.data : []);
    } catch (e) {
      setMembersError(e?.response?.data?.detail || e?.message || 'Failed to load team members');
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const openMembers = async (team) => {
    setSelectedTeamForMembers(team);
    setMemberUserId('');
    setEditingMembership(null);
    setEditingNewUserId('');
    setShowMembersModal(true);
    if (team?.id !== undefined && team?.id !== null) {
      await fetchTeamMembers(team.id);
    }
  };

  const membershipIdByTeamAndUser = useMemo(() => {
    const map = new Map();
    for (const link of (teamUserLinks || [])) {
      const key = `${String(link.team_id)}:${String(link.user_id)}`;
      map.set(key, link.id);
    }
    return map;
  }, [teamUserLinks]);

  const memberUserIdsSet = useMemo(() => {
    const set = new Set();
    for (const u of (teamMembers || [])) set.add(String(u?.id));
    return set;
  }, [teamMembers]);

  const availableUsersForTeam = useMemo(() => {
    return (users || []).filter((u) => !memberUserIdsSet.has(String(u?.id)));
  }, [users, memberUserIdsSet]);

  const handleAddMember = async () => {
    const teamId = selectedTeamForMembers?.id;
    const userId = memberUserId;
    if (!teamId || !userId) return;
    setSavingMember(true);
    setMembersError('');
    try {
      await axios.post(
        `${API_BASE_URL}/team-users`,
        { team_id: Number(teamId), user_id: Number(userId) },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      setMemberUserId('');
      await fetchTeamMembers(teamId);
    } catch (e) {
      setMembersError(e?.response?.data?.detail || e?.message || 'Failed to add user to team');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (memberUserIdToDelete) => {
    const teamId = selectedTeamForMembers?.id;
    if (!teamId) return;
    const membershipId = membershipIdByTeamAndUser.get(`${String(teamId)}:${String(memberUserIdToDelete)}`);
    if (!membershipId) {
      setMembersError('Membership record not found for this user.');
      return;
    }
    const ok = window.confirm('Remove this user from the team?');
    if (!ok) return;
    setSavingMember(true);
    setMembersError('');
    try {
      await axios.delete(`${API_BASE_URL}/team-users/${membershipId}`, { headers: { accept: '*/*' } });
      await fetchTeamMembers(teamId);
    } catch (e) {
      setMembersError(e?.response?.data?.detail || e?.message || 'Failed to remove user from team');
    } finally {
      setSavingMember(false);
    }
  };

  const startEditMember = (member) => {
    const teamId = selectedTeamForMembers?.id;
    if (!teamId) return;
    const membershipId = membershipIdByTeamAndUser.get(`${String(teamId)}:${String(member?.id)}`);
    if (!membershipId) {
      setMembersError('Membership record not found for this user.');
      return;
    }
    setEditingMembership({ membershipId, oldUserId: String(member?.id || '') });
    setEditingNewUserId('');
  };

  const cancelEditMember = () => {
    setEditingMembership(null);
    setEditingNewUserId('');
  };

  const handleSaveEditMember = async () => {
    const teamId = selectedTeamForMembers?.id;
    if (!teamId || !editingMembership?.membershipId || !editingNewUserId) return;
    setSavingMember(true);
    setMembersError('');
    try {
      await axios.delete(`${API_BASE_URL}/team-users/${editingMembership.membershipId}`, { headers: { accept: '*/*' } });
      await axios.post(
        `${API_BASE_URL}/team-users`,
        { team_id: Number(teamId), user_id: Number(editingNewUserId) },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      cancelEditMember();
      await fetchTeamMembers(teamId);
    } catch (e) {
      setMembersError(e?.response?.data?.detail || e?.message || 'Failed to update team member');
    } finally {
      setSavingMember(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users || [];
    return (users || []).filter((u) => {
      const name = String(u?.user_name || '').toLowerCase();
      const role = String(u?.role || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [users, search]);

  const openCreateUser = () => {
    setUserMode('create');
    setSelectedUser(null);
    setUserForm({ user_name: '', password: '', role: 'admin' });
    setShowUserModal(true);
  };

  const openEditUser = (u) => {
    setUserMode('edit');
    setSelectedUser(u);
    setUserForm({ user_name: u?.user_name || '', password: '', role: u?.role || 'admin' });
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setUserMode('create');
    setSelectedUser(null);
    setUserForm({ user_name: '', password: '', role: 'admin' });
  };

  const handleSaveUser = async () => {
    const user_name = String(userForm.user_name || '').trim();
    const password = String(userForm.password || '');
    const role = String(userForm.role || '').trim();
    if (!user_name || !role) return;
    if (userMode === 'create' && !String(password || '').trim()) return;
    setSavingUser(true);
    setUsersError('');
    try {
      if (userMode === 'edit') {
        if (!selectedUser?.id) throw new Error('User id not found');
        const payload = { user_name, role };
        if (String(password || '').trim()) payload.password = password;
        await axios.patch(`${API_BASE_URL}/users/${selectedUser.id}`, payload, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/users`,
          { user_name, password, role },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      }
      closeUserModal();
      await fetchUsers();
    } catch (e) {
      setUsersError(e?.response?.data?.detail || e?.message || 'Failed to save user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!u?.id) return;
    const ok = window.confirm('Delete this user?');
    if (!ok) return;
    setUsersError('');
    try {
      await axios.delete(`${API_BASE_URL}/users/${u.id}`, { headers: { accept: '*/*' } });
      await fetchUsers();
    } catch (e) {
      setUsersError(e?.response?.data?.detail || e?.message || 'Failed to delete user');
    } finally {
    }
  };

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams || [];
    return (teams || []).filter((t) => {
      const name = (t.team_name || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [teams, search]);

  const openCreateTeam = () => {
    setTeamMode('create');
    setSelectedTeam(null);
    setTeamForm({ team_name: '', description: '' });
    setShowTeamModal(true);
  };

  const openEditTeam = (team) => {
    setTeamMode('edit');
    setSelectedTeam(team);
    setTeamForm({ team_name: team?.team_name || '', description: team?.description || '' });
    setShowTeamModal(true);
  };

  const handleDeleteTeam = async (teamId) => {
    const ok = window.confirm('Delete this team?');
    if (!ok) return;
    setTeamsError('');
    try {
      await axios.delete(`${API_BASE_URL}/teams/${teamId}`, {
        headers: { accept: '*/*' },
      });
      await fetchTeams();
    } catch (e) {
      setTeamsError(e?.response?.data?.detail || e?.message || 'Failed to delete team');
    }
  };

  const handleSaveTeam = async () => {
    const team_name = String(teamForm.team_name || '').trim();
    if (!team_name) return;
    setSavingTeam(true);
    setTeamsError('');
    try {
      if (teamMode === 'create') {
        await axios.post(
          `${API_BASE_URL}/teams`,
          { team_name, description: String(teamForm.description || '') },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      } else {
        await axios.patch(
          `${API_BASE_URL}/teams/${selectedTeam.id}`,
          { team_name, description: String(teamForm.description || '') },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
      }
      setShowTeamModal(false);
      await fetchTeams();
    } catch (e) {
      setTeamsError(e?.response?.data?.detail || e?.message || 'Failed to save team');
    } finally {
      setSavingTeam(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          Teams / Users
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            placeholder={tab === 'teams' ? 'Search Teams' : 'Search Users'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

          {tab === 'teams' ? (
            <MuiButton variant="contained" onClick={openCreateTeam} startIcon={<Plus size={18} />}>
              New Team
            </MuiButton>
          ) : (
            <MuiButton variant="contained" onClick={openCreateUser} startIcon={<Plus size={18} />}>
              Add User
            </MuiButton>
          )}
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="users" label="Users" />
        <Tab value="teams" label="Teams" />
      </Tabs>

      {tab === 'users' ? (
        <Paper variant="outlined">
          {usersError ? (
            <Alert
              severity="error"
              action={(
                <MuiButton color="inherit" size="small" onClick={() => fetchUsers()}>
                  Retry
                </MuiButton>
              )}
            >
              {usersError}
            </Alert>
          ) : null}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Teams</TableCell>
                  <TableCell>Last Visit</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">Loading users…</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">No users found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{ width: 32, height: 32, borderRadius: '999px', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
                            {String(u?.user_name || 'U').trim().slice(0, 1).toUpperCase()}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u?.user_name || 'User'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{u?.role || ''}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <MuiButton size="small" variant="text" onClick={() => openEditUser(u)}>
                            Edit
                          </MuiButton>
                          <MuiButton size="small" color="error" variant="text" onClick={() => handleDeleteUser(u)}>
                            Delete
                          </MuiButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper variant="outlined">
          {teamsError ? (
            <Alert
              severity="error"
              action={(
                <MuiButton color="inherit" size="small" onClick={() => fetchTeams()}>
                  Retry
                </MuiButton>
              )}
            >
              {teamsError}
            </Alert>
          ) : null}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingTeams ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">Loading teams…</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">No teams found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeams.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{t.team_name}</TableCell>
                      <TableCell>{t.description || ''}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <MuiButton size="small" variant="text" color="inherit" onClick={() => openMembers(t)}>
                            Add User
                          </MuiButton>
                          <MuiButton size="small" variant="text" onClick={() => openEditTeam(t)}>
                            Edit
                          </MuiButton>
                          <MuiButton size="small" color="error" variant="text" onClick={() => handleDeleteTeam(t.id)}>
                            Delete
                          </MuiButton>
                          <MuiButton size="small" variant="outlined" color="inherit" sx={{ minWidth: 0, px: 1 }}>
                            <MoreVertical size={16} />
                          </MuiButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={showTeamModal} onClose={() => setShowTeamModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>{teamMode === 'create' ? 'New Team' : 'Edit Team'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Team Name"
              value={teamForm.team_name}
              onChange={(e) => setTeamForm((p) => ({ ...p, team_name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={teamForm.description}
              onChange={(e) => setTeamForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton variant="outlined" color="inherit" onClick={() => setShowTeamModal(false)}>
            Cancel
          </MuiButton>
          <MuiButton variant="contained" onClick={handleSaveTeam} disabled={savingTeam || !String(teamForm.team_name || '').trim()}>
            {savingTeam ? 'Saving…' : 'Save'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={showUserModal} onClose={closeUserModal} fullWidth maxWidth="sm">
        <DialogTitle>{userMode === 'edit' ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Username"
              value={userForm.user_name}
              onChange={(e) => setUserForm((p) => ({ ...p, user_name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
              fullWidth
              helperText={userMode === 'create' ? 'Password is required when creating a user.' : 'Leave blank to keep existing password.'}
            />
            <FormControl fullWidth>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Role</Typography>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                size="small"
              >
                <MenuItem value="admin">admin</MenuItem>
                <MenuItem value="user">user</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton variant="outlined" color="inherit" onClick={closeUserModal}>
            Cancel
          </MuiButton>
          <MuiButton
            variant="contained"
            onClick={handleSaveUser}
            disabled={
              savingUser ||
              !String(userForm.user_name || '').trim() ||
              !String(userForm.role || '').trim() ||
              (userMode === 'create' && !String(userForm.password || '').trim())
            }
          >
            {savingUser ? 'Saving…' : userMode === 'edit' ? 'Save' : 'Add User'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showMembersModal}
        onClose={() => { setShowMembersModal(false); setMembersError(''); cancelEditMember(); }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{selectedTeamForMembers ? `Team: ${selectedTeamForMembers.team_name}` : 'Team Members'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {membersError ? <Alert severity="error">{membersError}</Alert> : null}

            <Paper variant="outlined">
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Members</Typography>
                <MuiButton
                  size="small"
                  variant="text"
                  onClick={() => selectedTeamForMembers?.id ? fetchTeamMembers(selectedTeamForMembers.id) : fetchTeamUserLinks()}
                  disabled={loadingMembers || savingMember}
                >
                  Refresh
                </MuiButton>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingMembers ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">Loading members…</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (teamMembers || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">No members in this team.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (teamMembers || []).map((m) => {
                        const isEditing = Boolean(editingMembership?.oldUserId && editingMembership.oldUserId === String(m?.id));
                        return (
                          <TableRow key={m.id}>
                            <TableCell>{m.user_name || String(m.id)}</TableCell>
                            <TableCell>{m.role || ''}</TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="flex-end">
                                  <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <Select
                                      displayEmpty
                                      value={editingNewUserId}
                                      onChange={(e) => setEditingNewUserId(e.target.value)}
                                    >
                                      <MenuItem value="">Select new user</MenuItem>
                                      {(users || []).filter((u) => String(u?.id) !== String(m?.id)).map((u) => (
                                        <MenuItem key={u.id} value={u.id}>{u.user_name || String(u.id)}</MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                  <MuiButton size="small" variant="text" onClick={handleSaveEditMember} disabled={savingMember || !editingNewUserId}>
                                    Save
                                  </MuiButton>
                                  <MuiButton size="small" variant="text" color="inherit" onClick={cancelEditMember} disabled={savingMember}>
                                    Cancel
                                  </MuiButton>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  <MuiButton size="small" variant="text" onClick={() => startEditMember(m)} disabled={savingMember}>
                                    Edit
                                  </MuiButton>
                                  <MuiButton size="small" color="error" variant="text" onClick={() => handleDeleteMember(m.id)} disabled={savingMember}>
                                    Delete
                                  </MuiButton>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Add user to team</Typography>
              <Grid container spacing={2} alignItems="flex-end" sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth size="small">
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>User</Typography>
                    <Select
                      displayEmpty
                      value={memberUserId}
                      onChange={(e) => setMemberUserId(e.target.value)}
                    >
                      <MenuItem value="">Select user</MenuItem>
                      {availableUsersForTeam.map((u) => (
                        <MenuItem key={u.id} value={u.id}>{u.user_name || String(u.id)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <MuiButton
                    fullWidth
                    variant="contained"
                    onClick={handleAddMember}
                    disabled={savingMember || !memberUserId || !selectedTeamForMembers?.id}
                  >
                    {savingMember ? 'Saving…' : 'Add User'}
                  </MuiButton>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton variant="outlined" color="inherit" onClick={() => { setShowMembersModal(false); setMembersError(''); cancelEditMember(); }}>
            Close
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TeamsUsers;
