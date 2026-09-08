import { RunSummary } from "../types";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RoutineDetail: { routineId: string; routineName: string };
  SectionDetail: { runId: string; sectionId: string; sectionName: string };
  RunSummary: { summary: RunSummary };
  AdminRoutineManager: { routineId: string; routineName: string };
  UsersManager: undefined;
};
