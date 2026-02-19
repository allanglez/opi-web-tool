import { APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';

/**
 * Helper to make authenticated API calls with mock auth.
 * Uses X-Mock-User-Id header for mock auth bypass.
 */
export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  private headers(userId?: number) {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      h['X-Mock-User-Id'] = String(userId);
    }
    return h;
  }

  // ── Auth ──────────────────────────────────────────────
  async getMe(userId?: number) {
    return this.request.get(`${API_BASE}/me`, { headers: this.headers(userId) });
  }

  // ── Cycles ────────────────────────────────────────────
  async getActiveCycle(userId?: number) {
    return this.request.get(`${API_BASE}/cycles/active`, { headers: this.headers(userId) });
  }

  async createCycle(data: { name: string; year: number; startsOn: string; endsOn: string }, userId?: number) {
    return this.request.post(`${API_BASE}/admin/cycles`, {
      headers: this.headers(userId),
      data,
    });
  }

  async approveCycle(cycleId: number, userId?: number) {
    return this.request.post(`${API_BASE}/admin/cycles/${cycleId}/approve`, {
      headers: this.headers(userId),
    });
  }

  // ── Ingestion ─────────────────────────────────────────
  async ingestSchools(data: unknown[], userId?: number) {
    return this.request.post(`${API_BASE}/ingest/schools`, {
      headers: this.headers(userId),
      data: { schools: data },
    });
  }

  async ingestPrograms(data: unknown[], userId?: number) {
    return this.request.post(`${API_BASE}/ingest/programs`, {
      headers: this.headers(userId),
      data: { programs: data },
    });
  }

  async ingestClasses(data: unknown[], userId?: number) {
    return this.request.post(`${API_BASE}/ingest/classes`, {
      headers: this.headers(userId),
      data: { classes: data },
    });
  }

  async ingestStudents(data: unknown[], userId?: number) {
    return this.request.post(`${API_BASE}/ingest/students`, {
      headers: this.headers(userId),
      data: { students: data },
    });
  }

  async ingestClassStudents(data: unknown[], userId?: number) {
    return this.request.post(`${API_BASE}/ingest/class-students`, {
      headers: this.headers(userId),
      data: { classStudents: data },
    });
  }

  // ── Assignments ───────────────────────────────────────
  async createAssignment(data: { cycleId: number; classId: number; evaluatorId: number }, userId?: number) {
    return this.request.post(`${API_BASE}/coordinator/assignments`, {
      headers: this.headers(userId),
      data,
    });
  }

  async getAssignments(userId?: number) {
    return this.request.get(`${API_BASE}/coordinator/assignments`, {
      headers: this.headers(userId),
    });
  }

  // ── Assessments ───────────────────────────────────────
  async startAssessment(data: { studentId: number; cycleId: number }, userId?: number) {
    return this.request.post(`${API_BASE}/assessments/start`, {
      headers: this.headers(userId),
      data,
    });
  }

  async getAssessment(id: number, userId?: number) {
    return this.request.get(`${API_BASE}/assessments/${id}`, {
      headers: this.headers(userId),
    });
  }

  async updateAssessment(id: number, data: { opiLevelId?: number; notes?: string }, userId?: number) {
    return this.request.patch(`${API_BASE}/assessments/${id}`, {
      headers: this.headers(userId),
      data,
    });
  }

  async completeAssessment(id: number, data: { opiLevelId: number; notes?: string }, userId?: number) {
    return this.request.post(`${API_BASE}/assessments/${id}/complete`, {
      headers: this.headers(userId),
      data,
    });
  }

  // ── Audio ─────────────────────────────────────────────
  async uploadAudio(assessmentId: number, filePath: string, userId?: number) {
    const headers: Record<string, string> = {};
    if (userId) {
      headers['X-Mock-User-Id'] = String(userId);
    }
    return this.request.post(`${API_BASE}/assessments/${assessmentId}/audio/upload`, {
      headers,
      multipart: {
        file: {
          name: 'test-audio.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from('fake-audio-data-for-testing'),
        },
      },
    });
  }

  // ── Classes ───────────────────────────────────────────
  async getClassStudents(classId: number, userId?: number) {
    return this.request.get(`${API_BASE}/classes/${classId}/students`, {
      headers: this.headers(userId),
    });
  }

  async submitClass(classId: number, userId?: number) {
    return this.request.post(`${API_BASE}/classes/${classId}/submit`, {
      headers: this.headers(userId),
    });
  }

  // ── Scheduling ────────────────────────────────────────
  async addSchoolDate(schoolId: number, data: { cycleId: number; assessmentDate: string }, userId?: number) {
    return this.request.post(`${API_BASE}/coordinator/schools/${schoolId}/dates`, {
      headers: this.headers(userId),
      data,
    });
  }

  // ── Reports ───────────────────────────────────────────
  async getExportSummary(cycleId: number, userId?: number) {
    return this.request.get(`${API_BASE}/reports/summary?cycleId=${cycleId}`, {
      headers: this.headers(userId),
    });
  }

  // ── Retention / Reset ─────────────────────────────────
  async getRetentionConfig(userId?: number) {
    return this.request.get(`${API_BASE}/admin/retention/config`, {
      headers: this.headers(userId),
    });
  }

  async updateRetentionConfig(data: { cycleId: number; retentionDays: number | null }, userId?: number) {
    return this.request.patch(`${API_BASE}/admin/retention/config`, {
      headers: this.headers(userId),
      data,
    });
  }

  async startReset(cycleId: number, userId?: number) {
    return this.request.post(`${API_BASE}/admin/reset`, {
      headers: this.headers(userId),
      data: { cycleId },
    });
  }

  async getResetStatus(userId?: number) {
    return this.request.get(`${API_BASE}/admin/reset/status`, {
      headers: this.headers(userId),
    });
  }

  // ── Evaluator Dashboard ───────────────────────────────
  async getEvaluatorDashboard(userId?: number) {
    return this.request.get(`${API_BASE}/evaluator/dashboard`, {
      headers: this.headers(userId),
    });
  }

  // ── Coordinator Schools ───────────────────────────────
  async getCoordinatorSchools(userId?: number) {
    return this.request.get(`${API_BASE}/coordinator/schools`, {
      headers: this.headers(userId),
    });
  }

  // ── Health ────────────────────────────────────────────
  async health() {
    return this.request.get(`${API_BASE}/health`);
  }
}
