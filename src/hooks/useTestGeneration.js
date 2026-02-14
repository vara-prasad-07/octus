import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { generateTests, deleteSuite, exportSuite } from '../api/testGenApi';
import {
    deleteTestSuiteHistory,
    getProjectTestSuiteHistory,
    saveGeneratedSuiteHistory,
} from '../services/testGenerationHistoryService';

/**
 * Custom hook encapsulating test generation state and actions.
 * Handles loading, errors, suite data, and history.
 */
export function useTestGeneration(projectId = null) {
    const { currentUser } = useAuth();
    const [suite, setSuite] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadHistory = useCallback(async () => {
        if (!projectId) {
            setHistory([]);
            return;
        }

        try {
            const data = await getProjectTestSuiteHistory(projectId);
            setHistory(Array.isArray(data) ? data : []);
        } catch (historyError) {
            const msg = historyError.message || 'Failed to load test history';
            setError(msg);
            setHistory([]);
        }
    }, [projectId]);

    const generate = useCallback(async (formData) => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                user_story: formData.userStory,
                acceptance_criteria: formData.acceptanceCriteria
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                component_context: formData.component || 'General',
                priority: formData.priority || 'P1',
                target_format: formData.format || 'gherkin',
                project_id: projectId,
                github_repo: formData.githubRepo,
                github_file_path: formData.githubFilePath,
                github_token: formData.githubToken,
            };

            const { data } = await generateTests(payload);
            const { historyId } = await saveGeneratedSuiteHistory({
                projectId,
                ownerId: currentUser?.uid || null,
                generationPayload: payload,
                suiteData: data,
            });

            const enrichedSuite = { ...data, _history_id: historyId };
            setSuite(enrichedSuite);
            await loadHistory();
            return enrichedSuite;
        } catch (err) {
            const msg =
                err.response?.data?.detail || err.message || 'Generation failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.uid, loadHistory, projectId]);

    const removeSuite = useCallback(async (suiteId, historyId = null) => {
        if (!suiteId && !historyId) {
            throw new Error('Suite ID or history ID is required');
        }

        if (suiteId) {
            await deleteSuite(suiteId);
        }

        await deleteTestSuiteHistory({
            projectId,
            suiteId: suiteId || null,
            suiteHistoryId: historyId,
        });

        setHistory((prev) =>
            prev.filter((item) => {
                if (historyId) return item._history_id !== historyId;
                return item.suite_id !== suiteId;
            })
        );

        if ((suiteId && suite?.suite_id === suiteId) || (historyId && suite?._history_id === historyId)) {
            setSuite(null);
        }
    }, [projectId, suite]);

    const handleExport = useCallback(async (suiteId, format) => {
        const { data } = await exportSuite(suiteId, format);
        const ext = { json: 'json', feature: 'feature', csv: 'csv', pytest: 'py' }[format] || format;
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${suiteId}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    return {
        suite,
        setSuite,
        history,
        loading,
        error,
        generate,
        loadHistory,
        removeSuite,
        handleExport,
    };
}
