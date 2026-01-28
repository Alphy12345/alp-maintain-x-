import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../components';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Output Data</div>
          <div className="text-sm text-gray-500">Procedure outputs submitted from the mobile app</div>
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Reloading…' : 'Reload'}
        </Button>
      </div>

      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button type="button" onClick={load} className="text-sm font-medium text-red-700 hover:text-red-800">
            Retry
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedure</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fields</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={5}>
                    No output data found.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={String(row?.execution_id)} className="align-top">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{row?.work_order_name || '—'}</div>
                      <div className="text-xs text-gray-500">#{row?.work_order_id ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{row?.procedure_name || '—'}</div>
                      <div className="text-xs text-gray-500">#{row?.procedure_id ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row?.performed_by_name || row?.performed_by || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row?.status || ''}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(row?.fields || []).length === 0 ? (
                        <div className="text-gray-500">—</div>
                      ) : (
                        <div className="space-y-1">
                          {(row.fields || []).slice(0, 6).map((f) => (
                            <div key={String(f?.field_id)} className="text-xs">
                              <span className="font-medium text-gray-900">{f?.label || f?.field_id}:</span>{' '}
                              <span className="text-gray-700">{String(f?.value ?? '')}</span>
                            </div>
                          ))}
                          {(row.fields || []).length > 6 ? (
                            <div className="text-xs text-gray-500">+{(row.fields || []).length - 6} more</div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
