
import { useState } from 'react';
import { Icon, ICONS } from './Icon';

const formatSeconds = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

const parseToSeconds = (hhmmss) => {
  const [h, m, s] = hhmmss.split(':').map(Number);
  return (h * 3600) + (m * 60) + (s || 0);
};

export default function ScheduleEditor({ initialData, onSave, onDelete, onCancel }) {
  const [durationStr, setDurationStr] = useState(formatSeconds(initialData.duration));
  const [repeats, setRepeats] = useState(initialData.repeats);

  const totalSeconds = parseToSeconds(durationStr) * (parseInt(repeats) || 0);

  const handleSave = () => {
    onSave({
      duration: parseToSeconds(durationStr),
      repeats: parseInt(repeats) || 1
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      onDelete();
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 space-y-3">
      <div className="flex gap-4 items-end">
        {/* Duration Input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Duration (HH:MM:SS)</label>
          <input 
            type="text" 
            className="p-2 border rounded w-32" 
            placeholder="00:00:00"
            value={durationStr}
            onChange={(e) => setDurationStr(e.target.value)}
          />
        </div>

        {/* Repeats Input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Repeats</label>
          <input 
            type="number" 
            className="p-2 border rounded w-20" 
            value={repeats}
            onChange={(e) => setRepeats(e.target.value)}
          />
        </div>

        {/* Total Duration Display (Read-Only) */}
        <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Total Duration</label>
            <div className="p-2 border rounded w-32 bg-gray-50 text-gray-600 font-mono">
                {formatSeconds(totalSeconds)}
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-2">
            <Icon d={ICONS.trash} size={18} />
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
