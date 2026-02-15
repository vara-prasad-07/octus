import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateInsightsWithGemini } from './llm';

/**
 * Fetch ALL data from Firebase collections (no filtering)
 * @returns {Promise<Object>} Combined data from all collections
 */
export const fetchAllInsightsData = async () => {
  try {
    console.log('Fetching ALL insights data from collections...');

    // Fetch ALL documents from all three collections in parallel
    const [testGenSnapshot, uiValidationsSnapshot, uxValidationsSnapshot] = await Promise.all([
      getDocs(collection(db, 'testGenerationHistory')),
      getDocs(collection(db, 'uiValidations')),
      getDocs(collection(db, 'uxValidations'))
    ]);

    // Convert snapshots to arrays
    const testGenerationHistory = testGenSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const uiValidations = uiValidationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const uxValidations = uxValidationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched ALL data:', {
      testGenerationCount: testGenerationHistory.length,
      uiValidationsCount: uiValidations.length,
      uxValidationsCount: uxValidations.length
    });

    return {
      testGenerationHistory,
      uiValidations,
      uxValidations
    };
  } catch (error) {
    console.error('Error fetching insights data:', error);
    throw new Error('Failed to fetch data: ' + error.message);
  }
};

/**
 * Main function to fetch all data and generate insights using Gemini
 * @returns {Promise<Object>} Complete insights analysis
 */
export const getProjectInsights = async () => {
  try {
    // Step 1: Fetch ALL data from Firebase (no filtering)
    const allData = await fetchAllInsightsData();

    // Step 2: Generate insights using Gemini AI
    const insights = await generateInsightsWithGemini(allData);

    return insights;
  } catch (error) {
    console.error('Error in getProjectInsights:', error);
    throw error;
  }
};
