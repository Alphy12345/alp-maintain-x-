import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import {
  Box,
  CircularProgress,
  Paper,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const Table = ({ 
  columns, 
  data, 
  loading = false, 
  sortable = true, 
  onSort, 
  onRowClick,
  className = '' 
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  const handleSort = (column) => {
    if (!sortable || !column.sortable) return;

    const newDirection = 
      sortConfig.key === column.key && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';

    setSortConfig({ key: column.key, direction: newDirection });
    
    if (onSort) {
      onSort(column.key, newDirection);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const renderCell = (column, row, index) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row, index);
    }

    if (column.format) {
      switch (column.format) {
        case 'date':
          return new Date(value).toLocaleDateString();
        case 'datetime':
          return new Date(value).toLocaleString();
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        default:
          return value;
      }
    }

    return value;
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" className={className}>
      <MuiTable size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              const canSort = Boolean(sortable && column.sortable);
              const activeAsc = sortConfig.key === column.key && sortConfig.direction === 'asc';
              const activeDesc = sortConfig.key === column.key && sortConfig.direction === 'desc';
              return (
                <TableCell
                  key={column.key}
                  onClick={() => handleSort(column)}
                  sx={{
                    fontWeight: 800,
                    cursor: canSort ? 'pointer' : 'default',
                    userSelect: 'none',
                    '&:hover': canSort ? { bgcolor: 'action.hover' } : undefined,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em' }}>
                      {column.title}
                    </Typography>
                    {canSort ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                        <ChevronUp size={14} color={activeAsc ? '#2563eb' : '#9ca3af'} />
                        <ChevronDown size={14} color={activeDesc ? '#2563eb' : '#9ca3af'} />
                      </Box>
                    ) : null}
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={row.id || index}
              component={motion.tr}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              hover={Boolean(onRowClick)}
              onMouseDown={(e) => {
                if (onRowClick) e.preventDefault();
              }}
              onClick={() => onRowClick && onRowClick(row)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <TableCell key={column.key} sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="body2">
                    {renderCell(column, row, index)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>

      {data.length === 0 && !loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ) : null}
    </TableContainer>
  );
};

export default Table;
