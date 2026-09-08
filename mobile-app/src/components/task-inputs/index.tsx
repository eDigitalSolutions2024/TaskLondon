import React from "react";
import { TaskInputProps } from "./types";
import StandardTaskInput from "./StandardTaskInput";

export default function TaskInput(props: TaskInputProps) {
  return <StandardTaskInput {...props} />;
}

export type { TaskInputProps };
