import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar, Download, TrendingUp, Clock, Wrench, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardBody, Button } from '../components';
import { Box, Grid, Stack, TextField, Typography } from '@mui/material';
import useStore from '../store/useStore';

const Reports = () => {
  const { chartData, workOrders, assets, pmSchedules } = useStore();
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-12-31'
  });

  const [reportingForm, setReportingForm] = useState({
    reportTitle: '',
    fromDate: '',
    toDate: '',
    preparedBy: '',
    notes: ''
  });
  const [submittedReporting, setSubmittedReporting] = useState(null);

  // Calculate additional metrics
  const calculateMTTR = () => {
    const completedOrders = workOrders.filter(wo => wo.status === 'completed' && wo.actualDuration);
    if (completedOrders.length === 0) return 0;
    
    const totalDuration = completedOrders.reduce((sum, wo) => sum + wo.actualDuration, 0);
    return (totalDuration / completedOrders.length / 60).toFixed(1); // Convert to hours
  };

  const calculatePMCompletionRate = () => {
    const activePMs = pmSchedules.filter(pm => pm.isActive);
    if (activePMs.length === 0) return 0;
    
    const completedThisMonth = activePMs.filter(pm => {
      const lastCompleted = new Date(pm.lastCompleted);
      const now = new Date();
      return lastCompleted.getMonth() === now.getMonth() && 
             lastCompleted.getFullYear() === now.getFullYear();
    });
    
    return ((completedThisMonth.length / activePMs.length) * 100).toFixed(1);
  };

  const assetStatusData = [
    { name: 'Running', value: assets.filter(a => a.status === 'running').length, color: '#10b981' },
    { name: 'Down', value: assets.filter(a => a.status === 'down').length, color: '#ef4444' },
    { name: 'Maintenance', value: assets.filter(a => a.status === 'maintenance').length, color: '#f59e0b' }
  ];

  const priorityData = [
    { priority: 'Critical', count: workOrders.filter(wo => wo.priority === 'critical').length },
    { priority: 'High', count: workOrders.filter(wo => wo.priority === 'high').length },
    { priority: 'Medium', count: workOrders.filter(wo => wo.priority === 'medium').length },
    { priority: 'Low', count: workOrders.filter(wo => wo.priority === 'low').length }
  ];

  const monthlyTrendData = [
    { month: 'Jul', workOrders: 45, completed: 42, pmCompliance: 92 },
    { month: 'Aug', workOrders: 52, completed: 48, pmCompliance: 88 },
    { month: 'Sep', workOrders: 38, completed: 36, pmCompliance: 95 },
    { month: 'Oct', workOrders: 61, completed: 58, pmCompliance: 91 },
    { month: 'Nov', workOrders: 47, completed: 45, pmCompliance: 89 },
    { month: 'Dec', workOrders: 55, completed: 52, pmCompliance: 87.5 }
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  const exportReport = () => {
    // Mock export functionality
    alert('Report export functionality would be implemented here');
  };

  const handleReportingChange = (field) => (e) => {
    setReportingForm((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmitReporting = (e) => {
    e.preventDefault();
    setSubmittedReporting({
      ...reportingForm,
      submittedAt: new Date().toISOString()
    });
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Reports & Analytics</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Comprehensive maintenance analytics and insights
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button variant="secondary">
            <Calendar size={16} style={{ marginRight: 8 }} />
            {dateRange.start} to {dateRange.end}
          </Button>
          <Button onClick={exportReport}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export Report
          </Button>
        </Stack>
      </Stack>

      {/* Key Metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Mean Time to Repair
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{calculateMTTR()} hrs</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'success.main', fontWeight: 700 }}>
                      ↓ 12% from last month
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'info.main', color: 'common.white', display: 'flex' }}>
                    <Clock size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      PM Completion Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{calculatePMCompletionRate()}%</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'error.main', fontWeight: 700 }}>
                      ↓ 2.5% from last month
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'success.main', color: 'common.white', display: 'flex' }}>
                    <CheckCircle size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Total Work Orders
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{workOrders.length}</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'success.main', fontWeight: 700 }}>
                      ↑ 8% from last month
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'secondary.main', color: 'common.white', display: 'flex' }}>
                    <Wrench size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card hover>
            <CardBody>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Asset Uptime
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>94.2%</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'success.main', fontWeight: 700 }}>
                      ↑ 1.2% from last month
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '999px', bgcolor: 'warning.main', color: 'common.white', display: 'flex' }}>
                    <TrendingUp size={22} />
                  </Box>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2}>
        {/* Work Orders by Status */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Work Orders by Status</Typography>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.workOrdersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </Grid>

        {/* Asset Status Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Asset Status Distribution</Typography>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assetStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Reporting</Typography>
        </CardHeader>
        <CardBody>
          <Box component="form" onSubmit={handleSubmitReporting}>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Report Title"
                    size="small"
                    value={reportingForm.reportTitle}
                    onChange={handleReportingChange('reportTitle')}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Prepared By"
                    size="small"
                    value={reportingForm.preparedBy}
                    onChange={handleReportingChange('preparedBy')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={reportingForm.fromDate}
                    onChange={handleReportingChange('fromDate')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="To Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={reportingForm.toDate}
                    onChange={handleReportingChange('toDate')}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <TextField
                label="Notes"
                size="small"
                value={reportingForm.notes}
                onChange={handleReportingChange('notes')}
                multiline
                minRows={3}
                fullWidth
              />

              <Stack direction="row" justifyContent="flex-end">
                <Button type="submit">Save Reporting</Button>
              </Stack>
            </Stack>
          </Box>

          {submittedReporting && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Submitted Reporting</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary"><b>Report Title:</b> {submittedReporting.reportTitle || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary"><b>Prepared By:</b> {submittedReporting.preparedBy || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary"><b>From Date:</b> {submittedReporting.fromDate || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary"><b>To Date:</b> {submittedReporting.toDate || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary"><b>Notes:</b> {submittedReporting.notes || '-'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Charts Row 2 */}
      <Grid container spacing={2}>
        {/* Monthly Trend */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Monthly Performance Trend</Typography>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="workOrders" stroke="#3b82f6" name="Work Orders" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
                  <Line type="monotone" dataKey="pmCompliance" stroke="#f59e0b" name="PM Compliance %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </Grid>

        {/* Work Orders by Priority */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Work Orders by Priority</Typography>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="priority" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </Grid>
      </Grid>

      {/* Downtime Trend */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Downtime Trend (Last 7 Weeks)</Typography>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.downtimeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="downtime" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Downtime (Hours)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Work Orders per Asset */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Work Orders per Asset</Typography>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.workOrdersPerAsset}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="assetName" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* PM Completion Rate */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>PM Completion Rate Trend</Typography>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.pmCompletionRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Completion Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </Stack>
  );
};

export default Reports;
