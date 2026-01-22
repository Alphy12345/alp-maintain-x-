import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, MoreVertical, Plus, Search, Tag, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Button, Card, Modal } from '../components';
import useStore from '../store/useStore';

const API_BASE_URL = 'http://172.18.100.31:8000';

const iconClasses = [
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-yellow-50 text-yellow-700 border-yellow-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-green-50 text-green-700 border-green-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-teal-50 text-teal-700 border-teal-200',
];

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
};

const Categories = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(categories?.[0]?.id || '');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = categories || [];
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const selected = useMemo(() => {
    const list = categories || [];
    return list.find((c) => c.id === selectedId) || list[0] || null;
  }, [categories, selectedId]);

  const openCreate = () => {
    setNewName('');
    setShowCreate(true);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const created = addCategory({ name, createdBy: 'System' });
    setSelectedId(created.id);
    setShowCreate(false);
  };

  const openEdit = () => {
    setEditName(selected?.name || '');
    setShowEdit(true);
  };

  const handleEdit = () => {
    const name = editName.trim();
    if (!selected?.id || !name) return;
    updateCategory(selected.id, { name });
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    const ok = window.confirm('Delete this category?');
    if (!ok) return;
    setError('');
    setDeleting(true);
    try {
      const idStr = String(selected.id);
      const isNumericId = /^\d+$/.test(idStr);
      if (isNumericId) {
        await axios.delete(`${API_BASE_URL}/categories/${idStr}`, {
          headers: { accept: '*/*' },
        });
      }
      deleteCategory(selected.id);

      const remaining = (categories || []).filter((c) => c.id !== selected.id);
      setSelectedId(remaining?.[0]?.id || '');
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Categories"
              className="w-80 pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      ) : null}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <div className="divide-y divide-gray-200">
            {filtered.map((c, idx) => {
              const active = c.id === (selected?.id || '');
              const cls = iconClasses[idx % iconClasses.length];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-4 ${active ? 'bg-gray-900/40' : 'bg-transparent'} hover:bg-gray-900/30`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full border flex items-center justify-center ${cls}`}>
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className={`font-medium truncate ${active ? 'text-white' : 'text-gray-200'}`}>{c.name}</div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-500">No categories found</div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-8">
          {selected ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-semibold text-gray-900">{selected.name}</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={openEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={handleDelete} disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    title="More"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="text-sm text-gray-600">
                  Created by <span className="font-medium text-gray-900">{selected.createdBy || 'System'}</span> on{' '}
                  <span className="text-gray-700">{formatDateTime(selected.createdAt)}</span>
                </div>
              </div>

              <div className="px-5 py-10">
                <div className="flex items-center justify-center">
                  <Button variant="secondary">Use in New Work Order</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-gray-500">Select a category</div>
          )}
        </Card>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Category" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter category name"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Category" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter category name"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-gray-500">
        Categories UI is mock/local (no backend persistence yet).
      </motion.div>
    </div>
  );
};

export default Categories;
