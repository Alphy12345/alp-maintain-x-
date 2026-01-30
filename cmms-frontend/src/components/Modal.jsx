import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', 
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  const maxWidth = (() => {
    if (size === 'sm') return 'sm';
    if (size === 'md') return 'md';
    if (size === 'lg') return 'lg';
    if (size === 'xl') return 'xl';
    if (size === 'full') return false;
    return 'md';
  })();

  return (
    <Dialog
      open={!!isOpen}
      onClose={closeOnBackdrop ? onClose : undefined}
      fullWidth
      maxWidth={maxWidth}
      PaperProps={{ className }}
    >
      {(title || showCloseButton) ? (
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <span>{title || ''}</span>
          {showCloseButton ? (
            <IconButton aria-label="Close" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </DialogTitle>
      ) : null}
      <DialogContent dividers>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
