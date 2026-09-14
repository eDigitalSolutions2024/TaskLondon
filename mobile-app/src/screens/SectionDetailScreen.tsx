import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { RunSectionResponse, SubmitTaskResultBody, TaskWithResult } from "../types";
import { colors, radius, spacing } from "../theme";
import TaskInput from "../components/task-inputs";
import IncidentModal from "../components/IncidentModal";
import RoutineIcon from "../components/RoutineIcon";
import ThematicSplash from "../components/ThematicSplash";

type Rt = RouteProp<RootStackParamList, "SectionDetail">;

// Íconos temáticos de fondo distribuidos sutilmente
const BG_ICONS: Array<{
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size: number;
  top: number;
  left?: number;
  right?: number;
  rotate: string;
  opacity: number;
}> = [
  { name: "coffee", size: 36, top: 40, left: 20, rotate: "-15deg", opacity: 0.05 },
  { name: "tea", size: 32, top: 80, right: 25, rotate: "12deg", opacity: 0.05 },
  { name: "checkbox-marked-circle-outline", size: 36, top: 220, left: 15, rotate: "10deg", opacity: 0.05 },
  { name: "food-croissant", size: 38, top: 360, right: 20, rotate: "-20deg", opacity: 0.05 },
  { name: "shield-check-outline", size: 36, top: 520, left: 25, rotate: "15deg", opacity: 0.05 },
];

export default function SectionDetailScreen() {
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { runId, sectionId, sectionName, readOnly } = route.params;

  const { user } = useAuth();
  const [data, setData] = useState<RunSectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentTaskId, setIncidentTaskId] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const result = await api.getRunSection(runId, sectionId);
      setData(result);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo cargar la sección");
    } finally {
      setLoading(false);
    }
  }, [runId, sectionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSubmit(task: TaskWithResult, body: SubmitTaskResultBody) {
    setSubmittingTaskId(task._id);
    try {
      await api.submitTaskResult(runId, task._id, body);
      await load();
    } catch (err) {
      console.error("[handleSubmit Error]", err);
      if (err instanceof ApiError && err.status === 400) {
        Alert.alert("Falta información", err.message);
      } else {
        Alert.alert("Error al guardar", err instanceof Error ? err.message : "No se pudo guardar la actividad");
      }
    } finally {
      setSubmittingTaskId(null);
    }
  }

  if (loading || !data) {
    const shiftMode = user?.role === "admin" ? "admin" : user?.shift === "cierre" ? "cierre" : user?.shift === "apertura" ? "apertura" : "general";
    return (
      <ThematicSplash
        mode={shiftMode}
        message={`Cargando ${sectionName}...`}
        subMessage="Cargando actividades y puntos de control"
      />
    );
  }

  const completedCount = data.tasks.filter((t) => !!t.result).length;
  const totalCount = data.tasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 20}
    >
      {/* Fondo con marca de agua temática */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BG_ICONS.map((icon, idx) => (
          <View
            key={idx}
            style={{
              position: "absolute",
              top: icon.top,
              left: icon.left,
              right: icon.right,
              transform: [{ rotate: icon.rotate }],
              opacity: icon.opacity,
            }}
          >
            <MaterialCommunityIcons name={icon.name} size={icon.size} color={colors.primary} />
          </View>
        ))}
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Section Summary Card estilo Hero London Cafe */}
          <View style={styles.sectionHeaderCard}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionIconBadge}>
                <RoutineIcon contextText={sectionName} size={28} color={colors.primary} />
              </View>
              <View style={styles.sectionTitleBlock}>
                <View style={styles.brandBadge}>
                  <MaterialCommunityIcons name="coffee" size={12} color={colors.primary} />
                  <Text style={styles.brandBadgeText}>SECCIÓN OPERATIVA</Text>
                </View>
                <Text style={styles.sectionTitle}>{sectionName}</Text>
              </View>
            </View>

            {/* Barra de progreso de la sección */}
            <View style={styles.sectionProgressBlock}>
              <View style={styles.progressInfoRow}>
                <Text style={styles.progressSubTitle}>
                  {completedCount} de {totalCount} actividades listas
                </Text>
                <Text style={styles.progressPercentageText}>{progressPct}%</Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.max(4, progressPct)}%` }]} />
              </View>

              <View style={styles.sectionStatsPillsRow}>
                <View style={styles.statChip}>
                  <Ionicons name="checkbox-outline" size={13} color={colors.primary} />
                  <Text style={styles.statChipText}>{totalCount} actividades</Text>
                </View>
                <View style={[styles.statChip, allCompleted && styles.statChipCompleted]}>
                  <MaterialCommunityIcons
                    name={allCompleted ? "check-decagram" : "progress-clock"}
                    size={14}
                    color={allCompleted ? colors.success : colors.primary}
                  />
                  <Text style={[styles.statChipText, allCompleted && styles.statChipTextCompleted]}>
                    {allCompleted ? "Completada" : "En proceso"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Task cards section label */}
          <View style={styles.tasksHeaderRow}>
            <Text style={styles.tasksListTitle}>Lista de verificación & tareas</Text>
            <View style={styles.tasksCountBadge}>
              <Text style={styles.tasksListCount}>{data.tasks.length} puntos de control</Text>
            </View>
          </View>

          {data.tasks.map((task, index) => {
            const isCompleted = !!task.result;
            return (
              <View key={task._id} style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
                <View style={styles.taskHeader}>
                  <View style={[styles.taskIconBadge, isCompleted && styles.taskIconBadgeCompleted]}>
                    <RoutineIcon
                      name={task.icon || "checklist"}
                      contextText={task.title}
                      size={20}
                      color={isCompleted ? colors.success : colors.primary}
                    />
                  </View>

                  <View style={styles.taskTitleContainer}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskIndex}>{index + 1}.</Text>
                      <Text style={styles.taskTitle}>
                        {task.title} {task.required && <Text style={styles.requiredMark}>*</Text>}
                      </Text>
                    </View>
                    <View style={styles.taskReqRow}>
                      <View style={task.required ? styles.taskRequiredPill : styles.taskOptionalPill}>
                        <Text style={task.required ? styles.taskRequirementText : styles.taskOptionalText}>
                          {task.required ? "Obligatoria" : "Opcional"}
                        </Text>
                      </View>
                      {task.requiresPhoto && (
                        <View style={styles.taskPhotoPill}>
                          <Ionicons name="camera-outline" size={11} color={colors.primary} />
                          <Text style={styles.taskPhotoPillText}>Foto requerida</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                {!!task.description && (
                  <View style={styles.descBox}>
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <TaskInput
                    task={task}
                    result={task.result}
                    submitting={submittingTaskId === task._id}
                    onSubmit={(body) => handleSubmit(task, body)}
                    readOnly={readOnly}
                  />
                </View>

                {!readOnly && (
                  <Pressable
                    style={styles.taskIncidentButton}
                    onPress={() => {
                      setIncidentTaskId(task._id);
                      setIncidentModalVisible(true);
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
                    <Text style={styles.taskIncidentButtonText}>Reportar incidencia en este punto</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {!readOnly && (
            <Pressable
              style={({ pressed }) => [styles.incidentButton, pressed && styles.btnPressed]}
              onPress={() => {
                setIncidentTaskId(undefined);
                setIncidentModalVisible(true);
              }}
            >
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
              <Text style={styles.incidentButtonText}>Reportar Incidencia de Sección</Text>
            </Pressable>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {!readOnly && (
        <IncidentModal
          visible={incidentModalVisible}
          onClose={() => setIncidentModalVisible(false)}
          onSubmitted={() => {
            setIncidentModalVisible(false);
            load();
          }}
          runId={runId}
          sectionId={sectionId}
          taskId={incidentTaskId}
        />
      )}
    </KeyboardAvoidingView>
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
    paddingTop: spacing.md,
  },
  sectionHeaderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTopBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(122, 28, 40, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  sectionTitleBlock: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },
  sectionProgressBlock: {
    backgroundColor: "rgba(122, 28, 40, 0.03)",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.08)",
  },
  progressInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressSubTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  progressPercentageText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.primary,
  },
  progressBarTrack: {
    width: "100%",
    height: 7,
    backgroundColor: "rgba(122, 28, 40, 0.12)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sectionStatsPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statChipCompleted: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
  },
  statChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  statChipTextCompleted: {
    color: colors.success,
  },
  tasksHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
    paddingHorizontal: 2,
  },
  tasksListTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  tasksCountBadge: {
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tasksListCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  taskCardCompleted: {
    borderColor: "rgba(40, 167, 69, 0.35)",
    backgroundColor: "#FCFDFD",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  taskIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  taskIconBadgeCompleted: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
    borderColor: "rgba(40, 167, 69, 0.3)",
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskIndex: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  requiredMark: {
    color: colors.danger,
    fontWeight: "900",
  },
  taskReqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  taskRequiredPill: {
    backgroundColor: "rgba(198, 40, 40, 0.09)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  taskOptionalPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskRequirementText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },
  taskOptionalText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  taskPhotoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(122, 28, 40, 0.07)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  taskPhotoPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  completedBadge: {
    marginLeft: spacing.xs,
  },
  pendingBadge: {
    marginLeft: spacing.xs,
  },
  descBox: {
    backgroundColor: "rgba(122, 28, 40, 0.03)",
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  taskDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  inputContainer: {
    marginTop: spacing.xs,
  },
  taskIncidentButton: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskIncidentButtonText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  incidentButton: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: "rgba(220, 53, 69, 0.3)",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  incidentButtonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
