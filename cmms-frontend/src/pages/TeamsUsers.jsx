import React, { useEffect, useMemo, useState } from 'react';
import { Search, MoreVertical, Plus } from 'lucide-react';
import axios from 'axios';
import { Button, Modal } from '../components';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams / Users</h1>

        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={tab === 'teams' ? 'Search Teams' : 'Search Users'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          {tab === 'teams' ? (
            <Button onClick={openCreateTeam} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Team
            </Button>
          ) : (
            <Button onClick={openCreateUser} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => setTab('teams')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'teams'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Teams
          </button>
        </nav>
      </div>

      {tab === 'users' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {usersError ? (
            <div className="p-4 border-b border-gray-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
              <div>{usersError}</div>
              <button
                type="button"
                onClick={() => fetchUsers()}
                className="text-sm font-medium text-red-700 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loadingUsers ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-500" colSpan={5}>
                      Loading users…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-500" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-primary-700">
                            {String(u?.user_name || 'U').trim().slice(0, 1).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{u?.user_name || 'User'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u?.role || ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditUser(u)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end px-4 py-3 text-xs text-gray-500 border-t border-gray-200">
            1 – 1 of 1
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {teamsError ? (
            <div className="p-4 border-b border-gray-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
              <div>{teamsError}</div>
              <button
                type="button"
                onClick={() => fetchTeams()}
                className="text-sm font-medium text-red-700 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loadingTeams ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-500" colSpan={3}>
                      Loading teams…
                    </td>
                  </tr>
                ) : filteredTeams.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-500" colSpan={3}>
                      No teams found.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((t) => (
                    <tr key={t.id} className="bg-white">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.team_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{t.description || ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openMembers(t)}
                            className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                          >
                            Add User
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTeam(t)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(t.id)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                          <button type="button" className="p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title={teamMode === 'create' ? 'New Team' : 'Edit Team'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
            <input
              value={teamForm.team_name}
              onChange={(e) => setTeamForm((p) => ({ ...p, team_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Team name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={teamForm.description}
              onChange={(e) => setTeamForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTeamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam} disabled={savingTeam || !String(teamForm.team_name || '').trim()}>
              {savingTeam ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showUserModal}
        onClose={closeUserModal}
        title={userMode === 'edit' ? 'Edit User' : 'Add User'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              value={userForm.user_name}
              onChange={(e) => setUserForm((p) => ({ ...p, user_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeUserModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={
                savingUser ||
                !String(userForm.user_name || '').trim() ||
                !String(userForm.role || '').trim() ||
                (userMode === 'create' && !String(userForm.password || '').trim())
              }
            >
              {savingUser ? 'Saving…' : userMode === 'edit' ? 'Save' : 'Add User'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showMembersModal}
        onClose={() => { setShowMembersModal(false); setMembersError(''); cancelEditMember(); }}
        title={selectedTeamForMembers ? `Team: ${selectedTeamForMembers.team_name}` : 'Team Members'}
        size="lg"
      >
        <div className="space-y-4">
          {membersError ? (
            <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
              {membersError}
            </div>
          ) : null}

          <div className="rounded-md border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Members</div>
              <button
                type="button"
                onClick={() => selectedTeamForMembers?.id ? fetchTeamMembers(selectedTeamForMembers.id) : fetchTeamUserLinks()}
                className="text-sm text-gray-600 hover:text-gray-800"
                disabled={loadingMembers || savingMember}
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loadingMembers ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-gray-500" colSpan={3}>Loading members…</td>
                    </tr>
                  ) : (teamMembers || []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-gray-500" colSpan={3}>No members in this team.</td>
                    </tr>
                  ) : (
                    (teamMembers || []).map((m) => {
                      const isEditing = Boolean(editingMembership?.oldUserId && editingMembership.oldUserId === String(m?.id));
                      return (
                        <tr key={m.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{m.user_name || String(m.id)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{m.role || ''}</td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-2">
                                <select
                                  value={editingNewUserId}
                                  onChange={(e) => setEditingNewUserId(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  <option value="">Select new user</option>
                                  {(users || []).filter((u) => String(u?.id) !== String(m?.id)).map((u) => (
                                    <option key={u.id} value={u.id}>{u.user_name || String(u.id)}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleSaveEditMember}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                  disabled={savingMember || !editingNewUserId}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditMember}
                                  className="text-sm text-gray-600 hover:text-gray-800"
                                  disabled={savingMember}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => startEditMember(m)}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                  disabled={savingMember}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(m.id)}
                                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                                  disabled={savingMember}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Add user to team</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select user</option>
                  {availableUsersForTeam.map((u) => (
                    <option key={u.id} value={u.id}>{u.user_name || String(u.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Button
                  onClick={handleAddMember}
                  disabled={savingMember || !memberUserId || !selectedTeamForMembers?.id}
                  className="w-full"
                >
                  {savingMember ? 'Saving…' : 'Add User'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowMembersModal(false); setMembersError(''); cancelEditMember(); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamsUsers;
