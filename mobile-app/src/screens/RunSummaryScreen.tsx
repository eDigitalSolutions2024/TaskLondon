import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "RunSummary">;
type Rt = RouteProp<RootStackParamList, "RunSummary">;

function formatTime(iso?: string): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function RunSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { summary } = route.params;
  const { user, establishment } = useAuth();

  function goHome() {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl * 2 }]}>
      <View style={styles.headerCard}>
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
        </View>
        <Text style={styles.title}>{summary.routine.name}</Text>
        <Text style={styles.subtitle}>Rutina finalizada</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {summary.activitiesCompleted}/{summary.activitiesTotal}
          </Text>
          <Text style={styles.statLabel}>Actividades</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.percentage}%</Text>
          <Text style={styles.statLabel}>Completado</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, summary.incidentsCount > 0 && styles.statValueDanger]}>
            {summary.incidentsCount}
          </Text>
          <Text style={styles.statLabel}>Incidencias</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.photosCount}</Text>
          <Text style={styles.statLabel}>Fotos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Secciones</Text>
      {summary.sections.map((section, index) => {
        const iconName = section.hasIncidents
          ? "warning"
          : section.status === "completed"
          ? "checkmark-circle"
          : "ellipse-outline";
        const iconColor = section.hasIncidents
          ? colors.warning
          : section.status === "completed"
          ? colors.success
          : colors.pending;
        return (
          <View key={`${section.name}-${index}`} style={styles.sectionRow}>
            <Ionicons name={iconName} size={20} color={iconColor} style={styles.sectionIcon} />
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionMeta}>
                {section.completed}/{section.total} completadas
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Empleado</Text>
        <Text style={styles.metaValue}>{summary.employee?.name ?? user?.name ?? "-"}</Text>

        <Text style={styles.metaLabel}>Sucursal</Text>
        <Text style={styles.metaValue}>{establishment?.name ?? "-"}</Text>

        <Text style={styles.metaLabel}>Inicio</Text>
        <Text style={styles.metaValue}>{formatTime(summary.startedAt)}</Text>

        <Text style={styles.metaLabel}>Finalización</Text>
        <Text style={styles.metaValue}>{formatTime(summary.completedAt)}</Text>
      </View>

      <Pressable style={styles.homeButton} onPress={goHome}>
        <Text style={styles.homeButtonText}>Volver al inicio</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  headerCard: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  checkBadge: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  statValueDanger: {
    color: colors.danger,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    marginRight: spacing.md,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  homeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  homeButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
