import React from 'react';
import { AppBar, Box, IconButton, Toolbar } from '@mui/material';
import { Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import useStore from '../../store/useStore';

const TopBar = () => {
  const { toggleSidebar, darkMode, toggleDarkMode } = useStore();

  return (
    <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ px: { xs: 1, sm: 2, lg: 3 } }}>
        <IconButton
          onClick={toggleSidebar}
          edge="start"
          aria-label="open sidebar"
          sx={{ display: { lg: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <IconButton onClick={toggleDarkMode} aria-label="toggle theme">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
