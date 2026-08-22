// API client service for JobHQ backend

const API_BASE = '';

async function request(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API error on ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Auth & Status
  getAuthStatus: () => request('/api/auth/status'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Profile & Resume
  getProfile: () => request('/api/profile'),
  saveProfile: (resumeText, structured) => 
    request('/api/profile', {
      method: 'POST',
      body: JSON.stringify({ resumeText, structured }),
    }),
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await fetch('/api/profile/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to upload resume');
    }
    return await res.json();
  },
  scanGithub: (username) =>
    request('/api/profile/github-scan', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  saveStarStory: (story) =>
    request('/api/profile/star-story', {
      method: 'POST',
      body: JSON.stringify({ story }),
    }),
  deleteStarStory: (id) =>
    request(`/api/profile/star-story/${id}`, {
      method: 'DELETE',
    }),


  // Jobs
  getJobs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/jobs${query ? `?${query}` : ''}`);
  },
  getJob: (id) => request(`/api/jobs/${id}`),
  createJob: (jobData) => 
    request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    }),
  scrapeJobUrl: (url) =>
    request('/api/jobs/scrape-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  scoutPortals: (params) =>
    request('/api/scrapers/run', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
  rankJob: (id) => request(`/api/jobs/${id}/rank`, { method: 'POST' }),
  rankAllJobs: () => request('/api/jobs/rank-all', { method: 'POST' }),
  deleteJob: (id) => request(`/api/jobs/${id}`, { method: 'DELETE' }),
  loadSampleJobs: () => request('/api/jobs/sample', { method: 'POST' }),
  updateJobStatus: (id, status, note) => 
    request(`/api/jobs/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),
  getJobEvents: (id) => request(`/api/jobs/${id}/events`),
  getApplyInfo: (id) => request(`/api/jobs/${id}/apply-info`),
  
  // Tailoring & AI
  tailorJob: (id) => request(`/api/jobs/${id}/tailor`, { method: 'POST' }),
  scanGmailAlerts: () => request('/api/scan', { method: 'POST' }),
  getGmailAlerts: () => request('/api/gmail/alerts'),

  // Hunter & Automation
  getHunterStatus: () => request('/api/hunter/status'),
  runHunter: (config) => request('/api/hunter/run', { method: 'POST', body: JSON.stringify(config || {}) }),
  getHunterTasks: () => request('/api/hunter/tasks'),
  getHunterRuns: () => request('/api/hunter/runs'),
};
