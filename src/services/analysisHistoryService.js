import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = 'analysisHistory';

/**
 * Save an AI analysis to history
 */
export const saveAnalysisToHistory = async (projectId, analysisData) => {
  try {
    const historyEntry = {
      projectId,
      timestamp: Timestamp.now(),
      overallRisk: analysisData.overallRisk,
      criticalIssues: analysisData.criticalIssues,
      suggestions: analysisData.suggestions,
      optimizations: analysisData.optimizations,
      backendData: analysisData.backendData,
      taskCount: analysisData.suggestions?.length || 0
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), historyEntry);
    return docRef.id;
  } catch (error) {
    console.error('Error saving analysis to history:', error);
    throw error;
  }
};

/**
 * Get analysis history for a project
 */
export const getProjectAnalysisHistory = async (projectId) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    throw error;
  }
};

/**
 * Get a specific analysis from history
 */
export const getAnalysisById = async (analysisId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, analysisId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: docSnap.data().timestamp?.toDate()
      };
    } else {
      throw new Error('Analysis not found');
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    throw error;
  }
};

/**
 * Delete an analysis from history
 */
export const deleteAnalysisFromHistory = async (analysisId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, analysisId));
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
};

