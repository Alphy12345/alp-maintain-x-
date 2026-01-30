import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  icon, 
  className = '', 
  ...props 
}) => {
  const muiVariant = (variant === 'ghost') ? 'text' : (variant === 'secondary' ? 'outlined' : 'contained');
  const color = (variant === 'danger') ? 'error' : (variant === 'success' ? 'success' : 'primary');
  const muiSize = (size === 'sm') ? 'small' : (size === 'lg' ? 'large' : 'medium');

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      size={muiSize}
      className={className}
      disabled={disabled || loading}
      startIcon={!loading ? icon : undefined}
      {...props}
    >
      {loading ? (
        <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
      ) : null}
      {children}
    </MuiButton>
  );
};

export default Button;
