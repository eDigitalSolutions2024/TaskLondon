import { RunSummary } from "../types";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RoutineDetail: { routineId: string; routineName: string; historyRunId?: string; readOnly?: boolean };
  SectionDetail: { runId: string; sectionId: string; sectionName: string; readOnly?: boolean };
  RunSummary: { summary: RunSummary };
  AdminRoutineManager: { routineId: string; routineName: string };
  UsersManager: undefined;
};
