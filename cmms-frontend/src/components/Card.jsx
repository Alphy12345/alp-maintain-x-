import React from 'react';
import { motion } from 'framer-motion';
import { Box, Paper } from '@mui/material';

const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <Paper
        variant="outlined"
        className={className}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'box-shadow 200ms ease',
          ...(hover
            ? {
              '&:hover': {
                boxShadow: 3,
              },
            }
            : null),
        }}
      >
        {children}
      </Paper>
    </motion.div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <Box className={className} sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
    {children}
  </Box>
);

const CardBody = ({ children, className = '' }) => (
  <Box className={className} sx={{ px: 3, py: 2 }}>
    {children}
  </Box>
);

const CardFooter = ({ children, className = '' }) => (
  <Box
    className={className}
    sx={{
      px: 3,
      py: 2,
      borderTop: 1,
      borderColor: 'divider',
      bgcolor: 'background.default',
    }}
  >
    {children}
  </Box>
);

export { Card, CardHeader, CardBody, CardFooter };
