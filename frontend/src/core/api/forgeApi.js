import api from './axios.js';

export const forgeApi = {
  // Learner portal & Dashboard
  dashboard: () => api.get('/forge/dashboard'),
  myLearning: () => api.get('/forge/my-learning'),
  transcript: () => api.get('/forge/transcript'),
  myCertificates: (userId) => api.get(`/forge/certificates/${userId}`),
  verifyCertificate: (code) => api.get(`/forge/verify-certificate/${code}`),

  // Domains / Categories
  domains: () => api.get('/forge/domains'),
  createDomain: (data) => api.post('/forge/domains', data),
  updateDomain: (id, data) => api.put(`/forge/domains/${id}`, data),
  deleteDomain: (id) => api.delete(`/forge/domains/${id}`),

  // Course library & Management
  library: (params) => api.get('/forge/library', { params }),
  listCourses: () => api.get('/forge/courses'),
  getCourse: (id) => api.get(`/forge/courses/${id}`),
  updateCourse: (id, data) => api.put(`/forge/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/forge/courses/${id}`),
  publishCourse: (id) => api.post(`/forge/courses/${id}/publish`),
  myCourses: () => api.get('/forge/my-courses'),

  // SCORM Upload & Playback
  uploadScorm: (formData, params = {}, onProgress = null) =>
    api.post('/forge/scorm/upload', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: 30 * 60 * 1000,
    }),
  syncProgress: (courseId, data) => api.post(`/forge/courses/${courseId}/progress`, data),

  // Assignment & Enrollment
  assignableEmployees: (params) => api.get('/forge/assignable-employees', { params }),
  assignCourse: (courseId, data) => api.post(`/forge/courses/${courseId}/assign`, data),
  bulkEnroll: (data) => api.post('/forge/bulk-enroll', data),
  enroll: (courseId) => api.post('/forge/enroll', null, { params: { course_id: courseId } }),

  // Executive Analytics
  analyticsOverview: () => api.get('/forge/analytics/overview'),
  courseAnalytics: (courseId) => api.get(`/forge/analytics/courses/${courseId}`),
  nudge: (enrollmentId) => api.post('/forge/analytics/nudge', { enrollment_id: enrollmentId }),
  teamAnalytics: () => api.get('/forge/analytics/overview'),
  courseEnrollments: (id) => api.get(`/forge/courses/${id}/enrollments`),

  // Employee Profile Tab
  employeeCourses: (empId) => api.get(`/forge/employee-courses/${empId}`),
};

export const journeyApi = {
  createJourney: (data) => api.post('/journey/journeys', data),
  listJourneys: () => api.get('/journey/journeys'),
  getJourney: (id) => api.get(`/journey/journeys/${id}`),
  updateJourney: (id, data) => api.patch(`/journey/journeys/${id}`, data),
  deleteJourney: (id) => api.delete(`/journey/journeys/${id}`),
  assignJourney: (id, data) => api.post(`/journey/journeys/${id}/assign`, data),
  myJourneys: () => api.get('/journey/my-journeys'),
};
