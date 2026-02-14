import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectTasks, updateTask } from '../services/taskService';
import { saveAnalysisToHistory, getProjectAnalysisHistory } from '../services/analysisHistoryService';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateForBackend, formatDateForDisplay } from '../utils/dateUtils.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const AIAnalysis = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  useEffect(() => {
    loadTasksAndAnalyze();
    loadAnalysisHistory();
  }, [projectId]);

  const loadTasksAndAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectTasks(projectId);
      setTasks(data);
      
      // Auto-run analysis
      if (data.length > 0) {
        setTimeout(() => runAIAnalysis(data), 500);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load tasks');
      setLoading(false);
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const history = await getProjectAnalysisHistory(projectId);
      setAnalysisHistory(history);
    } catch (err) {
      console.error('Failed to load analysis history:', err);
    }
  };

  const runAIAnalysis = async (taskData) => {
    setAnalyzing(true);
    setError(null);
    
    try {
      // Prepare request payload with proper validation
      const requestPayload = {
        projectId: projectId,
        tasks: taskData.map(task => ({
          id: String(task.id),
          name: String(task.name || 'Untitled Task'),
          assignee: task.assignee ? String(task.assignee) : null,
          dueDate: formatDateForBackend(task.dueDate),
          storyPoints: Math.max(0, Math.min(100, parseInt(task.storyPoints) || 0)),
          status: ['todo', 'in-progress', 'done'].includes(task.status) ? task.status : 'todo',
          dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
        })),
        team_capacity: [
          { name: 'Sarah Johnson', capacity: 40, velocity_multiplier: 1.2 },  // 20% faster
          { name: 'Michael Chen', capacity: 40, velocity_multiplier: 1.5 },   // 50% faster - senior dev
          { name: 'David Martinez', capacity: 40, velocity_multiplier: 1.3 }, // 30% faster
          { name: 'Emily Rodriguez', capacity: 40, velocity_multiplier: 1.1 }, // 10% faster
          { name: 'James Wilson', capacity: 40, velocity_multiplier: 1.4 },   // 40% faster - DevOps expert
          { name: 'Lisa Anderson', capacity: 40, velocity_multiplier: 0.9 },  // Average
          { name: 'Robert Taylor', capacity: 40, velocity_multiplier: 1.0 },  // Average
          { name: 'Jennifer Lee', capacity: 40, velocity_multiplier: 1.2 },   // 20% faster
          { name: 'Christopher Brown', capacity: 40, velocity_multiplier: 0.8 }, // Slower - junior
          { name: 'Amanda White', capacity: 40, velocity_multiplier: 1.1 }    // 10% faster
        ],
        sprint_duration_days: 14,
        velocity_history: [35, 42, 38, 40]
      };

      console.log('Sending to backend:', requestPayload);

      // Call backend API
      const response = await fetch(`${BACKEND_URL}/planning/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Backend error response:', errorData);
        
        // Format error message nicely
        let errorMessage = `Backend error: ${response.statusText}`;
        if (errorData?.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = `Validation errors:\n${errorData.detail.map(e => `- ${e.msg}`).join('\n')}`;
          } else {
            errorMessage = errorData.detail;
          }
        }
        throw new Error(errorMessage);
      }

      const backendAnalysis = await response.json();
      console.log('Backend analysis received:', backendAnalysis);
      
      // Transform backend response to frontend format
      const transformedAnalysis = {
        overallRisk: backendAnalysis.overall_risk_score,
        criticalIssues: backendAnalysis.critical_issues,
        suggestions: backendAnalysis.task_analysis.map((taskAnalysis) => {
          const originalTask = taskData.find(t => t.id === taskAnalysis.task_id);
          return {
            taskId: taskAnalysis.task_id,
            taskName: taskAnalysis.task_name,
            currentAssignee: originalTask?.assignee || 'Unassigned',
            currentPoints: originalTask?.storyPoints || 0,
            currentDueDate: formatDateForDisplay(originalTask?.dueDate),
            issues: [
              taskAnalysis.risk_level === 'critical' || taskAnalysis.risk_level === 'high' 
                ? `${taskAnalysis.risk_level.toUpperCase()} risk level detected` 
                : null,
              taskAnalysis.risk_factors.complexity > 70 
                ? 'High complexity - consider breaking down' 
                : null,
              taskAnalysis.risk_factors.dependency > 50 
                ? 'Dependency risk with other tasks' 
                : null,
              taskAnalysis.risk_factors.overload > 70 
                ? 'Assignee overloaded' 
                : null
            ].filter(Boolean),
            recommendations: {
              optimalAssignee: originalTask?.assignee || 'Sarah Johnson',
              optimalPoints: Math.max(1, (originalTask?.storyPoints || 5) - 2),
              optimalDueDate: originalTask?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              reasoning: taskAnalysis.recommendations.join('. ') || 'Based on risk analysis, these adjustments will reduce project risk.'
            },
            impact: {
              riskReduction: Math.min(taskAnalysis.total_risk_score, 30),
              timelineSaved: Math.floor(taskAnalysis.risk_factors.deadline / 30),
              confidenceScore: 100 - taskAnalysis.total_risk_score
            }
          };
        }),
        optimizations: {
          totalRiskReduction: Math.max(0, 100 - backendAnalysis.overall_risk_score),
          estimatedTimeSaved: `${backendAnalysis.predicted_release_delay_days} days`,
          teamEfficiencyGain: `${Math.floor(backendAnalysis.average_velocity / 10)}%`
        },
        backendData: backendAnalysis  // Store full backend response
      };
      
      setAnalysis(transformedAnalysis);
      
      // Save analysis to history
      try {
        await saveAnalysisToHistory(projectId, transformedAnalysis);
        await loadAnalysisHistory(); // Refresh history list
      } catch (saveError) {
        console.error('Failed to save analysis to history:', saveError);
        // Don't show error to user, just log it
      }
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(`Failed to perform AI analysis: ${err.message}`);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion) => {
    try {
      await updateTask(suggestion.taskId, {
        assignee: suggestion.recommendations.optimalAssignee,
        storyPoints: suggestion.recommendations.optimalPoints,
        dueDate: suggestion.recommendations.optimalDueDate
      });
      
      alert('✓ AI suggestion applied successfully!');
      navigate(`/project/${projectId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to apply suggestion');
    }
  };

  const applyAllSuggestions = async () => {
    if (!window.confirm('Apply all AI suggestions? This will update all tasks.')) return;
    
    try {
      for (const suggestion of analysis.suggestions) {
        await updateTask(suggestion.taskId, {
          assignee: suggestion.recommendations.optimalAssignee,
          storyPoints: suggestion.recommendations.optimalPoints,
          dueDate: suggestion.recommendations.optimalDueDate
        });
      }
      
      alert('✓ All AI suggestions applied successfully!');
      navigate(`/project/${projectId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to apply suggestions');
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
            <p className="text-slate-400">Intelligent recommendations powered by backend AI engine</p>
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
            
            {analysis && (
              <button
                onClick={applyAllSuggestions}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-500 hover:to-green-600 transition-all shadow-lg shadow-green-900/50 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply All Suggestions</span>
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
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <div className="text-sm text-slate-400 mb-2">Risk Reduction Potential</div>
                <div className="text-4xl font-bold text-green-500 mb-1">{analysis.optimizations.totalRiskReduction}%</div>
                <div className="text-xs text-slate-500">Applying all suggestions</div>
              </div>
              
              <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <div className="text-sm text-slate-400 mb-2">Estimated Time Saved</div>
                <div className="text-4xl font-bold text-blue-500 mb-1">{analysis.optimizations.estimatedTimeSaved}</div>
                <div className="text-xs text-slate-500">From timeline optimization</div>
              </div>
              
              <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <div className="text-sm text-slate-400 mb-2">Team Efficiency Gain</div>
                <div className="text-4xl font-bold text-orange-500 mb-1">{analysis.optimizations.teamEfficiencyGain}</div>
                <div className="text-xs text-slate-500">Better workload distribution</div>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="bg-gradient-to-r from-danger-900/30 to-danger-800/20 border border-danger-500/30 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <svg className="w-6 h-6 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Critical Issues Detected</span>
              </h3>
              <ul className="space-y-2">
                {analysis.criticalIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-dark-200">
                    <span className="text-danger-500 mt-1">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">AI Optimization Suggestions</h2>
              
              {analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{suggestion.taskName}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {suggestion.issues.map((issue, i) => (
                          <span key={i} className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-xs border border-orange-500/30">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-4">
                        <div className="text-xs text-slate-400">Confidence</div>
                        <div className="text-lg font-bold text-green-500">{suggestion.impact.confidenceScore}%</div>
                      </div>
                      <button
                        onClick={() => setSelectedSuggestion(selectedSuggestion === idx ? null : idx)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all text-sm font-medium shadow-lg shadow-blue-900/50"
                      >
                        {selectedSuggestion === idx ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>

                  {selectedSuggestion === idx && (
                    <div className="border-t border-dark-800 pt-4 mt-4 animate-slide-up">
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        {/* Current State */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-400 mb-3">Current State</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-300">Assignee:</span>
                              <span className="text-white font-medium">{suggestion.currentAssignee || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Story Points:</span>
                              <span className="text-white font-medium">{suggestion.currentPoints}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Due Date:</span>
                              <span className="text-white font-medium">{suggestion.currentDueDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recommended State */}
                        <div>
                          <h4 className="text-sm font-semibold text-green-500 mb-3">AI Recommended</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-300">Assignee:</span>
                              <span className="text-green-400 font-medium">{suggestion.recommendations.optimalAssignee}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Story Points:</span>
                              <span className="text-green-400 font-medium">{suggestion.recommendations.optimalPoints}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Due Date:</span>
                              <span className="text-green-400 font-medium">{formatDateForDisplay(suggestion.recommendations.optimalDueDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">AI Reasoning</h4>
                        <p className="text-slate-300 text-sm">{suggestion.recommendations.reasoning}</p>
                      </div>

                      {/* Impact */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">Risk Reduction</div>
                          <div className="text-2xl font-bold text-green-500">-{suggestion.impact.riskReduction}%</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">Time Saved</div>
                          <div className="text-2xl font-bold text-blue-500">{suggestion.impact.timelineSaved}d</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">Confidence</div>
                          <div className="text-2xl font-bold text-orange-500">{suggestion.impact.confidenceScore}%</div>
                        </div>
                      </div>

                      {/* Apply Button */}
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-500 hover:to-green-600 transition-all shadow-lg shadow-green-900/50 font-semibold flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Apply This Suggestion</span>
                      </button>
                    </div>
                  )}
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
                    setAnalysis({
                      overallRisk: historyItem.overallRisk,
                      criticalIssues: historyItem.criticalIssues,
                      suggestions: historyItem.suggestions,
                      optimizations: historyItem.optimizations,
                      backendData: historyItem.backendData
                    });
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
                          historyItem.overallRisk >= 70 ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          historyItem.overallRisk >= 50 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                          'bg-green-500/10 text-green-400 border border-green-500/30'
                        }`}>
                          Risk: {historyItem.overallRisk}
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
                      <div className="text-xl font-bold text-white">{historyItem.taskCount}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Critical Issues</div>
                      <div className="text-xl font-bold text-red-400">{historyItem.criticalIssues?.length || 0}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Risk Reduction</div>
                      <div className="text-xl font-bold text-green-400">{historyItem.optimizations?.totalRiskReduction || 0}%</div>
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
