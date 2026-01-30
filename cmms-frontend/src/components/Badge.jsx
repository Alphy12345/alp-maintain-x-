import React from 'react';
import { Chip } from '@mui/material';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'sm', 
  className = '' 
}) => {
  const muiSize = (size === 'lg') ? 'medium' : 'small';
  const color = (variant === 'success')
    ? 'success'
    : (variant === 'warning')
      ? 'warning'
      : (variant === 'danger')
        ? 'error'
        : (variant === 'info')
          ? 'info'
          : (variant === 'primary')
            ? 'primary'
            : 'default';

  return (
    <Chip
      size={muiSize}
      label={children}
      color={color}
      variant={variant === 'default' ? 'outlined' : 'filled'}
      className={className}
    />
  );
};

export default Badge;
