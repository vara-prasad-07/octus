import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectTasks, createTask, updateTask, deleteTask } from '../../services/taskService';
import DataImportModal from '../DataImportModal';
import ColumnManager from './ColumnManager';
import { formatDateForInput, formatDateForDisplay } from '../../utils/dateUtils.js';

const PlanningTab = ({ projectId }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showRiskDrawer, setShowRiskDrawer] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { taskId, field }
  const [editValue, setEditValue] = useState('');
  const [columns, setColumns] = useState([
    { id: 'name', label: 'Feature Name', type: 'text', required: true, editable: true },
    { id: 'module', label: 'Module', type: 'text', required: false, editable: true },
    { id: 'dueDate', label: 'Due Date', type: 'date', required: false, editable: true },
    { id: 'velocity', label: 'Velocity', type: 'number', required: false, editable: true },
    { id: 'bugs', label: 'Bugs', type: 'number', required: false, editable: true },
    { id: 'status', label: 'Status', type: 'select', required: false, editable: true }
  ]);
  const [formData, setFormData] = useState({
    name: '',
    module: '',
    dueDate: '',
    velocity: '',
    bugs: 0,
    status: 'todo'
  });

  useEffect(() => {
    loadTasks();
    loadColumns();
  }, [projectId]);

  const loadColumns = () => {
    const savedColumns = localStorage.getItem(`project_${projectId}_columns`);
    if (savedColumns) {
      setColumns(JSON.parse(savedColumns));
    }
  };

  const saveColumns = (newColumns) => {
    setColumns(newColumns);
    localStorage.setItem(`project_${projectId}_columns`, JSON.stringify(newColumns));
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getProjectTasks(projectId);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
      } else {
        await createTask({ ...formData, projectId });
      }
      setShowModal(false);
      setEditingTask(null);
      setFormData({ name: '', assignee: '', dueDate: '', storyPoints: '', status: 'todo' });
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      assignee: task.assignee,
      dueDate: task.dueDate,
      storyPoints: task.storyPoints,
      status: task.status
    });
    setShowModal(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
        loadTasks();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleImportTasks = async (importedTasks) => {
    try {
      for (const task of importedTasks) {
        await createTask(task);
      }
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Failed to import some tasks');
    }
  };

  const startEditing = (taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveInlineEdit = async (taskId) => {
    if (!editingCell) return;
    
    try {
      await updateTask(taskId, {
        [editingCell.field]: editValue
      });
      setEditingCell(null);
      setEditValue('');
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Failed to update task');
    }
  };

  const handleKeyPress = (e, taskId) => {
    if (e.key === 'Enter') {
      saveInlineEdit(taskId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const renderCell = (task, column) => {
    const value = task[column.id];
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === column.id;

    if (column.id === 'bugs') {
      const bugCount = value || 0;
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          bugCount === 0 ? 'bg-green-500/10 text-green-400' :
          bugCount <= 2 ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {bugCount}
        </span>
      );
    }

    if (column.id === 'module' && !isEditing) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-700/50 text-slate-300">
          {value || 'No Module'}
        </span>
      );
    }

    if (column.id === 'status') {
      if (isEditing) {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveInlineEdit(task.id)}
            autoFocus
            className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded text-white focus:outline-none"
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            <option value="todo" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>To Do</option>
            <option value="in-progress" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>In Progress</option>
            <option value="done" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Done</option>
          </select>
        );
      }
      return getStatusBadge(value);
    }

    // Handle date display
    if (column.id === 'dueDate' && !isEditing) {
      return (
        <span className="text-sm text-slate-200">{formatDateForDisplay(value)}</span>
      );
    }

    if (isEditing) {
      const inputType = column.type === 'number' ? 'number' : 
                       column.type === 'date' ? 'date' : 
                       column.type === 'percentage' ? 'number' : 'text';
      
      // Format date value for input field
      const inputValue = column.type === 'date' ? formatDateForInput(editValue) : editValue;
      
      return (
        <input
          type={inputType}
          value={inputValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveInlineEdit(task.id)}
          onKeyDown={(e) => handleKeyPress(e, task.id)}
          autoFocus
          min={column.type === 'percentage' ? 0 : column.type === 'number' ? 0 : undefined}
          max={column.type === 'percentage' ? 100 : undefined}
          className="w-full px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded text-white focus:outline-none"
          style={{ 
            color: '#ffffff',
            WebkitTextFillColor: '#ffffff',
            caretColor: '#ffffff',
            colorScheme: column.type === 'date' ? 'dark' : 'normal'
          }}
        />
      );
    }

    const displayValue = column.type === 'percentage' && value ? `${value}%` : value || '-';
    return <span className="hover:text-slate-400 transition-colors">{displayValue}</span>;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowRiskDrawer(true);
  };

  const getRiskScore = (points) => Math.min(Math.floor((points || 0) * 10), 100);

  const getRiskBadge = (points) => {
    const risk = getRiskScore(points);
    const color = risk > 70 ? 'bg-danger-500/10 text-danger-500 border-danger-500/30' : 
                  risk > 40 ? 'bg-warning-500/10 text-warning-500 border-warning-500/30' : 
                  'bg-success-500/10 text-success-500 border-success-500/30';
    return <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${color}`}>{risk}</span>;
  };

  const getStatusBadge = (status) => {
    const colors = {
      'todo': 'bg-dark-700 text-slate-300',
      'in-progress': 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
      'done': 'bg-success-500/10 text-success-500 border border-success-500/30'
    };
    const labels = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'done': 'Done'
    };
    return <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${colors[status]}`}>{labels[status]}</span>;
  };

  const avgRisk = tasks.length > 0 ? Math.floor(tasks.reduce((acc, t) => acc + getRiskScore(t.storyPoints), 0) / tasks.length) : 0;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  
  // Calculate velocity (sum of all feature velocities)
  const completedVelocity = tasks
    .filter(t => t.status === 'done')
    .reduce((acc, t) => acc + (parseInt(t.velocity) || 0), 0);
  
  const totalVelocity = tasks.reduce((acc, t) => acc + (parseInt(t.velocity) || 0), 0);
  
  const velocityPercentage = totalVelocity > 0 
    ? Math.floor((completedVelocity / totalVelocity) * 100) 
    : 0;
  
  // Calculate Predicted Delay using the formula:
  // PredictedDelay = max(0, RemainingWork + BugImpact - DaysLeft)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const predictedDelay = tasks.reduce((totalDelay, task) => {
    if (task.status === 'done') return totalDelay;
    
    const remainingWork = parseInt(task.velocity) || 0;
    const bugs = parseInt(task.bugs) || 0;
    const bugImpact = bugs * 0.5;
    
    // Calculate days left until due date
    let daysLeft = 0;
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate - today;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const taskDelay = Math.max(0, remainingWork + bugImpact - daysLeft);
    
    // Debug log
    if (taskDelay > 0) {
      console.log(`Task: ${task.name}`);
      console.log(`  Velocity: ${remainingWork}, Bugs: ${bugs}, DaysLeft: ${daysLeft}`);
      console.log(`  Delay: ${taskDelay} days`);
    }
    
    return totalDelay + taskDelay;
  }, 0);
  
  // Calculate High-Risk Tasks using the formula:
  // RiskScore = (Velocity × 0.4) + (Bugs × 2) + (OverdueDays × 3)
  // High Risk if RiskScore > 10
  const highRiskTasks = tasks.filter(task => {
    if (task.status === 'done') return false;
    
    const velocity = parseInt(task.velocity) || 0;
    const bugs = parseInt(task.bugs) || 0;
    
    // Calculate overdue days
    let overdueDays = 0;
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = today - dueDate;
      overdueDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    const riskScore = (velocity * 0.4) + (bugs * 2) + (overdueDays * 3);
    
    // Debug log
    if (riskScore > 10) {
      console.log(`High Risk Task: ${task.name}`);
      console.log(`  Velocity: ${velocity}, Bugs: ${bugs}, Overdue: ${overdueDays} days`);
      console.log(`  Risk Score: ${riskScore.toFixed(1)}`);
    }
    
    return riskScore > 10;
  }).length;
  
  console.log(`Total Predicted Delay: ${Math.round(predictedDelay)} days`);
  console.log(`High-Risk Tasks: ${highRiskTasks}`);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-slate-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading tasks...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">Team Velocity</div>
            <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-200 mb-2">{completedVelocity}</div>
          <div className="text-sm font-medium text-slate-400">
            of {totalVelocity} points ({velocityPercentage}%)
          </div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">Predicted Delay</div>
            <div className="w-10 h-10 bg-danger-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold text-danger-500 mb-2">+{Math.round(predictedDelay)}</div>
          <div className="text-sm font-medium text-slate-400">days</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">High-Risk Tasks</div>
            <div className="w-10 h-10 bg-danger-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{highRiskTasks}</div>
          <div className="text-sm font-medium text-slate-400">tasks</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">Total Tasks</div>
            <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{totalTasks}</div>
          <div className="text-sm font-medium text-slate-400">active</div>
        </div>
      </div>

      {/* AI Health Summary */}
      <div className="bg-gradient-to-r from-slate-900/40 to-slate-800/20 border border-slate-600/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-slate-800/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-white">AI Project Health Summary</h3>
              <span className="px-2 py-1 bg-slate-800/30 text-slate-400 rounded-lg text-xs font-semibold">Click AI Analyze</span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              {totalTasks === 0 ? (
                'No tasks yet. Add tasks to get AI-powered insights and recommendations.'
              ) : (
                'Click "AI Analyze" button to get intelligent insights about your sprint health, velocity trends, risk predictions, and comparison with previous completed tasks.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Tasks</h2>
            <p className="text-sm text-slate-400 mt-1">Manage and track project tasks</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowColumnManager(true)}
              className="bg-slate-800 border border-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-dark-700 transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Manage Columns</span>
            </button>
            <button
              onClick={() => navigate(`/project/${projectId}/ai-analysis`)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg shadow-blue-900/50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Analyze</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-slate-800 border border-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-dark-700 transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Import Data</span>
            </button>
            <button
              onClick={() => {
                setEditingTask(null);
                setFormData({ name: '', assignee: '', dueDate: '', storyPoints: '', status: 'todo' });
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-slate-500 hover:to-slate-600 transition-all shadow-lg shadow-slate-900/30 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Task</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                {columns.filter(col => !col.hidden).map((column) => (
                  <th key={column.id} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-900/50 transition-colors">
                  {columns.filter(col => !col.hidden).map((column) => (
                    <td
                      key={column.id}
                      className={`px-6 py-4 text-sm ${column.editable ? 'cursor-pointer' : ''} ${
                        column.id === 'name' ? 'font-medium text-white' : 
                        column.id === 'velocity' ? 'font-semibold text-white' : 
                        'text-slate-300'
                      }`}
                      onClick={() => column.editable && editingCell?.taskId !== task.id && startEditing(task.id, column.id, task[column.id])}
                    >
                      {renderCell(task, column)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleTaskClick(task)} 
                        className="text-slate-400 hover:text-primary-300 transition-colors"
                        title="View Risk Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(task)} className="text-warning-400 hover:text-warning-300 transition-colors" title="Edit in Modal">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="text-danger-500 hover:text-danger-400 transition-colors" title="Delete">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 text-lg">No tasks yet</p>
              <p className="text-dark-500 text-sm mt-1">Add your first task or import from CSV to get started</p>
              <button
                onClick={() => setShowImportModal(true)}
                className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-medium"
              >
                Import Sample Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">{editingTask ? 'Edit Feature' : 'Add Feature'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Feature Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  placeholder="e.g., User authentication system"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Module</label>
                <input
                  type="text"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  placeholder="e.g., Login Page, Dashboard, API"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Velocity</label>
                  <input
                    type="number"
                    value={formData.velocity}
                    onChange={(e) => setFormData({ ...formData, velocity: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                    placeholder="5"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bugs</label>
                  <input
                    type="number"
                    value={formData.bugs}
                    onChange={(e) => setFormData({ ...formData, bugs: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formatDateForInput(formData.dueDate)}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-500 hover:to-cyan-600 transition-colors font-medium"
                >
                  {editingTask ? 'Update Feature' : 'Add Feature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Breakdown Drawer */}
      {showRiskDrawer && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setShowRiskDrawer(false)}>
          <div className="w-full max-w-md h-full bg-slate-900 shadow-2xl p-8 overflow-y-auto animate-slide-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Risk Breakdown</h2>
              <button onClick={() => setShowRiskDrawer(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-white mb-2">{selectedTask.name}</h3>
              <p className="text-sm text-slate-400">Assigned to: {selectedTask.assignee || 'Unassigned'}</p>
            </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Current State</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Assignee:</span>
              <span className="text-white font-medium">{selectedTask.assignee || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Story Points:</span>
              <span className="text-white font-medium">{selectedTask.storyPoints || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Due Date:</span>
              <span className="text-white font-medium">{formatDateForDisplay(selectedTask.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Status:</span>
              <span className="text-white font-medium capitalize">{selectedTask.status?.replace('-', ' ') || 'To Do'}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Risk Analysis</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Complexity', value: Math.min(selectedTask.storyPoints * 10, 40), color: 'danger' },
              { label: 'Timeline Risk', value: selectedTask.dueDate ? 20 : 30, color: 'warning' },
              { label: 'Resource Load', value: selectedTask.assignee ? 15 : 25, color: 'warning' }
            ].map((factor, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{factor.label}</span>
                  <span className={`text-sm font-bold text-${factor.color}-500`}>+{factor.value}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className={`bg-${factor.color}-500 h-2 rounded-full transition-all`}
                    style={{ width: `${factor.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-r from-danger-900/30 to-danger-800/20 border border-danger-500/30 rounded-xl">
        <div className="text-sm font-medium text-slate-300 mb-2">Total Risk Score</div>
        <div className="text-5xl font-bold text-danger-500">{getRiskScore(selectedTask.storyPoints)}/100</div>
        <p className="text-sm text-slate-400 mt-2">
          Based on complexity, timeline, and resource allocation analysis
        </p>
      </div>
          </div>
        </div>
      )}

      {/* Column Manager Modal */}
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onSave={saveColumns}
          onClose={() => setShowColumnManager(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DataImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportTasks}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default PlanningTab;





