import axios from 'axios';

export const AI_TEST_GEN_BACKEND_URL = (
  import.meta.env.VITE_AI_TEST_GEN_BACKEND_URL || 'https://threerd-back.onrender.com'
).replace(/\/$/, '');

const COMMON_CONFIG = {
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
};

export const aiTestGenApi = axios.create({
  baseURL: AI_TEST_GEN_BACKEND_URL,
  ...COMMON_CONFIG,
});

export const aiTestGenTestsApi = axios.create({
  baseURL: `${AI_TEST_GEN_BACKEND_URL}/tests`,
  ...COMMON_CONFIG,
});

