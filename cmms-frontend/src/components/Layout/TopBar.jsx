import React from 'react';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import useStore from '../../store/useStore';

const TopBar = () => {
  const { toggleSidebar, darkMode, toggleDarkMode } = useStore();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.default',
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 2, lg: 3 }, position: 'relative' }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 900,
            letterSpacing: 1,
            display: { xs: 'none', lg: 'block' },
          }}
        >
          CMTI
        </Typography>

        <IconButton
          onClick={toggleSidebar}
          edge="start"
          aria-label="open sidebar"
          sx={{ display: { lg: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              letterSpacing: -0.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: { xs: '72vw', sm: '60vw', lg: '70vw' },
            }}
          >
            Computerized Maintenance Management System
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <IconButton onClick={toggleDarkMode} aria-label="toggle theme">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
