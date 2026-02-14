import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImagesToCloudinary, saveUXValidation, saveUIValidation } from '../../services/uxValidationService';
import ValidationProgress from './ValidationProgress';
import VisualRegressionResults from './VisualRegressionResults';
import UIComparisonResults from './UIComparisonResults';
import UXValidationHistoryModal from './UXValidationHistoryModal';
import UIValidationHistoryModal from './UIValidationHistoryModal';

const VisualQATab = ({ projectId }) => {
  const { currentUser } = useAuth();
  const [activeMode, setActiveMode] = useState(null); // 'ux' or 'ui'
  const [uxScreens, setUxScreens] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUIHistoryModal, setShowUIHistoryModal] = useState(false);
  
  // UI validation states
  const [referenceUI, setReferenceUI] = useState(null);
  const [comparisonUI, setComparisonUI] = useState(null);
  const [progressChecks, setProgressChecks] = useState([]);
  const [visualRegressionResults, setVisualRegressionResults] = useState(null);
  const [uiComparisonResults, setUIComparisonResults] = useState(null);

  const handleGetStarted = (mode) => {
    setActiveMode(mode);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newScreens = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setUxScreens([...uxScreens, ...newScreens]);
  };

  const handleRemoveScreen = (id) => {
    setUxScreens(uxScreens.filter((screen) => screen.id !== id));
  };

  const handleValidateUX = async () => {
    if (uxScreens.length === 0) return;

    setIsValidating(true);

    try {
      // Step 1: Upload images to Cloudinary
      console.log('Uploading images to Cloudinary...');
      const uploadedImages = await uploadImagesToCloudinary(uxScreens);
      console.log('Images uploaded successfully:', uploadedImages);

      // Step 2: Convert images to base64 for backend validation
      const imagesWithOrder = await Promise.all(
        uxScreens.map(async (screen, index) => {
          const base64 = await fileToBase64(screen.file);
          return {
            index: index,
            image: base64,
          };
        })
      );

      const payload = {
        totalCount: uxScreens.length,
        images: imagesWithOrder,
      };

      // Step 3: Send to backend for validation
      console.log('Sending to backend for validation...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${backendUrl}/validateux`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('Validation result:', result);
      
      // Handle the response structure - the actual report is in validation_report
      const reportData = result.validation_report || result.report || result;
      
      console.log('Extracted report data:', reportData);
      console.log('Report data keys:', Object.keys(reportData || {}));
      
      // Step 4: Save to Firestore with Cloudinary URLs
      console.log('Saving to Firestore...');
      
      const validationData = {
        screenCount: uxScreens.length,
        images: uploadedImages, // Cloudinary URLs with order
        results: reportData, // This will be saved as validationResults in Firestore
      };
      
      console.log('Validation data structure:', {
        screenCount: validationData.screenCount,
        imagesCount: validationData.images?.length,
        resultsKeys: Object.keys(validationData.results || {})
      });

      const docId = await saveUXValidation(
        validationData,
        currentUser.uid,
        projectId
      );
      console.log('Saved to Firestore with ID:', docId);
      
      // Step 5: Store in localStorage for quick access
      const storageData = {
        id: docId,
        timestamp: new Date().toISOString(),
        screenCount: uxScreens.length,
        images: uploadedImages,
        results: reportData,
      };
      
      // Get existing reports from localStorage
      const existingReports = JSON.parse(localStorage.getItem('uxValidationReports') || '[]');
      
      // Add new report to the beginning
      existingReports.unshift(storageData);
      
      // Keep only last 10 reports to avoid storage limits
      const reportsToStore = existingReports.slice(0, 10);
      
      // Save to localStorage
      localStorage.setItem('uxValidationReports', JSON.stringify(reportsToStore));
      
      // Set the actual report data for display
      setValidationResults(reportData);
      
      console.log('UX Validation completed successfully!');
    } catch (error) {
      console.error('Error validating UX:', error);
      alert(`Error validating UX: ${error.message}. Please try again.`);
    } finally {
      setIsValidating(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReferenceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceUI({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleComparisonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setComparisonUI({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleGetReport = async () => {
    if (!referenceUI || !comparisonUI) {
      alert('Please upload both reference and comparison UI images');
      return;
    }

    setIsValidating(true);
    setVisualRegressionResults(null);
    setUIComparisonResults(null);

    // Initialize progress checks - both are compulsory
    const checks = [
      {
        id: 'visualRegressions',
        title: '1. Detect visual regressions',
        description: 'Checking for broken elements or overlap in UI',
        status: 'pending'
      },
      {
        id: 'missingElements',
        title: '2. Missing elements / layout shifts',
        description: 'Checking for missing elements and layout shifts',
        status: 'pending'
      }
    ];
    setProgressChecks(checks);

    let visualRegressionData = null;
    let uiComparisonData = null;

    try {
      const comparisonBase64 = await fileToBase64(comparisonUI.file);

      // Step 1: Visual Regressions Check (Compulsory)
      setProgressChecks(prev => prev.map(check => 
        check.id === 'visualRegressions' 
          ? { ...check, status: 'loading' } 
          : check
      ));

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${backendUrl}/visualregressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: comparisonBase64,
          }),
        });

        const result = await response.json();
        console.log('Visual Regression result:', result);
        visualRegressionData = result;
        setVisualRegressionResults(result);

        setProgressChecks(prev => prev.map(check => 
          check.id === 'visualRegressions' 
            ? { ...check, status: 'completed' } 
            : check
        ));
      } catch (error) {
        console.error('Error in visual regressions check:', error);
        alert('Error checking visual regressions. Please try again.');
        setIsValidating(false);
        return;
      }

      // Step 2: UI Comparison Check (Compulsory)
      setProgressChecks(prev => prev.map(check => 
        check.id === 'missingElements' 
          ? { ...check, status: 'loading' } 
          : check
      ));

      try {
        const formData = new FormData();
        formData.append('baseline_image', referenceUI.file);
        formData.append('comparison_image', comparisonUI.file);
        formData.append('tolerance', '5');
        formData.append('test_description', 'UI comparison for missing elements and layout shifts');

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${backendUrl}/uicomparison`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        console.log('UI Comparison result:', result);
        uiComparisonData = result;
        setUIComparisonResults(result);

        setProgressChecks(prev => prev.map(check => 
          check.id === 'missingElements' 
            ? { ...check, status: 'completed' } 
            : check
        ));
      } catch (error) {
        console.error('Error in UI comparison check:', error);
        alert('Error checking missing elements. Please try again.');
        setIsValidating(false);
        return;
      }

      // Step 3: Upload images to Cloudinary
      console.log('Uploading images to Cloudinary...');
      const referenceImageData = await uploadImagesToCloudinary([{ file: referenceUI.file }]);
      const comparisonImageData = await uploadImagesToCloudinary([{ file: comparisonUI.file }]);
      
      console.log('Images uploaded successfully');

      // Step 4: Save to Firestore
      console.log('Saving UI validation to Firestore...');
      const checksPerformed = ['visualRegressions', 'missingElements']; // Both are compulsory

      const validationData = {
        referenceImage: referenceImageData[0],
        comparisonImage: comparisonImageData[0],
        visualRegressionResults: visualRegressionData,
        uiComparisonResults: uiComparisonData,
        checksPerformed: checksPerformed,
      };

      const docId = await saveUIValidation(
        validationData,
        currentUser.uid,
        projectId
      );
      console.log('Saved to Firestore with ID:', docId);

    } catch (error) {
      console.error('Error validating UI:', error);
      alert('Error validating UI. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  if (activeMode === 'ui') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8">
          {/* Header with History Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Validate User Interface</h2>
            <button
              onClick={() => setShowUIHistoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 hover:border-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          </div>
          
          {/* Upload Sections */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Reference UI Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Reference UI</h3>
              <label className="block">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-700">
                  {referenceUI ? (
                    <div className="relative">
                      <img
                        src={referenceUI.preview}
                        alt="Reference UI"
                        className="w-full h-48 object-contain rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setReferenceUI(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">­ƒô©</div>
                      <div className="text-sm text-gray-300 mb-1">Upload Reference UI</div>
                      <div className="text-xs text-gray-400">Click to upload or drag and drop</div>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleReferenceUpload}
                  />
                </div>
              </label>
            </div>

            {/* Comparison UI Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Comparison UI</h3>
              <label className="block">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-700">
                  {comparisonUI ? (
                    <div className="relative">
                      <img
                        src={comparisonUI.preview}
                        alt="Comparison UI"
                        className="w-full h-48 object-contain rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setComparisonUI(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">­ƒô©</div>
                      <div className="text-sm text-gray-300 mb-1">Upload Comparison UI</div>
                      <div className="text-xs text-gray-400">Click to upload or drag and drop</div>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleComparisonUpload}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Checks Info - Only show if not validating */}
          {!isValidating && progressChecks.length === 0 && (
            <>
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Validation Checks</h3>
                <div className="space-y-4">
                  {/* Visual Regressions Check */}
                  <div className="border-2 border-gray-600 rounded-lg p-4 bg-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">1. Detect visual regressions</h4>
                        <p className="text-sm text-gray-300">Wanna check any broken elements or overlap in UI?</p>
                      </div>
                    </div>
                  </div>

                  {/* Missing Elements Check */}
                  <div className="border-2 border-gray-600 rounded-lg p-4 bg-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">2. Missing elements / layout shifts</h4>
                        <p className="text-sm text-gray-300">Wanna check missing elements / layout shifts?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Get Report Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGetReport}
                  disabled={!referenceUI || !comparisonUI}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Get Report
                </button>
              </div>
            </>
          )}

          {/* Progress Indicator */}
          {progressChecks.length > 0 && (
            <ValidationProgress checks={progressChecks} />
          )}

          {/* Validation Results */}
          {(visualRegressionResults || uiComparisonResults) && (
            <div className="mt-8 space-y-8">
              {/* Visual Regression Results */}
              {visualRegressionResults && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Visual Regression Analysis</h2>
                  <VisualRegressionResults results={visualRegressionResults} />
                </div>
              )}

              {/* UI Comparison Results */}
              {uiComparisonResults && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">UI Comparison Analysis</h2>
                  <UIComparisonResults results={uiComparisonResults} />
                </div>
              )}

              {/* Reset Button */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => {
                    setActiveMode(null);
                    setReferenceUI(null);
                    setComparisonUI(null);
                    setProgressChecks([]);
                    setVisualRegressionResults(null);
                    setUIComparisonResults(null);
                  }}
                  className="bg-gray-700 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Start New Validation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* UI History Modal */}
        <UIValidationHistoryModal
          projectId={projectId}
          isOpen={showUIHistoryModal}
          onClose={() => setShowUIHistoryModal(false)}
        />
      </div>
    );
  }

  if (activeMode === 'ux') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8">
          {/* Header with History Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Upload UX Flow Screens</h2>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 hover:border-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          </div>
          
          {/* Upload Area */}
          <div className="mb-6">
            <label className="block mb-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-700">
                <div className="text-4xl mb-2">­ƒô©</div>
                <div className="text-sm text-gray-300 mb-1">Click to upload or drag and drop</div>
                <div className="text-xs text-gray-400">Upload screens in order from start to end</div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </div>
            </label>
          </div>

          {/* Preview Section */}
          {uxScreens.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Uploaded Screens ({uxScreens.length})
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                {uxScreens.map((screen, index) => (
                  <div key={screen.id} className="relative group">
                    <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-700">
                      <img
                        src={screen.preview}
                        alt={`Screen ${index + 1}`}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => handleRemoveScreen(screen.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ô£ò
                    </button>
                  </div>
                ))}
              </div>

              {/* Validate Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleValidateUX}
                  disabled={isValidating}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? 'Validating...' : 'Validate UX'}
                </button>
              </div>
            </>
          )}

          {/* Validation Results */}
          {validationResults && (
            <div className="mt-8 space-y-6">
              {/* Overall Assessment */}
              {validationResults.overall_assessment && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Overall Assessment</h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-lg font-semibold ${
                        validationResults.overall_assessment.severity === 'good' 
                          ? 'bg-green-100 text-green-700'
                          : validationResults.overall_assessment.severity === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {validationResults.overall_assessment.severity?.toUpperCase()}
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {validationResults.overall_assessment.flow_quality_score}
                        </div>
                        <div className="text-xs text-gray-600">Quality Score</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {validationResults.overall_assessment.summary}
                  </p>
                </div>
              )}

              {/* Flow Analysis */}
              {validationResults.flow_analysis && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Flow Analysis</h3>
                  
                  {validationResults.flow_analysis.logical_order && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${
                          validationResults.flow_analysis.logical_order.is_correct 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}></span>
                        <h4 className="font-semibold text-gray-900">Logical Order</h4>
                      </div>
                      <p className="text-gray-600 text-sm ml-5">
                        {validationResults.flow_analysis.logical_order.description}
                      </p>
                      {validationResults.flow_analysis.logical_order.issues?.length > 0 && (
                        <div className="ml-5 mt-2">
                          {validationResults.flow_analysis.logical_order.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded mt-1">
                              <span>ÔÜá´©Å</span>
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Screen Transitions */}
                  {validationResults.flow_analysis.screen_transitions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Screen Transitions</h4>
                      <div className="space-y-2">
                        {validationResults.flow_analysis.screen_transitions.map((transition, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                Screen {transition.from_screen} ÔåÆ Screen {transition.to_screen}
                              </span>
                              <span className="text-sm text-gray-600">({transition.transition_type})</span>
                              {transition.is_smooth && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Smooth</span>
                              )}
                            </div>
                            {transition.issues?.length > 0 && (
                              <div className="space-y-1">
                                {transition.issues.map((issue, i) => (
                                  <p key={i} className="text-sm text-gray-600 ml-4">ÔÇó {issue}</p>
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
              {validationResults.screen_by_screen_analysis?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Screen by Screen Analysis</h3>
                  <div className="space-y-4">
                    {validationResults.screen_by_screen_analysis.map((screen, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded">
                            {screen.screen_index}
                          </span>
                          <h4 className="font-semibold text-gray-900">{screen.screen_title}</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          {screen.fields_present?.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-green-700 mb-1">Ô£ô Fields Present</h5>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {screen.fields_present.map((field, i) => (
                                  <li key={i}>ÔÇó {field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {screen.missing_fields?.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-red-700 mb-1">Ô£ù Missing Fields</h5>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {screen.missing_fields.map((field, i) => (
                                  <li key={i}>ÔÇó {field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {screen.issues?.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">Issues</h5>
                            <div className="space-y-2">
                              {screen.issues.map((issue, i) => (
                                <div key={i} className={`text-sm p-2 rounded ${
                                  issue.severity === 'high' 
                                    ? 'bg-red-50 text-red-700'
                                    : issue.severity === 'medium'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}>
                                  <span className="font-semibold">{issue.type}:</span> {issue.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {screen.recommendations?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">­ƒÆí Recommendations</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {screen.recommendations.map((rec, i) => (
                                <li key={i}>ÔÇó {rec}</li>
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
              {validationResults.consistency_check && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Consistency Check</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {validationResults.consistency_check.visual_consistency && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-3 h-3 rounded-full ${
                            validationResults.consistency_check.visual_consistency.is_consistent 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></span>
                          <h4 className="font-semibold text-gray-900">Visual</h4>
                        </div>
                        {validationResults.consistency_check.visual_consistency.issues?.length > 0 && (
                          <ul className="text-sm text-gray-600 space-y-1">
                            {validationResults.consistency_check.visual_consistency.issues.map((issue, i) => (
                              <li key={i}>ÔÇó {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {validationResults.consistency_check.navigation_consistency && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-3 h-3 rounded-full ${
                            validationResults.consistency_check.navigation_consistency.is_consistent 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></span>
                          <h4 className="font-semibold text-gray-900">Navigation</h4>
                        </div>
                        {validationResults.consistency_check.navigation_consistency.issues?.length > 0 && (
                          <ul className="text-sm text-gray-600 space-y-1">
                            {validationResults.consistency_check.navigation_consistency.issues.map((issue, i) => (
                              <li key={i}>ÔÇó {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {validationResults.consistency_check.branding_consistency && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-3 h-3 rounded-full ${
                            validationResults.consistency_check.branding_consistency.is_consistent 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></span>
                          <h4 className="font-semibold text-gray-900">Branding</h4>
                        </div>
                        {validationResults.consistency_check.branding_consistency.issues?.length > 0 && (
                          <ul className="text-sm text-gray-600 space-y-1">
                            {validationResults.consistency_check.branding_consistency.issues.map((issue, i) => (
                              <li key={i}>ÔÇó {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {validationResults.recommendations?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Key Recommendations</h3>
                  <div className="space-y-3">
                    {validationResults.recommendations.map((rec, idx) => (
                      <div key={idx} className={`border-l-4 p-4 rounded ${
                        rec.priority === 'high'
                          ? 'border-red-500 bg-red-50'
                          : rec.priority === 'medium'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            rec.priority === 'high'
                              ? 'bg-red-200 text-red-800'
                              : rec.priority === 'medium'
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}>
                            {rec.priority?.toUpperCase()}
                          </span>
                          <span className="text-sm font-semibold text-gray-700">{rec.category}</span>
                        </div>
                        <p className="text-sm text-gray-700">{rec.description}</p>
                        {rec.affected_screens?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Affects screens: {rec.affected_screens.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Journey Assessment */}
              {validationResults.user_journey_assessment && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">User Journey Assessment</h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {validationResults.user_journey_assessment.clarity}
                      </div>
                      <div className="text-sm text-gray-600">Clarity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {validationResults.user_journey_assessment.ease_of_use}
                      </div>
                      <div className="text-sm text-gray-600">Ease of Use</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {validationResults.user_journey_assessment.completion_likelihood}
                      </div>
                      <div className="text-sm text-gray-600">Completion Likelihood</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {validationResults.user_journey_assessment.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2">Ô£ô Strengths</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {validationResults.user_journey_assessment.strengths.map((strength, i) => (
                            <li key={i}>ÔÇó {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResults.user_journey_assessment.pain_points?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">ÔÜá´©Å Pain Points</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {validationResults.user_journey_assessment.pain_points.map((point, i) => (
                            <li key={i}>ÔÇó {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Missing Steps */}
              {validationResults.missing_steps?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Missing Steps</h3>
                  <div className="space-y-3">
                    {validationResults.missing_steps.map((step, idx) => (
                      <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-1">
                          After Screen {step.after_screen}: {step.suggested_screen}
                        </div>
                        <p className="text-sm text-gray-700">{step.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History Modal */}
        <UXValidationHistoryModal
          projectId={projectId}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <div className="grid grid-cols-2 gap-6">
        {/* Validate UX Card */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-3">Validate UX</h2>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Validate User Experience?</h3>
          <p className="text-gray-300 mb-auto">
            Give your UI shots, we gonna handle the user flow with clear insights
          </p>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => handleGetStarted('ux')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Validate UI Card */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-3">Validate UI</h2>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Validate User Interface</h3>
          <p className="text-gray-300 mb-auto">
            Give your UI shots, we gonna handle user interface with clear insights
          </p>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => handleGetStarted('ui')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <UXValidationHistoryModal
        projectId={projectId}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </div>
  );
};

export default VisualQATab;
