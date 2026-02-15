import { useState } from 'react';
import * as XLSX from 'xlsx';
import { formatDateForBackend } from '../../utils/dateUtils.js';

const DataImportModal = ({ onClose, onImport, projectId }) => {
  const [importMethod, setImportMethod] = useState('manual'); // manual, csv, excel
  const [manualData, setManualData] = useState('');
  const [parsedTasks, setParsedTasks] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Convert to task format - support both old and new column names
        const tasks = jsonData.map((row, index) => ({
          name: row['Feature Name'] || row.name || row.task || row.Task || row.Name || `Task ${index + 1}`,
          module: row.Module || row.module || '',
          dueDate: formatDateForBackend(row['Due Date'] || row.dueDate || row['due date'] || ''),
          velocity: parseInt(row.Velocity || row.velocity || row.storyPoints || row.points || row.Points || 0),
          bugs: parseInt(row.Bugs || row.bugs || 0),
          status: (row.Status || row.status || 'todo').toLowerCase(),
          projectId
        }));

        setParsedTasks(tasks);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleManualParse = () => {
    try {
      // Parse manual input (expecting CSV-like format)
      const lines = manualData.trim().split('\n');
      const tasks = lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        return {
          name: parts[0] || `Task ${index + 1}`,
          module: parts[1] || '',
          dueDate: parts[2] || '',
          velocity: parseInt(parts[3]) || 0,
          bugs: parseInt(parts[4]) || 0,
          status: (parts[5] || 'todo').toLowerCase(),
          projectId
        };
      });
      setParsedTasks(tasks);
    } catch (error) {
      console.error('Error parsing manual data:', error);
      alert('Error parsing data. Use format: Feature Name, Module, Due Date, Velocity, Bugs, Status');
    }
  };

  const handleImport = () => {
    if (parsedTasks.length === 0) {
      alert('No tasks to import');
      return;
    }
    onImport(parsedTasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="card-dark rounded-2xl shadow-2xl p-8 max-w-3xl w-full animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Import Tasks</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Import Method Selection */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={() => setImportMethod('manual')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              importMethod === 'manual'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            Manual Input
          </button>
          <button
            onClick={() => setImportMethod('csv')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              importMethod === 'csv'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            CSV Upload
          </button>
          <button
            onClick={() => setImportMethod('excel')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              importMethod === 'excel'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            Excel Upload
          </button>
        </div>

        {/* Manual Input */}
        {importMethod === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Enter tasks (one per line: Feature Name, Module, Due Date, Velocity, Bugs, Status)
              </label>
              <textarea
                value={manualData}
                onChange={(e) => setManualData(e.target.value)}
                rows="8"
                className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-xl placeholder-dark-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                placeholder="User authentication flow, Login Page, 2026-02-20, 13, 2, in-progress&#10;Dashboard analytics widget, Dashboard, 2026-02-22, 8, 0, in-progress"
                style={{ 
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  caretColor: '#ffffff'
                }}
              />
            </div>
            <button
              onClick={handleManualParse}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-medium"
            >
              Parse Tasks
            </button>
          </div>
        )}

        {/* File Upload */}
        {(importMethod === 'csv' || importMethod === 'excel') && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-dark-700 rounded-xl p-8 text-center hover:border-primary-500 transition-all">
              <input
                type="file"
                accept={importMethod === 'csv' ? '.csv' : '.xlsx,.xls'}
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">
                  {file ? file.name : `Click to upload ${importMethod.toUpperCase()}`}
                </p>
                <p className="text-dark-400 text-sm">
                  Expected columns: Feature Name, Module, Due Date, Velocity, Bugs, Status
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Preview Parsed Tasks */}
        {parsedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Preview ({parsedTasks.length} tasks)</h3>
            <div className="bg-dark-900 rounded-xl p-4 max-h-60 overflow-y-auto">
              {parsedTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <div className="flex-1">
                    <div className="text-white font-medium">{task.name}</div>
                    <div className="text-dark-400 text-sm">
                      {task.module} • {task.dueDate} • {task.velocity} velocity • {task.bugs} bugs
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-dark-700 rounded-xl text-dark-300 hover:bg-dark-800 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedTasks.length === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-500 hover:to-primary-600 transition-all shadow-lg shadow-primary-500/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {parsedTasks.length} Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataImportModal;
