import { useState, useEffect } from 'react';
import { getProjectUIValidations } from '../../services/uxValidationService';
import VisualRegressionResults from './VisualRegressionResults';
import UIComparisonResults from './UIComparisonResults';

const UIValidationHistoryModal = ({ projectId, isOpen, onClose }) => {
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
      const data = await getProjectUIValidations(projectId);
      setValidations(data);
    } catch (error) {
      console.error('Error loading UI validations:', error);
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
              {selectedValidation ? 'UI Validation Report' : 'UI Validation History'}
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
        <h3 className="text-lg font-semibold text-white mb-2">No UI Validation History</h3>
        <p className="text-gray-400">Upload reference and comparison UI images to create your first validation report.</p>
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
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">
              {validation.createdAt?.toDate().toLocaleDateString()} at{' '}
              {validation.createdAt?.toDate().toLocaleTimeString()}
            </div>
            <div className="text-lg font-semibold text-white">
              UI Validation
            </div>
          </div>

          {/* Image Comparison Preview */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {validation.referenceImage && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Reference</div>
                <img
                  src={validation.referenceImage.url}
                  alt="Reference UI"
                  className="w-full h-24 object-cover rounded border border-gray-600 group-hover:border-blue-500 transition-colors"
                />
              </div>
            )}
            {validation.comparisonImage && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Comparison</div>
                <img
                  src={validation.comparisonImage.url}
                  alt="Comparison UI"
                  className="w-full h-24 object-cover rounded border border-gray-600 group-hover:border-blue-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Checks Performed */}
          {validation.checksPerformed && validation.checksPerformed.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Checks Performed:</div>
              <div className="flex flex-wrap gap-2">
                {validation.checksPerformed.map((check, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
                  >
                    {check === 'visualRegressions' ? 'Visual Regressions' : 'Missing Elements'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View Arrow */}
          <div className="flex items-center justify-end text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
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
  return (
    <div className="space-y-6">
      {/* Images Section */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Compared Images</h3>
        <div className="grid grid-cols-2 gap-6">
          {validation.referenceImage && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Reference UI</h4>
              <img
                src={validation.referenceImage.url}
                alt="Reference UI"
                className="w-full rounded-lg border border-gray-600 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => window.open(validation.referenceImage.url, '_blank')}
              />
              <div className="text-xs text-gray-400 mt-2">
                {validation.referenceImage.width} × {validation.referenceImage.height}
              </div>
            </div>
          )}
          {validation.comparisonImage && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Comparison UI</h4>
              <img
                src={validation.comparisonImage.url}
                alt="Comparison UI"
                className="w-full rounded-lg border border-gray-600 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => window.open(validation.comparisonImage.url, '_blank')}
              />
              <div className="text-xs text-gray-400 mt-2">
                {validation.comparisonImage.width} × {validation.comparisonImage.height}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Regression Results */}
      {validation.visualRegressionResults && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Visual Regression Analysis</h2>
          <VisualRegressionResults results={validation.visualRegressionResults} />
        </div>
      )}

      {/* UI Comparison Results */}
      {validation.uiComparisonResults && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">UI Comparison Analysis</h2>
          <UIComparisonResults results={validation.uiComparisonResults} />
        </div>
      )}
    </div>
  );
};

export default UIValidationHistoryModal;
