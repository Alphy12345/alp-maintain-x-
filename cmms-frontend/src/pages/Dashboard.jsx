import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Wrench, 
  AlertTriangle, 
  Power, 
  CheckCircle,
  Clock,
  Calendar,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components';
import { Box, Grid, Stack, Typography } from '@mui/material';
import useStore from '../store/useStore';

const Dashboard = () => {
  const { 
    dashboardKPI, 
    chartData, 
    activities, 
    getOverdueWorkOrders, 
    getUpcomingPM,
    workOrders,
    assets
  } = useStore();

  const overdueWorkOrders = getOverdueWorkOrders();
  const upcomingPM = getUpcomingPM();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const KPICard = ({ title, value, icon: Icon, color, change }) => (
    <motion.div variants={itemVariants}>
      <Card hover>
        <CardBody>
          <Box sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                  {value}
                </Typography>
                {change !== undefined && change !== null ? (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      fontWeight: 700,
                      color: change >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {change >= 0 ? '+' : ''}{change}% from last month
                  </Typography>
                ) : null}
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '999px',
                  bgcolor: color,
                  color: 'common.white',
                  display: 'flex',
                }}
              >
                <Icon size={22} />
              </Box>
            </Stack>
          </Box>
        </CardBody>
      </Card>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Stack spacing={3}>
        {/* Page Header */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Welcome back! Here's what's happening with your maintenance operations.
          </Typography>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6} lg={3}>
            <KPICard
              title="Open Work Orders"
              value={dashboardKPI.openWorkOrders}
              icon={Wrench}
              color="info.main"
              change={12}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <KPICard
              title="Overdue Work Orders"
              value={dashboardKPI.overdueWorkOrders}
              icon={AlertTriangle}
              color="error.main"
              change={-5}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <KPICard
              title="Assets Down"
              value={dashboardKPI.assetsDown}
              icon={Power}
              color="warning.main"
              change={0}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <KPICard
              title="PM Compliance"
              value={`${dashboardKPI.pmCompliance}%`}
              icon={CheckCircle}
              color="success.main"
              change={3}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={2}>
          {/* Work Orders by Status */}
          <Grid item xs={12} lg={6}>
            <motion.div variants={itemVariants}>
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
            </motion.div>
          </Grid>

          {/* Downtime Trend */}
          <Grid item xs={12} lg={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Downtime Trend (Hours)</Typography>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.downtimeTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="downtime" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Bottom Row */}
        <Grid container spacing={2}>
          {/* Recent Activity */}
          <Grid item xs={12} lg={8}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Recent Activity</Typography>
                    <Activity size={18} />
                  </Stack>
                </CardHeader>
                <CardBody>
                  <Stack spacing={2}>
                    {activities.slice(0, 5).map((activity) => (
                      <Stack key={activity.id} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ pt: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '999px', bgcolor: 'primary.main' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">{activity.description}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </motion.div>
          </Grid>

          {/* Upcoming PM */}
          <Grid item xs={12} lg={4}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Upcoming PM</Typography>
                    <Calendar size={18} />
                  </Stack>
                </CardHeader>
                <CardBody>
                  <Stack spacing={1.5}>
                    {upcomingPM.slice(0, 4).map((pm) => {
                      const asset = assets.find(a => a.id === pm.assetId);
                      return (
                        <Stack key={pm.id} direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                              {asset?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Due: {new Date(pm.nextDue).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Clock size={16} />
                        </Stack>
                      );
                    })}
                  </Stack>
                </CardBody>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Stack>
    </motion.div>
  );
};

export default Dashboard;
