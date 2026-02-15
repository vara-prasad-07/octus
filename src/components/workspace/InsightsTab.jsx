import { useState } from 'react';
import { getProjectInsights } from '../../services/insightsService';

const InsightsTab = () => {
  const [showInsights, setShowInsights] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Feature completion status - replace with actual state from your app
  const features = [
    { id: 1, name: 'Planning & Task Management', completed: true },
    { id: 2, name: 'Test Generation', completed: true },
    { id: 3, name: 'Visual QA & Validation', completed: true }
  ];

  const allFeaturesCompleted = features.every(f => f.completed);

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const insights = await getProjectInsights();
      setInsightsData(insights);
      setShowInsights(true);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError(err.message || 'Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Default values if insights data is not loaded yet
  const defect_trends = insightsData?.defect_trends || { trend: 'stable', summary: '' };
  const hotspots = insightsData?.hotspots || [];
  const release_readiness = insightsData?.release_readiness || { score: 0, decision: 'PENDING', reasoning: [] };
  const recommendation = insightsData?.recommendation || '';
  const readinessScore = release_readiness.score;
  const isBlocked = release_readiness.decision === "BLOCK";

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  // If insights not shown yet, display checklist
  if (!showInsights) {
    return (
      <div className="p-8 bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Complete Your Workflow</h2>
            <p className="text-gray-400">Finish all steps to unlock release insights</p>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 mb-6">
            <div className="space-y-4">
              {features.map((feature) => (
                <div 
                  key={feature.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                    feature.completed 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-gray-800/50 border border-gray-700/50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    feature.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {feature.completed ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{feature.id}</span>
                    )}
                  </div>
                  <span className={`text-lg font-medium ${
                    feature.completed ? 'text-white' : 'text-gray-400'
                  }`}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {allFeaturesCompleted && (
            <div className="text-center">
              <button
                onClick={handleGenerateInsights}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center space-x-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Insights...</span>
                    </>
                  ) : (
                    <>
                      <span>Know Your Insights</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {!allFeaturesCompleted && (
            <div className="text-center">
              <p className="text-gray-500 text-sm">Complete all features to view insights</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show insights dashboard
  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Release Insights</h2>
        <button
          onClick={() => setShowInsights(false)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
        >
          ← Back to Checklist
        </button>
      </div>

      {/* Release Readiness Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Readiness Score Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-4">Release Readiness Score</div>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#1f2937"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={readinessScore >= 80 ? '#10b981' : readinessScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(readinessScore / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-3xl font-bold text-white">{readinessScore}%</div>
            </div>
            <div className={`mt-4 px-4 py-2 rounded-lg font-semibold ${
              isBlocked 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {isBlocked ? '🚫 BLOCKED' : '✅ Ready to Release'}
            </div>
          </div>
        </div>

        {/* AI Recommendation Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/20 p-6">
          <div className="flex items-start space-x-3">
            <div className="text-3xl">🤖</div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-2">AI Recommendation</div>
              <p className="text-sm text-gray-300 mb-4">
                {recommendation || 'No recommendation available'}
              </p>
              {release_readiness.reasoning && release_readiness.reasoning.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 font-medium mb-2">Key Factors:</div>
                  {release_readiness.reasoning.map((reason, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span className="text-gray-300">{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Defect Trends & Hotspots Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Defect Trend Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Defect Trends</h3>
            <span className="text-2xl">{getTrendIcon(defect_trends.trend)}</span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${
            defect_trends.trend === 'increasing' 
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : defect_trends.trend === 'decreasing'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {defect_trends.trend.toUpperCase()}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            {defect_trends.summary || 'No trend data available'}
          </p>
        </div>

        {/* Module Hotspots Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Module Hotspots</h3>
          {hotspots && hotspots.length > 0 ? (
            <div className="space-y-3">
              {hotspots.map((hotspot, idx) => (
                <div 
                  key={idx} 
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{hotspot.module}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(hotspot.severity)}`}>
                      {hotspot.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          hotspot.severity === 'critical' ? 'bg-red-500' :
                          hotspot.severity === 'high' ? 'bg-orange-500' :
                          hotspot.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((hotspot.defect_count / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-300 min-w-[3rem] text-right">
                      {hotspot.defect_count} {hotspot.defect_count === 1 ? 'defect' : 'defects'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-sm">No hotspots detected</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Status */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Release Decision</h3>
          <div className="text-center py-4">
            <div className={`text-5xl mb-3 ${isBlocked ? 'text-red-400' : 'text-green-400'}`}>
              {isBlocked ? '🚫' : '✅'}
            </div>
            <div className={`text-2xl font-bold mb-2 ${isBlocked ? 'text-red-400' : 'text-green-400'}`}>
              {release_readiness.decision}
            </div>
            <div className="text-sm text-gray-400">
              Based on {release_readiness.reasoning?.length || 0} critical factors
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total Hotspots</span>
              <span className="text-white font-semibold text-lg">{hotspots?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Critical Issues</span>
              <span className="text-red-400 font-semibold text-lg">
                {hotspots?.filter(h => h.severity === 'critical').length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total Defects</span>
              <span className="text-orange-400 font-semibold text-lg">
                {hotspots?.reduce((sum, h) => sum + h.defect_count, 0) || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Trend Direction</span>
              <span className={`font-semibold text-lg ${
                defect_trends.trend === 'increasing' ? 'text-red-400' :
                defect_trends.trend === 'decreasing' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {getTrendIcon(defect_trends.trend)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Recommended Actions</h3>
          <div className="space-y-3">
            {hotspots && hotspots.length > 0 ? (
              <>
                {hotspots.filter(h => h.severity === 'critical').length > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-red-400 mt-0.5">⚠️</span>
                    <span className="text-sm text-gray-300">Fix critical defects immediately</span>
                  </div>
                )}
                {hotspots.filter(h => h.severity === 'high').length > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-400 mt-0.5">🔧</span>
                    <span className="text-sm text-gray-300">Address high-priority issues</span>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-0.5">📊</span>
                  <span className="text-sm text-gray-300">Re-run validation tests</span>
                </div>
                {defect_trends.trend === 'increasing' && (
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-400 mt-0.5">🔍</span>
                    <span className="text-sm text-gray-300">Investigate defect trend causes</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm">All systems looking good!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
