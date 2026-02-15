import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectTasks } from '../services/taskService';
import { callGeminiForAnalysis, saveAIAnalysis, getAIAnalysisHistory, getCompletedTasks } from '../services/aiAnalysisService';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateForDisplay } from '../utils/dateUtils.js';

const AIAnalysis = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  useEffect(() => {
    loadTasks();
    loadAnalysisHistory();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectTasks(projectId);
      setTasks(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load tasks');
      setLoading(false);
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const history = await getAIAnalysisHistory(projectId);
      setAnalysisHistory(history);
    } catch (err) {
      console.error('Failed to load analysis history:', err);
    }
  };

  const runAIAnalysis = async () => {
    if (tasks.length === 0) {
      setError('No tasks to analyze. Please add tasks first.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    
    try {
      // Get completed tasks for historical analysis
      const completedTasks = await getCompletedTasks(projectId);
      
      // Call Gemini LLM for analysis
      const analysisData = await callGeminiForAnalysis(tasks, completedTasks);
      
      // Save analysis to Firestore
      await saveAIAnalysis(projectId, currentUser.uid, analysisData, tasks.length);
      
      // Update state
      setAnalysis(analysisData);
      
      // Reload history
      await loadAnalysisHistory();
      
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(`Failed to perform AI analysis: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading AI Analysis..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <Navbar showBackButton={true} backTo={`/project/${projectId}`} pageTitle="AI Analysis" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Analysis & Optimization</h1>
            <p className="text-slate-400">Intelligent recommendations powered by Gemini AI</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {analysisHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 text-white px-5 py-3 rounded-xl font-medium hover:bg-slate-700/50 transition-all flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>History ({analysisHistory.length})</span>
              </button>
            )}
            
            {!analysis && !analyzing && tasks.length > 0 && (
              <button
                onClick={runAIAnalysis}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-900/50 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Run AI Analysis</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-danger-500/10 border border-danger-500/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start space-x-4">
              <svg className="w-6 h-6 text-danger-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-danger-500 mb-2">Analysis Error</h3>
                <p className="text-dark-200">{error}</p>
                <button
                  onClick={() => loadTasksAndAnalyze()}
                  className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-xl hover:bg-danger-700 transition-all text-sm font-medium"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Tasks State */}
        {!loading && !analyzing && tasks.length === 0 && (
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-2xl mb-6">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Tasks to Analyze</h3>
            <p className="text-slate-400 mb-6">Add tasks to your project to get AI-powered insights</p>
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all font-medium"
            >
              Go to Planning
            </button>
          </div>
        )}

        {analyzing && (
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700/30 rounded-2xl mb-6 animate-pulse">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Project Data...</h3>
            <p className="text-slate-400">AI is processing {tasks.length} tasks and generating optimization recommendations</p>
          </div>
        )}

        {analysis && !analyzing && (
          <>
            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/20 border border-red-500/30 rounded-2xl p-8 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold border border-red-500/30">
                      HIGH RISK ({analysis.summary.overallRisk}%)
                    </span>
                    <span className="px-3 py-1 bg-slate-800/50 text-slate-300 rounded-lg text-sm font-medium">
                      {analysis.summary.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-base">
                    {analysis.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Completed Tasks Performance */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{analysis.completedTasksAnalysis.title}</h3>
                  <p className="text-sm text-slate-400">{analysis.completedTasksAnalysis.description}</p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Feature</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Velocity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Days</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bugs</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {analysis.completedTasksAnalysis.tasks.map((task, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-white font-medium">{task.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs font-medium">
                            {task.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className={task.plannedVelocity === task.actualVelocity ? 'text-green-400' : 'text-yellow-400'}>
                            {task.actualVelocity}
                          </span>
                          <span className="text-slate-500 text-xs"> / {task.plannedVelocity}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className={task.plannedDays === task.actualDays ? 'text-green-400' : 'text-yellow-400'}>
                            {task.actualDays}
                          </span>
                          <span className="text-slate-500 text-xs"> / {task.plannedDays}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.bugs === 0 ? 'bg-green-500/10 text-green-400' :
                            task.bugs <= 1 ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {task.bugs}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            task.performance === 'On Track' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                            task.performance === 'Slight Delay' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            {task.performance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Key Insights from Completed Tasks</h4>
                <ul className="space-y-2">
                  {analysis.completedTasksAnalysis.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-slate-300 text-sm">
                      <svg className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* New Tasks Risk & Time Prediction */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{analysis.newTasksPredictions.title}</h3>
                  <p className="text-sm text-slate-400">{analysis.newTasksPredictions.description}</p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-slate-400">Planned</div>
                    <div className="text-xl font-bold text-white">{analysis.newTasksPredictions.summary.totalPlannedVelocity}</div>
                  </div>
                  <div className="text-slate-600">→</div>
                  <div className="text-center">
                    <div className="text-slate-400">Predicted</div>
                    <div className="text-xl font-bold text-orange-400">{analysis.newTasksPredictions.summary.totalPredictedVelocity}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {analysis.newTasksPredictions.tasks.map((task, idx) => (
                  <div key={idx} className={`bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-6 ${
                    task.riskLevel === 'Critical' ? 'border-red-500/50 bg-red-900/10' :
                    task.riskLevel === 'High' ? 'border-orange-500/50 bg-orange-900/10' :
                    'border-slate-700/50'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">{task.name}</h4>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs font-medium">
                            {task.module}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.riskLevel === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            task.riskLevel === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}>
                            {task.riskLevel} Risk ({task.riskScore}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Velocity</div>
                        <div className="text-sm">
                          <span className="text-slate-500">{task.plannedVelocity}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-orange-400 font-bold">{task.predictedVelocity}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Days</div>
                        <div className="text-sm">
                          <span className="text-slate-500">{task.plannedDays}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-orange-400 font-bold">{task.predictedDays}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Bugs</div>
                        <div className="text-sm">
                          <span className="text-slate-500">{task.bugs}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-red-400 font-bold">{task.predictedBugs}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold text-slate-400 mb-2">AI Reasoning</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{task.reasoning}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-400 mb-2">Recommendations</div>
                      {task.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start space-x-2">
                          <svg className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-xs text-slate-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern-Based Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Pattern-Based Suggestions</h2>
                  <p className="text-sm text-slate-400">Critical actions based on historical analysis</p>
                </div>
              </div>
              
              {analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className={`bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-6 ${
                  suggestion.severity === 'critical' ? 'border-red-500/50 bg-red-900/10' :
                  suggestion.severity === 'high' ? 'border-orange-500/50 bg-orange-900/10' :
                  'border-slate-700/50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${
                          suggestion.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          suggestion.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {suggestion.severity}
                        </span>
                        <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs font-medium">
                          {suggestion.type}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{suggestion.title}</h3>
                      <p className="text-slate-300 mb-4 leading-relaxed">{suggestion.description}</p>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-xs font-semibold text-cyan-400 mb-2">RECOMMENDED ACTION</div>
                        <p className="text-sm text-white font-medium">{suggestion.action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Analysis History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {analysisHistory.map((historyItem, idx) => (
                <div
                  key={historyItem.id}
                  className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all cursor-pointer"
                  onClick={() => {
                    setAnalysis(historyItem.analysis);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Analysis #{analysisHistory.length - idx}
                        </h3>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          historyItem.analysis?.summary?.overallRisk >= 70 ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          historyItem.analysis?.summary?.overallRisk >= 50 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                          'bg-green-500/10 text-green-400 border border-green-500/30'
                        }`}>
                          Risk: {historyItem.analysis?.summary?.overallRisk || 0}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {historyItem.timestamp?.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Tasks Analyzed</div>
                      <div className="text-xl font-bold text-white">{historyItem.tasksCount || 0}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Suggestions</div>
                      <div className="text-xl font-bold text-cyan-400">{historyItem.analysis?.suggestions?.length || 0}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Confidence</div>
                      <div className="text-xl font-bold text-green-400">{historyItem.analysis?.summary?.confidence || 0}%</div>
                    </div>
                  </div>
                </div>
              ))}

              {analysisHistory.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-2xl mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No analysis history yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
