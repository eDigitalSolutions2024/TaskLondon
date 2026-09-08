import { apiRequest } from "./client";
import {
  Establishment,
  Incident,
  ReportIncidentBody,
  Routine,
  RoutineFull,
  RoutineRun,
  RoutineRunWithProgress,
  RoutineSection,
  RunSectionResponse,
  RunSummary,
  SubmitTaskResultBody,
  Task,
  TaskResult,
  User,
} from "../types";

export interface LoginResponse {
  token: string;
  user: User;
}

export function login(nameOrUsername: string, password?: string, shift?: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { name: nameOrUsername, username: nameOrUsername, password, shift },
    skipAuth: true,
  });
}

export function getEstablishment(establishmentId: string): Promise<Establishment> {
  return apiRequest<Establishment>(`/establishments/${establishmentId}`);
}

export function getRoutines(establishmentId: string): Promise<Routine[]> {
  return apiRequest<Routine[]>(`/routines?establishmentId=${establishmentId}`);
}

export function createRoutine(body: Partial<Routine>): Promise<Routine> {
  return apiRequest<Routine>("/routines", { method: "POST", body });
}

export function updateRoutine(id: string, body: Partial<Routine>): Promise<Routine> {
  return apiRequest<Routine>(`/routines/${id}`, { method: "PUT", body });
}

export function deleteRoutine(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/routines/${id}`, { method: "DELETE" });
}

export function getSections(establishmentId: string): Promise<RoutineSection[]> {
  return apiRequest<RoutineSection[]>(`/sections?establishmentId=${establishmentId}`);
}

export function createSection(body: Partial<RoutineSection>): Promise<RoutineSection> {
  return apiRequest<RoutineSection>("/sections", { method: "POST", body });
}

export function updateSection(id: string, body: Partial<RoutineSection>): Promise<RoutineSection> {
  return apiRequest<RoutineSection>(`/sections/${id}`, { method: "PUT", body });
}

export function deleteSection(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/sections/${id}`, { method: "DELETE" });
}

export function createTask(body: Partial<Task>): Promise<Task> {
  return apiRequest<Task>("/tasks", { method: "POST", body });
}

export function updateTask(id: string, body: Partial<Task>): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`, { method: "PUT", body });
}

export function deleteTask(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}

export function getRoutineFull(routineId: string): Promise<RoutineFull> {
  return apiRequest<RoutineFull>(`/routines/${routineId}/full`);
}

export function getRuns(params: {
  establishmentId?: string;
  date?: string;
  employeeId?: string;
  shift?: string;
}): Promise<RoutineRun[]> {
  const query = new URLSearchParams();
  if (params.establishmentId) query.set("establishmentId", params.establishmentId);
  if (params.date) query.set("date", params.date);
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.shift) query.set("shift", params.shift);
  return apiRequest<RoutineRun[]>(`/runs?${query.toString()}`);
}

export function startRun(routineId: string, shift?: string): Promise<RoutineRun> {
  return apiRequest<RoutineRun>("/runs", { method: "POST", body: { routineId, shift } });
}

export function getHistory(params: {
  establishmentId?: string;
  date?: string;
  shift?: string;
  from?: string;
  to?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params.establishmentId) query.set("establishmentId", params.establishmentId);
  if (params.date) query.set("date", params.date);
  if (params.shift) query.set("shift", params.shift);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return apiRequest<any[]>(`/runs/history?${query.toString()}`);
}

export function getRun(runId: string): Promise<RoutineRunWithProgress> {
  return apiRequest<RoutineRunWithProgress>(`/runs/${runId}`);
}

export function getRunSection(runId: string, sectionId: string): Promise<RunSectionResponse> {
  return apiRequest<RunSectionResponse>(`/runs/${runId}/sections/${sectionId}`);
}

export function submitTaskResult(
  runId: string,
  taskId: string,
  body: SubmitTaskResultBody
): Promise<{ result: TaskResult; sectionProgress: unknown }> {
  return apiRequest(`/runs/${runId}/tasks/${taskId}/result`, { method: "POST", body });
}

export function reportIncident(runId: string, body: ReportIncidentBody): Promise<Incident> {
  return apiRequest<Incident>(`/runs/${runId}/incidents`, { method: "POST", body });
}

export function completeRun(runId: string): Promise<RunSummary> {
  return apiRequest<RunSummary>(`/runs/${runId}/complete`, { method: "POST" });
}

export interface UploadResponse {
  url: string;
}

export function uploadPhoto(formData: FormData): Promise<UploadResponse> {
  return apiRequest<UploadResponse>("/runs/upload", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

// --- Gestión de colaboradores (solo admin) ---

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: "admin" | "employee";
  shift?: "apertura" | "cierre";
  establishmentId: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateUserBody {
  name: string;
  username: string;
  email?: string;
  password?: string;
  role: "admin" | "employee";
  shift?: "apertura" | "cierre";
  establishmentId: string;
}

export interface UpdateUserBody {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: "admin" | "employee";
  shift?: "apertura" | "cierre";
  active?: boolean;
}

export function getUsers(establishmentId: string): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>(`/users?establishmentId=${establishmentId}`);
}

export function createUser(body: CreateUserBody): Promise<ManagedUser> {
  return apiRequest<ManagedUser>("/users", { method: "POST", body });
}

export function updateUser(id: string, body: UpdateUserBody): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/users/${id}`, { method: "PUT", body });
}

export function deactivateUser(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${id}`, { method: "DELETE" });
}
