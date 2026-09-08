import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme";

export type DisplayStatus = "pending" | "in_progress" | "completed" | "with_incidents";

const CONFIG: Record<
  DisplayStatus,
  { label: string; bg: string; fg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  pending: { label: "Pendiente", bg: colors.pendingBg, fg: colors.textMuted, icon: "ellipse-outline" },
  in_progress: { label: "En progreso", bg: colors.warningBg, fg: colors.warning, icon: "time-outline" },
  completed: { label: "Completada", bg: colors.successBg, fg: colors.success, icon: "checkmark-circle" },
  with_incidents: { label: "Con incidencias", bg: colors.dangerBg, fg: colors.danger, icon: "warning" },
};

export function deriveStatus(status: string, hasIncidents?: boolean): DisplayStatus {
  if (hasIncidents) return "with_incidents";
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "pending";
}

export default function StatusBadge({ status, hasIncidents }: { status: string; hasIncidents?: boolean }) {
  const display = deriveStatus(status, hasIncidents);
  const cfg = CONFIG[display];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.fg} />
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
