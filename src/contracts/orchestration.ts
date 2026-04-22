export const SUPPORTED_JOB_NAMES = [
  'autopilot',
  'create-sessions',
  'product-owner',
  'resolve-questions',
  'review-prs',
  'self-healing',
  'ops-report'
] as const;

export type SupportedJobName = typeof SUPPORTED_JOB_NAMES[number];

export type RunStatus = 'running' | 'success' | 'failed';

export interface AuditEvent {
  id: string;
  runId: string;
  jobName: SupportedJobName;
  scope: string;
  action: string;
  status: RunStatus;
  message: string;
  createdAt: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface JobRunRecord {
  runId: string;
  jobName: SupportedJobName;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface CodeHotspot {
  filePath: string;
  language: string;
  lines: number;
  exportedSymbols: number;
  functionCount: number;
  classCount: number;
  todoCount: number;
  riskScore: number;
  reasons: string[];
}

export interface RepositoryHealthReport {
  repository: string;
  generatedAt: string;
  scannedFiles: number;
  sourceLines: number;
  hotspots: CodeHotspot[];
  recommendations: string[];
}

export interface RoadmapFeatureIssue {
  title: string;
  body: string;
  labels: string[];
}
