import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pm_token');
      localStorage.removeItem('pm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { displayName?: string; username?: string }) =>
    api.patch('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// ─── Polls ────────────────────────────────────────────────────────────────────
export const pollApi = {
  getMyPolls: (params?: { status?: string; page?: number; search?: string }) =>
    api.get('/polls', { params }),
  getPublicPolls: (params?: { page?: number; category?: string; search?: string; sort?: string }) =>
    api.get('/polls/public', { params }),
  getPoll: (identifier: string) =>
    api.get(`/polls/${identifier}`),
  validateAccess: (identifier: string, params?: { token?: string; code?: string }) =>
    api.get(`/polls/${identifier}/access`, { params }),
  createPoll: (data: unknown) =>
    api.post('/polls', data),
  updatePoll: (pollId: string, data: unknown) =>
    api.patch(`/polls/${pollId}`, data),
  deletePoll: (pollId: string) =>
    api.delete(`/polls/${pollId}`),
  publishPoll: (pollId: string) =>
    api.post(`/polls/${pollId}/publish`),
  closePoll: (pollId: string) =>
    api.post(`/polls/${pollId}/close`),
  releaseResults: (pollId: string) =>
    api.post(`/polls/${pollId}/release-results`),
  getAccessTokens: (pollId: string) =>
    api.get(`/polls/${pollId}/tokens`),
  generateMoreTokens: (pollId: string, count: number) =>
    api.post(`/polls/${pollId}/generate-tokens`, { count }),
};

// ─── Votes ────────────────────────────────────────────────────────────────────
export const voteApi = {
  submitVote: (data: unknown) =>
    api.post('/votes', data),
  getResults: (pollId: string, token?: string) =>
    api.get(`/votes/poll/${pollId}/results`, { params: { token } }),
  checkVoteStatus: (pollSlug: string, params?: { sessionId?: string; token?: string }) =>
    api.get(`/votes/check/${pollSlug}`, { params }),
  exportVotes: (pollId: string) =>
    api.get(`/votes/poll/${pollId}/export`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getPollAnalytics: (pollId: string) => api.get(`/analytics/poll/${pollId}`),
};

// ─── Invites ──────────────────────────────────────────────────────────────────
export const inviteApi = {
  getList: (pollId: string) => api.get(`/invites/${pollId}`),
  send: (pollId: string, emails?: string[]) =>
    api.post(`/invites/${pollId}/send`, { emails }),
  addInvitees: (pollId: string, emails: string[]) =>
    api.post(`/invites/${pollId}/add`, { emails }),
};

export default api;
