
import { useState } from 'react';
import { Icon, ICONS } from './Icon';
import ScheduleEditor from './ScheduleEditor';

export default function PartsSection({ parts, partsSchedules, onChange, onMove, onAdd, onDelete, onChangeSchedule }) {
  const [tasks, setTasks] = useState(parts || []); // {lang: [part names]}
  const [schedules, setSchedules] = useState(partsSchedules || null); // [{ duration: int, repeats: int }]
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const addTask = (name) => {
    setTasks(prev => [...prev, name]);
    setSchedules(prev => [...prev, null]);
    onAdd(name);
    onChangeSchedule(schedules);
  };

  const deleteTask = (index) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
    setSchedules(prev => prev.filter((_, i) => i !== index));
    onDelete(index);
    onChangeSchedule(schedules);
  };

  const moveTask = (from, to) => {
    setTasks(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setSchedules(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    onMove(from, to);
    onChangeSchedule(schedules);
  };

  const updateTask = (index, value) => {
    setTasks(prev => prev.map((t, i) => i === index ? value : t));
    onChange(index, value);
  };

  const handleSaveSchedule = (index, data) => {
    setSchedules(prev => prev.map((s, i) => i === index ? data : s));
    setEditingIndex(null);
    onChangeSchedule(schedules);
  };

  const handleDeleteSchedule = (index) => {
    setSchedules(prev => prev.map((s, i) => i === index ? null : s));
    setEditingIndex(null);
    onChangeSchedule(schedules);
  };

  /*// Native Drag and Drop logic
  const handleDrop = (e, targetIndex) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === targetIndex) return;

    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(sourceIndex, 1);
    newTasks.splice(targetIndex, 0, movedTask);
    setTasks(newTasks);
    onMove(sourceIndex, targetIndex);
  };*/

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* List */}
      {tasks.map((taskName, index) => (
        <div key={index} className="space-y-1">
            <div 
              draggable 
              onDragStart={(e) => e.dataTransfer.setData('index', index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => moveTask(parseInt(e.dataTransfer.getData('index')), index)}
              className="flex items-center gap-2 p-3 bg-white border rounded shadow-sm"
            >
                <Icon d={ICONS.grip} className="cursor-grab text-gray-400" />
                <input 
                    className="flex-grow outline-none border-b border-transparent focus:border-blue-500"
                    value={taskName} 
                    onChange={(e) => updateTask(index, e.target.value)}
                />
                <button 
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className={`p-1 rounded ${schedules[index] ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                    <Icon d={ICONS.calendar} size={18} />
                </button>
                <button onClick={() => deleteTask(index)} className="text-gray-400 hover:text-red-500">
                    <Icon d={ICONS.x} size={18} />
                </button>
            </div>
            {editingIndex === index && (
                <ScheduleEditor 
                initialData={schedules[index] || { duration: 0, repeats: 1 }}
                onSave={(data) => handleSaveSchedule(index, data)}
                onDelete={() => handleDeleteSchedule(index)}
                onCancel={() => setEditingIndex(null)}
                />
            )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex gap-2 p-2 border rounded">
          <input 
            autoFocus 
            className="flex-grow outline-none"
            value={newTaskName} 
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskName)}
          />
          <button onClick={() => addTask(newTaskName)} className="text-green-600"><Icon d={ICONS.check} /></button>
          <button onClick={() => setIsAdding(false)} className="text-red-600"><Icon d={ICONS.x} /></button>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-blue-600 font-medium p-2">
          <Icon d={ICONS.plus} size={20} /> Add new task
        </button>
      )}
    </div>
  );

  /*return (
    <div className="w-full max-w-lg space-y-2">
      {tasks.map((task, index) => (
        <div 
          key={task.id} 
          draggable 
          onDragStart={(e) => e.dataTransfer.setData('index', index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => moveTask(parseInt(e.dataTransfer.getData('index')), index)}
          className="border p-3 rounded-md bg-white shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-3">
            <Icon d={ICONS.grip} className="cursor-grab text-gray-400" />
            <input 
                className="flex-grow outline-none border-b border-transparent focus:border-blue-500"
                value={taskName} 
                onChange={(e) => updateTask(index, e.target.value)}
            />
            <button onClick={() => setEditingScheduleId(task.id)} className="p-1 hover:bg-gray-100 rounded">
              <Icon d={ICONS.calendar} size={18} />
            </button>
          </div>
          
          {editingScheduleId === task.id && (
            <ScheduleEditor 
              initialData={task.schedule}
              onSave={(data) => { setEditingScheduleId(null); }}
              onCancel={() => setEditingScheduleId(null)}
              onDelete={() => { setEditingScheduleId(null); }}
            />
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex gap-2 p-2 border rounded">
          <input 
            autoFocus 
            className="flex-grow outline-none"
            value={newTaskName} 
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask} className="text-green-600"><Icon d={ICONS.check} /></button>
          <button onClick={() => setIsAdding(false)} className="text-red-600"><Icon d={ICONS.x} /></button>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-blue-600 font-medium p-2">
          <Icon d={ICONS.plus} size={20} /> Add new task
        </button>
      )}
    </div>
  );*/
}