import { db } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const TEST_HISTORY_COLLECTION = 'testGenerationHistory';
const TEST_RUNS_SUBCOLLECTION = 'runs';
const RUN_SNAPSHOTS_SUBCOLLECTION = 'snapshots';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const timestampToISO = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
};

const removeUndefined = (value) => {
  if (Array.isArray(value)) return value.map(removeUndefined).filter((item) => item !== undefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }

    return Object.entries(value).reduce((acc, [key, val]) => {
      if (val !== undefined) acc[key] = removeUndefined(val);
      return acc;
    }, {});
  }
  return value;
};

const normalizeHistoryEntry = (entryId, data) => {
  const createdAtISO =
    timestampToISO(data.createdAt) ||
    timestampToISO(data.updatedAt) ||
    data.created_at ||
    new Date().toISOString();

  const normalizedLastRun = data.last_run
    ? {
      ...data.last_run,
      updated_at: timestampToISO(data.last_run.updated_at) || data.last_run.updated_at || null,
    }
    : null;

  return {
    id: entryId,
    _history_id: entryId,
    ...data,
    created_at: createdAtISO,
    suite_id: data.suite_id || data.suite_data?.suite_id || null,
    last_run: normalizedLastRun,
  };
};

const resolveSuiteHistoryDocId = async ({ projectId, suiteId, suiteHistoryId = null }) => {
  if (suiteHistoryId) return suiteHistoryId;
  if (!projectId || !suiteId) return null;

  const snapshot = await getDocs(
    query(collection(db, TEST_HISTORY_COLLECTION), where('projectId', '==', projectId))
  );

  const match = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((item) => item.suite_id === suiteId)
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt || b.created_at) - toMillis(a.updatedAt || a.createdAt || a.created_at))[0];

  return match?.id || null;
};

export const saveGeneratedSuiteHistory = async ({
  projectId,
  ownerId = null,
  generationPayload,
  suiteData,
}) => {
  if (!projectId) throw new Error('Project ID is required');
  if (!suiteData) throw new Error('Suite data is required');

  const safePayload = removeUndefined({
    ...generationPayload,
    github_token: undefined,
    github_token_present: Boolean(generationPayload?.github_token),
  });

  const safeSuiteData = removeUndefined(suiteData);

  const historyDoc = removeUndefined({
    projectId,
    ownerId,
    suite_id: safeSuiteData.suite_id || null,
    user_story: safeSuiteData.user_story || safePayload.user_story || '',
    acceptance_criteria:
      safeSuiteData.acceptance_criteria || safePayload.acceptance_criteria || [],
    component: safeSuiteData.component || safePayload.component_context || 'General',
    priority: safeSuiteData.priority || safePayload.priority || 'P1',
    format: safeSuiteData.format || safePayload.target_format || 'gherkin',
    total_cases: safeSuiteData.total_cases || safeSuiteData.test_cases?.length || 0,
    breakdown: safeSuiteData.breakdown || {},
    github_repo: safePayload.github_repo || '',
    github_file_path: safePayload.github_file_path || '',
    generation_payload: safePayload,
    suite_data: safeSuiteData,
    run_count: 0,
    last_run: null,
    created_at: safeSuiteData.created_at || new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, TEST_HISTORY_COLLECTION), historyDoc);
  return { historyId: docRef.id };
};

export const getProjectTestSuiteHistory = async (projectId) => {
  if (!projectId) return [];

  const snapshot = await getDocs(
    query(collection(db, TEST_HISTORY_COLLECTION), where('projectId', '==', projectId))
  );

  return snapshot.docs
    .map((docSnap) => normalizeHistoryEntry(docSnap.id, docSnap.data()))
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt || b.created_at) - toMillis(a.updatedAt || a.createdAt || a.created_at));
};

export const saveTestRunHistorySnapshot = async ({
  projectId,
  suiteId,
  suiteHistoryId = null,
  ownerId = null,
  githubContext = {},
  runData,
}) => {
  if (!projectId) throw new Error('Project ID is required');
  if (!suiteId) throw new Error('Suite ID is required');
  if (!runData) throw new Error('Run data is required');

  const resolvedHistoryId = await resolveSuiteHistoryDocId({
    projectId,
    suiteId,
    suiteHistoryId,
  });

  if (!resolvedHistoryId) {
    throw new Error(`No suite history found for suite ${suiteId}`);
  }

  const suiteRef = doc(db, TEST_HISTORY_COLLECTION, resolvedHistoryId);
  const runId = runData.run_id ? String(runData.run_id) : `run-${Date.now()}`;
  const runRef = doc(suiteRef, TEST_RUNS_SUBCOLLECTION, runId);
  const existingRun = await getDoc(runRef);

  const runSummary = removeUndefined({
    run_id: runData.run_id || null,
    status: runData.status || 'unknown',
    conclusion: runData.conclusion ?? null,
    message: runData.message ?? null,
    logs: runData.logs ?? null,
    html_url: runData.html_url ?? null,
    repo: githubContext.repo || '',
    github_file_path: githubContext.filePath || '',
    updated_at: new Date().toISOString(),
  });

  await setDoc(
    runRef,
    removeUndefined({
      projectId,
      ownerId,
      suite_id: suiteId,
      ...runSummary,
      raw_payload: removeUndefined(runData),
      createdAt: existingRun.exists() ? existingRun.data().createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  await addDoc(
    collection(runRef, RUN_SNAPSHOTS_SUBCOLLECTION),
    removeUndefined({
      ...runSummary,
      raw_payload: removeUndefined(runData),
      recordedAt: serverTimestamp(),
    })
  );

  const suiteUpdate = removeUndefined({
    last_run: runSummary,
    updatedAt: serverTimestamp(),
  });

  if (!existingRun.exists()) {
    suiteUpdate.run_count = increment(1);
  }

  await updateDoc(suiteRef, suiteUpdate);
  return { historyId: resolvedHistoryId, runId };
};

export const deleteTestSuiteHistory = async ({
  projectId,
  suiteId = null,
  suiteHistoryId = null,
}) => {
  if (!projectId && !suiteHistoryId) throw new Error('Project ID or history ID is required');

  const targetIds = [];
  if (suiteHistoryId) {
    targetIds.push(suiteHistoryId);
  } else if (suiteId) {
    const snapshot = await getDocs(
      query(collection(db, TEST_HISTORY_COLLECTION), where('projectId', '==', projectId))
    );
    snapshot.docs.forEach((docSnap) => {
      if (docSnap.data().suite_id === suiteId) targetIds.push(docSnap.id);
    });
  }

  for (const historyId of targetIds) {
    const suiteRef = doc(db, TEST_HISTORY_COLLECTION, historyId);
    const runsSnap = await getDocs(collection(suiteRef, TEST_RUNS_SUBCOLLECTION));

    for (const runDoc of runsSnap.docs) {
      const snapshotsSnap = await getDocs(collection(runDoc.ref, RUN_SNAPSHOTS_SUBCOLLECTION));
      await Promise.all(snapshotsSnap.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)));
      await deleteDoc(runDoc.ref);
    }

    await deleteDoc(suiteRef);
  }
};

