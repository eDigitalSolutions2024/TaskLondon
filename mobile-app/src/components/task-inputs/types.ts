import { SubmitTaskResultBody, Task, TaskResult } from "../../types";

export interface TaskInputProps {
  task: Task;
  result: TaskResult | null;
  submitting: boolean;
  onSubmit: (body: SubmitTaskResultBody) => Promise<void> | void;
}
