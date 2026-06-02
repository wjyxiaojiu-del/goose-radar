/**
 * API 统一类型定义
 */

export interface DashboardStats {
  totalInterns: number;
  highRiskCount: number;
  highPotentialCount: number;
  avgFitScore: number;
  alertsNeedingHR: number;
  feedbackRate: number;
}

export interface RiskDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface PositionStat {
  name: string;
  count: number;
  avgFitScore: number;
  highRiskCount: number;
  highPotentialCount: number;
}

export interface AIReminder {
  id: number;
  type: string;
  content: string;
  priority: string;
  internId?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  riskDistribution: RiskDistribution;
  positionStats: PositionStat[];
  aiReminders: AIReminder[];
  aiStatus?: 'live' | 'cached-live' | 'cached-fallback' | 'fallback';
}

export interface InternListItem {
  id: string;
  name: string;
  gender: string;
  school: string;
  major: string;
  entryDate: Date;
  phase: string;
  position: string;
  mentor: string;
  fitScore: number;
  riskScore: number;
  potentialScore: number;
  tags: string[];
  riskLevel: string;
  potentialType: string;
  taskCompletionRate: number;
  latestReport: string;
  latestFeedback: string;
  hasActiveAlert: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AlertItem {
  id: string;
  internId: string;
  internName: string;
  internSchool: string;
  position: string;
  mentor: string;
  fitScore: number;
  riskScore: number;
  type: string;
  level: string;
  reason: string[];
  action: string;
  createdAt: Date;
}
