import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Upload images to Cloudinary
 * @param {Array} images - Array of image files
 * @returns {Promise<Array>} Array of uploaded image URLs with order
 */
export const uploadImagesToCloudinary = async (images) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file');
  }

  console.log('Cloudinary Config:', { cloudName, uploadPreset: uploadPreset.substring(0, 5) + '...' });

  const uploadPromises = images.map(async (imageData, index) => {
    const formData = new FormData();
    formData.append('file', imageData.file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'ux-validations');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Cloudinary error response:', data);
        
        // Provide helpful error messages
        if (data.error?.message) {
          if (data.error.message.includes('Upload preset')) {
            throw new Error(
              `Upload preset "${uploadPreset}" not found or not configured as unsigned. ` +
              `Please go to Cloudinary Settings > Upload > Add upload preset and set it to "Unsigned" mode.`
            );
          }
          throw new Error(`Cloudinary error: ${data.error.message}`);
        }
        
        throw new Error(`Failed to upload image ${index + 1}: ${response.status} ${response.statusText}`);
      }

      return {
        order: index,
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
      };
    } catch (error) {
      console.error(`Error uploading image ${index + 1}:`, error);
      throw error;
    }
  });

  return await Promise.all(uploadPromises);
};

/**
 * Save UX validation results to Firestore
 * @param {Object} validationData - The validation data to save
 * @param {string} userId - The user ID
 * @param {string} projectId - The project ID
 * @returns {Promise<string>} Document ID
 */
export const saveUXValidation = async (validationData, userId, projectId) => {
  try {
    console.log('saveUXValidation called with:', {
      userId,
      projectId,
      screenCount: validationData.screenCount,
      imagesCount: validationData.images?.length,
      resultsKeys: Object.keys(validationData.results || {})
    });
    
    const dataToSave = {
      projectId: projectId,
      userId: userId,
      screenCount: validationData.screenCount,
      images: validationData.images, // Array of {order, url, publicId}
      validationResults: validationData.results,
      createdAt: serverTimestamp(),
    };
    
    console.log('Data structure being saved to Firestore:', {
      projectId: dataToSave.projectId,
      userId: dataToSave.userId,
      screenCount: dataToSave.screenCount,
      imagesCount: dataToSave.images?.length,
      validationResultsKeys: Object.keys(dataToSave.validationResults || {})
    });
    
    const docRef = await addDoc(collection(db, 'uxValidations'), dataToSave);

    console.log('UX Validation saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving UX validation:', error);
    throw new Error('Failed to save UX validation: ' + error.message);
  }
};

/**
 * Get UX validations for a project
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Array of validation records
 */
export const getProjectUXValidations = async (projectId) => {
  try {
    // Simple query without orderBy to avoid index requirement
    // We'll sort in memory instead
    const q = query(
      collection(db, 'uxValidations'),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(q);
    const validations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort by createdAt in memory (newest first)
    return validations.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching UX validations:', error);
    
    // If still failing, return empty array instead of throwing
    console.warn('Returning empty array due to error');
    return [];
  }
};

/**
 * Get UX validations for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of validation records
 */
export const getUserUXValidations = async (userId) => {
  try {
    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, 'uxValidations'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const validations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort by createdAt in memory (newest first)
    return validations.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching user UX validations:', error);
    
    // Return empty array instead of throwing
    console.warn('Returning empty array due to error');
    return [];
  }
};

/**
 * Save UI validation results to Firestore
 * @param {Object} validationData - The validation data to save
 * @param {string} userId - The user ID
 * @param {string} projectId - The project ID
 * @returns {Promise<string>} Document ID
 */
export const saveUIValidation = async (validationData, userId, projectId) => {
  try {
    console.log('saveUIValidation called with:', {
      userId,
      projectId,
      hasReferenceImage: !!validationData.referenceImage,
      hasComparisonImage: !!validationData.comparisonImage,
      hasVisualRegressionResults: !!validationData.visualRegressionResults,
      hasUIComparisonResults: !!validationData.uiComparisonResults
    });
    
    const dataToSave = {
      projectId: projectId,
      userId: userId,
      referenceImage: validationData.referenceImage, // {url, publicId, format, width, height}
      comparisonImage: validationData.comparisonImage, // {url, publicId, format, width, height}
      visualRegressionResults: validationData.visualRegressionResults || null,
      uiComparisonResults: validationData.uiComparisonResults || null,
      checksPerformed: validationData.checksPerformed, // Array of check types performed
      createdAt: serverTimestamp(),
    };
    
    console.log('Data structure being saved to Firestore:', {
      projectId: dataToSave.projectId,
      userId: dataToSave.userId,
      hasReferenceImage: !!dataToSave.referenceImage,
      hasComparisonImage: !!dataToSave.comparisonImage,
      checksPerformed: dataToSave.checksPerformed
    });
    
    const docRef = await addDoc(collection(db, 'uiValidations'), dataToSave);

    console.log('UI Validation saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving UI validation:', error);
    throw new Error('Failed to save UI validation: ' + error.message);
  }
};

/**
 * Get UI validations for a project
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Array of validation records
 */
export const getProjectUIValidations = async (projectId) => {
  try {
    const q = query(
      collection(db, 'uiValidations'),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(q);
    const validations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort by createdAt in memory (newest first)
    return validations.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching UI validations:', error);
    console.warn('Returning empty array due to error');
    return [];
  }
};
