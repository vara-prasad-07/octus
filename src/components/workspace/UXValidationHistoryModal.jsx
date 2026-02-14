import { useState, useEffect } from 'react';
import { getProjectUXValidations } from '../../services/uxValidationService';

const UXValidationHistoryModal = ({ projectId, isOpen, onClose }) => {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedValidation, setSelectedValidation] = useState(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadValidations();
    }
  }, [isOpen, projectId]);

  const loadValidations = async () => {
    try {
      setLoading(true);
      const data = await getProjectUXValidations(projectId);
      setValidations(data);
    } catch (error) {
      console.error('Error loading validations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidationClick = (validation) => {
    setSelectedValidation(validation);
  };

  const handleBack = () => {
    setSelectedValidation(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {selectedValidation && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-white">
              {selectedValidation ? 'Validation Report' : 'Validation History'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : selectedValidation ? (
            <ValidationDetailView validation={selectedValidation} />
          ) : (
            <ValidationListView validations={validations} onSelect={handleValidationClick} />
          )}
        </div>
      </div>
    </div>
  );
};

// List View Component
const ValidationListView = ({ validations, onSelect }) => {
  if (validations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Validation History</h3>
        <p className="text-gray-400">Upload UX flow screens to create your first validation report.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {validations.map((validation) => (
        <div
          key={validation.id}
          onClick={() => onSelect(validation)}
          className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer group"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="text-sm text-gray-400 mb-1">
                {validation.createdAt?.toDate().toLocaleDateString()} at{' '}
                {validation.createdAt?.toDate().toLocaleTimeString()}
              </div>
              <div className="text-lg font-semibold text-white">
                {validation.screenCount} Screens
              </div>
            </div>
            {validation.validationResults?.overall_assessment && (
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">
                  {validation.validationResults.overall_assessment.flow_quality_score}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {validation.images?.slice(0, 4).map((img) => (
              <div key={img.order} className="relative flex-shrink-0">
                <img
                  src={img.url}
                  alt={`Screen ${img.order + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-600 group-hover:border-blue-500 transition-colors"
                />
                <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {img.order + 1}
                </div>
              </div>
            ))}
            {validation.images?.length > 4 && (
              <div className="w-16 h-16 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-sm font-semibold">
                +{validation.images.length - 4}
              </div>
            )}
          </div>

          {/* Status Badge */}
          {validation.validationResults?.overall_assessment?.severity && (
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                validation.validationResults.overall_assessment.severity === 'good'
                  ? 'bg-green-500/20 text-green-400'
                  : validation.validationResults.overall_assessment.severity === 'warning'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {validation.validationResults.overall_assessment.severity.toUpperCase()}
            </span>
          )}

          {/* View Arrow */}
          <div className="mt-4 flex items-center justify-end text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
            View Report
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

// Detail View Component
const ValidationDetailView = ({ validation }) => {
  // The backend returns data wrapped in validation_report
  // Try multiple possible field names for the results
  let results = validation.validationResults;
  
  // If validationResults exists but is wrapped, unwrap it
  if (results && results.validation_report) {
    results = results.validation_report;
  }
  
  // Debug logging
  console.log('ValidationDetailView - validation:', validation);
  console.log('ValidationDetailView - results:', results);
  console.log('ValidationDetailView - all keys:', Object.keys(validation));

  if (!results || !results.overall_assessment) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 mb-4">No validation results available</div>
          <div className="text-xs text-gray-500 text-left">
            <p className="mb-2">Debug Info:</p>
            <p>Available fields: {Object.keys(validation).join(', ')}</p>
            {validation.validationResults && (
              <p className="mt-2">validationResults keys: {Object.keys(validation.validationResults).join(', ')}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Images Gallery */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Flow Screens ({validation.screenCount})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {validation.images?.map((img) => (
            <div key={img.order} className="relative group">
              <img
                src={img.url}
                alt={`Screen ${img.order + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => window.open(img.url, '_blank')}
              />
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded">
                {img.order + 1}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
        
        {/* Scroll indicator */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          ↓ Scroll down to see validation analysis ↓
        </div>
      </div>

      {/* Overall Assessment */}
      {results?.overall_assessment && (
        <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Overall Assessment</h3>
            <div className="flex items-center gap-4">
              <span
                className={`px-4 py-2 rounded-lg font-semibold ${
                  results.overall_assessment.severity === 'good'
                    ? 'bg-green-500/20 text-green-400'
                    : results.overall_assessment.severity === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {results.overall_assessment.severity?.toUpperCase()}
              </span>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-400">
                  {results.overall_assessment.flow_quality_score}
                </div>
                <div className="text-xs text-gray-400">Quality Score</div>
              </div>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed">{results.overall_assessment.summary}</p>
        </div>
      )}

      {/* Flow Analysis */}
      {results?.flow_analysis && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Flow Analysis</h3>

          {results.flow_analysis.logical_order && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    results.flow_analysis.logical_order.is_correct ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></span>
                <h4 className="font-semibold text-white">Logical Order</h4>
              </div>
              <p className="text-gray-300 text-sm ml-5">{results.flow_analysis.logical_order.description}</p>
              {results.flow_analysis.logical_order.issues?.length > 0 && (
                <div className="ml-5 mt-2 space-y-1">
                  {results.flow_analysis.logical_order.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/10 p-2 rounded">
                      <span>⚠️</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.flow_analysis.screen_transitions?.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-3">Screen Transitions</h4>
              <div className="space-y-2">
                {results.flow_analysis.screen_transitions.map((transition, idx) => (
                  <div key={idx} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">
                        Screen {transition.from_screen} → Screen {transition.to_screen}
                      </span>
                      <span className="text-sm text-gray-400">({transition.transition_type})</span>
                      {transition.is_smooth && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Smooth</span>
                      )}
                    </div>
                    {transition.issues?.length > 0 && (
                      <div className="space-y-1">
                        {transition.issues.map((issue, i) => (
                          <p key={i} className="text-sm text-gray-400 ml-4">
                            • {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen by Screen Analysis */}
      {results?.screen_by_screen_analysis?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Screen by Screen Analysis</h3>
          <div className="space-y-4">
            {results.screen_by_screen_analysis.map((screen, idx) => (
              <div key={idx} className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded">{screen.screen_index}</span>
                  <h4 className="font-semibold text-white">{screen.screen_title}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  {screen.fields_present?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-green-400 mb-1">✓ Fields Present</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {screen.fields_present.map((field, i) => (
                          <li key={i}>• {field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {screen.missing_fields?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-red-400 mb-1">✗ Missing Fields</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {screen.missing_fields.map((field, i) => (
                          <li key={i}>• {field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {screen.issues?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-semibold text-white mb-2">Issues</h5>
                    <div className="space-y-2">
                      {screen.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`text-sm p-2 rounded ${
                            issue.severity === 'high'
                              ? 'bg-red-500/20 text-red-300'
                              : issue.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          <span className="font-semibold">{issue.type}:</span> {issue.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {screen.recommendations?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">💡 Recommendations</h5>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {screen.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consistency Check */}
      {results?.consistency_check && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Consistency Check</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.consistency_check.visual_consistency && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      results.consistency_check.visual_consistency.is_consistent ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></span>
                  <h4 className="font-semibold text-white">Visual</h4>
                </div>
                {results.consistency_check.visual_consistency.issues?.length > 0 && (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {results.consistency_check.visual_consistency.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {results.consistency_check.navigation_consistency && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      results.consistency_check.navigation_consistency.is_consistent ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></span>
                  <h4 className="font-semibold text-white">Navigation</h4>
                </div>
                {results.consistency_check.navigation_consistency.issues?.length > 0 && (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {results.consistency_check.navigation_consistency.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {results.consistency_check.branding_consistency && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      results.consistency_check.branding_consistency.is_consistent ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></span>
                  <h4 className="font-semibold text-white">Branding</h4>
                </div>
                {results.consistency_check.branding_consistency.issues?.length > 0 && (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {results.consistency_check.branding_consistency.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {results?.recommendations?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Key Recommendations</h3>
          <div className="space-y-3">
            {results.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`border-l-4 p-4 rounded ${
                  rec.priority === 'high'
                    ? 'border-red-500 bg-red-500/10'
                    : rec.priority === 'medium'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-blue-500 bg-blue-500/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {rec.priority?.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-gray-300">{rec.category}</span>
                </div>
                <p className="text-sm text-gray-300">{rec.description}</p>
                {rec.affected_screens?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Affects screens: {rec.affected_screens.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Journey Assessment */}
      {results?.user_journey_assessment && (
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-700/50">
          <h3 className="text-lg font-bold text-white mb-4">User Journey Assessment</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {results.user_journey_assessment.clarity}
              </div>
              <div className="text-sm text-gray-400">Clarity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {results.user_journey_assessment.ease_of_use}
              </div>
              <div className="text-sm text-gray-400">Ease of Use</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {results.user_journey_assessment.completion_likelihood}
              </div>
              <div className="text-sm text-gray-400">Completion Likelihood</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {results.user_journey_assessment.strengths?.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-400 mb-2">✓ Strengths</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  {results.user_journey_assessment.strengths.map((strength, i) => (
                    <li key={i}>• {strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {results.user_journey_assessment.pain_points?.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-400 mb-2">⚠️ Pain Points</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  {results.user_journey_assessment.pain_points.map((point, i) => (
                    <li key={i}>• {point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing Steps */}
      {results?.missing_steps?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Missing Steps</h3>
          <div className="space-y-3">
            {results.missing_steps.map((step, idx) => (
              <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="font-semibold text-white mb-1">
                  After Screen {step.after_screen}: {step.suggested_screen}
                </div>
                <p className="text-sm text-gray-300">{step.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UXValidationHistoryModal;
