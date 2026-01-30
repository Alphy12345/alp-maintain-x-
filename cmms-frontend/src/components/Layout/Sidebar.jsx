import React from 'react';
import { NavLink } from 'react-router-dom';
import { Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  BarChart3,
  Boxes,
  FileText,
  MapPin,
  Package,
  Tags,
  Truck,
  Users,
  Wrench
} from 'lucide-react';
import useStore from '../../store/useStore';

const navigation = [
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Reporting', href: '/reporting', icon: BarChart3 },
  { name: 'Assets', href: '/assets', icon: Package },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Parts Inventory', href: '/parts', icon: Boxes },
  { name: 'Procedures', href: '/library/procedures', icon: Tags },
  { name: 'Output Data', href: '/output-data', icon: FileText },
  { name: 'Teams / Users', href: '/teams-users', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Truck },
];

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useStore();

  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const drawerWidth = 288;

  return (
    <Drawer
      variant={isLgUp ? 'permanent' : 'temporary'}
      open={isLgUp ? true : sidebarOpen}
      onClose={isLgUp ? undefined : toggleSidebar}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
        display: { xs: 'block', lg: 'block' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', height: 64, px: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        {!isLgUp ? (
          <IconButton onClick={toggleSidebar} aria-label="close sidebar">
            <CloseIcon />
          </IconButton>
        ) : null}
      </Box>
      <Divider />

      <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <ListItemButton
                key={item.name}
                component={NavLink}
                to={item.href}
                onClick={() => {
                  if (!isLgUp) toggleSidebar();
                }}
                sx={{
                  borderRadius: 2,
                  '&.active': {
                    bgcolor: 'action.selected',
                    color: 'text.primary',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} />
                  </Box>
                </ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
