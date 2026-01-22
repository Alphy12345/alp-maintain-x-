import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookUser } from 'lucide-react';
import axios from 'axios';
import { Button } from '../components';

const API_BASE_URL = 'http://172.18.100.31:8000';

const Vendors = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`, {
        headers: { accept: 'application/json' },
      });
      setVendors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = vendors || [];
    if (!q) return rows;
    return rows.filter((v) => String(v?.name || '').toLowerCase().includes(q));
  }, [query, vendors]);

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this vendor?');
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/vendors/${id}`, {
        headers: { accept: '*/*' },
      });
      await fetchVendors();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete vendor');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Vendors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          <Button onClick={() => navigate('/vendors/create')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Vendor
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 min-h-[640px]">
        {error ? (
          <div className="p-4">
            <div className="text-sm text-red-600">{error}</div>
            <button
              type="button"
              onClick={() => fetchVendors()}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="p-8 text-sm text-gray-600">Loading vendors…</div>
        ) : filtered.length === 0 ? (
          <div className="min-h-[640px] flex items-center justify-center">
            <div className="text-center px-6">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <BookUser className="w-10 h-10 text-primary-700" />
              </div>
              <h2 className="mt-6 text-lg font-semibold text-gray-900">Start adding Vendors to your account</h2>
              <p className="mt-2 text-sm text-gray-600">
                Click the "+ New Vendor" button in the top right to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">{filtered.length} vendor(s)</div>
              <button
                type="button"
                onClick={() => fetchVendors()}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/vendors/${v.id}/edit`)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v.id)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vendors;
