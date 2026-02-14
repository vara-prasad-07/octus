/**
 * API client for the TestGen AI backend.
 * Requests are scoped to the dedicated AI test generation backend.
 */
import { aiTestGenTestsApi as api } from './aiTestGenClient';

/**
 * POST /tests/generate
 * @param {{ user_story: string, acceptance_criteria: string[], component_context: string, priority: string, target_format: string, project_id?: string }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const generateTests = (payload) => api.post('/generate', payload);

/**
 * GET /tests/{suiteId}
 */
export const getSuite = (suiteId) => api.get(`/${suiteId}`);

/**
 * GET /tests/?project_id=xxx
 */
export const listSuites = (projectId = null) =>
  api.get('/', { params: projectId ? { project_id: projectId } : {} });

/**
 * GET /tests/{suiteId}/export/{format}
 */
export const exportSuite = (suiteId, format) =>
  api.get(`/${suiteId}/export/${format}`, { responseType: 'blob' });

/**
 * DELETE /tests/{suiteId}
 */
export const deleteSuite = (suiteId) => api.delete(`/${suiteId}`);

export default api;
