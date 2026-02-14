import { useState, useEffect } from 'react';
import { getProjectUXValidations } from '../../services/uxValidationService';

/**
 * Component to display UX validation history for a project
 * Usage: <UXValidationHistory projectId={projectId} />
 */
const UXValidationHistory = ({ projectId }) => {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadValidations();
  }, [projectId]);

  const loadValidations = async () => {
    try {
      setLoading(true);
      const data = await getProjectUXValidations(projectId);
      setValidations(data);
    } catch (err) {
      console.error('Error loading validations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading validation history: {error}
      </div>
    );
  }

  if (validations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        No validation history yet. Upload UX flow screens to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Validation History</h3>
      
      {validations.map((validation) => (
        <div
          key={validation.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-900">
                {validation.screenCount} Screens Validated
              </div>
              <div className="text-sm text-gray-500">
                {validation.createdAt?.toDate().toLocaleString()}
              </div>
            </div>
            
            {validation.validationResults?.overall_assessment && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  validation.validationResults.overall_assessment.severity === 'good'
                    ? 'bg-green-100 text-green-700'
                    : validation.validationResults.overall_assessment.severity === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                Score: {validation.validationResults.overall_assessment.flow_quality_score}
              </span>
            )}
          </div>

          {/* Image Thumbnails */}
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {validation.images?.map((img) => (
              <div key={img.order} className="relative flex-shrink-0">
                <img
                  src={img.url}
                  alt={`Screen ${img.order + 1}`}
                  className="w-20 h-20 object-cover rounded border border-gray-200"
                />
                <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {img.order + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {validation.validationResults?.overall_assessment?.summary && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {validation.validationResults.overall_assessment.summary}
            </p>
          )}

          {/* View Details Button */}
          <button
            onClick={() => {
              // You can implement a modal or navigation to full results
              console.log('View validation:', validation);
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Full Report →
          </button>
        </div>
      ))}
    </div>
  );
};

export default UXValidationHistory;
