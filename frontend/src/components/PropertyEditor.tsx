import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Check, RotateCcw } from 'lucide-react';
import { putShapeProperties } from '../api/shapes';
import type { Shape } from '../types';

interface PropertyEditorProps {
  shape: Shape;
  onUpdate: (updatedShape: Shape) => void;
}

interface PropertyRow {
  id: string;
  key: string;
  value: string;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ shape, onUpdate }) => {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize properties from shape
  useEffect(() => {
    const initialRows: PropertyRow[] = Object.entries(shape.properties || {}).map(
      ([key, value], idx) => ({
        id: `row-${idx}-${Date.now()}`,
        key,
        value,
      })
    );
    setRows(initialRows);
    setSaved(false);
    setError(null);
  }, [shape]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-new-${Date.now()}-${Math.random()}`,
        key: '',
        value: '',
      },
    ]);
    setSaved(false);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSaved(false);
  };

  const handleChangeRow = (id: string, field: 'key' | 'value', val: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
    setSaved(false);
  };

  const handleReset = () => {
    const initialRows: PropertyRow[] = Object.entries(shape.properties || {}).map(
      ([key, value], idx) => ({
        id: `row-${idx}-${Date.now()}`,
        key,
        value,
      })
    );
    setRows(initialRows);
    setSaved(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    // 1. Build dictionary from rows, filtering out empty keys
    const propertiesToSend: Record<string, string> = {};
    const keySet = new Set<string>();
    let duplicateKey: string | null = null;

    for (const row of rows) {
      const trimmedKey = row.key.trim();
      const trimmedValue = row.value.trim();

      if (!trimmedKey) continue; // skip empty keys

      if (keySet.has(trimmedKey)) {
        duplicateKey = trimmedKey;
        break;
      }
      keySet.add(trimmedKey);
      propertiesToSend[trimmedKey] = trimmedValue;
    }

    if (duplicateKey) {
      setError(`Duplicate key found: "${duplicateKey}". Keys must be unique.`);
      setSaving(false);
      return;
    }

    try {
      // Overwrite properties completely so deleted ones are cleared
      const updatedShape = await putShapeProperties(shape.shape_id, propertiesToSend);
      onUpdate(updatedShape);
      setSaved(true);
    } catch (err: any) {
      const details = err.response?.data?.detail || 'Failed to save properties.';
      setError(typeof details === 'string' ? details : 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const originalProperties = shape.properties || {};
    const activeProperties: Record<string, string> = {};
    rows.forEach((r) => {
      const k = r.key.trim();
      if (k) activeProperties[k] = r.value.trim();
    });

    const origEntries = Object.entries(originalProperties);
    const activeEntries = Object.entries(activeProperties);

    if (origEntries.length !== activeEntries.length) return true;

    for (const [k, v] of origEntries) {
      if (activeProperties[k] !== v) return true;
    }
    return false;
  };

  return (
    <div className="bg-white border border-gray-205 rounded-2xl shadow-sm p-6 flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Custom Attributes Editor</h3>
            <p className="text-xs text-gray-400">Add metadata values (e.g. tag, flow rate, size, status)</p>
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              No custom attributes assigned to this symbol.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 group">
                  <input
                    type="text"
                    required
                    placeholder="Key (e.g. tag)"
                    value={row.key}
                    onChange={(e) => handleChangeRow(row.id, 'key', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. PV-100)"
                    value={row.value}
                    onChange={(e) => handleChangeRow(row.id, 'value', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    title="Remove Property"
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
              {error}
            </div>
          )}
        </form>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges() || saving}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50 transition px-3 py-2 rounded-xl"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Changes
        </button>

        <button
          type="submit"
          disabled={saving || !hasChanges()}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-xs font-semibold px-4.5 py-2 rounded-xl transition shadow-sm shrink-0"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved Attributes' : 'Save Attributes'}
        </button>
      </div>
    </div>
  );
};
