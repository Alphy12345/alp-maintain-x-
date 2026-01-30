import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PackagePlus } from 'lucide-react';
import { Button } from '../components';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';

const AssetPackages = () => {
  const [tab, setTab] = useState('custom');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Asset Packages</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Discover, install, and manage packages for your Assets.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
        <Tab value="custom" label="Custom Packages" />
        <Tab value="hub" label="Asset Hub Packages" />
      </Tabs>

      <Box sx={{ minHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
        {tab === 'custom' ? (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '999px',
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackagePlus size={24} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                You don't have any packages created yet.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Packages created by your organization, available to reinstall anytime.
              </Typography>
            </Box>
            <Button>Create Package from Asset</Button>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">Asset Hub Packages placeholder</Typography>
        )}
      </Box>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Asset Packages UI is a placeholder layout.
        </Typography>
      </motion.div>
    </Stack>
  );
};

export default AssetPackages;
