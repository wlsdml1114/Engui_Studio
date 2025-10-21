'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useI18n } from '@/lib/i18n/context';

interface PresetItem {
  id: string;
  userId: string;
  name: string;
  type: string;
  options: string; // JSON string
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MyPresetsPage() {
  const { t } = useI18n();
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetType, setNewPresetType] = useState('image');
  const [newPresetOptions, setNewPresetOptions] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: swrError, mutate } = useSWR('/api/presets', fetcher);

  const presets: PresetItem[] = data?.presets || [];

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user123', // Replace with actual user ID
          name: newPresetName,
          type: newPresetType,
          options: JSON.parse(newPresetOptions),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('messages.error', { error: 'Failed to create preset' }));
      }

      setNewPresetName('');
      setNewPresetOptions('{}');
      mutate(); // Revalidate SWR cache
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/presets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('myPresets.error', { error: 'Failed to delete preset' }));
      }

      mutate(); // Revalidate SWR cache
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (swrError) return <div>{t('myPresets.error', { error: 'Failed to load presets' })}</div>;
  if (!data) return <div>{t('common.loading')}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('myPresets.title')}</h1>

      <div className="mb-6 p-4 border rounded-md bg-gray-700">
        <h2 className="text-xl font-semibold mb-3">{t('myPresets.createNew')}</h2>
        <form onSubmit={handleCreatePreset} className="space-y-3">
          <div>
            <label htmlFor="presetName" className="block text-sm font-medium text-gray-300">{t('myPresets.presetName')}</label>
            <input
              type="text"
              id="presetName"
              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm sm:text-sm"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="presetType" className="block text-sm font-medium text-gray-300">{t('myPresets.type')}</label>
            <select
              id="presetType"
              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm sm:text-sm"
              value={newPresetType}
              onChange={(e) => setNewPresetType(e.target.value)}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="multitalk">MultiTalk</option>
            </select>
          </div>
          <div>
            <label htmlFor="presetOptions" className="block text-sm font-medium text-gray-300">{t('myPresets.options')}</label>
            <textarea
              id="presetOptions"
              rows={3}
              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm sm:text-sm"
              value={newPresetOptions}
              onChange={(e) => setNewPresetOptions(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{t('myPresets.error', { error })}</p>}
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? t('myPresets.creating') : t('myPresets.createBtn')}
          </button>
        </form>
      </div>

      <h2 className="text-xl font-semibold mb-3">{t('myPresets.existing')}</h2>
      {presets.length === 0 ? (
        <p>{t('myPresets.noPresets')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div key={preset.id} className="border p-4 rounded-md bg-gray-700 shadow-sm">
              <h3 className="text-lg font-bold">{preset.name}</h3>
              <p className="text-sm text-gray-400">{t('myPresets.type')}: {preset.type}</p>
              <p className="text-sm text-gray-400">{t('myPresets.options')}: {preset.options}</p>
              <button
                onClick={() => handleDeletePreset(preset.id)}
                className="mt-3 inline-flex justify-center py-1 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={loading}
              >
                {t('myPresets.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}