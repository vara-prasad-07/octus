import { useState, useEffect, useCallback } from 'react';
import { useTestGeneration } from '../../hooks/useTestGeneration';
import { aiTestGenApi } from '../../api/aiTestGenClient';
import { useAuth } from '../../contexts/AuthContext';
import { saveTestRunHistorySnapshot } from '../../services/testGenerationHistoryService';
import {
  Sparkles, ChevronDown, ChevronRight, Download, FileJson, FileText,
  FileSpreadsheet, Code2, Trash2, AlertCircle, CheckCircle2, Clock,
  Loader2, Beaker, ShieldAlert, Zap, BarChart3, Github, Search, FolderOpen, Link2
} from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  major: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  minor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  trivial: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const TYPE_ICONS = {
  happy_path: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  negative: <ShieldAlert className="w-4 h-4 text-red-400" />,
  edge_case: <Beaker className="w-4 h-4 text-amber-400" />,
  boundary: <BarChart3 className="w-4 h-4 text-cyan-400" />,
  security: <ShieldAlert className="w-4 h-4 text-rose-400" />,
  performance: <Zap className="w-4 h-4 text-sky-400" />,
};

const TYPE_LABELS = {
  happy_path: 'Happy Path',
  negative: 'Negative',
  edge_case: 'Edge Case',
  boundary: 'Boundary',
  security: 'Security',
  performance: 'Performance',
};

const TestGenerationTab = ({ projectId }) => {
  const { currentUser } = useAuth();
  const {
    suite, setSuite, loading, error, generate, loadHistory, history,
    removeSuite, handleExport,
  } = useTestGeneration(projectId);

  const [form, setForm] = useState({
    userStory: '',
    acceptanceCriteria: '',
    component: '',
    priority: 'P1',
    format: 'gherkin',
  });

  const [expandedCase, setExpandedCase] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeView, setActiveView] = useState('generate');

  // Test Runner State
  const [runStatus, setRunStatus] = useState(null); // { run_id, status, conclusion, logs, html_url }
  const [runLoading, setRunLoading] = useState(false);

  const handleRunTests = async () => {
    if (!suite?.suite_id || !ghToken || !ghSelectedRepo) return;
    setRunLoading(true);
    setRunStatus({ status: 'queued', conclusion: null });
    try {
      const { data } = await aiTestGenApi.post(
        `/tests/${suite.suite_id}/run?repo=${encodeURIComponent(ghSelectedRepo)}&token=${encodeURIComponent(ghToken)}`
      );
      setRunStatus(data);
      await persistRunSnapshot(data);
      if (data.run_id) {
        pollRunStatus(data.run_id);
      } else {
        setRunLoading(false);
        await loadHistory();
      }
    } catch (err) {
      const failureStatus = {
        run_id: null,
        status: 'error',
        conclusion: 'failure',
        logs: err.message,
        message: err.message,
      };
      setRunStatus(failureStatus);
      await persistRunSnapshot(failureStatus);
      setRunLoading(false);
      await loadHistory();
    }
  };

  const pollRunStatus = (runId) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await aiTestGenApi.get(
          `/tests/runs/${runId}/status?repo=${encodeURIComponent(ghSelectedRepo)}&token=${encodeURIComponent(ghToken)}`
        );
        setRunStatus(data);
        await persistRunSnapshot(data);
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(interval);
          setRunLoading(false);
          await loadHistory();
        }
      } catch (err) {
        clearInterval(interval);
        const failureStatus = {
          run_id: runId,
          status: 'error',
          conclusion: 'failure',
          logs: err.message,
          message: err.message,
        };
        setRunStatus(failureStatus);
        await persistRunSnapshot(failureStatus);
        setRunLoading(false);
        await loadHistory();
      }
    }, 5000);
  };

  // GitHub OAuth State
  const [ghToken, setGhToken] = useState(() => localStorage.getItem('gh_token') || '');
  const [ghRepos, setGhRepos] = useState([]);
  const [ghFiles, setGhFiles] = useState([]);
  const [ghSelectedRepo, setGhSelectedRepo] = useState('');
  const [ghSelectedFile, setGhSelectedFile] = useState('');
  const [ghLoadingRepos, setGhLoadingRepos] = useState(false);
  const [ghLoadingFiles, setGhLoadingFiles] = useState(false);
  const [ghFileSearch, setGhFileSearch] = useState('');

  const persistRunSnapshot = useCallback(async (runPayload) => {
    if (!projectId || !suite?.suite_id || !runPayload) return;

    try {
      const { historyId } = await saveTestRunHistorySnapshot({
        projectId,
        suiteId: suite.suite_id,
        suiteHistoryId: suite._history_id || null,
        ownerId: currentUser?.uid || null,
        githubContext: {
          repo: ghSelectedRepo || '',
          filePath: ghSelectedFile || '',
        },
        runData: runPayload,
      });

      if (!suite._history_id && historyId) {
        setSuite((prev) => (prev ? { ...prev, _history_id: historyId } : prev));
      }
    } catch (persistError) {
      console.error('Failed to persist run snapshot:', persistError);
    }
  }, [
    currentUser?.uid,
    ghSelectedFile,
    ghSelectedRepo,
    projectId,
    setSuite,
    suite?._history_id,
    suite?.suite_id,
  ]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // If we already have a token, load repos
  useEffect(() => {
    if (ghToken) loadGhRepos();
  }, [ghToken]);

  const connectGitHub = async () => {
    try {
      const { data } = await aiTestGenApi.get('/auth/github/login');
      const popup = window.open(data.url, 'github-oauth', 'width=600,height=700');

      const handleMessage = async (event) => {
        if (event.data?.type === 'github-oauth-callback' && event.data?.code) {
          window.removeEventListener('message', handleMessage);
          try {
            const { data: tokenData } = await aiTestGenApi.get(`/auth/github/callback?code=${event.data.code}`);
            if (tokenData.access_token) {
              setGhToken(tokenData.access_token);
              localStorage.setItem('gh_token', tokenData.access_token);
            }
          } catch (err) {
            console.error('Token exchange failed:', err);
          }
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('GitHub connect error:', err);
    }
  };

  const disconnectGitHub = () => {
    setGhToken('');
    setGhRepos([]);
    setGhFiles([]);
    setGhSelectedRepo('');
    setGhSelectedFile('');
    localStorage.removeItem('gh_token');
  };

  const loadGhRepos = async () => {
    if (!ghToken) return;
    setGhLoadingRepos(true);
    try {
      const { data } = await aiTestGenApi.get('/github/repos', { params: { token: ghToken } });
      setGhRepos(data);
    } catch { setGhRepos([]); }
    finally { setGhLoadingRepos(false); }
  };

  const loadGhFiles = async (repoFullName) => {
    if (!ghToken || !repoFullName) return;
    setGhLoadingFiles(true);
    setGhFiles([]);
    setGhSelectedFile('');
    try {
      const [owner, repo] = repoFullName.split('/');
      const selectedRepo = ghRepos.find(r => r.full_name === repoFullName);
      const branch = selectedRepo?.default_branch || 'main';
      const { data } = await aiTestGenApi.get(`/github/repos/${owner}/${repo}/tree`, {
        params: { token: ghToken, branch },
      });
      setGhFiles(data);
    } catch { setGhFiles([]); }
    finally { setGhLoadingFiles(false); }
  };

  const filteredFiles = ghFiles.filter(f =>
    f.path.toLowerCase().includes(ghFileSearch.toLowerCase())
  ).slice(0, 50);

  const handleGenerate = async () => {
    if (!form.userStory.trim()) return;
    try {
      // Always inject live GitHub state at call time to avoid stale closures
      const liveForm = {
        ...form,
        githubRepo: ghSelectedRepo || '',
        githubFilePath: ghSelectedFile || '',
        githubToken: ghToken || '',
      };
      setRunStatus(null); // Clear any previous run status
      await generate(liveForm);
    } catch {
      // error is already set in hook
    }
  };

  const toggleCase = (id) => {
    setExpandedCase(expandedCase === id ? null : id);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">AI Test Generator</h2>
          <p className="text-sm text-slate-400">Powered by Google Gemini</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('generate')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'generate'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
          >
            Generate
          </button>
          <button
            onClick={() => { setActiveView('history'); loadHistory(); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'history'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {activeView === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel — Input Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Story Input</h3>

              {/* User Story */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  User Story *
                </label>
                <textarea
                  value={form.userStory}
                  onChange={(e) => setForm({ ...form, userStory: e.target.value })}
                  rows={4}
                  placeholder="As a [role], I want to [action] so that [benefit]..."
                  className="w-full px-4 py-3 bg-slate-800/60 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  style={{ color: '#fff', WebkitTextFillColor: '#fff', caretColor: '#fff' }}
                />
              </div>

              {/* Acceptance Criteria */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Acceptance Criteria
                </label>
                <textarea
                  value={form.acceptanceCriteria}
                  onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })}
                  rows={3}
                  placeholder="One criterion per line&#10;- Users can log in with email&#10;- Password must be 8+ chars"
                  className="w-full px-4 py-3 bg-slate-800/60 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  style={{ color: '#fff', WebkitTextFillColor: '#fff', caretColor: '#fff' }}
                />
              </div>

              {/* Component / Page */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Component / Page
                </label>
                <input
                  type="text"
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  placeholder="e.g. Login Page, Checkout Flow"
                  className="w-full px-4 py-3 bg-slate-800/60 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  style={{ color: '#fff', WebkitTextFillColor: '#fff', caretColor: '#fff' }}
                />
              </div>

              {/* Priority & Format */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/60 border-2 border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    style={{ color: '#fff', WebkitTextFillColor: '#fff' }}
                  >
                    {['P0', 'P1', 'P2', 'P3'].map((p) => (
                      <option key={p} value={p} style={{ backgroundColor: '#1e293b', color: '#fff' }}>{p} — {
                        { P0: 'Critical', P1: 'High', P2: 'Medium', P3: 'Low' }[p]
                      }</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/60 border-2 border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    style={{ color: '#fff', WebkitTextFillColor: '#fff' }}
                  >
                    <option value="gherkin" style={{ backgroundColor: '#1e293b', color: '#fff' }}>Gherkin / BDD</option>
                    <option value="plain_steps" style={{ backgroundColor: '#1e293b', color: '#fff' }}>Plain Steps</option>
                    <option value="pytest" style={{ backgroundColor: '#1e293b', color: '#fff' }}>Pytest</option>
                  </select>
                </div>
              </div>

              {/* GitHub Context Section */}
              <div className="border-t border-slate-700/50 pt-5 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Github className="w-4 h-4 text-blue-400" />
                    GitHub Context
                  </h3>
                  {ghToken ? (
                    <button
                      onClick={disconnectGitHub}
                      className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>

                {!ghToken ? (
                  <button
                    onClick={connectGitHub}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/60 hover:bg-slate-700/60 border-2 border-dashed border-slate-600/50 hover:border-blue-500/50 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
                  >
                    <Github className="w-5 h-5" />
                    <span>Connect to GitHub</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Connected indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-xs text-emerald-400 font-medium">Connected to GitHub</span>
                    </div>

                    {/* Repo Selector */}
                    <div>
                      <label className="block text-xs font-medium text-dark-300 mb-1.5">Repository</label>
                      {ghLoadingRepos ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-dark-800 rounded-lg text-xs text-dark-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading repos...
                        </div>
                      ) : (
                        <select
                          value={ghSelectedRepo}
                          onChange={(e) => {
                            const repo = e.target.value;
                            setGhSelectedRepo(repo);
                            setGhSelectedFile('');
                            setForm(f => ({ ...f, githubRepo: repo, githubFilePath: '' }));
                            setSuite(null);  // Clear old results
                            setRunStatus(null);
                            if (repo) loadGhFiles(repo);
                          }}
                          className="w-full px-3 py-2.5 bg-slate-800/60 border-2 border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          style={{ color: '#fff', WebkitTextFillColor: '#fff' }}
                        >
                          <option value="" style={{ backgroundColor: '#1e293b' }}>Select a repository...</option>
                          {ghRepos.map((r) => (
                            <option key={r.full_name} value={r.full_name} style={{ backgroundColor: '#1e293b', color: '#fff' }}>
                              {r.full_name} {r.private ? '­ƒöÆ' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* File Selector */}
                    {ghSelectedRepo && (
                      <div>
                        <label className="block text-xs font-medium text-dark-300 mb-1.5">File</label>
                        {ghLoadingFiles ? (
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-dark-800 rounded-lg text-xs text-dark-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading file tree...
                          </div>
                        ) : (
                          <div className="bg-slate-800/60 border-2 border-slate-700/50 rounded-lg overflow-hidden">
                            {/* Search */}
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
                              <Search className="w-3.5 h-3.5 text-slate-500" />
                              <input
                                type="text"
                                value={ghFileSearch}
                                onChange={(e) => setGhFileSearch(e.target.value)}
                                placeholder="Search files..."
                                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-500"
                                style={{ color: '#fff', WebkitTextFillColor: '#fff', caretColor: '#fff' }}
                              />
                            </div>
                            {/* File list */}
                            <div className="max-h-40 overflow-y-auto">
                              {filteredFiles.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-slate-500">
                                  {ghFileSearch ? 'No files match' : 'No files found'}
                                </div>
                              ) : (
                                filteredFiles.map((f) => (
                                  <button
                                    key={f.path}
                                    onClick={() => {
                                      setGhSelectedFile(f.path);
                                      setForm(prev => ({ ...prev, githubFilePath: f.path, githubRepo: ghSelectedRepo, githubToken: ghToken }));
                                      setSuite(null);  // Clear old results when file changes
                                      setRunStatus(null);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${ghSelectedFile === f.path
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                                      }`}
                                  >
                                    <Code2 className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate font-mono">{f.path}</span>
                                    <span className="ml-auto text-dark-600 text-[10px]">{(f.size / 1024).toFixed(1)}kb</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Selected file indicator */}
                        {ghSelectedFile && (
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                            <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs text-violet-300 font-mono truncate">{ghSelectedFile}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !form.userStory.trim()}
                className="w-full py-3.5 rounded-xl text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg hover:shadow-blue-500/25 mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Test Cases</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium text-sm">Generation Error</p>
                  <p className="text-red-300/80 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel — Results */}
          <div className="lg:col-span-3 space-y-6">
            {loading && (
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-12 text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-700/50"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI is generating test cases...</h3>
                <p className="text-slate-400 text-sm">Analyzing story, applying coverage rules, and deduplicating. This can take 15-60 seconds.</p>
              </div>
            )}

            {suite && !loading && (
              <>
                {/* Suite Summary */}
                <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {suite.component || 'Test Suite'} ÔÇö {suite.total_cases} cases
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">{suite.user_story_summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Run Tests Button */}
                      {ghToken && ghSelectedRepo && (
                        <button
                          onClick={handleRunTests}
                          disabled={runLoading}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-all shadow-lg shadow-emerald-500/20"
                        >
                          {runLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          <span>{runLoading ? 'Running...' : 'Run Tests'}</span>
                        </button>
                      )}

                      {/* Export Button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="flex items-center space-x-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 hover:text-white transition-all"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showExportMenu && (
                          <div className="absolute right-0 mt-2 w-48 card-dark rounded-xl shadow-2xl overflow-hidden z-20 animate-slide-up border border-dark-700">
                            {[
                              { fmt: 'json', icon: <FileJson className="w-4 h-4" />, label: 'JSON' },
                              { fmt: 'feature', icon: <FileText className="w-4 h-4" />, label: 'Gherkin (.feature)' },
                              { fmt: 'csv', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'CSV' },
                              { fmt: 'pytest', icon: <Code2 className="w-4 h-4" />, label: 'Pytest (.py)' },
                            ].map(({ fmt, icon, label }) => (
                              <button
                                key={fmt}
                                onClick={() => {
                                  handleExport(suite.suite_id, fmt);
                                  setShowExportMenu(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-dark-200 hover:bg-dark-800 hover:text-white transition-colors flex items-center space-x-3"
                              >
                                {icon}
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Run Status Banner */}
                  {runStatus && (
                    <div className={`mt-4 px-4 py-3 rounded-xl border ${runStatus.status === 'completed' && runStatus.conclusion === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : runStatus.status === 'completed' && runStatus.conclusion === 'failure'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-violet-500/10 border-violet-500/30'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {runStatus.status === 'completed' && runStatus.conclusion === 'success' && (
                            <><CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-medium text-emerald-400">All tests passed!</span></>
                          )}
                          {runStatus.status === 'completed' && runStatus.conclusion === 'failure' && (
                            <><AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-sm font-medium text-red-400">Tests failed</span></>
                          )}
                          {runStatus.status === 'queued' && (
                            <><Clock className="w-4 h-4 text-violet-400 animate-pulse" />
                              <span className="text-sm font-medium text-violet-400">Queued ÔÇö waiting for runner...</span></>
                          )}
                          {runStatus.status === 'in_progress' && (
                            <><Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                              <span className="text-sm font-medium text-violet-400">Running tests...</span></>
                          )}
                          {runStatus.status === 'error' && (
                            <><AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-sm font-medium text-red-400">Error: {runStatus.logs || runStatus.message}</span></>
                          )}
                        </div>
                        {runStatus.html_url && (
                          <a href={runStatus.html_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-dark-400 hover:text-white transition-colors underline">
                            View on GitHub ÔåÆ
                          </a>
                        )}
                      </div>
                      {runStatus.logs && runStatus.status === 'completed' && (
                        <pre className="mt-3 text-xs text-dark-300 bg-dark-900 rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
                          {runStatus.logs}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Breakdown Badges */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(suite.breakdown || {}).map(([type, count]) => (
                      <span key={type} className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/60 rounded-lg text-xs font-medium text-slate-300 border border-slate-700/50">
                        {TYPE_ICONS[type] || <Beaker className="w-3.5 h-3.5" />}
                        <span>{TYPE_LABELS[type] || type}: {count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Test Cases List */}
                <div className="space-y-3">
                  {suite.test_cases?.map((tc, idx) => (
                    <div
                      key={tc.test_id || idx}
                      className="bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden transition-all hover:border-slate-600/50"
                    >
                      {/* Case Header */}
                      <button
                        onClick={() => toggleCase(tc.test_id)}
                        className="w-full text-left px-5 py-4 flex items-center space-x-3"
                      >
                        {expandedCase === tc.test_id
                          ? <ChevronDown className="w-4 h-4 text-dark-400 flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-dark-400 flex-shrink-0" />}
                        {TYPE_ICONS[tc.scenario_type] || <Beaker className="w-4 h-4 text-dark-400" />}
                        <span className="text-sm font-medium text-white flex-1">{tc.title}</span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${SEVERITY_COLORS[tc.severity] || SEVERITY_COLORS.minor}`}>
                          {tc.severity}
                        </span>
                        <span className="text-xs text-dark-500 font-mono">{tc.test_id}</span>
                      </button>

                      {/* Expanded Case Details */}
                      {expandedCase === tc.test_id && (
                        <div className="px-5 pb-5 pt-0 border-t border-dark-800">
                          {/* Tags */}
                          {tc.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                              {tc.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-dark-800 rounded text-xs text-dark-400 font-mono">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Preconditions */}
                          {tc.preconditions?.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Preconditions</h4>
                              <ul className="space-y-1">
                                {tc.preconditions.map((pre, i) => (
                                  <li key={i} className="text-sm text-dark-300 flex items-start space-x-2">
                                    <span className="text-violet-400 mt-0.5">ÔÇó</span>
                                    <span>{pre}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Steps Table */}
                          <div className="overflow-x-auto rounded-lg border border-dark-800">
                            <table className="w-full text-sm">
                              <thead className="bg-dark-900">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-dark-400 w-12">#</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-dark-400">Action</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-dark-400 w-32">Input</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-dark-400">Expected Result</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-dark-800">
                                {tc.steps?.map((step) => (
                                  <tr key={step.step_number} className="hover:bg-dark-900/50">
                                    <td className="px-3 py-2.5 text-dark-500 font-mono text-xs">{step.step_number}</td>
                                    <td className="px-3 py-2.5 text-dark-200">{step.action}</td>
                                    <td className="px-3 py-2.5 text-dark-400 font-mono text-xs">{step.input_data || 'ÔÇö'}</td>
                                    <td className="px-3 py-2.5 text-emerald-400/80">{step.expected_result}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Gherkin Preview */}
                          {tc.gherkin && (
                            <div className="mt-4">
                              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Gherkin</h4>
                              <pre className="bg-dark-900 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap border border-dark-800">
                                {tc.gherkin}
                              </pre>
                            </div>
                          )}

                          {/* Pytest Code Preview */}
                          {tc.pytest_code && (
                            <div className="mt-4">
                              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Pytest Code</h4>
                              <pre className="bg-dark-900 rounded-lg p-4 text-xs text-sky-300 font-mono overflow-x-auto whitespace-pre-wrap border border-dark-800">
                                {tc.pytest_code}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {!suite && !loading && (
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-16 text-center">
                <div className="w-20 h-20 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Beaker className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No test cases yet</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Enter a user story on the left and click Generate. The AI will produce comprehensive
                  test cases with happy paths, edge cases, and negative scenarios.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History View */
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="card-dark rounded-2xl p-12 text-center">
              <Clock className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No history yet</h3>
              <p className="text-dark-400 text-sm">Generated test suites will appear here.</p>
            </div>
          ) : (
            history.map((s) => (
              <div
                key={s.suite_id || s.id}
                onClick={() => {
                  if (!s.suite_data) return;
                  setSuite({ ...s.suite_data, _history_id: s._history_id });
                  setRunStatus(s.last_run || null);
                  setActiveView('generate');
                }}
                className="card-dark rounded-xl p-5 flex items-center justify-between hover:border-dark-600 transition-all cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-white font-medium">{s.component || 'Test Suite'}</span>
                    <span className="text-xs text-dark-500 font-mono">{s.suite_id || s.id}</span>
                  </div>
                  <p className="text-dark-400 text-sm truncate max-w-xl">
                    {s.user_story?.substring(0, 120) ||
                      s.generation_payload?.user_story?.substring(0, 120) ||
                      'No story'}
                  </p>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-xs text-dark-500">{s.total_cases || 0} cases</span>
                    <span className="text-xs text-dark-600">ÔÇó</span>
                    <span className="text-xs text-dark-500">{s.format || 'gherkin'}</span>
                    <span className="text-xs text-dark-600">ÔÇó</span>
                    <span className="text-xs text-dark-500">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                    {s.last_run?.status && (
                      <>
                        <span className="text-xs text-dark-600">ÔÇó</span>
                        <span
                          className={`text-xs ${s.last_run.conclusion === 'success'
                            ? 'text-emerald-400'
                            : s.last_run.conclusion === 'failure'
                              ? 'text-red-400'
                              : 'text-violet-400'
                            }`}
                        >
                          Last run: {s.last_run.status}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleExport(s.suite_id, 'json');
                    }}
                    className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-white transition-colors"
                    title="Export JSON"
                    disabled={!s.suite_id}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeSuite(s.suite_id, s._history_id);
                    }}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TestGenerationTab;
