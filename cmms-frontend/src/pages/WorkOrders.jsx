import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ChevronDown, SlidersHorizontal, X, ListChecks, Calendar, User, Lock, PauseCircle, RefreshCw, Check } from 'lucide-react';
import axios from 'axios';
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
  const [isDraggingLocationPictures, setIsDraggingLocationPictures] = useState(false);
  const [locationPicturesInputKey, setLocationPicturesInputKey] = useState(0);
  const [locationFilesInputKey, setLocationFilesInputKey] = useState(0);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    description: '',
    teamsInCharge: [],
    barcode: '',
    vendors: '',
    parentId: '',
    pictures: [],
    files: [],
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
    locationName: '',
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
          assigneeId: wo.assignee_id ? String(wo.assignee_id) : (wo.assigneeId ? String(wo.assigneeId) : ''),
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
    fetchAssets();
    fetchTeams();
    fetchCategories();
    fetchParts();
    fetchProcedures();
    fetchVendors();
    fetchWorkOrders();
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
    const list = Array.isArray(locations) ? locations : [];
    const location = list.find(l => l.id === locationId);
    if (location?.name) return location.name;
    if (typeof locationId === 'string' && locationId.trim()) return locationId;
    return 'Unknown Location';
  };

  const getAssigneeName = (assigneeId) => {
    const user = users.find(u => u.id === assigneeId);
    return user?.name || 'Unassigned';
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
        <div className="mt-3 text-xs text-gray-500">
          Loading procedure steps…
        </div>
      );
    }

    if (proc === null) {
      return (
        <div className="mt-3 text-xs text-gray-500">
          Unable to load procedure steps.
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="mt-3 text-xs text-gray-500">
          No steps found for this procedure.
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-3">
        <div className="text-xs font-medium text-gray-500">Procedure Details</div>
        <div className="space-y-3">
          {sections
            .slice()
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
            .map((sec) => {
              const fields = Array.isArray(sec?.fields) ? sec.fields : [];
              return (
                <div key={sec?.id ?? `${id}-sec-${sec?.order ?? ''}-${sec?.title ?? ''}`} className="rounded-md border border-gray-200 px-3 py-3">
                  <div className="text-sm font-semibold text-gray-900">{sec?.title || 'Untitled section'}</div>
                  {sec?.description ? (
                    <div className="mt-1 text-xs text-gray-600">{sec.description}</div>
                  ) : null}

                  {fields.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {fields
                        .slice()
                        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
                        .map((f) => {
                          const cfgOptions = Array.isArray(f?.config?.options) ? f.config.options : [];
                          const options = cfgOptions.length ? cfgOptions : (Array.isArray(f?.options) ? f.options : []);
                          return (
                            <div key={f?.id ?? `${id}-field-${f?.order ?? ''}-${f?.label ?? ''}`} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm text-gray-900">{f?.label || 'Untitled field'}</div>
                                <div className="text-xs text-gray-600">{String(f?.field_type || 'text')}</div>
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {Number(f?.required) ? 'Required' : 'Optional'}
                              </div>
                              {f?.help_text ? (
                                <div className="mt-1 text-xs text-gray-600">{f.help_text}</div>
                              ) : null}
                              {options.length > 0 ? (
                                <div className="mt-1 text-xs text-gray-600">
                                  Options: {options.map((o) => String(o?.label ?? o ?? '').trim()).filter(Boolean).join(', ')}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">No fields</div>
                  )}
                </div>
              );
            })}
        </div>

        {viewMode === 'calendar' && dragUi.active ? (
          <div className="text-sm text-gray-600">
            Dragging work order: <span className="font-semibold">{String(dragUi.workOrderId)}</span>
          </div>
        ) : null}
      </div>
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

    const monthStart = new Date(calendarAnchorDate.getFullYear(), calendarAnchorDate.getMonth(), 1);
    const gridStart = startOfWeekMonday(monthStart);
    return Array.from({ length: 42 }, (_v, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [calendarAnchorDate, calendarMode]);

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
      locationName: '',
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

    setCreateForm((p) => ({
      ...p,
      title: wo.title || '',
      description: wo.description || '',
      locationName: typeof wo.locationId === 'string' ? wo.locationId : '',
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
      teamsInCharge: [],
      barcode: '',
      vendors: '',
      parentId: '',
      pictures: [],
      files: [],
    });
    setIsDraggingLocationPictures(false);
    setLocationPicturesInputKey((k) => k + 1);
    setLocationFilesInputKey((k) => k + 1);
  };

  const openNewLocationModal = () => {
    resetLocationForm();
    setShowLocationModal(true);
  };

  const addLocationPictures = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const mapped = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          id: `LOC-PIC-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        };
      })
    );
    setLocationForm((p) => ({ ...p, pictures: [...(p.pictures || []), ...mapped] }));
  };

  const removeLocationPicture = (id) => {
    setLocationForm((p) => ({ ...p, pictures: (p.pictures || []).filter((x) => x.id !== id) }));
  };

  const addLocationFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const mapped = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          id: `LOC-FILE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        };
      })
    );
    setLocationForm((p) => ({ ...p, files: [...(p.files || []), ...mapped] }));
  };

  const removeLocationFile = (id) => {
    setLocationForm((p) => ({ ...p, files: (p.files || []).filter((x) => x.id !== id) }));
  };

  const handleCreateLocationFromModal = () => {
    const name = String(locationForm.name || '').trim();
    if (!name) return;
    const created = addLocation({
      name,
      type: 'site',
      address: String(locationForm.address || '').trim() || undefined,
      description: String(locationForm.description || '').trim() || undefined,
      teamsInCharge: Array.isArray(locationForm.teamsInCharge) ? locationForm.teamsInCharge : [],
      barcode: String(locationForm.barcode || '').trim() || undefined,
      vendors: String(locationForm.vendors || '').trim() || undefined,
      parentId: String(locationForm.parentId || '').trim() || undefined,
      pictures: locationForm.pictures || [],
      files: locationForm.files || [],
    });

    setCreateForm((p) => ({ ...p, locationName: created?.name || name }));
    setShowLocationModal(false);
    resetLocationForm();
  };

  const handleSaveWorkOrder = async () => {
    const title = createForm.title.trim();
    if (!title) return;

    const locationName = createForm.locationName.trim();
    const assetId = createForm.assetId ? String(createForm.assetId) : '';
    const teamId = createForm.teamId ? String(createForm.teamId) : '';

    let location = null;
    if (locationName) {
      location = (Array.isArray(locations) ? locations : []).find((l) => normalize(l.name) === normalize(locationName)) || null;
      if (!location) {
        location = addLocation({ name: locationName, type: 'site' });
      }
    }

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
      location: location?.name || locationName,
      team_id: teamId ? parseInt(teamId, 10) : null,
      assignee_id: Number.isFinite(numericAssigneeId) ? numericAssigneeId : null,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Work Orders"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            />
          </div>
          <Button onClick={openCreateWorkOrder}>
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => fetchWorkOrders()}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Mobile search */}
      <div className="md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search Work Orders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
          />
        </div>
      </div>

      {/* Filter chips + Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-md text-sm text-gray-700 bg-white">
              <SlidersHorizontal className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium">Filters</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'dueDate' ? '' : 'dueDate')}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 text-gray-500" />
                Due Date
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {openFilter === 'dueDate' && (
                <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="p-2">
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
                      <button
                        key={opt.key || 'any'}
                        type="button"
                        onClick={() => {
                          setFilters((p) => ({ ...p, dueDatePreset: opt.key, dueDateCustom: opt.key === 'custom' ? p.dueDateCustom : '' }));
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      >
                        {opt.label}
                      </button>
                    ))}

                    {filters.dueDatePreset === 'custom' && (
                      <div className="pt-2">
                        <input
                          type="date"
                          value={filters.dueDateCustom}
                          onChange={(e) => setFilters((p) => ({ ...p, dueDateCustom: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setOpenFilter('')}
                            className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === 'priority' ? '' : 'priority')}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                Priority
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {openFilter === 'priority' && (
                <div className="absolute z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {[
                    { key: '', label: 'Any' },
                    { key: 'low', label: 'Low' },
                    { key: 'medium', label: 'Medium' },
                    { key: 'high', label: 'High' },
                    { key: 'critical', label: 'Critical' },
                  ].map((opt) => (
                    <button
                      key={opt.key || 'any'}
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, priority: opt.key })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {extraFilterKeys.includes('asset') && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenFilter(openFilter === 'asset' ? '' : 'asset')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  Asset
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {openFilter === 'asset' && (
                  <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, asset: '' })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Any
                    </button>
                    {assets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setFilters((p) => ({ ...p, asset: a.id })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {a.asset_name || a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {extraFilterKeys.includes('status') && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenFilter(openFilter === 'status' ? '' : 'status')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  Status
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {openFilter === 'status' && (
                  <div className="absolute z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {[
                      { key: '', label: 'Any' },
                      { key: 'open', label: 'Open' },
                      { key: 'on_hold', label: 'On Hold' },
                      { key: 'in_progress', label: 'In Progress' },
                      { key: 'completed', label: 'Completed' },
                    ].map((opt) => (
                      <button
                        key={opt.key || 'any'}
                        type="button"
                        onClick={() => { setFilters((p) => ({ ...p, status: opt.key })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {extraFilterKeys.includes('categoryId') && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenFilter(openFilter === 'categoryId' ? '' : 'categoryId')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  Category
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {openFilter === 'categoryId' && (
                  <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, categoryId: '' })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Any
                    </button>
                    {(apiCategories || []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setFilters((p) => ({ ...p, categoryId: c.id })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {extraFilterKeys.includes('part') && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenFilter(openFilter === 'part' ? '' : 'part')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  Part
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {openFilter === 'part' && (
                  <div className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setFilters((p) => ({ ...p, part: '' })); setOpenFilter(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Any
                    </button>
                    {(apiParts || []).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setFilters((prev) => ({ ...prev, part: p.id })); setOpenFilter(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('todo'); setSelectedWorkOrderId(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'todo' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                To Do
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('done'); setSelectedWorkOrderId(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'done' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Done
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode === 'list' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('calendar'); setSelectedWorkOrderId(null); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode === 'calendar' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Calendar
                </button>
              </div>

              {viewMode === 'calendar' ? (
                <div className="inline-flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setCalendarMode('month')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${calendarMode === 'month' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMode('week')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${calendarMode === 'week' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Week
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarAnchorDate((prev) => {
                          const d = new Date(prev);
                          if (calendarMode === 'week') d.setDate(d.getDate() - 7);
                          else d.setMonth(d.getMonth() - 1);
                          return d;
                        });
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <div className="text-sm font-medium text-gray-900 min-w-[140px] text-center">
                      {calendarAnchorDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarAnchorDate((prev) => {
                          const d = new Date(prev);
                          if (calendarMode === 'week') d.setDate(d.getDate() + 7);
                          else d.setMonth(d.getMonth() + 1);
                          return d;
                        });
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="priority_desc">Sort: Priority (High - Low)</option>
                    <option value="priority_asc">Sort: Priority (Low - High)</option>
                    <option value="due_asc">Sort: Due Date (Soonest)</option>
                    <option value="due_desc">Sort: Due Date (Latest)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
              <div key={d} className="px-3 py-2 text-[11px] font-semibold text-gray-500 tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((d) => {
              const key = dayKey(d);
              const items = workOrdersByDay.get(key) || [];
              const inMonth = d.getMonth() === calendarAnchorDate.getMonth();
              const today = new Date();
              const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
              const dateIso = toDateOnlyIso(d);
              const isDropTarget = Boolean(dragUi?.dragging) && String(dragUi?.targetDayKey || '') === String(key);
              return (
                <div
                  key={key}
                  data-cal-daykey={key}
                  data-cal-dateiso={dateIso}
                  data-cal-dateonly={key}
                  className={`min-h-[140px] border-r border-b border-gray-200 p-2 transition-colors ${
                    'bg-white'
                  } ${isDropTarget ? 'bg-primary-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold ${isToday ? 'text-primary-700' : (inMonth ? 'text-gray-900' : 'text-gray-400')}`}>{d.getDate()}</div>
                    {items.length > 0 ? (
                      <div className="text-[11px] text-gray-500">{items.length}</div>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1 max-h-[110px] overflow-y-auto pr-1">
                    {items.map((wo) => (
                      <button
                        key={wo.__occKey || wo.id}
                        type="button"
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
                        className={`relative group w-full text-left px-2 py-1 rounded border bg-white hover:bg-gray-50 transition-colors border-gray-200 cursor-grab active:cursor-grabbing ${
                          dragUi?.dragging && String(dragUi?.workOrderId || '') === String(wo.id) ? 'opacity-0' : ''
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-900 truncate">{wo.title || wo.id}</div>
                        <div className="hidden group-hover:block absolute z-50 left-0 top-full mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg p-2">
                          <div className="text-xs font-semibold text-gray-900 truncate">{wo.title || wo.id}</div>
                          <div className="mt-1 text-[11px] text-gray-600">
                            <div><span className="font-medium">Start:</span> {formatShort(wo?.startDate || wo?.scheduledDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}</div>
                            <div><span className="font-medium">Due:</span> {formatShort(wo?.dueDate, wo?.recurrence === 'monthly_by_date' ? 'weekday_day' : 'month_day') || '—'}</div>
                            <div className="mt-1"><span className="font-medium">Priority:</span> {String(wo.priority || '—')}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {dragUi?.active ? (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{ left: `${Number(dragUi.x || 0) + 12}px`, top: `${Number(dragUi.y || 0) + 12}px` }}
            >
              <div className="w-60 px-2 py-1 rounded border border-primary-300 bg-white shadow-lg opacity-95">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {(workOrders || []).find((wo) => String(wo?.id) === String(dragUi.workOrderId))?.title || String(dragUi.workOrderId || '')}
                </div>
                <div className="text-[11px] text-gray-500">Drop on a date to reschedule</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left list */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {activeTab === 'done' ? 'Done' : 'To Do'} ({filteredWorkOrders.length})
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-sm text-gray-600">Loading work orders…</div>
            ) : filteredWorkOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">You don't have any work orders</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  Create the first work order
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredWorkOrders.map((wo) => {
                  const isSelected = wo.id === selectedWorkOrderId;
                  return (
                    <button
                      key={wo.id}
                      type="button"
                      onClick={() => setSelectedWorkOrderId(wo.id)}
                      className={`w-full text-left px-4 py-4 transition-colors border-l-2 ${
                        isSelected
                          ? 'bg-transparent border-primary-600'
                          : 'bg-transparent border-transparent hover:bg-gray-50/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {wo.title}
                            </div>
                            {getStatusBadge(normalizeStatus(wo.status))}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 truncate">
                            {wo.id} - {getAssetName(wo.assetId)} - {getLocationName(wo.locationId)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getPriorityBadge(wo.priority)}
                          <div className="text-xs text-gray-500">
                            {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'No due date'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right detail */}
        <div ref={workOrderDetailsRef} className="lg:col-span-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!selectedWorkOrder ? (
            <div className="h-full min-h-[65vh] flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-sm font-medium text-gray-900">Select a work order</p>
                <p className="mt-1 text-sm text-gray-500">Details will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">{selectedWorkOrder.id}</div>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedWorkOrder.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {getStatusBadge(normalizeStatus(selectedWorkOrder.status))}
                    {getPriorityBadge(selectedWorkOrder.priority)}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button variant="secondary" onClick={() => openEditWorkOrder(selectedWorkOrder)}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => handleDeleteWorkOrder(selectedWorkOrder.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500">Status</div>
                <div className="mt-2 grid grid-cols-3 gap-2 max-w-[520px]">
                  {[
                    { key: 'on_hold', label: 'On Hold', Icon: PauseCircle },
                    { key: 'in_progress', label: 'In Progress', Icon: RefreshCw },
                    { key: 'completed', label: 'Done', Icon: Check },
                  ].map((s) => {
                    const active = normalizeStatus(selectedWorkOrder.status) === s.key;
                    const Icon = s.Icon;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        disabled={saving}
                        onClick={() => handleStatusChange(selectedWorkOrder.id, s.key)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-md border px-3 py-3 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-transparent border-gray-300 text-primary-700 hover:bg-gray-50/10'
                        } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-900">General</div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900 mt-1">{String(normalizeStatus(selectedWorkOrder.status))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Priority</dt>
                      <dd className="text-sm text-gray-900 mt-1">{String(selectedWorkOrder.priority || 'low')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Work Type</dt>
                      <dd className="text-sm text-gray-900 mt-1">{String(selectedWorkOrder.workType || 'reactive')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Estimated Time</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.estimatedDuration
                          ? `${Math.floor(Number(selectedWorkOrder.estimatedDuration) / 60)}h ${Number(selectedWorkOrder.estimatedDuration) % 60}m`
                          : '—'}
                      </dd>
                    </div>
                  </dl>

                  {selectedWorkOrder.procedure ? (
                    <div>
                      {renderProcedureSteps(selectedWorkOrder.procedure)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-900">Assignment & Location</div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Assigned To</dt>
                      <dd className="text-sm text-gray-900 mt-1">{getAssigneeName(selectedWorkOrder.assigneeId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Team</dt>
                      <dd className="text-sm text-gray-900 mt-1">{getTeamName(selectedWorkOrder.teamId) || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Asset</dt>
                      <dd className="text-sm text-gray-900 mt-1">{getAssetName(selectedWorkOrder.assetId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Location</dt>
                      <dd className="text-sm text-gray-900 mt-1">{getLocationName(selectedWorkOrder.locationId)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-900">Scheduling</div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Start Date</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.startDate ? new Date(selectedWorkOrder.startDate).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Due Date</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.dueDate ? new Date(selectedWorkOrder.dueDate).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-xs font-medium text-gray-500">Recurrence</dt>
                      <dd className="text-sm text-gray-900 mt-1">{String(selectedWorkOrder.recurrence || 'does_not_repeat')}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-900">Procedure, Parts, Category, Vendor</div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Procedure</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.procedure
                          ? (getProcedureName(selectedWorkOrder.procedure) || String(selectedWorkOrder.procedure))
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Part</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.partId
                          ? (getPartName(selectedWorkOrder.partId) || String(selectedWorkOrder.partId))
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.categoryId
                          ? (getCategoryName(selectedWorkOrder.categoryId) || String(selectedWorkOrder.categoryId))
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Vendor</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {selectedWorkOrder.vendorId
                          ? (getVendorName(selectedWorkOrder.vendorId) || String(selectedWorkOrder.vendorId))
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-900">Description</div>
                <div className="p-4">
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedWorkOrder.description || '—'}
                  </div>
                </div>
              </div>

              {selectedWorkOrder.checklist && selectedWorkOrder.checklist.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500">Checklist</div>
                  <div className="mt-2 space-y-2">
                    {selectedWorkOrder.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          readOnly
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={item.completed ? 'line-through text-gray-500 text-sm' : 'text-gray-900 text-sm'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Create Work Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); setWorkOrderMode('create'); setEditingWorkOrderId(null); }}
        title={workOrderMode === 'edit' ? 'Edit Work Order' : 'New Work Order'}
        size="xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What needs to be done? (Required)
            </label>
            <textarea
              rows={2}
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe the work"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={createForm.locationName}
                onChange={(e) => setCreateForm((p) => ({ ...p, locationName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Start typing..."
              />
              <button
                type="button"
                onClick={handleAddNewLocation}
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <span className="text-lg leading-none">+</span>
                Add new location
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <div className="relative">
                <select
                  value={createForm.assetId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setCreateForm((p) => ({
                      ...p,
                      assetId: nextId,
                      assetName: nextId ? (getAssetName(nextId) || '') : '',
                    }));
                  }}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Select Asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.asset_name || a.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <button
                type="button"
                onClick={() => { setShowAddAssetModal(true); resetNewAssetForm(); }}
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <span className="text-lg leading-none">+</span>
                Add new asset
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <div className="relative">
              <select
                value={createForm.teamId}
                onChange={(e) => {
                  const nextTeamId = e.target.value;
                  setCreateForm((p) => ({ ...p, teamId: nextTeamId, assigneeId: '' }));
                  fetchTeamUsers(nextTeamId);
                }}
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.team_name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Procedure</label>
            <div className="border border-gray-200 rounded-md p-4 bg-white">
              {createForm.procedure ? (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <ListChecks className="h-4 w-4 text-gray-500" />
                        <span className="font-medium truncate">{getProcedureName(createForm.procedure)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">Procedure attached</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setCreateForm((p) => ({ ...p, procedure: '' })); setSelectedProcedureId(''); }}
                        className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowProcedureModal(true); setProcedureSearch(''); setSelectedProcedureId(createForm.procedure || ''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 text-primary-700 rounded-md text-sm hover:bg-primary-50"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {renderProcedureSteps(createForm.procedure)}
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <ListChecks className="h-4 w-4 text-gray-500" />
                    Create or attach new Form, Procedure or Checklist
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => { setShowProcedureModal(true); setProcedureSearch(''); setSelectedProcedureId(''); }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 text-primary-700 rounded-md text-sm hover:bg-primary-50"
                    >
                      <span className="text-lg leading-none">+</span>
                      Add Procedure
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <div className="relative">
              <select
                value={createForm.assigneeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, assigneeId: e.target.value }))}
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                disabled={!createForm.teamId || loadingTeamUsers}
              >
                <option value="">{loadingTeamUsers ? 'Loading users…' : (!createForm.teamId ? 'Select Team first' : 'Select User')}</option>
                {(teamUsers || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.user_name || u.name || String(u.id)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Time
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                <input
                  type="number"
                  min={0}
                  value={createForm.estimatedHours}
                  onChange={(e) => setCreateForm((p) => ({ ...p, estimatedHours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Minutes</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={createForm.estimatedMinutes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, estimatedMinutes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="does_not_repeat">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly_by_date">Monthly by date</option>
                <option value="monthly_by_weekday">Monthly by weekday</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>

              {createForm.recurrence === 'daily' && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
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
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setCreateForm((p) => {
                              const current = Array.isArray(p.recurrenceDays) ? p.recurrenceDays : [];
                              const next = current.includes(d.key) ? current.filter((x) => x !== d.key) : [...current, d.key];
                              return { ...p, recurrenceDays: next };
                            });
                          }}
                          className={`h-9 w-11 rounded-full text-sm font-medium border transition-colors ${selected ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Repeats every day after completion of this Work Order.</div>
                </div>
              )}

              {createForm.recurrence === 'weekly' && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>Every</span>
                    <input
                      type="number"
                      min={1}
                      value={createForm.recurrenceIntervalWeeks}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceIntervalWeeks: e.target.value }))}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span>week on</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
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
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setCreateForm((p) => {
                              const current = Array.isArray(p.recurrenceDays) ? p.recurrenceDays : [];
                              const next = current.includes(d.key) ? current.filter((x) => x !== d.key) : [...current, d.key];
                              return { ...p, recurrenceDays: next };
                            });
                          }}
                          className={`h-9 w-11 rounded-full text-sm font-medium border transition-colors ${selected ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
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
                  </div>
                </div>
              )}

              {createForm.recurrence === 'monthly_by_date' && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>Every</span>
                    <input
                      type="number"
                      min={1}
                      value={createForm.recurrenceIntervalMonths}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceIntervalMonths: e.target.value }))}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span>month on the</span>
                    <select
                      value={createForm.recurrenceDayOfMonth}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceDayOfMonth: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <span className="text-gray-500">
                      {(() => {
                        const day = Math.min(31, Math.max(1, parseInt(String(createForm.recurrenceDayOfMonth || 1), 10) || 1));
                        const base = createForm.startDate ? new Date(createForm.startDate) : new Date();
                        const d = new Date(base.getFullYear(), base.getMonth(), day);
                        try {
                          return d.toLocaleDateString(undefined, { weekday: 'long' });
                        } catch {
                          return '';
                        }
                      })()}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {(() => {
                      const day = Math.min(31, Math.max(1, parseInt(String(createForm.recurrenceDayOfMonth || 1), 10) || 1));
                      const interval = Math.max(1, parseInt(String(createForm.recurrenceIntervalMonths || 1), 10) || 1);
                      const suffix = (n) => {
                        const mod100 = n % 100;
                        if (mod100 >= 11 && mod100 <= 13) return 'th';
                        switch (n % 10) {
                          case 1: return 'st';
                          case 2: return 'nd';
                          case 3: return 'rd';
                          default: return 'th';
                        }
                      };
                      const ordinal = `${day}${suffix(day)}`;
                      const intervalText = interval === 1 ? 'every month' : `every ${interval} months`;
                      const base = createForm.startDate ? new Date(createForm.startDate) : new Date();
                      const d = new Date(base.getFullYear(), base.getMonth(), day);
                      const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
                      return `Repeats ${intervalText} on ${weekday} the ${ordinal} after completion of this Work Order.`;
                    })()}
                  </div>
                </div>
              )}

              {createForm.recurrence === 'monthly_by_weekday' && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>Every</span>
                    <input
                      type="number"
                      min={1}
                      value={createForm.recurrenceIntervalMonths}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceIntervalMonths: e.target.value }))}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span>month on the</span>
                    <select
                      value={createForm.recurrenceWeekOfMonth}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceWeekOfMonth: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      <option value={1}>1st</option>
                      <option value={2}>2nd</option>
                      <option value={3}>3rd</option>
                      <option value={4}>4th</option>
                      <option value={5}>Last</option>
                    </select>
                    <select
                      value={createForm.recurrenceWeekday}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceWeekday: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      <option value="sun">Sunday</option>
                      <option value="mon">Monday</option>
                      <option value="tue">Tuesday</option>
                      <option value="wed">Wednesday</option>
                      <option value="thu">Thursday</option>
                      <option value="fri">Friday</option>
                      <option value="sat">Saturday</option>
                    </select>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {(() => {
                      const interval = Math.max(1, parseInt(String(createForm.recurrenceIntervalMonths || 1), 10) || 1);
                      const intervalText = interval === 1 ? 'every month' : `every ${interval} months`;

                      const week = Math.min(5, Math.max(1, parseInt(String(createForm.recurrenceWeekOfMonth || 1), 10) || 1));
                      const weekText = week === 5 ? 'last' : (week === 1 ? '1st' : (week === 2 ? '2nd' : (week === 3 ? '3rd' : '4th')));

                      const weekdayMap = {
                        sun: 'Sunday',
                        mon: 'Monday',
                        tue: 'Tuesday',
                        wed: 'Wednesday',
                        thu: 'Thursday',
                        fri: 'Friday',
                        sat: 'Saturday',
                      };
                      const weekdayKey = String(createForm.recurrenceWeekday || 'mon');
                      const weekday = weekdayMap[weekdayKey] || 'Monday';

                      return `Repeats ${intervalText} on the ${weekText} ${weekday} of the month after completion of this Work Order.`;
                    })()}
                  </div>
                </div>
              )}

              {createForm.recurrence === 'yearly' && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>Every</span>
                    <input
                      type="number"
                      min={1}
                      value={createForm.recurrenceIntervalYears}
                      onChange={(e) => setCreateForm((p) => ({ ...p, recurrenceIntervalYears: e.target.value }))}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span>year</span>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {(() => {
                      const interval = Math.max(1, parseInt(String(createForm.recurrenceIntervalYears || 1), 10) || 1);
                      const intervalText = interval === 1 ? 'every year' : `every ${interval} years`;
                      const base = createForm.startDate ? new Date(createForm.startDate) : new Date();
                      const day = base.getDate();
                      const month = base.toLocaleDateString(undefined, { month: 'long' });
                      return `Repeats ${intervalText} on ${month} ${day} after completion of this Work Order.`;
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
              <select
                value={createForm.workType}
                onChange={(e) => setCreateForm((p) => ({ ...p, workType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="reactive">Reactive</option>
                <option value="preventive">Preventive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
              {[
                { key: 'low', label: 'Low' },
                { key: 'medium', label: 'Medium' },
                { key: 'high', label: 'High' },
                { key: 'critical', label: 'Critical' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setCreateForm((prev) => ({ ...prev, priority: p.key }))}
                  className={`px-3 py-2 text-sm ${createForm.priority === p.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parts</label>
              <div className="relative">
                <select
                  value={createForm.parts}
                  onChange={(e) => setCreateForm((p) => ({ ...p, parts: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Start typing...</option>
                  {(apiParts || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="relative">
                <select
                  value={createForm.categoryId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Start typing...</option>
                  {(apiCategories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <button
                type="button"
                onClick={handleCreateCategoryFromWorkOrder}
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <span className="text-lg leading-none">+</span>
                Add new category
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendors</label>
              <div className="relative">
                <select
                  value={createForm.vendorId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, vendorId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Start typing...</option>
                  {(apiVendors || []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateForm(); setWorkOrderMode('create'); setEditingWorkOrderId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkOrder} disabled={!createForm.title.trim() || saving || (workOrderMode === 'edit' && !editingWorkOrderId)}>
              {saving ? (workOrderMode === 'edit' ? 'Saving…' : 'Creating…') : (workOrderMode === 'edit' ? 'Save' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showLocationModal}
        onClose={() => { setShowLocationModal(false); resetLocationForm(); }}
        title="New Location"
        size="xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
            <input
              value={locationForm.name}
              onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter Location Name"
            />
          </div>

          <div>
            <input
              key={locationPicturesInputKey}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addLocationPictures(e.target.files);
                e.target.value = '';
              }}
              id="location-pictures-input"
            />

            <div
              className={`w-full rounded-md border-2 border-dashed p-6 transition-colors ${isDraggingLocationPictures ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'}`}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingLocationPictures(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingLocationPictures(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingLocationPictures(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingLocationPictures(false);
                addLocationPictures(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-sm text-gray-700">Add or drag pictures</div>
                <button
                  type="button"
                  onClick={() => document.getElementById('location-pictures-input')?.click()}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Choose pictures
                </button>
                <div className="text-xs text-gray-500">PNG, JPG, GIF</div>
              </div>
            </div>

            {Array.isArray(locationForm.pictures) && locationForm.pictures.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {locationForm.pictures.map((p) => (
                  <div key={p.id} className="relative border border-gray-200 rounded-md overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => removeLocationPicture(p.id)}
                      className="absolute top-1 right-1 h-7 w-7 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center hover:bg-white"
                      aria-label="Remove"
                      title="Remove"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                    <img src={p.dataUrl} alt={p.name} className="h-24 w-full object-cover" />
                    <div className="px-2 py-1 text-xs text-gray-700 truncate" title={p.name}>{p.name}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={locationForm.address}
              onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={locationForm.description}
              onChange={(e) => setLocationForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teams in Charge</label>
            <div className="border border-gray-200 rounded-md p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {teams.map((t) => {
                  const checked = (locationForm.teamsInCharge || []).includes(String(t.id));
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const id = String(t.id);
                          setLocationForm((p) => {
                            const cur = Array.isArray(p.teamsInCharge) ? p.teamsInCharge : [];
                            const next = e.target.checked ? [...cur, id] : cur.filter((x) => x !== id);
                            return { ...p, teamsInCharge: next };
                          });
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {t.team_name}
                    </label>
                  );
                })}
              </div>
              {teams.length === 0 ? (
                <div className="text-xs text-gray-500">No teams loaded</div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QR Code/Barcode</label>
            <input
              value={locationForm.barcode}
              onChange={(e) => setLocationForm((p) => ({ ...p, barcode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Files</label>
            <input
              key={locationFilesInputKey}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addLocationFiles(e.target.files);
                e.target.value = '';
              }}
              id="location-files-input"
            />
            <Button variant="secondary" onClick={() => document.getElementById('location-files-input')?.click()}>
              Attach files
            </Button>

            {Array.isArray(locationForm.files) && locationForm.files.length > 0 ? (
              <div className="mt-3 space-y-2">
                {locationForm.files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 border border-gray-200 rounded-md">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">{f.name}</div>
                      <div className="text-xs text-gray-500">{Math.round((f.size || 0) / 1024)} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLocationFile(f.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendors</label>
            <input
              value={locationForm.vendors}
              onChange={(e) => setLocationForm((p) => ({ ...p, vendors: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Start typing..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Location</label>
            <div className="relative">
              <select
                value={locationForm.parentId}
                onChange={(e) => setLocationForm((p) => ({ ...p, parentId: e.target.value }))}
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">None</option>
                {(Array.isArray(locations) ? locations : []).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowLocationModal(false); resetLocationForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateLocationFromModal} disabled={!String(locationForm.name || '').trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAssetsModal}
        onClose={() => setShowAssetsModal(false)}
        title="Assets"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
              />
            </div>
            <Button
              onClick={() => { setShowAddAssetModal(true); resetNewAssetForm(); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Asset
            </Button>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {assets
                .filter((a) => (a?.name || '').toLowerCase().includes(assetSearch.toLowerCase()))
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setCreateForm((p) => ({ ...p, assetName: a.name })); setShowAssetsModal(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.id}</div>
                  </button>
                ))}

              {assets.filter((a) => (a?.name || '').toLowerCase().includes(assetSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">No assets found.</div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddAssetModal}
        onClose={() => { setShowAddAssetModal(false); resetNewAssetForm(); }}
        title="Add New Asset"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name (Required)</label>
            <input
              value={newAssetForm.name}
              onChange={(e) => setNewAssetForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              placeholder="Start typing..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="relative">
                <select
                  value={newAssetForm.locationId}
                  onChange={(e) => setNewAssetForm((p) => ({ ...p, locationId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">None</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="relative">
                <select
                  value={newAssetForm.status}
                  onChange={(e) => setNewAssetForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="running">Running</option>
                  <option value="down">Down</option>
                  <option value="idle">Idle</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              value={newAssetForm.category}
              onChange={(e) => setNewAssetForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              placeholder="Uncategorized"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={newAssetForm.description}
              onChange={(e) => setNewAssetForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              placeholder="Add a description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowAddAssetModal(false); resetNewAssetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssetFromModal} disabled={!newAssetForm.name.trim()}>
              Save Asset
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showProcedureModal}
        onClose={() => { setShowProcedureModal(false); setProcedureSearch(''); setSelectedProcedureId(''); }}
        title="Add Procedure"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                placeholder="Search Procedure Templates"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => { setShowCreateProcedureModal(true); resetNewProcedureForm(); }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Create a New Procedure
            </button>
          </div>

          {(apiProcedures || []).length === 0 ? (
            <div className="border border-gray-200 rounded-md p-10 bg-white text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <ListChecks className="h-7 w-7 text-primary-600" />
              </div>
              <div className="mt-6 text-2xl font-bold text-gray-900">Start adding Procedures</div>
              <div className="mt-2 text-sm text-gray-600">
                Press <span className="font-medium text-primary-600">+ Create a New Procedure</span> button above to add your first Procedure.
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {(apiProcedures || [])
                  .filter((p) => (p?.name || '').toLowerCase().includes(procedureSearch.toLowerCase()))
                  .map((p) => {
                    const selected = String(selectedProcedureId) === String(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProcedureId(p.id)}
                        className={`w-full text-left px-3 py-3 text-sm transition-colors ${selected ? 'bg-transparent border-l-4 border-primary-500' : 'bg-transparent border-l-4 border-transparent'} hover:bg-gray-50/10`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 truncate">{p.description || '—'}</div>
                          </div>
                          <div className={`h-4 w-4 rounded border ${selected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowProcedureModal(false); setProcedureSearch(''); setSelectedProcedureId(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedProcedureId) return;
                setCreateForm((p) => ({ ...p, procedure: selectedProcedureId }));
                setShowProcedureModal(false);
                setProcedureSearch('');
              }}
              disabled={!selectedProcedureId || (apiProcedures || []).length === 0}
            >
              Add Procedure
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateProcedureModal}
        onClose={() => { setShowCreateProcedureModal(false); resetNewProcedureForm(); }}
        title="Create a New Procedure"
        size="xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Procedure Name</label>
            <input
              value={newProcedureForm.name}
              onChange={(e) => setNewProcedureForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              placeholder="Procedure name"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setNewProcedureForm((p) => ({ ...p, description: '' }))}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add Description
            </button>
            {newProcedureForm.description !== null && (
              <textarea
                rows={3}
                value={newProcedureForm.description || ''}
                onChange={(e) => setNewProcedureForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                placeholder="Description"
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 space-y-4">
              {(newProcedureForm.fields || []).map((f) => (
                <div key={f.id} className="border border-gray-200 rounded-md p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <input
                        value={f.name}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        placeholder="Field Name"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <div className="relative">
                        <select
                          value={f.type}
                          onChange={(e) => updateProcedureField(f.id, { type: e.target.value })}
                          className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          {procedureFieldTypes.map((t) => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!f.required}
                          onChange={(e) => updateProcedureField(f.id, { required: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  {f.type === 'text' && (
                    <div className="mt-3">
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        placeholder="Text will be entered here"
                        readOnly
                      />
                    </div>
                  )}

                  {f.type === 'checkbox' && (
                    <div className="mt-3">
                      <div className="h-10" />
                    </div>
                  )}

                  {f.type === 'number' && (
                    <div className="mt-3">
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        placeholder="Number will be entered here"
                        readOnly
                      />
                    </div>
                  )}

                  {f.type === 'amount' && (
                    <div className="mt-3">
                      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                        <div className="px-3 py-2 text-gray-600 bg-gray-50">$</div>
                        <input
                          className="flex-1 px-3 py-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          placeholder="Amount will be entered here"
                          readOnly
                        />
                      </div>
                    </div>
                  )}

                  {(f.type === 'multiple_choice' || f.type === 'checklist') && (
                    <div className="mt-3 space-y-2">
                      {(Array.isArray(f.options) ? f.options : []).map((o) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <div className="text-gray-400 select-none">⋮⋮</div>
                          <input
                            value={o.label}
                            onChange={(e) => updateFieldOption(f.id, o.id, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                            placeholder="Option"
                          />
                          <button
                            type="button"
                            onClick={() => removeFieldOption(f.id, o.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addFieldOption(f.id)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  {f.type === 'inspection_check' && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {[
                        { key: 'Pass', color: 'text-green-600' },
                        { key: 'Flag', color: 'text-orange-600' },
                        { key: 'Fail', color: 'text-red-600' },
                      ].map((x) => (
                        <div
                          key={x.key}
                          className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-center bg-white ${x.color}`}
                        >
                          {x.key}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowCreateProcedureModal(false); resetNewProcedureForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateProcedureFromModal} disabled={!newProcedureForm.name.trim()}>
              Add Procedure
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkOrders;
