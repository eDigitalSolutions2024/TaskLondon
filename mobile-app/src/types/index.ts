// Shared types mirroring the backend's Mongoose models / API responses.
// Kept intentionally loose (string ids) since the API returns Mongo ObjectIds as strings over JSON.

export type Role = "admin" | "employee";
export type Shift = "apertura" | "cierre";

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: Role;
  establishmentId: string;
  shift?: Shift;
}

export interface Establishment {
  _id: string;
  name: string;
  address?: string;
  active: boolean;
}

export type RoutineType = "apertura" | "operacion" | "cierre" | "cambio_turno" | "custom";

export interface Routine {
  _id: string;
  name: string;
  description?: string;
  type: RoutineType;
  icon: string;
  shift?: Shift | "ambos";
  establishmentId: string;
  schedule?: string;
  order: number;
  active: boolean;
  sectionsCount: number;
  activitiesCount: number;
}

export interface RoutineSection {
  _id: string;
  routineId: string | { _id: string; name: string; type?: RoutineType; shift?: Shift | "ambos" };
  name: string;
  description?: string;
  icon: string;
  order: number;
  required: boolean;
  active: boolean;
  tasksCount?: number;
}

export type TaskType =
  | "checkbox"
  | "confirmation"
  | "temperature"
  | "quantity"
  | "selection"
  | "text"
  | "photo"
  | "photo_confirmation";

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

export interface RoutineSectionFull extends RoutineSection {
  tasks: Task[];
}

export interface RoutineFull extends Routine {
  sections: RoutineSectionFull[];
}

export type RunStatus = "pending" | "in_progress" | "completed";

export interface RoutineRun {
  _id: string;
  routineId: string;
  establishmentId: string;
  employeeId: string;
  status: RunStatus;
  date: string;
  shift?: Shift;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionRun {
  _id: string;
  routineRunId: string;
  sectionId: string;
  status: RunStatus;
  completedAt?: string;
}

export type SectionStatus = "pending" | "in_progress" | "completed";

export interface SectionProgress {
  sectionRunId: string;
  sectionId: string;
  total: number;
  completed: number;
  percentage: number;
  status: SectionStatus;
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

export interface RoutineRunWithProgress extends RoutineRun {
  progress: RoutineProgress;
}

export interface RoutineRunHistory {
  _id: string;
  routineId: string | { _id: string; name: string; type: RoutineType; icon: string };
  routine: { _id: string; name: string; type: RoutineType; icon: string };
  employee: { _id: string; name: string; username?: string; role: Role; shift?: Shift } | null;
  status: RunStatus;
  date: string;
  shift: Shift;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  progress: RoutineProgress;
  incidentsCount: number;
  photosCount: number;
}

export interface TaskResult {
  _id: string;
  routineRunId: string;
  sectionRunId: string;
  taskId: string;
  type: TaskType;
  value: unknown;
  photoUrl?: string;
  photoUrls?: string[];
  comment?: string;
  completedBy?: string;
  completedAt?: string;
}

export interface TaskWithResult extends Task {
  result: TaskResult | null;
}

export interface RunSectionResponse {
  sectionRun: SectionRun;
  tasks: TaskWithResult[];
}

export type IncidentPriority = "baja" | "media" | "alta" | "critica";

export interface Incident {
  _id: string;
  routineRunId: string;
  sectionRunId?: string;
  taskId?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  priority: IncidentPriority;
  status: "open" | "resolved";
  reportedBy?: string;
}

export interface RunSummarySection {
  name?: string;
  status: SectionStatus;
  completed: number;
  total: number;
  hasIncidents: boolean;
}

export interface RunSummary {
  routine: { id: string; name: string };
  sections: RunSummarySection[];
  activitiesCompleted: number;
  activitiesTotal: number;
  percentage: number;
  incidentsCount: number;
  photosCount: number;
  startedAt?: string;
  completedAt?: string;
  employee: { id: string; name: string } | null;
}

export interface SubmitTaskResultBody {
  value: unknown;
  comment?: string;
  photoUrl?: string;
  photoUrls?: string[];
}

export interface ReportIncidentBody {
  sectionId?: string;
  taskId?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  priority: IncidentPriority;
}
