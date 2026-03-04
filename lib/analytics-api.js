import { api } from '@/lib/api';

const ANALYTICS_BASE = '/analytics';

const periodTypes = ['day', 'week', 'month', 'year', 'total'];

const normalizeCollegeId = (collegeId) => {
  if (!collegeId) return '';
  if (typeof collegeId === 'object') {
    return collegeId._id ?? collegeId.id ?? '';
  }
  return String(collegeId);
};

/**
 * Fetch course-student analytics with optional filters
 * @param {string|object} collegeId
 * @param {{ periodType?: string, periodKey?: string, from?: string, to?: string }} options
 * @returns {Promise<{ data: Array }>}
 */
export async function getCourseStudentAnalytics(collegeId, options = {}) {
  const params = new URLSearchParams();
  const normalizedId = normalizeCollegeId(collegeId);
  if (normalizedId) params.set('collegeId', normalizedId);
  if (options.periodType) params.set('periodType', options.periodType);
  if (options.periodKey) params.set('periodKey', options.periodKey);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  const res = await api.get(`${ANALYTICS_BASE}?${params.toString()}`, {}, true);
  return res;
}

/**
 * Fetch summary by period (returns array of period summaries)
 * @param {string|object} collegeId
 * @param {{ periodType?: string }} options
 * @returns {Promise<{ data: Array }>}
 */
export async function getAnalyticsSummary(collegeId, options = {}) {
  const params = new URLSearchParams();
  const normalizedId = normalizeCollegeId(collegeId);
  if (normalizedId) params.set('collegeId', normalizedId);
  if (options.periodType) params.set('periodType', options.periodType);
  const res = await api.get(`${ANALYTICS_BASE}/summary?${params.toString()}`, {}, true);
  return res;
}

/**
 * Rebuild total analytics for a college
 * @param {string|object} collegeId
 * @returns {Promise<{ data: object }>}
 */
export async function rebuildAnalyticsTotal(collegeId) {
  const normalizedId = normalizeCollegeId(collegeId);
  const res = await api.post(`${ANALYTICS_BASE}/rebuild-total/${normalizedId}`, null, {}, true);
  return res;
}

export { periodTypes };
