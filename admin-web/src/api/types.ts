export type RoutineType = 'apertura' | 'operacion' | 'cierre' | 'cambio_turno' | 'custom';

export type TaskType =
  | 'checkbox'
  | 'confirmation'
  | 'temperature'
  | 'quantity'
  | 'selection'
  | 'text'
  | 'photo'
  | 'photo_confirmation';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: 'admin' | 'employee';
  establishmentId: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'admin' | 'employee';
  shift?: 'apertura' | 'cierre';
  establishmentId: string;
  active: boolean;
  createdAt?: string;
}

export interface Routine {
  _id: string;
  name: string;
  description?: string;
  type: RoutineType;
  icon: string;
  shift?: 'apertura' | 'cierre' | 'ambos';
  establishmentId: string;
  schedule?: string;
  order: number;
  active: boolean;
  sectionsCount?: number;
  activitiesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskConfig {
  unit?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface Task {
  _id: string;
  sectionId: string;
  title: string;
  description?: string;
  type: TaskType;
  icon?: string;
  order: number;
  required: boolean;
  requiresPhoto: boolean;
  requiresComment: boolean;
  config?: TaskConfig;
  active: boolean;
}

export interface RoutineSection {
  _id: string;
  routineId: string | { _id: string; name: string; type?: RoutineType };
  name: string;
  description?: string;
  icon: string;
  order: number;
  required: boolean;
  active: boolean;
  tasks: Task[];
  tasksCount?: number;
}

export interface RoutineFull extends Routine {
  sections: RoutineSection[];
}

export interface SectionProgress {
  sectionRunId: string;
  sectionId: string;
  total: number;
  completed: number;
  percentage: number;
  status: 'pending' | 'in_progress' | 'completed';
  hasIncidents: boolean;
  name?: string;
  icon?: string;
  required?: boolean;
}

export interface RoutineProgress {
  sections: SectionProgress[];
  totalActivities: number;
  completedActivities: number;
  percentage: number;
  allRequiredCompleted: boolean;
}

export interface RoutineRunHistory {
  _id: string;
  routineId: string | { _id: string; name: string; type: RoutineType; icon: string };
  routine: { _id: string; name: string; type: RoutineType; icon: string };
  employee: { _id: string; name: string; username?: string; role: 'admin' | 'employee'; shift?: string } | null;
  status: 'pending' | 'in_progress' | 'completed';
  date: string;
  shift: 'apertura' | 'cierre' | string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  progress: RoutineProgress;
  incidentsCount: number;
  photosCount: number;
}
