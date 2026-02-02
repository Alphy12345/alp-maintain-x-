import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ChevronDown, SlidersHorizontal, X, ListChecks, Calendar, User, Lock, PauseCircle, RefreshCw, Check } from 'lucide-react';
import axios from 'axios';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Button as MuiButton,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Button, Badge, Modal } from '../components';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const normalizeStatus = (raw) => {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'open';
  if (s === 'on hold' || s === 'onhold' || s === 'hold' || s === 'paused') return 'on_hold';
  if (s === 'on_hold') return 'on_hold';
  if (s === 'in progress' || s === 'inprogress' || s === 'in-progress') return 'in_progress';
  if (s === 'in_progress') return 'in_progress';
  if (s === 'done' || s === 'complete' || s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'open') return 'open';
  return s;
};

const toApiStatus = (uiStatus) => {
  const s = normalizeStatus(uiStatus);
  if (s === 'on_hold') return 'on hold';
  if (s === 'in_progress') return 'in progress';
  if (s === 'completed') return 'done';
  return 'open';
};

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const WorkOrders = () => {
  const { locations, users, currentUser, addUser, addLocation, addAsset, addProcedure, proceduresVersion } = useStore();
  const [apiLocations, setApiLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loadingTeamUsers, setLoadingTeamUsers] = useState(false);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiParts, setApiParts] = useState([]);
  const [apiProcedures, setApiProcedures] = useState([]);
  const [apiProcedureDetailsById, setApiProcedureDetailsById] = useState({});
  const [apiVendors, setApiVendors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workOrderMode, setWorkOrderMode] = useState('create');
  const [editingWorkOrderId, setEditingWorkOrderId] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    description: '',
    teamId: '',
    vendorId: '',
    assetIds: [],
  });
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    locationId: '',
    status: 'running',
    category: 'Uncategorized',
    description: '',
  });
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showCreateProcedureModal, setShowCreateProcedureModal] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [newProcedureForm, setNewProcedureForm] = useState({
    name: '',
    description: null,
    fields: [],
  });
  const [calendarMoreModal, setCalendarMoreModal] = useState({
    open: false,
    dayKey: '',
    dateIso: '',
    items: [],
  });
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const workOrderDetailsRef = useRef(null);
  const [activeTab, setActiveTab] = useState('todo');
  const [viewMode, setViewMode] = useState('list');
  const [calendarMode, setCalendarMode] = useState('month');
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => new Date());
  const dragRafRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    workOrderId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragging: false,
    targetDayKey: '',
    targetDateIso: '',
  });
  const [dragUi, setDragUi] = useState({
    active: false,
    dragging: false,
    x: 0,
    y: 0,
    workOrderId: null,
    targetDayKey: '',
  });
  const [sortBy, setSortBy] = useState('priority_desc');
  const [openFilter, setOpenFilter] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    asset: '',
    dueDatePreset: '',
    dueDateCustom: '',
    categoryId: '',
    part: '',
  });
  const [extraFilterKeys, setExtraFilterKeys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    locationId: '',
    assetName: '',
    assetId: '',
    procedure: '',
    assigneeId: '',
    estimatedHours: '',
    estimatedMinutes: '',
    dueDate: '',
    startDate: '',
    recurrence: 'does_not_repeat',
    recurrenceDays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    recurrenceIntervalWeeks: 1,
    recurrenceIntervalMonths: 1,
    recurrenceDayOfMonth: new Date().getDate(),
    recurrenceWeekOfMonth: 1,
    recurrenceWeekday: 'mon',
    recurrenceIntervalYears: 1,
    status: 'open',
    workType: 'reactive',
    priority: 'low',
    teamId: '',
    parts: '',
    categoryId: '',
    vendorId: '',
  });

  const locationsOptions = useMemo(() => (Array.isArray(apiLocations) ? apiLocations : []), [apiLocations]);

  const assetsById = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(String(a.id), a);
    return map;
  }, [assets]);

  const teamsById = useMemo(() => {
    const map = new Map();
    for (const t of teams) map.set(String(t.id), t);
    return map;
  }, [teams]);

  const fetchAssets = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } });
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAssets([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/locations`, { headers: { accept: 'application/json' } });
      setApiLocations(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiLocations([]);
    }
  };

  const fetchTeamUsers = async (teamId) => {
    if (!teamId) {
      setTeamUsers([]);
      return;
    }
    setLoadingTeamUsers(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/team-users/teams/${teamId}`, { headers: { accept: 'application/json' } });
      const members = Array.isArray(res?.data?.users) ? res.data.users : [];
      setTeamUsers(members);
    } catch {
      setTeamUsers([]);
    } finally {
      setLoadingTeamUsers(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teams`, { headers: { accept: 'application/json' } });
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTeams([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/categories`, { headers: { accept: 'application/json' } });
      setApiCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiCategories([]);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/parts`, { headers: { accept: 'application/json' } });
      setApiParts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiParts([]);
    }
  };

  const fetchProcedures = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/procedures`, { headers: { accept: 'application/json' } });
      setApiProcedures(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiProcedures([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`, { headers: { accept: 'application/json' } });
      setApiVendors(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiVendors([]);
    }
  };

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/work-orders`, { headers: { accept: 'application/json' } });
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((wo) => {
        const estimatedDuration = (Number(wo.estimated_time_hours || 0) * 60) + Number(wo.estimated_time_minutes || 0);
        const dueIso = wo.due_date ? new Date(wo.due_date).toISOString() : undefined;
        const startIso = wo.start_date ? new Date(wo.start_date).toISOString() : undefined;
        const scheduledIso = (wo.scheduled_date || wo.scheduledDate)
          ? new Date(wo.scheduled_date || wo.scheduledDate).toISOString()
          : undefined;

        const rawStatus = wo.status ?? wo.work_order_status ?? wo.workOrderStatus ?? wo.state ?? wo.work_order_state;
        const idStr = String(wo.id);

        const procedureId = wo.procedure_id ?? wo.procedureId ?? wo.procedure ?? '';
        const categoryFromArray = Array.isArray(wo.categories) && wo.categories.length > 0 ? wo.categories[0] : null;
        const categoryId = (categoryFromArray?.id ?? (Array.isArray(wo.category_ids) ? wo.category_ids[0] : (wo.category_id ?? wo.categoryId ?? '')));
        const vendorId = wo.vendor_id ?? wo.vendorId ?? '';
        const partFromArray = Array.isArray(wo.parts) && wo.parts.length > 0 ? wo.parts[0] : null;
        const partId = (partFromArray?.id ?? (Array.isArray(wo.part_ids) ? wo.part_ids[0] : (wo.part_id ?? wo.partId ?? wo.part ?? '')));
        const recurrence = wo.recurrence || 'does_not_repeat';
        const baseForDefaults = startIso ? new Date(startIso) : (scheduledIso ? new Date(scheduledIso) : (dueIso ? new Date(dueIso) : new Date()));
        const dayOfMonthDefault = baseForDefaults.getDate();
        const weekdayKeyMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const weekdayDefault = weekdayKeyMap[baseForDefaults.getDay()] || 'mon';

        const normalizeDayKeys = (val) => {
          const list = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',') : []);
          const cleaned = list
            .map((x) => String(x || '').trim().toLowerCase())
            .map((x) => (x.startsWith('thu') ? 'thu' : x))
            .filter(Boolean);
          const valid = new Set(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
          const out = cleaned.filter((k) => valid.has(k));
          return out.length ? out : [];
        };

        const recurrenceDays = normalizeDayKeys(wo.recurrence_days ?? wo.recurrenceDays);
        const recurrenceIntervalWeeks = wo.recurrence_interval_weeks ?? wo.recurrenceIntervalWeeks;
        const recurrenceIntervalMonths = wo.recurrence_interval_months ?? wo.recurrenceIntervalMonths;
        const recurrenceIntervalYears = wo.recurrence_interval_years ?? wo.recurrenceIntervalYears;
        const recurrenceDayOfMonth = wo.recurrence_day_of_month ?? wo.recurrenceDayOfMonth;
        const recurrenceWeekOfMonth = wo.recurrence_week_of_month ?? wo.recurrenceWeekOfMonth;
        const recurrenceWeekday = wo.recurrence_weekday ?? wo.recurrenceWeekday;

        const assignedUser = wo.assigned_user || wo.assignedUser || null;
        const assigneeName =
          assignedUser?.user_name ||
          assignedUser?.name ||
          assignedUser?.username ||
          '';

        return {
          id: idStr,
          title: wo.name || '',
          description: wo.description || '',
          estimatedDuration: estimatedDuration || undefined,
          dueDate: dueIso,
          startDate: startIso,
          scheduledDate: scheduledIso,
          recurrence,
          recurrenceDays: recurrenceDays.length ? recurrenceDays : (recurrence === 'daily' ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] : (recurrence === 'weekly' ? [weekdayDefault] : [])),
          recurrenceIntervalWeeks: Math.max(1, parseInt(String(recurrenceIntervalWeeks || 1), 10) || 1),
          recurrenceIntervalMonths: Math.max(1, parseInt(String(recurrenceIntervalMonths || 1), 10) || 1),
          recurrenceIntervalYears: Math.max(1, parseInt(String(recurrenceIntervalYears || 1), 10) || 1),
          recurrenceDayOfMonth: Math.min(31, Math.max(1, parseInt(String(recurrenceDayOfMonth || dayOfMonthDefault), 10) || dayOfMonthDefault)),
          recurrenceWeekOfMonth: Math.min(5, Math.max(1, parseInt(String(recurrenceWeekOfMonth || 1), 10) || 1)),
          recurrenceWeekday: String(recurrenceWeekday || weekdayDefault),
          workType: wo.work_type || 'reactive',
          priority: wo.priority || 'low',
          locationId: wo.location || '',
          assetId: wo.asset_id ? String(wo.asset_id) : '',
          teamId: wo.team_id ? String(wo.team_id) : '',
          procedure: procedureId ? String(procedureId) : '',
          categoryId: categoryId ? String(categoryId) : '',
          vendorId: vendorId ? String(vendorId) : '',
          partId: partId ? String(partId) : '',
          categoryIds: Array.isArray(wo.category_ids)
            ? wo.category_ids.map((id) => String(id))
            : (Array.isArray(wo.categories) ? wo.categories.map((c) => String(c?.id)).filter(Boolean) : []),
          partIds: Array.isArray(wo.part_ids)
            ? wo.part_ids.map((id) => String(id))
            : (Array.isArray(wo.parts) ? wo.parts.map((p) => String(p?.id)).filter(Boolean) : []),
          status: normalizeStatus(rawStatus),
          assigneeId: wo.assigned_user_id ? String(wo.assigned_user_id) : (wo.assignee_id ? String(wo.assignee_id) : (wo.assigneeId ? String(wo.assigneeId) : '')),
          assigneeName,
        };
      });
      setWorkOrders(mapped);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchAssets();
    fetchTeams();
    fetchCategories();
    fetchParts();
    fetchProcedures();
    fetchVendors();
    fetchWorkOrders();
  }, []);

  useEffect(() => {
    let es;
    try {
      es = new EventSource(`${API_BASE_URL}/events/work-orders`);

      const onWorkOrderEvent = () => {
        fetchWorkOrders();
      };

      es.addEventListener('work_order', onWorkOrderEvent);

      return () => {
        try {
          es.removeEventListener('work_order', onWorkOrderEvent);
          es.close();
        } catch {
        }
      };
    } catch {
      return undefined;
    }
  }, []);

  const handleCreateCategoryFromWorkOrder = async () => {
    const name = window.prompt('Enter category name');
    const trimmed = String(name || '').trim();
    if (!trimmed) return;

    setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/categories`,
        { name: trimmed },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      await fetchCategories();
      const created = res?.data;
      if (created?.id !== undefined && created?.id !== null) {
        setCreateForm((p) => ({ ...p, categoryId: String(created.id) }));
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to create category');
    }
  };

  const priorityRank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const getAssetName = (assetId) => {
    const asset = assetsById.get(String(assetId));
    return asset?.asset_name || asset?.name || 'Unknown Asset';
  };

  const getTeamName = (teamId) => {
    const team = teamsById.get(String(teamId));
    return team?.team_name || '';
  };

  const getLocationName = (locationId) => {
    const idStr = String(locationId ?? '').trim();
    if (!idStr) return 'Unknown Location';
    const api = (Array.isArray(apiLocations) ? apiLocations : []).find((l) => String(l?.id) === idStr);
    if (api?.name) return api.name;
    const list = Array.isArray(locations) ? locations : [];
    const fallback = list.find(l => String(l?.id) === idStr);
    if (fallback?.name) return fallback.name;
    return idStr;
  };

  const getAssigneeName = (assigneeId) => {
    const id = assigneeId === null || assigneeId === undefined ? '' : String(assigneeId);
    if (!id) return 'Unassigned';
    const user = (Array.isArray(users) ? users : []).find((u) => String(u?.id) === id);
    return user?.user_name || user?.name || user?.username || 'Unassigned';
  };

  const getAssigneeLabel = (wo) => {
    if (!wo) return 'Unassigned';
    const direct = String(wo?.assigneeName || '').trim();
    if (direct) return direct;
    const fromUsers = getAssigneeName(wo?.assigneeId);
    if (fromUsers && fromUsers !== 'Unassigned') return fromUsers;
    const id = wo?.assigneeId === null || wo?.assigneeId === undefined ? '' : String(wo.assigneeId).trim();
    return id ? `User #${id}` : 'Unassigned';
  };

  const getCategoryName = (categoryId) => {
    const c = (apiCategories || []).find((x) => String(x.id) === String(categoryId));
    return c?.name || '';
  };

  const getPartName = (partId) => {
    const p = (apiParts || []).find((x) => String(x.id) === String(partId));
    return p?.name || '';
  };

  const getVendorName = (vendorId) => {
    const v = (apiVendors || []).find((x) => String(x.id) === String(vendorId));
    return v?.name || '';
  };

  const getProcedureName = (procedureId) => {
    const p = (apiProcedures || []).find((x) => String(x.id) === String(procedureId));
    return p?.name || '';
  };

  const fetchProcedureDetails = useCallback(async (procedureId) => {
    const id = String(procedureId || '').trim();
    if (!id) return null;
    if (Object.prototype.hasOwnProperty.call(apiProcedureDetailsById, id)) return apiProcedureDetailsById[id];
    try {
      const res = await axios.get(`${API_BASE_URL}/procedures/${id}`, { headers: { accept: 'application/json' } });
      const proc = res?.data;
      setApiProcedureDetailsById((prev) => ({ ...prev, [id]: proc }));
      return proc;
    } catch {
      setApiProcedureDetailsById((prev) => ({ ...prev, [id]: null }));
      return null;
    }
  }, [apiProcedureDetailsById]);

  const renderProcedureSteps = (procedureId) => {
    const id = String(procedureId || '').trim();
    if (!id) return null;
    const proc = Object.prototype.hasOwnProperty.call(apiProcedureDetailsById, id) ? apiProcedureDetailsById[id] : undefined;
    const sections = Array.isArray(proc?.sections) ? proc.sections : [];

    if (proc === undefined) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Loading procedure steps…
          </Typography>
        </Box>
      );
    }

    if (proc === null) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Unable to load procedure steps.
          </Typography>
        </Box>
      );
    }

    if (sections.length === 0) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            No steps found for this procedure.
          </Typography>
        </Box>
      );
    }

    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">
          Procedure Details
        </Typography>
        <Stack spacing={2}>
          {sections
            .slice()
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
            .map((sec) => {
              const fields = Array.isArray(sec?.fields) ? sec.fields : [];
              return (
                <Paper key={sec?.id ?? `${id}-sec-${sec?.order ?? ''}-${sec?.title ?? ''}`} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {sec?.title || 'Untitled section'}
                  </Typography>
                  {sec?.description ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {sec.description}
                    </Typography>
                  ) : null}

                  {fields.length > 0 ? (
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      {fields
                        .slice()
                        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
                        .map((f) => {
                          const cfgOptions = Array.isArray(f?.config?.options) ? f.config.options : [];
                          const options = cfgOptions.length ? cfgOptions : (Array.isArray(f?.options) ? f.options : []);
                          return (
                            <Paper
                              key={f?.id ?? `${id}-field-${f?.order ?? ''}-${f?.label ?? ''}`}
                              variant="outlined"
                              sx={{ p: 1.5, bgcolor: 'action.hover' }}
                            >
                              <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {f?.label || 'Untitled field'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {String(f?.field_type || 'text')}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {Number(f?.required) ? 'Required' : 'Optional'}
                              </Typography>
                              {f?.help_text ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {f.help_text}
                                </Typography>
                              ) : null}
                              {options.length > 0 ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Options: {options.map((o) => String(o?.label ?? o ?? '').trim()).filter(Boolean).join(', ')}
                                </Typography>
                              ) : null}
                            </Paper>
                          );
                        })}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      No fields
                    </Typography>
                  )}
                </Paper>
              );
            })}
        </Stack>

        {viewMode === 'calendar' && dragUi.active ? (
          <Typography variant="body2" color="text.secondary">
            Dragging work order: <Box component="span" sx={{ fontWeight: 800 }}>{String(dragUi.workOrderId)}</Box>
          </Typography>
        ) : null}
      </Stack>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: 'warning', label: 'Open' },
      on_hold: { variant: 'default', label: 'On Hold' },
      in_progress: { variant: 'info', label: 'In Progress' },
      completed: { variant: 'success', label: 'Completed' },
      cancelled: { variant: 'danger', label: 'Cancelled' }
    };
    
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: { variant: 'default', label: 'Low' },
      medium: { variant: 'info', label: 'Medium' },
      high: { variant: 'warning', label: 'High' },
      critical: { variant: 'danger', label: 'Critical' }
    };
    
    const config = variants[priority] || { variant: 'default', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isDoneStatus = (status) => status === 'completed' || status === 'cancelled';

  const isSameDay = (a, b) => (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const endOfDay = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const matchesDueDateFilter = (wo) => {
    if (!filters.dueDatePreset) return true;
    if (!wo.dueDate) return false;

    const due = new Date(wo.dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);
    const in7 = new Date(todayStart);
    in7.setDate(in7.getDate() + 7);
    const in30 = new Date(todayStart);
    in30.setDate(in30.getDate() + 30);

    if (filters.dueDatePreset === 'today') return due >= todayStart && due <= todayEnd;
    if (filters.dueDatePreset === 'tomorrow') return due >= tomorrowStart && due <= tomorrowEnd;
    if (filters.dueDatePreset === 'next_7') return due >= todayStart && due < endOfDay(in7);
    if (filters.dueDatePreset === 'next_30') return due >= todayStart && due < endOfDay(in30);
    if (filters.dueDatePreset === 'this_month') {
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
    }
    if (filters.dueDatePreset === 'overdue') return due < todayStart;
    if (filters.dueDatePreset === 'custom') {
      if (!filters.dueDateCustom) return true;
      const custom = new Date(filters.dueDateCustom);
      if (Number.isNaN(custom.getTime())) return true;
      return isSameDay(due, custom);
    }
    return true;
  };

  const filteredWorkOrders = workOrders
    .filter((wo) => {
      const matchesSearch = (wo.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(wo.id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab = activeTab === 'done'
        ? isDoneStatus(wo.status)
        : !isDoneStatus(wo.status);

      const matchesStatus = !filters.status || wo.status === filters.status;
      const matchesPriority = !filters.priority || wo.priority === filters.priority;
      const matchesAsset = !filters.asset || wo.assetId === filters.asset;
      const matchesDueDate = matchesDueDateFilter(wo);

      const matchesCategory = !filters.categoryId || wo.categoryId === filters.categoryId;
      const matchesPart = !filters.part || wo.partId === filters.part;

      return matchesSearch && matchesTab && matchesStatus && matchesPriority && matchesAsset && matchesDueDate && matchesCategory && matchesPart;
    })
    .sort((a, b) => {
      if (sortBy === 'priority_desc') return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      if (sortBy === 'priority_asc') return (priorityRank[a.priority] || 0) - (priorityRank[b.priority] || 0);
      if (sortBy === 'due_asc') return new Date(a.dueDate || '2999-12-31').getTime() - new Date(b.dueDate || '2999-12-31').getTime();
      if (sortBy === 'due_desc') return new Date(b.dueDate || '0000-01-01').getTime() - new Date(a.dueDate || '0000-01-01').getTime();
      return 0;
    });

  const selectedWorkOrder = workOrders.find((wo) => wo.id === selectedWorkOrderId) || null;

  useEffect(() => {
    const id = String(createForm.procedure || '').trim();
    if (!id) return;
    fetchProcedureDetails(id);
  }, [createForm.procedure, fetchProcedureDetails]);

  const parseIsoToDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const getCalendarDateForWorkOrder = (wo) => {
    const start = parseIsoToDate(wo?.startDate);
    if (start) return start;
    const scheduled = parseIsoToDate(wo?.scheduledDate);
    if (scheduled) return scheduled;
    const due = parseIsoToDate(wo?.dueDate);
    if (due) return due;
    return null;
  };

  const startOfWeekMonday = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x;
  };

  const sameDay = (a, b) => (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );

  const addMonths = (d, months) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDate();
    x.setDate(1);
    x.setMonth(x.getMonth() + Number(months || 0));
    const maxDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, maxDay));
    return x;
  };

  const getNthWeekdayOfMonth = (year, monthIndex, weekdayIndex, nth) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    if (nth === 5) {
      // last
      for (let day = lastDay; day >= 1; day -= 1) {
        const d = new Date(year, monthIndex, day);
        if (d.getDay() === weekdayIndex) return d;
      }
      return null;
    }

    let count = 0;
    for (let day = 1; day <= lastDay; day += 1) {
      const d = new Date(year, monthIndex, day);
      if (d.getDay() === weekdayIndex) {
        count += 1;
        if (count === nth) return d;
      }
    }
    return null;
  };

  const getOccurrencesInRange = (wo, rangeStart, rangeEnd) => {
    const anchor = getCalendarDateForWorkOrder(wo);
    if (!anchor) return [];

    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
    const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());

    const rec = String(wo?.recurrence || 'does_not_repeat');
    const out = [];
    const pushIfIn = (d) => {
      if (!d) return;
      const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dd.getTime() < start.getTime() || dd.getTime() > end.getTime()) return;
      if (dd.getTime() < anchorDay.getTime()) return;
      out.push(dd);
    };

    if (rec === 'does_not_repeat') {
      pushIfIn(anchorDay);
      return out;
    }

    // Daily
    if (rec === 'daily') {
      const interval = Math.max(1, parseInt(String(wo?.recurrenceIntervalDays || 1), 10) || 1);
      const dayKeys = Array.isArray(wo?.recurrenceDays) && wo.recurrenceDays.length
        ? wo.recurrenceDays
        : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const allowed = new Set(dayKeys);
      const weekdayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

      let d = new Date(Math.max(start.getTime(), anchorDay.getTime()));
      const delta = Math.max(0, diffDays(anchorDay, d));
      const offset = delta % interval;
      if (offset !== 0) d = addDays(d, interval - offset);

      let guard = 0;
      while (d.getTime() <= end.getTime() && guard < 400) {
        const k = weekdayMap[d.getDay()];
        if (allowed.has(k)) pushIfIn(d);
        d = addDays(d, interval);
        guard += 1;
      }
      return out;
    }

    // Weekly
    if (rec === 'weekly') {
      const intervalWeeks = Math.max(1, parseInt(String(wo?.recurrenceIntervalWeeks || 1), 10) || 1);
      const days = Array.isArray(wo?.recurrenceDays) && wo.recurrenceDays.length ? wo.recurrenceDays : ['mon'];
      const weekdayIndexMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

      const week0 = startOfWeekMonday(anchorDay);
      const startWeek = startOfWeekMonday(new Date(Math.max(start.getTime(), anchorDay.getTime())));
      const weeksBetween = Math.floor(diffDays(week0, startWeek) / 7);
      const offsetWeeks = ((weeksBetween % intervalWeeks) + intervalWeeks) % intervalWeeks;
      const firstWeek = offsetWeeks === 0 ? startWeek : addDays(startWeek, (intervalWeeks - offsetWeeks) * 7);

      let wk = new Date(firstWeek);
      let guard = 0;
      while (wk.getTime() <= end.getTime() && guard < 200) {
        for (const k of days) {
          const targetDow = weekdayIndexMap[String(k || '').toLowerCase()] ?? 1;
          // wk is Monday-start
          const d = addDays(wk, (targetDow + 6) % 7);
          pushIfIn(d);
        }
        wk = addDays(wk, intervalWeeks * 7);
        guard += 1;
      }
      return out;
    }

    // Monthly by date
    if (rec === 'monthly_by_date') {
      const intervalMonths = Math.max(1, parseInt(String(wo?.recurrenceIntervalMonths || 1), 10) || 1);
      const dom = Math.min(31, Math.max(1, parseInt(String(wo?.recurrenceDayOfMonth || anchorDay.getDate()), 10) || anchorDay.getDate()));

      const anchorMonthStart = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1);
      let curMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      if (curMonthStart.getTime() < anchorMonthStart.getTime()) curMonthStart = anchorMonthStart;

      const monthsBetween = (curMonthStart.getFullYear() - anchorMonthStart.getFullYear()) * 12 + (curMonthStart.getMonth() - anchorMonthStart.getMonth());
      const offset = ((monthsBetween % intervalMonths) + intervalMonths) % intervalMonths;
      if (offset !== 0) curMonthStart = addMonths(curMonthStart, intervalMonths - offset);

      let guard = 0;
      while (curMonthStart.getTime() <= end.getTime() && guard < 200) {
        const maxDay = new Date(curMonthStart.getFullYear(), curMonthStart.getMonth() + 1, 0).getDate();
        const d = new Date(curMonthStart.getFullYear(), curMonthStart.getMonth(), Math.min(dom, maxDay));
        pushIfIn(d);
        curMonthStart = addMonths(curMonthStart, intervalMonths);
        guard += 1;
      }
      return out;
    }

    // Monthly by weekday
    if (rec === 'monthly_by_weekday') {
      const intervalMonths = Math.max(1, parseInt(String(wo?.recurrenceIntervalMonths || 1), 10) || 1);
      const nth = Math.min(5, Math.max(1, parseInt(String(wo?.recurrenceWeekOfMonth || 1), 10) || 1));
      const weekdayIndexMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const weekdayKey = String(wo?.recurrenceWeekday || 'mon').toLowerCase();
      const weekdayIdx = weekdayIndexMap[weekdayKey] ?? 1;

      const anchorMonthStart = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1);
      let curMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      if (curMonthStart.getTime() < anchorMonthStart.getTime()) curMonthStart = anchorMonthStart;

      const monthsBetween = (curMonthStart.getFullYear() - anchorMonthStart.getFullYear()) * 12 + (curMonthStart.getMonth() - anchorMonthStart.getMonth());
      const offset = ((monthsBetween % intervalMonths) + intervalMonths) % intervalMonths;
      if (offset !== 0) curMonthStart = addMonths(curMonthStart, intervalMonths - offset);

      let guard = 0;
      while (curMonthStart.getTime() <= end.getTime() && guard < 200) {
        const d = getNthWeekdayOfMonth(curMonthStart.getFullYear(), curMonthStart.getMonth(), weekdayIdx, nth);
        pushIfIn(d);
        curMonthStart = addMonths(curMonthStart, intervalMonths);
        guard += 1;
      }
      return out;
    }

    // Quarterly (every 3 months from anchor)
    if (rec === 'quarterly') {
      const interval = 3;
      const anchorMonthStart = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1);
      let curMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      if (curMonthStart.getTime() < anchorMonthStart.getTime()) curMonthStart = anchorMonthStart;

      const monthsBetween = (curMonthStart.getFullYear() - anchorMonthStart.getFullYear()) * 12 + (curMonthStart.getMonth() - anchorMonthStart.getMonth());
      const offset = ((monthsBetween % interval) + interval) % interval;
      if (offset !== 0) curMonthStart = addMonths(curMonthStart, interval - offset);

      const dom = anchorDay.getDate();
      let guard = 0;
      while (curMonthStart.getTime() <= end.getTime() && guard < 100) {
        const maxDay = new Date(curMonthStart.getFullYear(), curMonthStart.getMonth() + 1, 0).getDate();
        pushIfIn(new Date(curMonthStart.getFullYear(), curMonthStart.getMonth(), Math.min(dom, maxDay)));
        curMonthStart = addMonths(curMonthStart, interval);
        guard += 1;
      }
      return out;
    }

    // Yearly
    if (rec === 'yearly') {
      const intervalYears = Math.max(1, parseInt(String(wo?.recurrenceIntervalYears || 1), 10) || 1);
      const monthIndex = anchorDay.getMonth();
      const dom = anchorDay.getDate();

      let year = Math.max(anchorDay.getFullYear(), start.getFullYear());
      const yearsBetween = year - anchorDay.getFullYear();
      const offset = ((yearsBetween % intervalYears) + intervalYears) % intervalYears;
      if (offset !== 0) year += intervalYears - offset;

      let guard = 0;
      while (year <= end.getFullYear() && guard < 50) {
        const maxDay = new Date(year, monthIndex + 1, 0).getDate();
        const d = new Date(year, monthIndex, Math.min(dom, maxDay));
        pushIfIn(d);
        year += intervalYears;
        guard += 1;
      }
      return out;
    }

    // Fallback
    pushIfIn(anchorDay);
    return out;
  };

  const calendarDays = useMemo(() => {
    if (calendarMode === 'week') {
      const start = startOfWeekMonday(calendarAnchorDate);
      return Array.from({ length: 7 }, (_v, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      });
    }

    const year = calendarAnchorDate.getFullYear();
    const month = calendarAnchorDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_v, i) => new Date(year, month, i + 1));
  }, [calendarAnchorDate, calendarMode]);

  const calendarMonthLeadingBlanks = useMemo(() => {
    if (calendarMode !== 'month') return 0;
    const year = calendarAnchorDate.getFullYear();
    const month = calendarAnchorDate.getMonth();
    const first = new Date(year, month, 1);
    const jsDow = first.getDay();
    // Monday-first index: Mon=0..Sun=6
    return (jsDow + 6) % 7;
  }, [calendarAnchorDate, calendarMode]);

  const calendarMonthTrailingBlanks = useMemo(() => {
    if (calendarMode !== 'month') return 0;
    const total = calendarMonthLeadingBlanks + (Array.isArray(calendarDays) ? calendarDays.length : 0);
    const rem = total % 7;
    return rem === 0 ? 0 : (7 - rem);
  }, [calendarDays, calendarMode, calendarMonthLeadingBlanks]);

  const workOrdersByDay = useMemo(() => {
    const map = new Map();
    const days = Array.isArray(calendarDays) ? calendarDays : [];
    if (!days.length) return map;

    const rangeStart = new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate());
    const rangeEnd = new Date(days[days.length - 1].getFullYear(), days[days.length - 1].getMonth(), days[days.length - 1].getDate());

    (filteredWorkOrders || []).forEach((wo) => {
      const occ = getOccurrencesInRange(wo, rangeStart, rangeEnd);
      occ.forEach((d) => {
        const key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        const cur = map.get(key) || [];
        cur.push({ ...wo, __occKey: `${wo.id}-${key}` });
        map.set(key, cur);
      });
    });

    // stable ordering within a day
    for (const [k, list] of map.entries()) {
      map.set(k, (list || []).slice().sort((a, b) => String(a?.priority || '').localeCompare(String(b?.priority || ''))));
    }

    return map;
  }, [filteredWorkOrders, calendarDays]);

  const toDateOnlyIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const dateOnlyToSafeIso = (dateOnly) => {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dateOnly || '').trim());
    if (!m) return undefined;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!y || !mo || !da) return undefined;
    // Use local noon to avoid timezone shifting across date boundaries
    const dt = new Date(y, mo - 1, da, 12, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt.toISOString();
  };

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
  }

  function diffDays(a, b) {
    const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const ms = b0.getTime() - a0.getTime();
    return Math.round(ms / (24 * 60 * 60 * 1000));
  }

  const formatShort = (iso, style = 'month_day') => {
    const d = parseIsoToDate(iso);
    if (!d) return '';
    try {
      if (style === 'weekday_day') {
        return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' });
      }
      return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCalendarDrop = async (workOrderId, targetDate) => {
    const dateOnly = toDateOnlyIso(targetDate);
    if (!workOrderId || !dateOnly) return;

    const targetStart = new Date(dateOnly);
    const current = (workOrders || []).find((wo) => String(wo?.id) === String(workOrderId));
    const currentStart = parseIsoToDate(current?.startDate) || parseIsoToDate(current?.scheduledDate) || parseIsoToDate(current?.dueDate);
    const currentDue = parseIsoToDate(current?.dueDate);
    const durationDays = (currentStart && currentDue) ? diffDays(currentStart, currentDue) : 0;
    const newDueDate = addDays(targetStart, durationDays);
    const newDueDateOnly = toDateOnlyIso(newDueDate);

    setError('');
    try {
      // Optimistic UI update
      setWorkOrders((prev) => (prev || []).map((wo) => {
        if (String(wo.id) !== String(workOrderId)) return wo;
        const startIso = dateOnlyToSafeIso(dateOnly);
        const dueIso = dateOnlyToSafeIso(newDueDateOnly);
        return { ...wo, startDate: startIso, scheduledDate: startIso, dueDate: dueIso };
      }));

      await axios.patch(
        `${API_BASE_URL}/work-orders/${workOrderId}`,
        { start_date: dateOnly, due_date: newDueDateOnly, scheduled_date: dateOnly },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      await fetchWorkOrders();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to reschedule work order');
      await fetchWorkOrders();
    }
  };

  const updateDragUi = () => {
    const s = dragStateRef.current;
    setDragUi({
      active: s.active,
      dragging: s.dragging,
      x: s.lastX,
      y: s.lastY,
      workOrderId: s.workOrderId,
      targetDayKey: s.targetDayKey,
    });
  };

  const scheduleDragUiUpdate = () => {
    if (dragRafRef.current) return;
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null;
      updateDragUi();
    });
  };

  const clearDrag = () => {
    const s = dragStateRef.current;
    s.active = false;
    s.pointerId = null;
    s.workOrderId = null;
    s.startX = 0;
    s.startY = 0;
    s.lastX = 0;
    s.lastY = 0;
    s.dragging = false;
    s.targetDayKey = '';
    s.targetDateIso = '';
    setDragUi({ active: false, dragging: false, x: 0, y: 0, workOrderId: null, targetDayKey: '' });
  };

  const findDropTarget = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return { dayKey: '', dateIso: '' };
    const cell = el.closest?.('[data-cal-daykey]');
    if (!cell) return { dayKey: '', dateIso: '' };
    return {
      dayKey: cell.getAttribute('data-cal-daykey') || '',
      dateIso: cell.getAttribute('data-cal-dateonly') || cell.getAttribute('data-cal-dateiso') || '',
    };
  };

  const dateOnlyToLocalDate = (dateOnly) => {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dateOnly || '').trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!y || !mo || !da) return null;
    const d = new Date(y, mo - 1, da);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const onCalendarPointerMove = (e) => {
    const s = dragStateRef.current;
    if (!s.active) return;
    if (s.pointerId !== null && e.pointerId !== s.pointerId) return;
    s.lastX = e.clientX;
    s.lastY = e.clientY;

    const dx = Math.abs(e.clientX - s.startX);
    const dy = Math.abs(e.clientY - s.startY);
    if (!s.dragging && (dx > 6 || dy > 6)) {
      s.dragging = true;
    }

    const t = findDropTarget(e.clientX, e.clientY);
    s.targetDayKey = t.dayKey;
    s.targetDateIso = t.dateIso;
    scheduleDragUiUpdate();
  };

  const onCalendarPointerUp = async (e) => {
    const s = dragStateRef.current;
    if (!s.active) return;
    if (s.pointerId !== null && e.pointerId !== s.pointerId) return;

    const workOrderId = s.workOrderId;
    const dragging = s.dragging;
    const t = findDropTarget(e.clientX, e.clientY);
    const dateIso = t.dateIso || s.targetDateIso;
    clearDrag();

    try {
      window.removeEventListener('pointermove', onCalendarPointerMove);
      window.removeEventListener('pointerup', onCalendarPointerUp);
      window.removeEventListener('pointercancel', onCalendarPointerUp);
    } catch {
      // noop
    }

    if (!workOrderId) return;
    if (!dragging) {
      setViewMode('list');
      setSelectedWorkOrderId(workOrderId);
      return;
    }
    if (!dateIso) return;
    const localDate = dateOnlyToLocalDate(dateIso);
    if (!localDate) return;
    await handleCalendarDrop(workOrderId, localDate);
  };

  useEffect(() => {
    setApiProcedureDetailsById({});
    fetchProcedures();
  }, [proceduresVersion]);

  useEffect(() => {
    const id = String(selectedWorkOrder?.procedure || '').trim();
    if (!id) return;
    fetchProcedureDetails(id);
  }, [selectedWorkOrder?.procedure, fetchProcedureDetails]);

  useEffect(() => {
    if (!selectedWorkOrderId) return;
    if (!workOrderDetailsRef.current) return;
    try {
      workOrderDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // noop
    }
  }, [selectedWorkOrderId]);

  const clearAllFilters = () => {
    setFilters({ status: '', priority: '', asset: '', dueDatePreset: '', dueDateCustom: '', categoryId: '', part: '' });
    setExtraFilterKeys([]);
    setOpenFilter('');
  };

  const handleStatusChange = async (workOrderId, newStatus) => {
    if (!workOrderId) return;
    setError('');
    setSaving(true);
    try {
      const normalized = normalizeStatus(newStatus);

      const apiStatus = toApiStatus(normalized);

      setWorkOrders((prev) => prev.map((wo) => (
        String(wo.id) === String(workOrderId)
          ? { ...wo, status: normalized }
          : wo
      )));

      if (normalized === 'completed') {
        setActiveTab('done');
        setSelectedWorkOrderId(String(workOrderId));
      }

      await axios.patch(
        `${API_BASE_URL}/work-orders/${workOrderId}`,
        { status: apiStatus, work_order_status: apiStatus, state: apiStatus },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      await fetchWorkOrders();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to update status');
      await fetchWorkOrders();
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      locationId: '',
      assetName: '',
      assetId: '',
      procedure: '',
      assigneeId: '',
      estimatedHours: '',
      estimatedMinutes: '',
      dueDate: '',
      startDate: '',
      recurrence: 'does_not_repeat',
      recurrenceDays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      recurrenceIntervalWeeks: 1,
      recurrenceIntervalMonths: 1,
      recurrenceDayOfMonth: new Date().getDate(),
      recurrenceWeekOfMonth: 1,
      recurrenceWeekday: 'mon',
      recurrenceIntervalYears: 1,
      status: 'open',
      workType: 'reactive',
      priority: 'low',
      teamId: '',
      parts: '',
      categoryId: '',
      vendorId: '',
    });
    setTeamUsers([]);
  };

  const openCreateWorkOrder = () => {
    setWorkOrderMode('create');
    setEditingWorkOrderId(null);
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openEditWorkOrder = (wo) => {
    if (!wo) return;
    setWorkOrderMode('edit');
    setEditingWorkOrderId(wo.id);

    const duration = Number(wo.estimatedDuration || 0);
    const hours = duration ? Math.floor(duration / 60) : 0;
    const minutes = duration ? duration % 60 : 0;

    const toDateInput = (isoOrDate) => {
      if (!isoOrDate) return '';
      try {
        const d = new Date(isoOrDate);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };

    const locStr = typeof wo.locationId === 'string' ? wo.locationId : '';
    const matchByName = (Array.isArray(apiLocations) ? apiLocations : []).find((l) => String(l?.name || '').trim() === String(locStr || '').trim());

    setCreateForm((p) => ({
      ...p,
      title: wo.title || '',
      description: wo.description || '',
      locationId: matchByName?.id ? String(matchByName.id) : '',
      assetId: wo.assetId ? String(wo.assetId) : '',
      assetName: wo.assetId ? String(getAssetName(wo.assetId) || '') : '',
      procedure: wo.procedure ? String(wo.procedure) : '',
      teamId: wo.teamId ? String(wo.teamId) : '',
      assigneeId: wo.assigneeId ? String(wo.assigneeId) : '',
      status: normalizeStatus(wo.status),
      estimatedHours: String(hours || ''),
      estimatedMinutes: String(minutes || ''),
      dueDate: toDateInput(wo.dueDate),
      startDate: toDateInput(wo.startDate),
      recurrence: wo.recurrence || 'does_not_repeat',
      workType: wo.workType || 'reactive',
      priority: wo.priority || 'low',
      categoryId: wo.categoryId ? String(wo.categoryId) : '',
      vendorId: wo.vendorId ? String(wo.vendorId) : '',
      parts: wo.partId ? String(wo.partId) : '',
    }));

    if (wo.teamId) {
      fetchTeamUsers(String(wo.teamId));
    } else {
      setTeamUsers([]);
    }

    setShowCreateModal(true);
  };

  const resetNewAssetForm = () => {
    setNewAssetForm({
      name: '',
      locationId: '',
      status: 'running',
      category: 'Uncategorized',
      description: '',
    });
  };

  const resetNewProcedureForm = () => {
    setNewProcedureForm({
      name: '',
      description: null,
      fields: [
        { id: `PF-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: 'Field Name', type: 'text', required: false },
      ],
    });
  };

  const procedureFieldTypes = [
    { key: 'checkbox', label: 'Checkbox' },
    { key: 'text', label: 'Text Field' },
    { key: 'number', label: 'Number Field' },
    { key: 'amount', label: 'Amount ($)' },
    { key: 'multiple_choice', label: 'Multiple Choice' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'inspection_check', label: 'Inspection Check' },
  ];

  const addProcedureField = () => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: [
        ...(p.fields || []),
        { id: `PF-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: '', type: 'text', required: false },
      ],
    }));
  };

  const ensureFieldTypeDefaults = (field) => {
    if (!field) return field;
    if (field.type === 'multiple_choice' || field.type === 'checklist') {
      const existing = Array.isArray(field.options) ? field.options : [];
      if (existing.length > 0) return { ...field, options: existing };
      return {
        ...field,
        options: [
          { id: `OPT-${Date.now()}-1`, label: 'Option 1' },
          { id: `OPT-${Date.now()}-2`, label: 'Option 2' },
        ],
      };
    }
    if (field.type === 'inspection_check') {
      return {
        ...field,
        options: [
          { id: 'pass', label: 'Pass' },
          { id: 'flag', label: 'Flag' },
          { id: 'fail', label: 'Fail' },
        ],
      };
    }

    if ('options' in field) {
      const { options, ...rest } = field;
      return rest;
    }
    return field;
  };

  const updateProcedureField = (fieldId, updates) => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: (p.fields || []).map((f) => {
        if (f.id !== fieldId) return f;
        const next = ensureFieldTypeDefaults({ ...f, ...updates });
        return next;
      }),
    }));
  };

  const removeProcedureField = (fieldId) => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: (p.fields || []).filter((f) => f.id !== fieldId),
    }));
  };

  const addFieldOption = (fieldId) => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: (p.fields || []).map((f) => {
        if (f.id !== fieldId) return f;
        const existing = Array.isArray(f.options) ? f.options : [];
        const nextIndex = existing.length + 1;
        return {
          ...f,
          options: [...existing, { id: `OPT-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: `Option ${nextIndex}` }],
        };
      }),
    }));
  };

  const updateFieldOption = (fieldId, optionId, label) => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: (p.fields || []).map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          options: (f.options || []).map((o) => (o.id === optionId ? { ...o, label } : o)),
        };
      }),
    }));
  };

  const removeFieldOption = (fieldId, optionId) => {
    setNewProcedureForm((p) => ({
      ...p,
      fields: (p.fields || []).map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          options: (f.options || []).filter((o) => o.id !== optionId),
        };
      }),
    }));
  };

  const handleCreateProcedureFromModal = () => {
    const name = (newProcedureForm.name || '').trim();
    if (!name) return;

    const created = addProcedure({
      name,
      description: (newProcedureForm.description || '').trim(),
      fields: (newProcedureForm.fields || []).map((f) => ({
        id: f.id,
        name: (f.name || '').trim(),
        type: f.type,
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options.map((o) => ({ id: o.id, label: (o.label || '').trim() })).filter((o) => o.label) : undefined,
      })).filter((f) => f.name),
      createdBy: currentUser?.id || 'system',
      createdAt: new Date().toISOString(),
    });

    setCreateForm((p) => ({ ...p, procedure: created.id }));
    setSelectedProcedureId(created.id);
    setShowCreateProcedureModal(false);
    setShowProcedureModal(false);
    resetNewProcedureForm();
  };

  const handleCreateAssetFromModal = () => {
    const name = (newAssetForm.name || '').trim();
    if (!name) return;

    const created = addAsset({
      name,
      category: newAssetForm.category || 'Uncategorized',
      locationId: newAssetForm.locationId || '',
      status: newAssetForm.status || 'running',
      description: (newAssetForm.description || '').trim() || undefined,
    });

    if (created?.id) {
      setAssets((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((a) => String(a.id) === String(created.id))) return list;
        return [...list, { id: created.id, name: created.name, asset_name: created.name }];
      });
      setCreateForm((p) => ({
        ...p,
        assetId: String(created.id),
        assetName: created.name,
      }));
    }

    setCreateForm((p) => ({
      ...p,
      assetName: created.name,
      locationName: p.locationName || (created.locationId ? (locations.find((l) => l.id === created.locationId)?.name || '') : ''),
    }));

    setShowAddAssetModal(false);
    resetNewAssetForm();
    setShowAssetsModal(false);
  };

  const handleAddNewLocation = () => {
    openNewLocationModal();
  };

  const normalize = (s) => (s || '').trim().toLowerCase();

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      address: '',
      description: '',
      teamId: '',
      vendorId: '',
      assetIds: [],
    });
  };

  const openNewLocationModal = () => {
    resetLocationForm();
    setShowLocationModal(true);
  };

  const handleCreateLocationFromModal = async () => {
    const name = String(locationForm.name || '').trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        address: String(locationForm.address || '').trim() || null,
        description: String(locationForm.description || '').trim() || null,
        team_id: locationForm.teamId ? parseInt(String(locationForm.teamId), 10) : null,
        vendor_ids: locationForm.vendorId ? [parseInt(String(locationForm.vendorId), 10)] : [],
        asset_ids: Array.isArray(locationForm.assetIds)
          ? locationForm.assetIds.filter(Boolean).map((id) => parseInt(String(id), 10))
          : [],
      };
      const res = await axios.post(`${API_BASE_URL}/locations`, payload, {
        headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      });
      const created = res?.data;
      await fetchLocations();
      if (created?.id !== undefined && created?.id !== null) {
        setCreateForm((p) => ({ ...p, locationId: String(created.id) }));
      }
      setShowLocationModal(false);
      resetLocationForm();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to create location');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkOrder = async () => {
    const title = createForm.title.trim();
    if (!title) return;

    const assetId = createForm.assetId ? String(createForm.assetId) : '';
    const teamId = createForm.teamId ? String(createForm.teamId) : '';

    const selectedLocation = (Array.isArray(apiLocations) ? apiLocations : []).find((l) => String(l?.id) === String(createForm.locationId || '')) || null;

    const hours = parseInt(createForm.estimatedHours || '0', 10);
    const minutes = parseInt(createForm.estimatedMinutes || '0', 10);
    const estimatedDuration = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);

    const recurrenceIntervalWeeks = Math.max(1, parseInt(String(createForm.recurrenceIntervalWeeks || 1), 10) || 1);
    const recurrenceIntervalMonths = Math.max(1, parseInt(String(createForm.recurrenceIntervalMonths || 1), 10) || 1);
    const recurrenceDayOfMonth = Math.min(31, Math.max(1, parseInt(String(createForm.recurrenceDayOfMonth || 1), 10) || 1));
    const recurrenceWeekOfMonth = Math.min(5, Math.max(1, parseInt(String(createForm.recurrenceWeekOfMonth || 1), 10) || 1));
    const recurrenceWeekday = String(createForm.recurrenceWeekday || 'mon');
    const recurrenceIntervalYears = Math.max(1, parseInt(String(createForm.recurrenceIntervalYears || 1), 10) || 1);

    const yearlyBaseDate = createForm.startDate ? new Date(createForm.startDate) : new Date();
    const recurrenceYearlyMonth = yearlyBaseDate.getMonth() + 1;
    const recurrenceYearlyDay = yearlyBaseDate.getDate();

    const numericProcedureId = createForm.procedure ? parseInt(String(createForm.procedure), 10) : NaN;
    const hasNumericProcedureId = Number.isFinite(numericProcedureId);
    const numericCategoryId = createForm.categoryId ? parseInt(String(createForm.categoryId), 10) : NaN;
    const numericVendorId = createForm.vendorId ? parseInt(String(createForm.vendorId), 10) : NaN;
    const numericPartId = createForm.parts ? parseInt(String(createForm.parts), 10) : NaN;
    const numericAssigneeId = createForm.assigneeId ? parseInt(String(createForm.assigneeId), 10) : NaN;

    const apiPayload = {
      name: title,
      description: createForm.description.trim(),
      status: createForm.status || 'open',
      estimated_time_hours: Number.isFinite(hours) ? hours : 0,
      estimated_time_minutes: Number.isFinite(minutes) ? minutes : 0,
      due_date: createForm.dueDate || null,
      start_date: createForm.startDate || null,
      recurrence: createForm.recurrence,
      work_type: createForm.workType,
      priority: createForm.priority,
      location: selectedLocation?.name || null,
      team_id: teamId ? parseInt(teamId, 10) : null,
      assigned_user_id: Number.isFinite(numericAssigneeId) ? numericAssigneeId : null,
      asset_id: assetId ? parseInt(assetId, 10) : null,
      procedure_id: hasNumericProcedureId ? numericProcedureId : null,
      vendor_id: Number.isFinite(numericVendorId) ? numericVendorId : null,
      category_ids: Number.isFinite(numericCategoryId) ? [numericCategoryId] : [],
      parts: Number.isFinite(numericPartId) ? [numericPartId] : [],
      ...(hasNumericProcedureId ? {} : (createForm.procedure ? { procedure: String(createForm.procedure) } : {})),
    };

    setSaving(true);
    setError('');
    try {
      if (workOrderMode === 'create') {
        const res = await axios.post(`${API_BASE_URL}/work-orders`, apiPayload, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const createdApi = res?.data;
        await fetchWorkOrders();
        setShowCreateModal(false);
        resetCreateForm();
        setWorkOrderMode('create');
        setEditingWorkOrderId(null);
        setActiveTab('todo');
        if (createdApi?.id !== undefined && createdApi?.id !== null) {
          setSelectedWorkOrderId(String(createdApi.id));
        }
      } else {
        await axios.patch(
          `${API_BASE_URL}/work-orders/${editingWorkOrderId}`,
          apiPayload,
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );
        await fetchWorkOrders();
        setShowCreateModal(false);
        resetCreateForm();
        setWorkOrderMode('create');
        setEditingWorkOrderId(null);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || (workOrderMode === 'create' ? 'Failed to create work order' : 'Failed to update work order'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkOrder = async (id) => {
    const ok = window.confirm('Delete this work order?');
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/work-orders/${id}`, {
        headers: { accept: '*/*' },
      });
      setSelectedWorkOrderId(null);
      await fetchWorkOrders();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete work order');
    }
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Work Orders
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search Work Orders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ display: { xs: 'none', md: 'block' }, width: 288 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <MuiButton variant="contained" onClick={openCreateWorkOrder} startIcon={<Plus size={18} />}>
            New Work Order
          </MuiButton>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <MuiButton color="inherit" size="small" onClick={() => fetchWorkOrders()}>
              Retry
            </MuiButton>
          )}
        >
          {error}
        </Alert>
      ) : null}

      {/* Mobile search */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <TextField
          size="small"
          placeholder="Search Work Orders"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter chips + Tabs */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip
              size="small"
              icon={<SlidersHorizontal size={16} />}
              label="Filters"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />

            <Box sx={{ position: 'relative' }}>
              <MuiButton
                type="button"
                variant="outlined"
                size="small"
                onClick={() => setOpenFilter(openFilter === 'dueDate' ? '' : 'dueDate')}
                startIcon={<Calendar size={16} />}
                endIcon={<ChevronDown size={16} />}
              >
                Due Date
              </MuiButton>

              {openFilter === 'dueDate' && (
                <Paper
                  elevation={4}
                  sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 288, overflow: 'hidden' }}
                >
                  <Box sx={{ p: 1 }}>
                    {[ 
                      { key: '', label: 'Any' },
                      { key: 'today', label: 'Today' },
                      { key: 'tomorrow', label: 'Tomorrow' },
                      { key: 'next_7', label: 'Next 7 Days' },
                      { key: 'next_30', label: 'Next 30 Days' },
                      { key: 'this_month', label: 'This Month' },
                      { key: 'overdue', label: 'Overdue' },
                      { key: 'custom', label: 'Custom Date' },
                    ].map((opt) => (
                      <MuiButton
                        key={opt.key || 'any'}
                        type="button"
                        variant="text"
                        color="inherit"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          setFilters((p) => ({ ...p, dueDatePreset: opt.key, dueDateCustom: opt.key === 'custom' ? p.dueDateCustom : '' }));
                        }}
                      >
                        {opt.label}
                      </MuiButton>
                    ))}

                    {filters.dueDatePreset === 'custom' && (
                      <Stack spacing={1} sx={{ pt: 1 }}>
                        <TextField
                          size="small"
                          type="date"
                          value={filters.dueDateCustom}
                          onChange={(e) => setFilters((p) => ({ ...p, dueDateCustom: e.target.value }))}
                          fullWidth
                        />
                        <Stack direction="row" justifyContent="flex-end">
                          <MuiButton type="button" size="small" variant="outlined" onClick={() => setOpenFilter('')}>
                            Done
                          </MuiButton>
                        </Stack>
                      </Stack>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>

            <Box sx={{ position: 'relative' }}>
              <MuiButton
                type="button"
                variant="outlined"
                size="small"
                onClick={() => setOpenFilter(openFilter === 'priority' ? '' : 'priority')}
                endIcon={<ChevronDown size={16} />}
              >
                Priority
              </MuiButton>

              {openFilter === 'priority' && (
                <Paper elevation={4} sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 224, overflow: 'hidden' }}>
                  <Box sx={{ p: 1 }}>
                    {[
                      { key: '', label: 'Any' },
                      { key: 'low', label: 'Low' },
                      { key: 'medium', label: 'Medium' },
                      { key: 'high', label: 'High' },
                      { key: 'critical', label: 'Critical' },
                    ].map((opt) => (
                      <MuiButton
                        key={opt.key || 'any'}
                        type="button"
                        variant="text"
                        color="inherit"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => { setFilters((p) => ({ ...p, priority: opt.key })); setOpenFilter(''); }}
                      >
                        {opt.label}
                      </MuiButton>
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>

            {extraFilterKeys.includes('asset') && (
              <Box sx={{ position: 'relative' }}>
                <MuiButton
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
                  endIcon={<ChevronDown size={16} />}
                >
                  Asset
                </MuiButton>

                {openFilter === 'asset' && (
                  <Paper elevation={4} sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 288, overflow: 'hidden' }}>
                    <Box sx={{ p: 1, maxHeight: 320, overflowY: 'auto' }}>
                      <MuiButton
                        type="button"
                        variant="text"
                        color="inherit"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => { setFilters((p) => ({ ...p, asset: '' })); setOpenFilter(''); }}
                      >
                        Any
                      </MuiButton>
                      {assets.map((a) => (
                        <MuiButton
                          key={a.id}
                          type="button"
                          variant="text"
                          color="inherit"
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                          onClick={() => { setFilters((p) => ({ ...p, asset: a.id })); setOpenFilter(''); }}
                        >
                          {a.asset_name || a.name}
                        </MuiButton>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {extraFilterKeys.includes('status') && (
              <Box sx={{ position: 'relative' }}>
                <MuiButton
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenFilter(openFilter === 'status' ? '' : 'status')}
                  endIcon={<ChevronDown size={16} />}
                >
                  Status
                </MuiButton>

                {openFilter === 'status' && (
                  <Paper elevation={4} sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 224, overflow: 'hidden' }}>
                    <Box sx={{ p: 1 }}>
                      {[
                        { key: '', label: 'Any' },
                        { key: 'open', label: 'Open' },
                        { key: 'on_hold', label: 'On Hold' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'completed', label: 'Completed' },
                      ].map((opt) => (
                        <MuiButton
                          key={opt.key || 'any'}
                          type="button"
                          variant="text"
                          color="inherit"
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                          onClick={() => { setFilters((p) => ({ ...p, status: opt.key })); setOpenFilter(''); }}
                        >
                          {opt.label}
                        </MuiButton>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {extraFilterKeys.includes('categoryId') && (
              <Box sx={{ position: 'relative' }}>
                <MuiButton
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenFilter(openFilter === 'categoryId' ? '' : 'categoryId')}
                  endIcon={<ChevronDown size={16} />}
                >
                  Category
                </MuiButton>

                {openFilter === 'categoryId' && (
                  <Paper elevation={4} sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 288, overflow: 'hidden' }}>
                    <Box sx={{ p: 1, maxHeight: 320, overflowY: 'auto' }}>
                      <MuiButton
                        type="button"
                        variant="text"
                        color="inherit"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => { setFilters((p) => ({ ...p, categoryId: '' })); setOpenFilter(''); }}
                      >
                        Any
                      </MuiButton>
                      {(apiCategories || []).map((c) => (
                        <MuiButton
                          key={c.id}
                          type="button"
                          variant="text"
                          color="inherit"
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                          onClick={() => { setFilters((p) => ({ ...p, categoryId: c.id })); setOpenFilter(''); }}
                        >
                          {c.name}
                        </MuiButton>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {extraFilterKeys.includes('part') && (
              <Box sx={{ position: 'relative' }}>
                <MuiButton
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenFilter(openFilter === 'part' ? '' : 'part')}
                  endIcon={<ChevronDown size={16} />}
                >
                  Part
                </MuiButton>

                {openFilter === 'part' && (
                  <Paper elevation={4} sx={{ position: 'absolute', zIndex: 50, mt: 1, width: 288, overflow: 'hidden' }}>
                    <Box sx={{ p: 1, maxHeight: 320, overflowY: 'auto' }}>
                      <MuiButton
                        type="button"
                        variant="text"
                        color="inherit"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => { setFilters((p) => ({ ...p, part: '' })); setOpenFilter(''); }}
                      >
                        Any
                      </MuiButton>
                      {(apiParts || []).map((p) => (
                        <MuiButton
                          key={p.id}
                          type="button"
                          variant="text"
                          color="inherit"
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                          onClick={() => { setFilters((prev) => ({ ...prev, part: p.id })); setOpenFilter(''); }}
                        >
                          {p.name}
                        </MuiButton>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            <MuiButton type="button" variant="outlined" size="small" color="inherit" onClick={clearAllFilters}>
              Clear
            </MuiButton>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={activeTab}
              onChange={(_e, next) => {
                if (!next) return;
                setActiveTab(next);
                setSelectedWorkOrderId(null);
              }}
            >
              <ToggleButton value="todo">To Do</ToggleButton>
              <ToggleButton value="done">Done</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={viewMode}
                onChange={(_e, next) => {
                  if (!next) return;
                  if (next === 'calendar') setSelectedWorkOrderId(null);
                  setViewMode(next);
                }}
              >
                <ToggleButton value="list">List</ToggleButton>
                <ToggleButton value="calendar">Calendar</ToggleButton>
              </ToggleButtonGroup>

              {viewMode === 'calendar' ? (
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={calendarMode}
                    onChange={(_e, next) => {
                      if (!next) return;
                      setCalendarMode(next);
                    }}
                  >
                    <ToggleButton value="month">Month</ToggleButton>
                    <ToggleButton value="week">Week</ToggleButton>
                  </ToggleButtonGroup>

                  <MuiButton
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setCalendarAnchorDate((prev) => {
                        const d = new Date(prev);
                        if (calendarMode === 'week') d.setDate(d.getDate() - 7);
                        else d.setMonth(d.getMonth() - 1);
                        return d;
                      });
                    }}
                  >
                    Prev
                  </MuiButton>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
                    {calendarAnchorDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                  </Typography>
                  <MuiButton
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setCalendarAnchorDate((prev) => {
                        const d = new Date(prev);
                        if (calendarMode === 'week') d.setDate(d.getDate() + 7);
                        else d.setMonth(d.getMonth() + 1);
                        return d;
                      });
                    }}
                  >
                    Next
                  </MuiButton>
                </Stack>
              ) : (
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <MenuItem value="priority_desc">Sort: Priority (High - Low)</MenuItem>
                    <MenuItem value="priority_asc">Sort: Priority (Low - High)</MenuItem>
                    <MenuItem value="due_asc">Sort: Due Date (Soonest)</MenuItem>
                    <MenuItem value="due_desc">Sort: Due Date (Latest)</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {viewMode === 'calendar' ? (
        <Paper variant="outlined" sx={{ overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarMode === 'month'
              ? Array.from({ length: calendarMonthLeadingBlanks }).map((_v, i) => (
                <Box
                  key={`cal-blank-start-${i}`}
                  sx={{
                    minHeight: 140,
                    borderRight: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    p: 1.5,
                    bgcolor: 'background.paper',
                  }}
                />
              ))
              : null}
            {calendarDays.map((d) => {
              const key = dayKey(d);
              const items = workOrdersByDay.get(key) || [];
              const maxVisible = calendarMode === 'month' ? 1 : 50;
              const visibleItems = (items || []).slice(0, maxVisible);
              const hiddenItems = (items || []).slice(maxVisible);
              const inMonth = d.getMonth() === calendarAnchorDate.getMonth();
              const today = new Date();
              const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
              const dateIso = toDateOnlyIso(d);
              const isDropTarget = Boolean(dragUi?.dragging) && String(dragUi?.targetDayKey || '') === String(key);
              return (
                <Box
                  key={key}
                  data-cal-daykey={key}
                  data-cal-dateiso={dateIso}
                  data-cal-dateonly={key}
                  sx={{
                    minHeight: 140,
                    borderRight: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    p: 1.5,
                    bgcolor: isDropTarget ? 'action.hover' : 'background.paper',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack spacing={0} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 900,
                          lineHeight: 1.1,
                          color: isToday ? 'primary.main' : (inMonth ? 'text.primary' : 'text.disabled'),
                        }}
                      >
                        {d.getDate()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          lineHeight: 1.1,
                          color: inMonth ? 'text.secondary' : 'text.disabled',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </Typography>
                    </Stack>
                    {items.length > 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        {items.length}
                      </Typography>
                    ) : null}
                  </Stack>

                  <Stack
                    spacing={0.75}
                    sx={{
                      mt: 1,
                      maxHeight: calendarMode === 'month' ? 'none' : 110,
                      overflowY: calendarMode === 'month' ? 'visible' : 'auto',
                      pr: calendarMode === 'month' ? 0 : 0.5,
                    }}
                  >
                    {visibleItems.map((wo) => (
                      <Box
                        key={wo.__occKey || wo.id}
                        component="button"
                        title={`Work Order: ${String(wo.title || wo.id)}\nStart: ${formatShort(wo?.startDate || wo?.scheduledDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}\nDue: ${formatShort(wo?.dueDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}\nPriority: ${String(wo.priority || '—')}`}
                        onPointerDown={(e) => {
                          if (viewMode !== 'calendar') return;
                          e.preventDefault();
                          e.stopPropagation();

                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {
                            // ignore
                          }

                          const s = dragStateRef.current;
                          s.active = true;
                          s.pointerId = e.pointerId;
                          s.workOrderId = wo.id;
                          s.startX = e.clientX;
                          s.startY = e.clientY;
                          s.lastX = e.clientX;
                          s.lastY = e.clientY;
                          s.dragging = false;

                          const t = findDropTarget(e.clientX, e.clientY);
                          s.targetDayKey = t.dayKey;
                          s.targetDateIso = t.dateIso;
                          setDragUi({
                            active: true,
                            dragging: false,
                            x: e.clientX,
                            y: e.clientY,
                            workOrderId: wo.id,
                            targetDayKey: t.dayKey,
                          });

                          window.addEventListener('pointermove', onCalendarPointerMove);
                          window.addEventListener('pointerup', onCalendarPointerUp);
                          window.addEventListener('pointercancel', onCalendarPointerUp);
                        }}
                        style={{ touchAction: 'none' }}
                        sx={{
                          width: '100%',
                          textAlign: 'left',
                          px: 1,
                          py: 0.75,
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                          cursor: 'grab',
                          opacity: (dragUi?.dragging && String(dragUi?.workOrderId || '') === String(wo.id)) ? 0 : 1,
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                          {wo.title || wo.id}
                        </Typography>
                      </Box>
                    ))}
                    {calendarMode === 'month' && hiddenItems.length > 0 ? (
                      <MuiButton
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCalendarMoreModal({
                            open: true,
                            dayKey: key,
                            dateIso,
                            items: hiddenItems,
                          });
                        }}
                        variant="text"
                        size="small"
                        sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
                      >
                        +{hiddenItems.length} more
                      </MuiButton>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}

            {calendarMode === 'month'
              ? Array.from({ length: calendarMonthTrailingBlanks }).map((_v, i) => (
                <Box
                  key={`cal-blank-end-${i}`}
                  sx={{
                    minHeight: 140,
                    borderRight: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    p: 1.5,
                    bgcolor: 'background.paper',
                  }}
                />
              ))
              : null}
          </Box>

          {dragUi?.active ? (
            <Box
              sx={{
                position: 'fixed',
                zIndex: 9999,
                pointerEvents: 'none',
                left: `${Number(dragUi.x || 0) + 12}px`,
                top: `${Number(dragUi.y || 0) + 12}px`,
              }}
            >
              <Paper variant="outlined" sx={{ px: 1.5, py: 1, width: 240, opacity: 0.95 }}>
                <Typography variant="caption" sx={{ fontWeight: 800 }} noWrap>
                  {(workOrders || []).find((wo) => String(wo?.id) === String(dragUi.workOrderId))?.title || String(dragUi.workOrderId || '')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Drop on a date to reschedule
                </Typography>
              </Paper>
            </Box>
          ) : null}
        </Paper>
      ) : (
        <Grid
          container
          spacing={2}
          sx={{
            height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
            overflow: { xs: 'visible', lg: 'hidden' },
          }}
        >
          <Grid item xs={12} lg={4} sx={{ height: { xs: 'auto', lg: '100%' } }}>
            <Paper variant="outlined" sx={{ overflow: 'hidden', height: { xs: 'auto', lg: '100%' } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {activeTab === 'done' ? 'Done' : 'To Do'} ({filteredWorkOrders.length})
                </Typography>
              </Stack>
              <Divider />

              <Box
                sx={{
                  maxHeight: { xs: '65vh', lg: 'calc(100% - 52px)' },
                  overflowY: 'hidden',
                  overscrollBehavior: 'contain',
                  '&:hover': { overflowY: 'auto' },
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Loading work orders…</Typography>
                  </Stack>
                ) : filteredWorkOrders.length === 0 ? (
                  <Stack spacing={1} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '999px', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={20} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      You don't have any work orders
                    </Typography>
                    <MuiButton type="button" variant="text" onClick={() => setShowCreateModal(true)}>
                      Create the first work order
                    </MuiButton>
                  </Stack>
                ) : (
                  <List disablePadding>
                    {filteredWorkOrders.map((wo, idx) => {
                      const isSelected = wo.id === selectedWorkOrderId;
                      return (
                        <React.Fragment key={wo.id}>
                          <ListItemButton
                            selected={isSelected}
                            onClick={() => setSelectedWorkOrderId(wo.id)}
                            sx={{
                              alignItems: 'flex-start',
                              borderLeft: '2px solid',
                              borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                            }}
                          >
                            <ListItemText
                              primary={(
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                                    {wo.title}
                                  </Typography>
                                  {getStatusBadge(normalizeStatus(wo.status))}
                                </Stack>
                              )}
                              secondary={
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {wo.id} - {getAssetName(wo.assetId)} - {getLocationName(wo.locationId)}
                                </Typography>
                              }
                            />
                            <Stack spacing={0.5} alignItems="flex-end" sx={{ pl: 1 }}>
                              {getPriorityBadge(wo.priority)}
                              <Typography variant="caption" color="text.secondary">
                                {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'No due date'}
                              </Typography>
                            </Stack>
                          </ListItemButton>
                          {idx < filteredWorkOrders.length - 1 ? <Divider component="li" /> : null}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8} sx={{ height: { xs: 'auto', lg: '100%' } }}>
            <Paper ref={workOrderDetailsRef} variant="outlined" sx={{ overflow: 'hidden', height: { xs: 'auto', lg: '100%' } }}>
              {!selectedWorkOrder ? (
                <Stack sx={{ minHeight: '65vh', p: 4 }} alignItems="center" justifyContent="center" spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Select a work order
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Details will appear here.
                  </Typography>
                </Stack>
              ) : (
                <Box sx={{ p: 3, height: { xs: 'auto', lg: '100%' }, overflowY: { xs: 'visible', lg: 'auto' } }}>
                  <Stack spacing={3}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }} justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {selectedWorkOrder.id}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                          {selectedWorkOrder.title}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          {getStatusBadge(normalizeStatus(selectedWorkOrder.status))}
                          {getPriorityBadge(selectedWorkOrder.priority)}
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <MuiButton variant="outlined" onClick={() => openEditWorkOrder(selectedWorkOrder)}>
                          Edit
                        </MuiButton>
                        <MuiButton variant="outlined" color="error" onClick={() => handleDeleteWorkOrder(selectedWorkOrder.id)}>
                          Delete
                        </MuiButton>
                      </Stack>
                    </Stack>

                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">
                        Status
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mt: 1, maxWidth: 520 }}>
                        {[
                          { key: 'on_hold', label: 'On Hold', Icon: PauseCircle, color: 'warning' },
                          { key: 'in_progress', label: 'In Progress', Icon: RefreshCw, color: 'info' },
                          { key: 'completed', label: 'Done', Icon: Check, color: 'success' },
                        ].map((s) => {
                          const active = normalizeStatus(selectedWorkOrder.status) === s.key;
                          const Icon = s.Icon;
                          return (
                            <Grid item xs={12} sm={4} key={s.key}>
                              <MuiButton
                                fullWidth
                                type="button"
                                disabled={saving}
                                onClick={() => handleStatusChange(selectedWorkOrder.id, s.key)}
                                variant={active ? 'contained' : 'outlined'}
                                color={s.color}
                                startIcon={<Icon size={18} />}
                              >
                                {s.label}
                              </MuiButton>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>

                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>General</Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{String(normalizeStatus(selectedWorkOrder.status))}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">Priority</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{String(selectedWorkOrder.priority || 'low')}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">Work Type</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{String(selectedWorkOrder.workType || 'reactive')}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">Estimated Time</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {selectedWorkOrder.estimatedDuration
                                ? `${Math.floor(Number(selectedWorkOrder.estimatedDuration) / 60)}h ${Number(selectedWorkOrder.estimatedDuration) % 60}m`
                                : '—'}
                            </Typography>
                          </Grid>
                        </Grid>

                        {selectedWorkOrder.procedure ? (
                          <Box sx={{ mt: 2 }}>
                            {renderProcedureSteps(selectedWorkOrder.procedure)}
                          </Box>
                        ) : null}
                      </Box>
                    </Paper>

              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Assignment & Location</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{getAssigneeLabel(selectedWorkOrder)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Team</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{getTeamName(selectedWorkOrder.teamId) || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Asset</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{getAssetName(selectedWorkOrder.assetId)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Location</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{getLocationName(selectedWorkOrder.locationId)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Scheduling</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Start Date</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.startDate ? new Date(selectedWorkOrder.startDate).toLocaleDateString() : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Due Date</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.dueDate ? new Date(selectedWorkOrder.dueDate).toLocaleDateString() : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Recurrence</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{String(selectedWorkOrder.recurrence || 'does_not_repeat')}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Procedure, Parts, Category, Vendor</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Procedure</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.procedure
                          ? (getProcedureName(selectedWorkOrder.procedure) || String(selectedWorkOrder.procedure))
                          : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Part</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.partId
                          ? (getPartName(selectedWorkOrder.partId) || String(selectedWorkOrder.partId))
                          : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Category</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.categoryId
                          ? (getCategoryName(selectedWorkOrder.categoryId) || String(selectedWorkOrder.categoryId))
                          : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Vendor</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedWorkOrder.vendorId
                          ? (getVendorName(selectedWorkOrder.vendorId) || String(selectedWorkOrder.vendorId))
                          : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Description</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedWorkOrder.description || '—'}
                  </Typography>
                </Box>
              </Paper>

                    {selectedWorkOrder.checklist && selectedWorkOrder.checklist.length > 0 && (
                      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Checklist</Typography>
                        </Box>
                        <Box sx={{ p: 2 }}>
                          <Stack spacing={1}>
                            {selectedWorkOrder.checklist.map((item) => (
                              <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                                <input type="checkbox" checked={item.completed} readOnly />
                                <Typography variant="body2" color={item.completed ? 'text.secondary' : 'text.primary'} sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                  {item.text}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      </Paper>
                    )}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Create Work Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); setWorkOrderMode('create'); setEditingWorkOrderId(null); }}
        title={workOrderMode === 'edit' ? 'Edit Work Order' : 'New Work Order'}
        size="xl"
      >
        <Stack spacing={3}>
          <Stack spacing={2}>
            <TextField
              label="What needs to be done? (Required)"
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Describe the work"
              fullWidth
              multiline
              minRows={2}
            />

            <TextField
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Add a description"
              fullWidth
              multiline
              minRows={4}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <Select
                      value={createForm.locationId}
                      displayEmpty
                      onChange={(e) => setCreateForm((p) => ({ ...p, locationId: String(e.target.value || '') }))}
                    >
                      <MenuItem value="">Select Location</MenuItem>
                      {locationsOptions.map((l) => (
                        <MenuItem key={l.id} value={String(l.id)}>{l.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <MuiButton type="button" variant="text" onClick={handleAddNewLocation}>
                    Add new location
                  </MuiButton>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <Select
                      value={createForm.assetId}
                      displayEmpty
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setCreateForm((p) => ({
                          ...p,
                          assetId: nextId,
                          assetName: nextId ? (getAssetName(nextId) || '') : '',
                        }));
                      }}
                    >
                      <MenuItem value="">Select Asset</MenuItem>
                      {assets.map((a) => (
                        <MenuItem key={a.id} value={a.id}>{a.asset_name || a.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <MuiButton type="button" variant="text" onClick={() => { setShowAddAssetModal(true); resetNewAssetForm(); }}>
                    Add new asset
                  </MuiButton>
                </Stack>
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <Select
                value={createForm.teamId}
                displayEmpty
                onChange={(e) => {
                  const nextTeamId = e.target.value;
                  setCreateForm((p) => ({ ...p, teamId: nextTeamId, assigneeId: '' }));
                  fetchTeamUsers(nextTeamId);
                }}
              >
                <MenuItem value="">Select Team</MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.team_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Procedure</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {createForm.procedure ? (
                <Box>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <ListChecks size={18} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {getProcedureName(createForm.procedure)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <MuiButton
                        type="button"
                        variant="outlined"
                        color="inherit"
                        onClick={() => { setCreateForm((p) => ({ ...p, procedure: '' })); setSelectedProcedureId(''); }}
                      >
                        Remove
                      </MuiButton>
                      <MuiButton
                        type="button"
                        variant="outlined"
                        onClick={() => { setShowProcedureModal(true); setProcedureSearch(''); setSelectedProcedureId(createForm.procedure || ''); }}
                      >
                        Change
                      </MuiButton>
                    </Stack>
                  </Stack>

                  {renderProcedureSteps(createForm.procedure)}
                </Box>
              ) : (
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ListChecks size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Create or attach new Form, Procedure or Checklist
                    </Typography>
                  </Stack>
                  <MuiButton
                    type="button"
                    variant="outlined"
                    onClick={() => { setShowProcedureModal(true); setProcedureSearch(''); setSelectedProcedureId(''); }}
                  >
                    Add Procedure
                  </MuiButton>
                </Stack>
              )}
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Assigned To</Typography>
            <FormControl fullWidth>
              <Select
                value={createForm.assigneeId}
                displayEmpty
                onChange={(e) => setCreateForm((p) => ({ ...p, assigneeId: e.target.value }))}
                disabled={!createForm.teamId || loadingTeamUsers}
              >
                <MenuItem value="">
                  {loadingTeamUsers ? 'Loading users…' : (!createForm.teamId ? 'Select Team first' : 'Select User')}
                </MenuItem>
                {(teamUsers || []).map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.user_name || u.name || String(u.id)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Estimated Time</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Hours"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={createForm.estimatedHours}
                  onChange={(e) => setCreateForm((p) => ({ ...p, estimatedHours: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Minutes"
                  type="number"
                  inputProps={{ min: 0, max: 59 }}
                  value={createForm.estimatedMinutes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, estimatedMinutes: e.target.value }))}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Due Date"
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Start Date"
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <Select
                  value={createForm.recurrence}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCreateForm((p) => ({
                      ...p,
                      recurrence: next,
                      recurrenceDays:
                        next === 'daily' || next === 'weekly'
                          ? ((p.recurrenceDays && p.recurrenceDays.length > 0) ? p.recurrenceDays : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
                          : p.recurrenceDays,
                      recurrenceIntervalWeeks: next === 'weekly' ? (p.recurrenceIntervalWeeks || 1) : p.recurrenceIntervalWeeks,
                      recurrenceIntervalMonths: (next === 'monthly_by_date' || next === 'monthly_by_weekday') ? (p.recurrenceIntervalMonths || 1) : p.recurrenceIntervalMonths,
                      recurrenceDayOfMonth: next === 'monthly_by_date' ? (p.recurrenceDayOfMonth || new Date().getDate()) : p.recurrenceDayOfMonth,
                      recurrenceWeekOfMonth: next === 'monthly_by_weekday' ? (p.recurrenceWeekOfMonth || 1) : p.recurrenceWeekOfMonth,
                      recurrenceWeekday: next === 'monthly_by_weekday' ? (p.recurrenceWeekday || 'mon') : p.recurrenceWeekday,
                      recurrenceIntervalYears: next === 'yearly' ? (p.recurrenceIntervalYears || 1) : p.recurrenceIntervalYears,
                    }));
                  }}
                >
                  <MenuItem value="does_not_repeat">Does not repeat</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly_by_date">Monthly by date</MenuItem>
                  <MenuItem value="monthly_by_weekday">Monthly by weekday</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>

              {createForm.recurrence === 'daily' && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {[
                      { key: 'sun', label: 'Sun' },
                      { key: 'mon', label: 'Mon' },
                      { key: 'tue', label: 'Tue' },
                      { key: 'wed', label: 'Wed' },
                      { key: 'thu', label: 'Thu' },
                      { key: 'fri', label: 'Fri' },
                      { key: 'sat', label: 'Sat' },
                    ].map((d) => {
                      const selected = (createForm.recurrenceDays || []).includes(d.key);
                      return (
                        <MuiButton
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setCreateForm((p) => {
                              const current = Array.isArray(p.recurrenceDays) ? p.recurrenceDays : [];
                              const next = current.includes(d.key) ? current.filter((x) => x !== d.key) : [...current, d.key];
                              return { ...p, recurrenceDays: next };
                            });
                          }}
                          size="small"
                          variant={selected ? 'contained' : 'outlined'}
                        >
                          {d.label}
                        </MuiButton>
                      );
                    })}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Repeats every day after completion of this Work Order.
                  </Typography>
                </Box>
              )}

              {createForm.recurrence === 'weekly' && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary">Every</Typography>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 1 }}
                      value={createForm.recurrenceIntervalWeeks}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceIntervalWeeks: e.target.value }))}
                      sx={{ width: 96 }}
                    />
                    <Typography variant="body2" color="text.secondary">week on</Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {[
                      { key: 'sun', label: 'Sun', full: 'Sunday' },
                      { key: 'mon', label: 'Mon', full: 'Monday' },
                      { key: 'tue', label: 'Tue', full: 'Tuesday' },
                      { key: 'wed', label: 'Wed', full: 'Wednesday' },
                      { key: 'thu', label: 'Thu', full: 'Thursday' },
                      { key: 'fri', label: 'Fri', full: 'Friday' },
                      { key: 'sat', label: 'Sat', full: 'Saturday' },
                    ].map((d) => {
                      const selected = (createForm.recurrenceDays || []).includes(d.key);
                      return (
                        <MuiButton
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setCreateForm((p) => {
                              const current = Array.isArray(p.recurrenceDays) ? p.recurrenceDays : [];
                              const next = current.includes(d.key) ? current.filter((x) => x !== d.key) : [...current, d.key];
                              return { ...p, recurrenceDays: next };
                            });
                          }}
                          size="small"
                          variant={selected ? 'contained' : 'outlined'}
                        >
                          {d.label}
                        </MuiButton>
                      );
                    })}
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {(() => {
                      const order = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                      const map = {
                        sun: 'Sunday',
                        mon: 'Monday',
                        tue: 'Tuesday',
                        wed: 'Wednesday',
                        thu: 'Thursday',
                        fri: 'Friday',
                        sat: 'Saturday',
                      };
                      const days = order.filter((k) => (createForm.recurrenceDays || []).includes(k)).map((k) => map[k]);
                      const interval = Math.max(1, parseInt(String(createForm.recurrenceIntervalWeeks || 1), 10) || 1);
                      const intervalText = interval === 1 ? 'every week' : `every ${interval} weeks`;
                      const dayText = days.length > 0 ? days.join(', ') : 'no days selected';
                      return `Repeats ${intervalText} on ${dayText} after completion of this Work Order.`;
                    })()}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Work Type</Typography>
              <FormControl fullWidth>
                <Select
                  value={createForm.workType}
                  onChange={(e) => setCreateForm((p) => ({ ...p, workType: e.target.value }))}
                >
                  <MenuItem value="reactive">Reactive</MenuItem>
                  <MenuItem value="preventive">Preventive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Priority</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={createForm.priority}
              onChange={(_e, next) => {
                if (!next) return;
                setCreateForm((prev) => ({ ...prev, priority: next }));
              }}
            >
              <ToggleButton value="low">Low</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="high">High</ToggleButton>
              <ToggleButton value="critical">Critical</ToggleButton>
            </ToggleButtonGroup>
          </div>

          <Stack spacing={2}>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Parts</Typography>
              <FormControl fullWidth>
                <Select
                  value={createForm.parts}
                  displayEmpty
                  onChange={(e) => setCreateForm((p) => ({ ...p, parts: e.target.value }))}
                >
                  <MenuItem value="">Start typing...</MenuItem>
                  {(apiParts || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Categories</Typography>
              <FormControl fullWidth>
                <Select
                  value={createForm.categoryId}
                  displayEmpty
                  onChange={(e) => setCreateForm((p) => ({ ...p, categoryId: e.target.value }))}
                >
                  <MenuItem value="">Start typing...</MenuItem>
                  {(apiCategories || []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <MuiButton type="button" variant="text" onClick={handleCreateCategoryFromWorkOrder}>
                Add new category
              </MuiButton>
            </div>

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Vendors</Typography>
              <FormControl fullWidth>
                <Select
                  value={createForm.vendorId}
                  displayEmpty
                  onChange={(e) => setCreateForm((p) => ({ ...p, vendorId: e.target.value }))}
                >
                  <MenuItem value="">Start typing...</MenuItem>
                  {(apiVendors || []).map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </Stack>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
            <MuiButton
              variant="outlined"
              color="inherit"
              onClick={() => { setShowCreateModal(false); resetCreateForm(); setWorkOrderMode('create'); setEditingWorkOrderId(null); }}
            >
              Cancel
            </MuiButton>
            <MuiButton
              variant="contained"
              onClick={handleSaveWorkOrder}
              disabled={!createForm.title.trim() || saving || (workOrderMode === 'edit' && !editingWorkOrderId)}
            >
              {saving ? (workOrderMode === 'edit' ? 'Saving…' : 'Creating…') : (workOrderMode === 'edit' ? 'Save' : 'Create')}
            </MuiButton>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        isOpen={Boolean(calendarMoreModal?.open)}
        onClose={() => setCalendarMoreModal({ open: false, dayKey: '', dateIso: '', items: [] })}
        title={calendarMoreModal?.dateIso ? `Work Orders - ${calendarMoreModal.dateIso}` : 'Work Orders'}
        size="sm"
      >
        <Stack spacing={1.5}>
          {(calendarMoreModal?.items || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No work orders</Typography>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <List disablePadding>
                {(calendarMoreModal.items || []).map((wo, idx) => (
                  <React.Fragment key={wo.__occKey || wo.id}>
                    <ListItemButton
                      onClick={() => {
                        setViewMode('list');
                        setSelectedWorkOrderId(wo.id);
                        setCalendarMoreModal({ open: false, dayKey: '', dateIso: '', items: [] });
                      }}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                            {wo.title || wo.id}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" component="span">
                            <Box component="span" sx={{ display: 'block' }}>
                              <Box component="span" sx={{ fontWeight: 700 }}>Start:</Box>{' '}
                              {formatShort(wo?.startDate || wo?.scheduledDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}
                            </Box>
                            <Box component="span" sx={{ display: 'block' }}>
                              <Box component="span" sx={{ fontWeight: 700 }}>Due:</Box>{' '}
                              {formatShort(wo?.dueDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}
                            </Box>
                          </Typography>
                        }
                      />
                      <Box sx={{ pl: 1, pt: 0.25 }}>
                        {getPriorityBadge(wo.priority)}
                      </Box>
                    </ListItemButton>
                    {idx < (calendarMoreModal.items || []).length - 1 ? <Divider component="li" /> : null}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </Modal>

      <Modal
        isOpen={showLocationModal}
        onClose={() => { setShowLocationModal(false); resetLocationForm(); }}
        title="New Location"
        size="xl"
      >
        <Stack spacing={2.5} sx={{ maxWidth: 920, mx: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            Manage location details and assign a team/vendor.
          </Typography>

          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : null}

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Location Name"
                value={locationForm.name}
                onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))}
                disabled={saving}
                required
                fullWidth
              />

              <TextField
                label="Address"
                value={locationForm.address}
                onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))}
                disabled={saving}
                fullWidth
              />

              <TextField
                label="Description"
                value={locationForm.description}
                onChange={(e) => setLocationForm((p) => ({ ...p, description: e.target.value }))}
                disabled={saving}
                fullWidth
                multiline
                minRows={3}
              />

              <FormControl fullWidth disabled={saving}>
                <Select
                  value={locationForm.teamId}
                  displayEmpty
                  onChange={(e) => setLocationForm((p) => ({ ...p, teamId: String(e.target.value || '') }))}
                >
                  <MenuItem value="">Team in Charge</MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>{t.team_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={saving}>
                <Select
                  value={locationForm.vendorId}
                  displayEmpty
                  onChange={(e) => setLocationForm((p) => ({ ...p, vendorId: String(e.target.value || '') }))}
                >
                  <MenuItem value="">Vendor</MenuItem>
                  {apiVendors.map((v) => (
                    <MenuItem key={v.id} value={String(v.id)}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={saving}>
                <Select
                  multiple
                  value={locationForm.assetIds}
                  displayEmpty
                  onChange={(e) => {
                    const val = e.target.value;
                    const next = Array.isArray(val) ? val : String(val || '').split(',').filter(Boolean);
                    setLocationForm((p) => ({ ...p, assetIds: next }));
                  }}
                  renderValue={(selected) => {
                    const ids = Array.isArray(selected) ? selected : [];
                    const byId = new Map((assets || []).map((a) => [String(a.id), a]));
                    const names = ids.map((id) => byId.get(String(id))?.asset_name).filter(Boolean);
                    return names.length ? names.join(', ') : 'Assets';
                  }}
                >
                  {(assets || []).map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>{a.asset_name || a.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <MuiButton
                  type="button"
                  variant="text"
                  onClick={() => { setShowLocationModal(false); resetLocationForm(); }}
                  disabled={saving}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  onClick={handleCreateLocationFromModal}
                  disabled={!String(locationForm.name || '').trim() || saving}
                >
                  Create
                </MuiButton>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Modal>

      <Modal
        isOpen={showAssetsModal}
        onClose={() => setShowAssetsModal(false)}
        title="Assets"
        size="md"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <MuiButton
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => { setShowAddAssetModal(true); resetNewAssetForm(); }}
            >
              Add New Asset
            </MuiButton>
          </Stack>

          <Paper variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
            <List dense disablePadding>
              {assets
                .filter((a) => String(a?.asset_name || a?.name || '').toLowerCase().includes(assetSearch.toLowerCase()))
                .map((a) => (
                  <ListItemButton
                    key={a.id}
                    onClick={() => {
                      const label = a.asset_name || a.name || '';
                      setCreateForm((p) => ({ ...p, assetId: String(a.id), assetName: String(label) }));
                      setShowAssetsModal(false);
                    }}
                  >
                    <ListItemText
                      primary={a.asset_name || a.name}
                      secondary={String(a.id)}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))}

              {assets.filter((a) => String(a?.asset_name || a?.name || '').toLowerCase().includes(assetSearch.toLowerCase())).length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">No assets found.</Typography>
                </Box>
              ) : null}
            </List>
          </Paper>
        </Stack>
      </Modal>

      <Modal
        isOpen={showAddAssetModal}
        onClose={() => { setShowAddAssetModal(false); resetNewAssetForm(); }}
        title="Add New Asset"
        size="md"
      >
        <Stack spacing={2.5}>
          <TextField
            label="Asset Name"
            value={newAssetForm.name}
            onChange={(e) => setNewAssetForm((p) => ({ ...p, name: e.target.value }))}
            required
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={newAssetForm.locationId}
                  onChange={(e) => setNewAssetForm((p) => ({ ...p, locationId: String(e.target.value || '') }))}
                >
                  <MenuItem value="">None</MenuItem>
                  {(locations || []).map((l) => (
                    <MenuItem key={l.id} value={String(l.id)}>{l.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Select
                  value={newAssetForm.status}
                  onChange={(e) => setNewAssetForm((p) => ({ ...p, status: String(e.target.value || '') }))}
                >
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="down">Down</MenuItem>
                  <MenuItem value="idle">Idle</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            label="Category"
            value={newAssetForm.category}
            onChange={(e) => setNewAssetForm((p) => ({ ...p, category: e.target.value }))}
            fullWidth
          />

          <TextField
            label="Description"
            value={newAssetForm.description}
            onChange={(e) => setNewAssetForm((p) => ({ ...p, description: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <MuiButton variant="text" onClick={() => { setShowAddAssetModal(false); resetNewAssetForm(); }}>
              Cancel
            </MuiButton>
            <MuiButton variant="contained" onClick={handleCreateAssetFromModal} disabled={!newAssetForm.name.trim()}>
              Save Asset
            </MuiButton>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        isOpen={showProcedureModal}
        onClose={() => { setShowProcedureModal(false); setProcedureSearch(''); setSelectedProcedureId(''); }}
        title="Add Procedure"
        size="lg"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              value={procedureSearch}
              onChange={(e) => setProcedureSearch(e.target.value)}
              placeholder="Search Procedure Templates"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <MuiButton
              type="button"
              variant="outlined"
              onClick={() => { setShowCreateProcedureModal(true); resetNewProcedureForm(); }}
            >
              Create New
            </MuiButton>
          </Stack>

          {(apiProcedures || []).length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                <ListChecks size={28} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Start adding Procedures</Typography>
                <Typography variant="body2" color="text.secondary">
                  Press “Create New” to add your first Procedure.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 360, overflow: 'auto' }}>
              <List dense disablePadding>
                {(apiProcedures || [])
                  .filter((p) => (p?.name || '').toLowerCase().includes(procedureSearch.toLowerCase()))
                  .map((p) => (
                    <ListItemButton
                      key={p.id}
                      selected={String(selectedProcedureId) === String(p.id)}
                      onClick={() => setSelectedProcedureId(p.id)}
                    >
                      <ListItemText
                        primary={p.name}
                        secondary={p.description || '—'}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  ))}
              </List>
            </Paper>
          )}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <MuiButton variant="text" onClick={() => { setShowProcedureModal(false); setProcedureSearch(''); setSelectedProcedureId(''); }}>
              Cancel
            </MuiButton>
            <MuiButton
              variant="contained"
              onClick={() => {
                if (!selectedProcedureId) return;
                setCreateForm((p) => ({ ...p, procedure: selectedProcedureId }));
                setShowProcedureModal(false);
                setProcedureSearch('');
              }}
              disabled={!selectedProcedureId || (apiProcedures || []).length === 0}
            >
              Add Procedure
            </MuiButton>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        isOpen={showCreateProcedureModal}
        onClose={() => { setShowCreateProcedureModal(false); resetNewProcedureForm(); }}
        title="Create a New Procedure"
        size="xl"
      >
        <Stack spacing={2.5}>
          <TextField
            label="Procedure Name"
            value={newProcedureForm.name}
            onChange={(e) => setNewProcedureForm((p) => ({ ...p, name: e.target.value }))}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={newProcedureForm.description ?? ''}
            onChange={(e) => setNewProcedureForm((p) => ({ ...p, description: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />

          <Stack spacing={2}>
            {(newProcedureForm.fields || []).map((f) => (
              <Paper key={f.id} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <TextField value={f.name} label="Field Name" fullWidth size="small" InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={f.type}
                        onChange={(e) => updateProcedureField(f.id, { type: e.target.value })}
                      >
                        {procedureFieldTypes.map((t) => (
                          <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!f.required}
                          onChange={(e) => updateProcedureField(f.id, { required: e.target.checked })}
                        />
                        <span style={{ marginLeft: 8 }}>Required</span>
                      </label>
                    </Stack>
                  </Grid>
                </Grid>

                {(f.type === 'multiple_choice' || f.type === 'checklist') ? (
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {(Array.isArray(f.options) ? f.options : []).map((o) => (
                      <Stack key={o.id} direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={o.label}
                          onChange={(e) => updateFieldOption(f.id, o.id, e.target.value)}
                          placeholder="Option"
                          fullWidth
                          size="small"
                        />
                        <MuiButton variant="text" color="error" onClick={() => removeFieldOption(f.id, o.id)}>
                          Remove
                        </MuiButton>
                      </Stack>
                    ))}
                    <MuiButton variant="outlined" onClick={() => addFieldOption(f.id)}>
                      Add Option
                    </MuiButton>
                  </Stack>
                ) : null}
              </Paper>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <MuiButton variant="text" onClick={() => { setShowCreateProcedureModal(false); resetNewProcedureForm(); }}>
              Cancel
            </MuiButton>
            <MuiButton variant="contained" onClick={handleCreateProcedureFromModal} disabled={!newProcedureForm.name.trim()}>
              Add Procedure
            </MuiButton>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default WorkOrders;
