import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { resolveSemanticIcon } from "../theme/icons";

interface Props {
  name?: string | null;
  contextText?: string | null;
  size?: number;
  color?: string;
}

export default function RoutineIcon({ name, contextText, size = 24, color = colors.primary }: Props) {
  return <Ionicons name={resolveSemanticIcon(name, contextText)} size={size} color={color} />;
}
