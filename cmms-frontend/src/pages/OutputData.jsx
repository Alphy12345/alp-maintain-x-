import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const API_BASE_URL = 'http://172.18.100.31:8000';

export default function OutputData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/output-data`, { headers: { accept: 'application/json' } });
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const sorted = [...items].sort((a, b) => {
        const ai = Number(a?.execution_id);
        const bi = Number(b?.execution_id);
        if (!Number.isFinite(ai) && !Number.isFinite(bi)) return 0;
        if (!Number.isFinite(ai)) return 1;
        if (!Number.isFinite(bi)) return -1;
        return bi - ai;
      });
      setData(sorted);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load output data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let es;
    try {
      es = new EventSource(`${API_BASE_URL}/events/output-data`);
    } catch (e) {
      es = null;
    }

    if (!es) return () => {};

    const onOutputData = (evt) => {
      try {
        const payload = JSON.parse(evt?.data || '{}');
        const id = payload?.execution_id;
        if (!id) return;
        setData((prev) => {
          const exists = (prev || []).some((x) => String(x?.execution_id) === String(id));
          if (exists) return prev;
          const next = [payload, ...(prev || [])];
          next.sort((a, b) => Number(b?.execution_id) - Number(a?.execution_id));
          return next;
        });
      } catch (e) {
      }
    };

    es.addEventListener('output_data', onOutputData);
    return () => {
      try {
        es.removeEventListener('output_data', onOutputData);
        es.close();
      } catch (e) {
      }
    };
  }, []);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Output Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Procedure outputs submitted from the mobile app
          </Typography>
        </Box>

        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? 'Reloading…' : 'Reload'}
        </Button>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Work Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Procedure</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fields</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6 }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">Loading…</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      No output data found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={String(row?.execution_id)} hover>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {row?.work_order_name || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{row?.work_order_id ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {row?.procedure_name || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{row?.procedure_id ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" color="text.secondary">
                        {row?.performed_by_name || row?.performed_by || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant="body2" color="text.secondary">
                        {row?.status || ''}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      {(row?.fields || []).length === 0 ? (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {(row.fields || []).slice(0, 6).map((f) => (
                            <Typography key={String(f?.field_id)} variant="caption" color="text.secondary">
                              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {f?.label || f?.field_id}:
                              </Box>{' '}
                              {String(f?.value ?? '')}
                            </Typography>
                          ))}
                          {(row.fields || []).length > 6 ? (
                            <Typography variant="caption" color="text.secondary">
                              +{(row.fields || []).length - 6} more
                            </Typography>
                          ) : null}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
