import axios from 'axios'

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('aria_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aria_token')
      localStorage.removeItem('aria_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

export const getMe = () =>
  api.get('/auth/me').then(r => r.data)

// State
export const getState = () =>
  api.get('/state').then(r => r.data)

// Incidents
export const getIncidents = () =>
  api.get('/incidents').then(r => r.data)

export const getIncident = (id) =>
  api.get(`/incidents/${id}`).then(r => r.data)

export const createIncident = (data) =>
  api.post('/incidents', data).then(r => r.data)

export const updateIncidentStatus = (id, status) =>
  api.patch(`/incidents/${id}/status`, null, { params: { status } }).then(r => r.data)

// Resources
export const getResources = () =>
  api.get('/resources').then(r => r.data)

export const deployResource = (resourceId, incidentId) =>
  api.post(`/resources/${resourceId}/deploy/${incidentId}`).then(r => r.data)

export const releaseResource = (resourceId) =>
  api.post(`/resources/${resourceId}/release`).then(r => r.data)

// AI
export const getAssessment = () =>
  api.get('/ai/assessment').then(r => r.data)

export const getAllocation = () =>
  api.get('/ai/allocation').then(r => r.data)

export const queryAI = (question) =>
  api.post('/ai/query', { question }).then(r => r.data)

export const getBriefing = () =>
  api.get('/ai/briefing').then(r => r.data)

// Copilot
export const getCopilotFields = () =>
  api.get('/copilot/fields').then(r => r.data)

export const submitCopilotIntake = (data) =>
  api.post('/copilot/submit', data).then(r => r.data)

export default api
