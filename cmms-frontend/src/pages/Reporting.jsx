import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar, ChevronDown, Download, Filter } from 'lucide-react';
import {
  Box,
  Button,
  Chip,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Card, CardBody, CardHeader, Table, Badge } from '../components';
import useStore from '../store/useStore';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'http://172.18.100.31:8000';

const EXPORT_SECTIONS = ['work_orders'];

const normalizeWorkOrderStatus = (raw) => {
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

const tabs = [
  { id: 'work_orders', label: 'Work Orders' },
  { id: 'export_data', label: 'Export Data' },
];

const formatDateForInput = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatInputDate = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const Gauge = ({ label, valueText }) => (
  <Stack alignItems="center" justifyContent="center" spacing={0.5}>
    <Box sx={{ position: 'relative', width: 160, height: 80, overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: '18px solid',
          borderColor: 'primary.100',
        }}
      />
    </Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>
      {valueText}
    </Typography>
  </Stack>
);

const Reporting = () => {
  const { assets, locations, users, workOrdersVersion } = useStore();

  const [apiWorkOrders, setApiWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [workOrdersError, setWorkOrdersError] = useState('');

  const [apiAssets, setApiAssets] = useState([]);

  const [activeTab, setActiveTab] = useState('work_orders');
  const [exportSection, setExportSection] = useState('work_orders');
  const [exportForm, setExportForm] = useState({
    start: '',
    end: '',
    format: 'csv',
    includePlannedOrCreated: true,
    includeDue: true,
    includeCompleted: true,
    procedureFormat: 'summary',
    includeOnlyRestock: false,
    includeDeletedUsers: false,
    exportType: 'grouped_by_user',
    columnsOpen: false,
  });
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date('2000-01-01T00:00:00');
    return { start: formatDateForInput(start), end: formatDateForInput(end) };
  });

  const [filters, setFilters] = useState({ assignedTo: '', dueDate: '', priority: '' });

  useEffect(() => {
    if (!EXPORT_SECTIONS.includes(exportSection)) {
      setExportSection('work_orders');
    }
  }, [exportSection]);

  useEffect(() => {
    if (activeTab === 'reporting_details') {
      setActiveTab('work_orders');
    }
  }, [activeTab]);

  const startDate = useMemo(() => new Date(`${dateRange.start}T00:00:00`), [dateRange.start]);
  const endDate = useMemo(() => new Date(`${dateRange.end}T23:59:59`), [dateRange.end]);

  const fetchWorkOrders = useCallback(async () => {
    setLoadingWorkOrders(true);
    setWorkOrdersError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/work-orders`, { headers: { accept: 'application/json' } });
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((wo) => {
        const dueIso = wo?.due_date ? new Date(wo.due_date).toISOString() : null;
        const startIso = wo?.start_date ? new Date(wo.start_date).toISOString() : null;
        const createdIso = wo?.created_at ? new Date(wo.created_at).toISOString() : (startIso || null);
        const completedIso = wo?.completed_at ? new Date(wo.completed_at).toISOString() : null;
        const assetVal = wo?.asset;
        const assetObj = assetVal && typeof assetVal === 'object' ? assetVal : null;
        const assetIdRaw =
          wo?.asset_id ??
          wo?.assetId ??
          wo?.asset_id_fk ??
          (assetVal && typeof assetVal !== 'object' ? assetVal : null) ??
          assetObj?.id ??
          assetObj?.asset_id ??
          assetObj?.assetId ??
          null;
        const assetId = assetIdRaw !== undefined && assetIdRaw !== null ? String(assetIdRaw) : '';
        const assetName = String(
          wo?.asset_name ??
          wo?.assetName ??
          assetObj?.name ??
          assetObj?.asset_name ??
          ''
        ).trim();
        const assignedUser = wo?.assigned_user || wo?.assignedUser || null;
        const assigneeName =
          assignedUser?.user_name ||
          assignedUser?.name ||
          assignedUser?.username ||
          '';
        return {
          id: String(wo?.id ?? ''),
          title: String(wo?.name ?? ''),
          description: String(wo?.description ?? ''),
          createdAt: createdIso,
          startDate: startIso,
          dueDate: dueIso,
          completedAt: completedIso,
          status: normalizeWorkOrderStatus(wo?.status),
          priority: String(wo?.priority ?? 'low'),
          workType: String(wo?.work_type ?? ''),
          locationId: typeof wo?.location === 'string' ? wo.location : (wo?.location ? String(wo.location) : ''),
          teamId: wo?.team_id !== undefined && wo?.team_id !== null ? String(wo.team_id) : '',
          assetId,
          assetName,
          vendorId: wo?.vendor_id !== undefined && wo?.vendor_id !== null ? String(wo.vendor_id) : '',
          procedureId: wo?.procedure_id !== undefined && wo?.procedure_id !== null ? String(wo.procedure_id) : '',
          recurrence: String(wo?.recurrence ?? 'does_not_repeat'),
          assigneeId: wo?.assigned_user_id !== undefined && wo?.assigned_user_id !== null ? String(wo.assigned_user_id) : '',
          assigneeName,
        };
      });
      setApiWorkOrders(mapped);
    } catch (e) {
      setWorkOrdersError(e?.response?.data?.detail || e?.message || 'Failed to load work orders');
      setApiWorkOrders([]);
    } finally {
      setLoadingWorkOrders(false);
    }
  }, []);

  const fetchAssetsForExport = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/assets`, { headers: { accept: 'application/json' } });
      setApiAssets(Array.isArray(res.data) ? res.data : []);
    } catch {
      setApiAssets([]);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders, workOrdersVersion]);

  useEffect(() => {
    if (activeTab !== 'export_data') return;
    if (Array.isArray(assets) && assets.length > 0) return;
    fetchAssetsForExport();
  }, [activeTab, assets, fetchAssetsForExport]);

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
  }, [fetchWorkOrders]);

  const derivedRange = useMemo(() => {
    const list = Array.isArray(apiWorkOrders) ? apiWorkOrders : [];
    let min = null;
    let max = null;

    const push = (iso) => {
      if (!iso) return;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    };

    for (const wo of list) {
      push(wo.createdAt);
      push(wo.startDate);
      push(wo.completedAt);
    }

    const today = new Date();
    const start = min || new Date('2000-01-01T00:00:00');
    const end = (!max || max > today) ? today : max;
    return { start: formatDateForInput(start), end: formatDateForInput(end) };
  }, [apiWorkOrders]);

  useEffect(() => {
    setDateRange((prev) => {
      if (!prev?.start || !prev?.end) return derivedRange;
      if (prev.start === derivedRange.start && prev.end === derivedRange.end) return prev;
      const prevStart = new Date(`${prev.start}T00:00:00`);
      const prevEnd = new Date(`${prev.end}T23:59:59`);
      const derivedStart = new Date(`${derivedRange.start}T00:00:00`);
      const derivedEnd = new Date(`${derivedRange.end}T23:59:59`);

      if (prevStart > derivedStart || prevEnd < derivedEnd) {
        return derivedRange;
      }
      return prev;
    });
  }, [derivedRange.start, derivedRange.end]);

  const exportDateRangeText = useMemo(() => {
    const s = exportForm.start || dateRange.start;
    const e = exportForm.end || dateRange.end;
    if (!s || !e) return '';
    return `${new Date(`${s}T00:00:00`).toLocaleDateString()} - ${new Date(`${e}T00:00:00`).toLocaleDateString()}`;
  }, [exportForm.start, exportForm.end, dateRange.start, dateRange.end]);

  const exportStartDate = useMemo(() => {
    const s = exportForm.start || dateRange.start;
    return new Date(`${s}T00:00:00`);
  }, [exportForm.start, dateRange.start]);

  const exportEndDate = useMemo(() => {
    const e = exportForm.end || dateRange.end;
    return new Date(`${e}T23:59:59`);
  }, [exportForm.end, dateRange.end]);

  const exportInRange = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= exportStartDate && d <= exportEndDate;
  };

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const downloadCsv = (filenameBase, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const headers = safeRows.length ? Object.keys(safeRows[0]) : [];
    const csv = [headers.join(',')]
      .concat(
        safeRows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','))
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (filenameBase, title, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const headers = safeRows.length ? Object.keys(safeRows[0]) : [];
    const body = safeRows.map((r) => headers.map((h) => String(r?.[h] ?? '')));

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(String(title || 'Export'), 40, 40);
    if (exportDateRangeText) {
      doc.setFontSize(10);
      doc.text(`Date Range: ${exportDateRangeText}`, 40, 58);
    }

    autoTable(doc, {
      head: headers.length ? [headers] : [['No data']],
      body: headers.length ? body : [],
      startY: exportDateRangeText ? 72 : 60,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20 },
    });

    doc.save(`${filenameBase}.pdf`);
  };

  const buildExportRows = () => {
    const assetList = (Array.isArray(assets) && assets.length > 0) ? assets : (Array.isArray(apiAssets) ? apiAssets : []);
    const assetName = (id) => assetList.find((a) => (
      String(a?.id ?? '') === String(id ?? '') ||
      String(a?.asset_id ?? '') === String(id ?? '') ||
      String(a?.assetId ?? '') === String(id ?? '')
    ))?.name || assetList.find((a) => (
      String(a?.id ?? '') === String(id ?? '') ||
      String(a?.asset_id ?? '') === String(id ?? '') ||
      String(a?.assetId ?? '') === String(id ?? '')
    ))?.asset_name || '';
    const locationName = (id) => locations.find((l) => String(l?.id ?? '') === String(id ?? ''))?.name || '';
    const userName = (id) => users.find((u) => String(u?.id ?? '') === String(id ?? ''))?.name || '';
    const assigneeName = (wo) => {
      if (wo?.assigneeName) return String(wo.assigneeName);
      const fromUsers = userName(wo?.assigneeId);
      if (fromUsers) return fromUsers;
      const fromOptions = assigneeOptions.find((o) => String(o.id) === String(wo?.assigneeId))?.name || '';
      return String(fromOptions || wo?.assigneeId || '');
    };

    if (exportSection === 'work_orders') {
      const list = (apiWorkOrders || []).filter((wo) => exportInRange(wo.createdAt));
      const filtered = list.filter((wo) => {
        if (wo.status === 'completed') return exportForm.includeCompleted;
        if (wo.dueDate && exportInRange(wo.dueDate)) return exportForm.includeDue;
        return exportForm.includePlannedOrCreated;
      });
      return filtered.map((wo) => ({
        ID: wo.id,
        Title: wo.title,
        Status: wo.status,
        Priority: wo.priority,
        Asset: assetName(wo.assetId) || String(wo.assetName || ''),
        Location: locationName(wo.locationId) || String(wo.locationId || ''),
        AssignedTo: assigneeName(wo),
        DueDate: wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '',
        CreatedAt: wo.createdAt ? new Date(wo.createdAt).toLocaleString() : '',
      }));
    }

    return [];
  };

  const handleExport = () => {
    const rows = buildExportRows();
    const titleMap = {
      work_orders: 'Work Orders',
    };
    const title = titleMap[exportSection] || 'Export';

    const s = exportForm.start || dateRange.start;
    const e = exportForm.end || dateRange.end;
    const baseName = `report-${exportSection}-${s}_${e}`;

    if (exportForm.format === 'pdf' || exportForm.format === 'qr_pdf') {
      downloadPdf(baseName, `Export: ${title}`, rows);
      return;
    }

    downloadCsv(baseName, rows);
  };

  const inRange = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= startDate && d <= endDate;
  };

  const filteredWorkOrders = useMemo(() => {
    return (apiWorkOrders || []).filter((wo) => {
      if (filters.assignedTo && wo.assigneeId !== filters.assignedTo) return false;
      if (filters.priority && wo.priority !== filters.priority) return false;
      if (filters.dueDate) {
        const due = wo.dueDate ? formatDateForInput(new Date(wo.dueDate)) : '';
        if (due !== filters.dueDate) return false;
      }
      return true;
    });
  }, [apiWorkOrders, filters]);

  const assigneeOptions = useMemo(() => {
    const map = new Map();

    for (const u of (users || [])) {
      const id = String(u?.id ?? '');
      if (!id) continue;
      map.set(id, { id, name: String(u?.name ?? '') || id });
    }

    for (const wo of (apiWorkOrders || [])) {
      const id = String(wo?.assigneeId ?? '').trim();
      if (!id) continue;
      const name = String(wo?.assigneeName ?? '').trim() || map.get(id)?.name || id;
      map.set(id, { id, name });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [apiWorkOrders, users]);

  const derived = useMemo(() => {
    const createdCount = filteredWorkOrders.length;
    const completedCount = filteredWorkOrders.filter((wo) => wo.status === 'completed').length;
    const percentCompleted = createdCount === 0 ? 0 : Math.round((completedCount / createdCount) * 100);

    const byType = {
      preventive: filteredWorkOrders.filter((wo) => wo.workType === 'preventive').length,
      reactive: filteredWorkOrders.filter((wo) => wo.workType === 'reactive').length,
      other: filteredWorkOrders.filter((wo) => wo.workType && wo.workType !== 'preventive' && wo.workType !== 'reactive').length,
    };

    const statusCounts = {
      open: filteredWorkOrders.filter((wo) => wo.status === 'open').length,
      on_hold: filteredWorkOrders.filter((wo) => wo.status === 'on_hold').length,
      in_progress: filteredWorkOrders.filter((wo) => wo.status === 'in_progress').length,
      done: filteredWorkOrders.filter((wo) => wo.status === 'completed').length,
    };

    const repeatingCount = filteredWorkOrders.filter((wo) => wo.recurrence && wo.recurrence !== 'does_not_repeat').length;
    const nonRepeatingCount = createdCount - repeatingCount;

    const now = new Date();
    const overdueCount = filteredWorkOrders.filter((wo) => wo.dueDate && new Date(wo.dueDate) < now && wo.status !== 'completed').length;

    return { createdCount, completedCount, percentCompleted, byType, statusCounts, repeatingCount, nonRepeatingCount, overdueCount };
  }, [filteredWorkOrders]);

  const chartData = useMemo(() => {
    const MAX_DAYS = 90;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chartEventDate = (wo) => {
      const created = wo?.createdAt ? new Date(wo.createdAt) : null;
      if (created && !Number.isNaN(created.getTime())) return created;
      const started = wo?.startDate ? new Date(wo.startDate) : null;
      if (started && !Number.isNaN(started.getTime())) return started;
      const due = wo?.dueDate ? new Date(wo.dueDate) : null;
      if (due && !Number.isNaN(due.getTime()) && due <= today) return due;
      return null;
    };

    let maxSeen = null;
    for (const wo of (filteredWorkOrders || [])) {
      const created = chartEventDate(wo);
      const completed = wo.completedAt ? new Date(wo.completedAt) : null;
      if (created && !Number.isNaN(created.getTime())) {
        if (!maxSeen || created > maxSeen) maxSeen = created;
      }
      if (completed && !Number.isNaN(completed.getTime())) {
        if (!maxSeen || completed > maxSeen) maxSeen = completed;
      }
    }

    const clampEnd = maxSeen ? new Date(maxSeen) : new Date(today);
    clampEnd.setHours(0, 0, 0, 0);
    if (clampEnd > today) clampEnd.setTime(today.getTime());

    const clampStart = new Date(clampEnd);
    clampStart.setTime(clampEnd.getTime() - (MAX_DAYS - 1) * (24 * 60 * 60 * 1000));

    const dayMs = 24 * 60 * 60 * 1000;

    const keyForDate = (d) => {
      const mm = d.getMonth() + 1;
      const dd = d.getDate();
      return `${d.getFullYear()}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    };

    const within = (d) => d >= clampStart && d <= clampEnd;

    const buckets = new Map();
    const ensure = (key) => {
      if (!buckets.has(key)) {
        buckets.set(key, {
          created: 0,
          completed: 0,
          preventive: 0,
          reactive: 0,
          other: 0,
          repeating: 0,
        });
      }
      return buckets.get(key);
    };

    for (const wo of (filteredWorkOrders || [])) {
      const eventDate = chartEventDate(wo);
      if (eventDate) {
        const c = new Date(eventDate);
        if (!Number.isNaN(c.getTime()) && within(c)) {
          c.setHours(0, 0, 0, 0);
          const key = keyForDate(c);
          const b = ensure(key);
          b.created += 1;
          if (wo.workType === 'preventive') b.preventive += 1;
          else if (wo.workType === 'reactive') b.reactive += 1;
          else if (wo.workType) b.other += 1;
          if (wo.recurrence && wo.recurrence !== 'does_not_repeat') b.repeating += 1;
        }
      }

      if (wo.completedAt) {
        const c = new Date(wo.completedAt);
        if (!Number.isNaN(c.getTime()) && within(c)) {
          c.setHours(0, 0, 0, 0);
          const key = keyForDate(c);
          const b = ensure(key);
          b.completed += 1;
        }
      }
    }

    const out = [];
    const cur = new Date(clampStart);
    while (cur <= clampEnd) {
      const key = keyForDate(cur);
      const b = buckets.get(key) || {
        created: 0,
        completed: 0,
        preventive: 0,
        reactive: 0,
        other: 0,
        repeating: 0,
      };

      out.push({
        date: `${cur.getMonth() + 1}/${cur.getDate()}`,
        created: b.created,
        completed: b.completed,
        preventive: b.preventive,
        reactive: b.reactive,
        other: b.other,
        repeating: b.repeating,
        nonRepeating: Math.max(0, b.created - b.repeating),
      });

      cur.setDate(cur.getDate() + 1);
    }

    return out;
  }, [filteredWorkOrders]);

  const donutData = useMemo(() => ([
    { name: 'Open', value: derived.statusCounts.open, color: '#3b82f6' },
    { name: 'On Hold', value: derived.statusCounts.on_hold, color: '#f59e0b' },
    { name: 'In Progress', value: derived.statusCounts.in_progress, color: '#10b981' },
    { name: 'Done', value: derived.statusCounts.done, color: '#6366f1' },
  ]), [derived.statusCounts]);

  const repeatingWorkOrders = useMemo(
    () => (filteredWorkOrders || []).filter((wo) => wo.recurrence && wo.recurrence !== 'does_not_repeat'),
    [filteredWorkOrders]
  );

  const repeatingColumns = useMemo(() => ([
    { key: 'title', title: 'Title', sortable: true },
    { key: 'id', title: 'ID', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <Badge variant={v === 'completed' ? 'success' : v === 'in_progress' ? 'info' : v === 'cancelled' ? 'danger' : 'warning'}>{v}</Badge> },
    { key: 'priority', title: 'Priority', sortable: true },
    { key: 'workType', title: 'Work Type', sortable: true },
    { key: 'assigneeId', title: 'Assigned To', sortable: true, render: (v) => assigneeOptions.find((o) => o.id === v)?.name || '-' },
    { key: 'assetId', title: 'Asset', sortable: true, render: (v) => assets.find((a) => a.id === v)?.name || '-' },
    { key: 'locationId', title: 'Location', sortable: true, render: (v) => locations.find((l) => l.id === v)?.name || '-' },
    { key: 'dueDate', title: 'Due Date', sortable: true, render: (v) => (v ? new Date(v).toLocaleDateString() : '-') },
    { key: 'recurrence', title: 'Recurrence', sortable: true },
  ]), [assigneeOptions, assets, locations]);

  const clearFilters = () => {
    setFilters({ assignedTo: '', dueDate: '', priority: '' });
    setDateRange(derivedRange);
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Reporting
          </Typography>
        </Stack>

        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} />
          ))}
        </Tabs>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip icon={<Filter size={16} />} label="Filters" variant="outlined" size="small" />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              displayEmpty
              value={filters.assignedTo}
              onChange={(e) => setFilters((p) => ({ ...p, assignedTo: e.target.value }))}
            >
              <MenuItem value="">Assigned To</MenuItem>
              {assigneeOptions.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            value={filters.dueDate}
            onChange={(e) => setFilters((p) => ({ ...p, dueDate: e.target.value }))}
            sx={{ minWidth: 170 }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              displayEmpty
              value={filters.priority}
              onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="">Priority</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Button type="button" variant="outlined" color="inherit">
            My Filters
          </Button>
          <Button type="button" variant="outlined" color="inherit" onClick={clearFilters}>
            Clear
          </Button>
        </Stack>
      </Stack>

      {activeTab !== 'work_orders' ? (
        activeTab === 'export_data' ? (

          <Card>
            <CardHeader>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Export Work Order List
                </Typography>
                <Button type="button" variant="outlined" color="inherit" size="small" startIcon={<Filter size={16} />}>
                  Filters
                </Button>
              </Stack>
            </CardHeader>
            <CardBody>
              <Stack spacing={3} sx={{ maxWidth: 720 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Date Range
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      type="date"
                      value={exportForm.start || dateRange.start}
                      onChange={(e) => setExportForm((p) => ({ ...p, start: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                            <Calendar size={16} />
                          </Box>
                        ),
                      }}
                    />
                    <TextField
                      size="small"
                      type="date"
                      value={exportForm.end || dateRange.end}
                      onChange={(e) => setExportForm((p) => ({ ...p, end: e.target.value }))}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {exportDateRangeText}
                  </Typography>
                </Box>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 700 }}>Export Format</FormLabel>
                  <RadioGroup
                    row
                    value={exportForm.format}
                    onChange={(e) => setExportForm((p) => ({ ...p, format: e.target.value }))}
                  >
                    <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV (Excel)" />
                    <FormControlLabel value="pdf" control={<Radio size="small" />} label="PDF" />
                  </RadioGroup>
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 700 }}>Work Orders to include in this date range</FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={exportForm.includePlannedOrCreated}
                          onChange={(e) => setExportForm((p) => ({ ...p, includePlannedOrCreated: e.target.checked }))}
                        />
                      }
                      label="Planned or Created"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={exportForm.includeDue}
                          onChange={(e) => setExportForm((p) => ({ ...p, includeDue: e.target.checked }))}
                        />
                      }
                      label="Due"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={exportForm.includeCompleted}
                          onChange={(e) => setExportForm((p) => ({ ...p, includeCompleted: e.target.checked }))}
                        />
                      }
                      label="Completed"
                    />
                  </FormGroup>
                </FormControl>

                <FormControl size="small" sx={{ maxWidth: 320 }}>
                  <FormLabel sx={{ fontWeight: 700 }}>Procedure Format</FormLabel>
                  <Select
                    value={exportForm.procedureFormat}
                    onChange={(e) => setExportForm((p) => ({ ...p, procedureFormat: e.target.value }))}
                  >
                    <MenuItem value="summary">Summary</MenuItem>
                    <MenuItem value="full">Full</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>

                  <Box>
                    <Button
                      type="button"
                      variant="outlined"
                      color="inherit"
                      onClick={() => setExportForm((p) => ({ ...p, columnsOpen: !p.columnsOpen }))}
                      endIcon={<ChevronDown size={18} />}
                    >
                      Columns
                    </Button>
                    <Collapse in={exportForm.columnsOpen}>
                      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
                        <FormGroup>
                          {[
                            { key: 'id', label: 'ID' },
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status' },
                            { key: 'priority', label: 'Priority' },
                            { key: 'asset', label: 'Asset' },
                            { key: 'location', label: 'Location' },
                            { key: 'assignee', label: 'Assigned To' },
                            { key: 'dueDate', label: 'Due Date' },
                            { key: 'createdAt', label: 'Created At' },
                          ].map((c) => (
                            <FormControlLabel
                              key={c.key}
                              control={<Checkbox defaultChecked size="small" />}
                              label={c.label}
                            />
                          ))}
                        </FormGroup>
                      </Paper>
                    </Collapse>
                  </Box>

                  <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    <Button type="button" variant="text" onClick={() => alert('Preview would be implemented here.')}>Preview</Button>
                    <Button type="button" variant="text" onClick={() => alert('Schedule would be implemented here.')}>Schedule</Button>
                    <Button variant="contained" onClick={handleExport} startIcon={<Download size={18} />}>
                      Export
                    </Button>
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
        ) : null
      ) : (
        <Stack spacing={2.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Work Orders
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Created vs. Completed
                  </Typography>
                  <IconButton size="small" color="inherit">
                    +
                  </IconButton>
                </Stack>
              </CardHeader>
              <CardBody>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.createdCount || '-'}
                      </Typography>
                      <Chip label="Created" size="small" variant="outlined" color="primary" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.completedCount || '-'}
                      </Typography>
                      <Chip label="Completed" size="small" variant="outlined" color="success" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {Number.isFinite(derived.percentCompleted) ? derived.percentCompleted : '-'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Percent Completed
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
                <Box sx={{ height: 224 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>

            </Grid>
            <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Work Orders by Type
                  </Typography>
                  <IconButton size="small" color="inherit">
                    +
                  </IconButton>
                </Stack>
              </CardHeader>
              <CardBody>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.byType.preventive || '-'}
                      </Typography>
                      <Chip label="Preventive" size="small" variant="outlined" color="success" />
                    </Stack>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.byType.reactive || '-'}
                      </Typography>
                      <Chip label="Reactive" size="small" variant="outlined" color="primary" />
                    </Stack>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.byType.other || '-'}
                      </Typography>
                      <Chip label="Other" size="small" variant="outlined" color="default" />
                    </Stack>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.createdCount ? Math.round((derived.byType.preventive / Math.max(derived.createdCount, 1)) * 100) : '-'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Preventive Ratio
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
                <Box sx={{ height: 224 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="preventive" stackId="a" fill="#10b981" />
                      <Bar dataKey="reactive" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="other" stackId="a" fill="#94a3b8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>

            </Grid>

            <Card>
              <CardHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Non-Repeating vs. Repeating
                  </Typography>
                  <Button type="button" variant="outlined" size="small" color="inherit">
                    Add to Dashboard
                  </Button>
                </Stack>
              </CardHeader>
              <CardBody>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.nonRepeatingCount || '-'}
                      </Typography>
                      <Chip label="Non-Repeating" size="small" variant="outlined" color="primary" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.repeatingCount || '-'}
                      </Typography>
                      <Chip label="Repeating" size="small" variant="outlined" color="primary" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.createdCount ? Math.round((derived.repeatingCount / Math.max(derived.createdCount, 1)) * 100) : '-'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Repeating Ratio
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
                <Box sx={{ height: 224 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="nonRepeating" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="repeating" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Status
                  </Typography>
                  <IconButton size="small" color="inherit">
                    +
                  </IconButton>
                </Stack>
              </CardHeader>
              <CardBody>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Stack alignItems="center" spacing={0.5}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {derived.statusCounts.open || '-'}
                          </Typography>
                          <Chip label="Open" size="small" variant="outlined" color="primary" />
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack alignItems="center" spacing={0.5}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {derived.statusCounts.on_hold || '-'}
                          </Typography>
                          <Chip label="On Hold" size="small" variant="outlined" color="warning" />
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack alignItems="center" spacing={0.5}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {derived.statusCounts.in_progress || '-'}
                          </Typography>
                          <Chip label="In Progress" size="small" variant="outlined" color="success" />
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack alignItems="center" spacing={0.5}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {derived.statusCounts.done || '-'}
                          </Typography>
                          <Chip label="Done" size="small" variant="outlined" color="info" />
                        </Stack>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 224 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={75} paddingAngle={2}>
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </CardBody>
            </Card>
          </Grid>

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            All Repeating Work Orders
          </Typography>
          <Card>
            <CardHeader>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  All Repeating Work Orders
                </Typography>
                <Button type="button" variant="outlined" size="small" color="inherit">
                  Add to Dashboard
                </Button>
              </Stack>
            </CardHeader>
            <CardBody>
              <Table columns={repeatingColumns} data={repeatingWorkOrders} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  On Time vs. Overdue
                </Typography>
                <IconButton size="small" color="inherit">
                  +
                </IconButton>
              </Stack>
            </CardHeader>
            <CardBody>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} lg={3}>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {Math.max(derived.createdCount - derived.overdueCount, 0) || '-'}
                      </Typography>
                      <Chip label="On Time" size="small" variant="outlined" color="success" />
                    </Stack>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {derived.overdueCount || '-'}
                      </Typography>
                      <Chip label="Overdue" size="small" variant="outlined" color="error" />
                    </Stack>
                  </Stack>
                </Grid>
                <Grid item xs={12} lg={4.5}>
                  <Gauge label="Total % On Time" valueText={derived.createdCount ? `${Math.round(((derived.createdCount - derived.overdueCount) / Math.max(derived.createdCount, 1)) * 100)}%` : '-'} />
                </Grid>
                <Grid item xs={12} lg={4.5}>
                  <Gauge label="On Time" valueText={derived.createdCount ? `${Math.round(((derived.createdCount - derived.overdueCount) / Math.max(derived.createdCount, 1)) * 100)}%` : '-'} />
                </Grid>
              </Grid>
            </CardBody>
          </Card>
        </Stack>
      )}

    </Stack>
  );
};

export default Reporting;
