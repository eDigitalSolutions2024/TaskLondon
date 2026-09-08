import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { RoutineRunWithProgress, SectionProgress } from "../types";
import { colors, radius, spacing } from "../theme";
import ProgressBar from "../components/ProgressBar";
import StatusBadge, { deriveStatus } from "../components/StatusBadge";
import IncidentModal from "../components/IncidentModal";
import RoutineIcon from "../components/RoutineIcon";
import ThematicSplash from "../components/ThematicSplash";
import ThemedWatermark from "../components/ThemedWatermark";

type Nav = NativeStackNavigationProp<RootStackParamList, "RoutineDetail">;
type Rt = RouteProp<RootStackParamList, "RoutineDetail">;

// Paleta de la tarjeta hero según el contexto: turno de apertura, turno de
// cierre o administrador — para que se note de inmediato en qué modo estás
// al abrir una rutina (mismo criterio de color que ya usa la Home).
const HERO_PALETTE: Record<
  "apertura" | "cierre" | "admin",
  {
    label: string;
    bg: string;
    border: string;
    fg: string;
    title: string;
    statText: string;
    iconBg: string;
    badgeBg: string;
    badgeBorder: string;
    divider: string;
    track: string;
  }
> = {
  apertura: {
    label: "TURNO APERTURA",
    bg: colors.primary,
    border: colors.primary,
    fg: colors.white,
    title: colors.white,
    statText: "rgba(255,255,255,0.85)",
    iconBg: "rgba(255,255,255,0.18)",
    badgeBg: "rgba(255,255,255,0.18)",
    badgeBorder: "rgba(255,255,255,0.3)",
    divider: "rgba(255,255,255,0.25)",
    track: "rgba(255,255,255,0.25)",
  },
  cierre: {
    label: "TURNO CIERRE",
    bg: "#1A2238",
    border: "#1A2238",
    fg: colors.white,
    title: colors.white,
    statText: "rgba(255,255,255,0.8)",
    iconBg: "rgba(255,255,255,0.14)",
    badgeBg: "rgba(255,255,255,0.14)",
    badgeBorder: "rgba(255,255,255,0.25)",
    divider: "rgba(255,255,255,0.2)",
    track: "rgba(255,255,255,0.22)",
  },
  admin: {
    label: "SUPERVISIÓN ADMIN",
    bg: "#1C0A0E",
    border: "rgba(212, 175, 55, 0.45)",
    fg: "#FDE68A",
    title: colors.white,
    statText: "rgba(253,230,138,0.8)",
    iconBg: "rgba(212, 175, 55, 0.18)",
    badgeBg: "rgba(212, 175, 55, 0.18)",
    badgeBorder: "rgba(212, 175, 55, 0.4)",
    divider: "rgba(212, 175, 55, 0.25)",
    track: "rgba(212, 175, 55, 0.22)",
  },
};

// Estilo distintivo por estado real de la sección: color de acento, fondo del
// ícono e ícono superpuesto, para que el estado se note sin tener que leer
// texto — evita que se pase por alto una sección pendiente o con incidencias.
const SECTION_STATUS_STYLES: Record<
  "pending" | "in_progress" | "completed" | "with_incidents",
  {
    accent: string;
    border: string;
    cardBg: string;
    iconBg: string;
    iconBorder: string;
    dotIcon: React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  pending: {
    accent: colors.pending,
    border: colors.border,
    cardBg: colors.card,
    iconBg: colors.background,
    iconBorder: colors.border,
    dotIcon: "ellipse-outline",
  },
  in_progress: {
    accent: colors.warning,
    border: "rgba(180, 83, 9, 0.35)",
    cardBg: colors.warningBg,
    iconBg: "rgba(180, 83, 9, 0.1)",
    iconBorder: "rgba(180, 83, 9, 0.3)",
    dotIcon: "time",
  },
  completed: {
    accent: colors.success,
    border: "rgba(46, 125, 50, 0.35)",
    cardBg: colors.successBg,
    iconBg: "rgba(46, 125, 50, 0.1)",
    iconBorder: "rgba(46, 125, 50, 0.3)",
    dotIcon: "checkmark",
  },
  with_incidents: {
    accent: colors.danger,
    border: "rgba(198, 40, 40, 0.4)",
    cardBg: colors.dangerBg,
    iconBg: "rgba(198, 40, 40, 0.1)",
    iconBorder: "rgba(198, 40, 40, 0.3)",
    dotIcon: "warning",
  },
};

export default function RoutineDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { routineId, routineName } = route.params;

  const { user } = useAuth();
  const [run, setRun] = useState<RoutineRunWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const started = await api.startRun(routineId);
      const full = await api.getRun(started._id);
      setRun(full);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo cargar la rutina");
    } finally {
      setLoading(false);
    }
  }, [routineId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    if (!run) return;
    const full = await api.getRun(run._id);
    setRun(full);
  }

  async function handleComplete() {
    if (!run) return;
    setCompleting(true);
    try {
      const summary = await api.completeRun(run._id);
      navigation.navigate("RunSummary", { summary });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const missing = (err.body as any)?.progress?.sections
          ?.filter((s: SectionProgress) => s.required && s.status !== "completed")
          ?.map((s: SectionProgress) => s.name)
          ?.join(", ");
        Alert.alert(
          "Faltan secciones obligatorias",
          missing ? `Completa: ${missing}` : "Aún hay secciones obligatorias sin completar."
        );
      } else {
        Alert.alert("Error", err instanceof Error ? err.message : "No se pudo finalizar la rutina");
      }
    } finally {
      setCompleting(false);
    }
  }

  if (loading || !run) {
    const shiftMode = user?.role === "admin" ? "admin" : user?.shift === "cierre" ? "cierre" : user?.shift === "apertura" ? "apertura" : "general";
    return (
      <ThematicSplash
        mode={shiftMode}
        message={`Cargando ${routineName}...`}
        subMessage="Preparando secciones y actividades requeridas"
      />
    );
  }

  const { progress } = run;

  const heroMode: "apertura" | "cierre" | "admin" =
    user?.role === "admin" ? "admin" : user?.shift === "cierre" ? "cierre" : "apertura";
  const hero = HERO_PALETTE[heroMode];

  return (
    <View style={styles.container}>
      {/* Fondo con marca de agua temática */}
      <ThemedWatermark />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: hero.bg, borderColor: hero.border }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBadge, { backgroundColor: hero.iconBg }]}>
              <RoutineIcon contextText={routineName} size={28} color={hero.fg} />
            </View>
            <View style={styles.heroTitleContainer}>
              <View style={[styles.brandBadge, { backgroundColor: hero.badgeBg, borderColor: hero.badgeBorder }]}>
                <MaterialCommunityIcons
                  name={heroMode === "admin" ? "shield-crown" : heroMode === "cierre" ? "weather-night" : "weather-sunset-up"}
                  size={12}
                  color={hero.fg}
                />
                <Text style={[styles.brandBadgeText, { color: hero.fg }]}>{hero.label}</Text>
              </View>
              <Text style={[styles.heroTitle, { color: hero.title }]}>{routineName}</Text>
            </View>
            {user?.role === "admin" && (
              <Pressable
                style={[styles.adminConfigBtn, { backgroundColor: hero.badgeBg, borderColor: hero.badgeBorder }]}
                onPress={() => navigation.navigate("AdminRoutineManager", { routineId, routineName })}
              >
                <Ionicons name="settings-outline" size={15} color={hero.fg} />
                <Text style={[styles.adminConfigBtnText, { color: hero.fg }]}>Ajustes</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.heroProgressSection, { borderTopColor: hero.divider }]}>
            <View style={styles.heroProgressStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkbox-outline" size={15} color={hero.fg} />
                <Text style={[styles.statText, { color: hero.statText }]}>
                  <Text style={[styles.statBold, { color: hero.title }]}>{progress.completedActivities}</Text> de {progress.totalActivities} actividades
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="pie-chart-outline" size={15} color={hero.fg} />
                <Text style={[styles.statText, { color: hero.statText }]}>
                  <Text style={[styles.statBold, { color: hero.title }]}>{progress.percentage}%</Text> completado
                </Text>
              </View>
            </View>
            <View style={styles.heroProgressBarContainer}>
              <ProgressBar percentage={progress.percentage} height={8} color={hero.fg} trackColor={hero.track} />
            </View>
          </View>
        </View>

        {/* Section title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionListTitle}>Secciones de la Rutina</Text>
          <View style={styles.sectionsCountBadge}>
            <Text style={styles.sectionListCount}>{progress.sections.length} secciones</Text>
          </View>
        </View>

        {/* Sections List */}
        {progress.sections.map((section, index) => {
          const displayStatus = deriveStatus(section.status, section.hasIncidents);
          const statusStyles = SECTION_STATUS_STYLES[displayStatus];
          return (
            <Pressable
              key={section.sectionRunId}
              style={({ pressed }) => [
                styles.sectionCard,
                { borderColor: statusStyles.border, backgroundColor: statusStyles.cardBg },
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                navigation.navigate("SectionDetail", {
                  runId: run._id,
                  sectionId: section.sectionId,
                  sectionName: section.name ?? "Sección",
                })
              }
            >
              <View style={[styles.statusAccentBar, { backgroundColor: statusStyles.accent }]} />

              <View style={styles.sectionTopRow}>
                <View style={styles.sectionIconWrap}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: statusStyles.iconBg, borderColor: statusStyles.iconBorder },
                    ]}
                  >
                    <RoutineIcon
                      name={section.icon}
                      contextText={section.name}
                      size={22}
                      color={statusStyles.accent}
                    />
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: statusStyles.accent }]}>
                    <Ionicons name={statusStyles.dotIcon} size={11} color={colors.white} />
                  </View>
                </View>

                <View style={styles.sectionInfo}>
                  <View style={styles.sectionTitleLine}>
                    <Text style={styles.sectionIndex}>{index + 1}.</Text>
                    <Text style={styles.sectionName} numberOfLines={1}>
                      {section.name}
                    </Text>
                  </View>
                  <Text style={styles.sectionMeta}>
                    {section.completed} de {section.total} actividades realizadas
                  </Text>
                </View>

                <View style={styles.sectionRightBadge}>
                  {section.required ? (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Obligatorio</Text>
                    </View>
                  ) : (
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalBadgeText}>Opcional</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.sectionProgressContainer}>
                <ProgressBar percentage={section.percentage} height={6} color={statusStyles.accent} />
              </View>

              <View style={styles.sectionFooter}>
                <StatusBadge status={section.status} hasIncidents={section.hasIncidents} />
                <View style={styles.openSectionAction}>
                  <Text style={[styles.openSectionActionText, { color: statusStyles.accent }]}>
                    {displayStatus === "pending" ? "Comenzar sección" : "Abrir sección"}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={statusStyles.accent} />
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* Actions & Incidents */}
        <Pressable
          style={({ pressed }) => [styles.incidentButton, pressed && styles.btnPressed]}
          onPress={() => setIncidentModalVisible(true)}
        >
          <Ionicons name="warning-outline" size={18} color={colors.danger} />
          <Text style={styles.incidentButtonText}>Reportar Incidencia Global</Text>
        </Pressable>

        {progress.allRequiredCompleted && run.status !== "completed" && (
          <Pressable
            style={({ pressed }) => [styles.completeButton, pressed && styles.btnPressed, completing && styles.btnDisabled]}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.completeBtnContent}>
                <Ionicons name="checkmark-done" size={20} color={colors.white} />
                <Text style={styles.completeButtonText}>Finalizar Rutina</Text>
              </View>
            )}
          </Pressable>
        )}

        {run.status === "completed" && (
          <View style={styles.completedNotice}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.completedNoticeText}>Rutina completada exitosamente</Text>
          </View>
        )}
      </ScrollView>

      <IncidentModal
        visible={incidentModalVisible}
        onClose={() => setIncidentModalVisible(false)}
        onSubmitted={() => {
          setIncidentModalVisible(false);
          refresh();
        }}
        runId={run._id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroIconBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  heroTitleContainer: {
    flex: 1,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.2)",
    marginBottom: 4,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },
  adminConfigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminConfigBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  heroProgressSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroProgressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statBold: {
    fontWeight: "700",
    color: colors.text,
  },
  heroProgressBarContainer: {
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
    paddingHorizontal: 2,
  },
  sectionListTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },
  sectionsCountBadge: {
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  sectionListCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionCard: {
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    paddingLeft: spacing.md + 2 + 5,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statusAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  sectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionIconWrap: {
    marginRight: spacing.sm + 2,
  },
  sectionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionIndex: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  sectionName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionRightBadge: {
    marginLeft: spacing.xs,
  },
  requiredBadge: {
    backgroundColor: "rgba(198, 40, 40, 0.09)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },
  optionalBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  sectionProgressContainer: {
    marginVertical: spacing.sm,
  },
  sectionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  openSectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openSectionActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  incidentButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.3)",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  incidentButtonText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completeBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completeButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.85,
  },
  completedNotice: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(40, 167, 69, 0.08)",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(40, 167, 69, 0.2)",
  },
  completedNoticeText: {
    color: colors.success,
    fontWeight: "700",
    fontSize: 14,
  },
});
