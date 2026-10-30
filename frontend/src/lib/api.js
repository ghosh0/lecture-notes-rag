import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An error occurred'
    return Promise.reject(new Error(message))
  }
)

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notesApi = {
  list: () => api.get('/notes/').then((r) => r.data),
  get: (id) => api.get(`/notes/${id}`).then((r) => r.data),
  upload: (formData, onProgress) =>
    api
      .post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      .then((r) => r.data),
  delete: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (payload) => api.post('/chat/', payload).then((r) => r.data),
  getSessions: (noteId) =>
    api.get(`/chat/sessions/${noteId}`).then((r) => r.data),
  getSession: (sessionId) =>
    api.get(`/chat/session/${sessionId}`).then((r) => r.data),
  deleteSession: (sessionId) =>
    api.delete(`/chat/session/${sessionId}`).then((r) => r.data),
}

// ─── Votes ────────────────────────────────────────────────────────────────────
export const votesApi = {
  vote: (sessionId, messageId, voteType) =>
    api
      .post(`/votes/${sessionId}/${messageId}`, { vote_type: voteType })
      .then((r) => r.data),
}

export default api

