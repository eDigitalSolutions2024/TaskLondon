
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as api from "../api/endpoints";
import { RootStackParamList } from "../navigation/types";
import { RoutineFull, RoutineSectionFull, Task, TaskType } from "../types";
import { colors, radius, spacing } from "../theme";
import { SEMANTIC_ICON_LIST } from "../theme/icons";
import RoutineIcon from "../components/RoutineIcon";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdminRoutineManager">;
type Rt = RouteProp<RootStackParamList, "AdminRoutineManager">;

const TASK_TYPES: Array<{ value: TaskType; label: string }> = [
  { value: "checkbox", label: "Casilla (Checkbox)" },
  { value: "confirmation", label: "Confirmación (Correcto/Problema)" },
  { value: "temperature", label: "Temperatura (°C)" },
  { value: "quantity", label: "Cantidad numérica" },
  { value: "selection", label: "Selección de opciones" },
  { value: "text", label: "Texto / Observación" },
  { value: "photo", label: "Fotografía obligatoria" },
  { value: "photo_confirmation", label: "Foto + Confirmación" },
];

export default function AdminRoutineManagerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { routineId, routineName } = route.params;

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Sección
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<RoutineSectionFull | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionIcon, setSectionIcon] = useState("checklist");
  const [sectionRequired, setSectionRequired] = useState(true);
  const [savingSection, setSavingSection] = useState(false);

  // Modal Actividad / Tarea
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("checkbox");
  const [taskIcon, setTaskIcon] = useState("checklist");
  const [taskRequired, setTaskRequired] = useState(true);
  const [taskRequiresPhoto, setTaskRequiresPhoto] = useState(false);
  const [taskRequiresComment, setTaskRequiresComment] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getRoutineFull(routineId);
      data.sections.sort((a, b) => a.order - b.order);
      data.sections.forEach((s) => s.tasks.sort((a, b) => a.order - b.order));
      setRoutine(data);
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

  // --- Manejo Secciones ---
  function openAddSection() {
    setEditingSection(null);
    setSectionName("");
    setSectionIcon("checklist");
    setSectionRequired(true);
    setSectionModalVisible(true);
  }

  function openEditSection(section: RoutineSectionFull) {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionIcon(section.icon || "checklist");
    setSectionRequired(section.required);
    setSectionModalVisible(true);
  }

  async function handleSaveSection() {
    if (!sectionName.trim()) {
      Alert.alert("Dato requerido", "Ingresa el nombre de la sección.");
      return;
    }
    setSavingSection(true);
    try {
      if (editingSection) {
        await api.updateSection(editingSection._id, {
          name: sectionName.trim(),
          icon: sectionIcon,
          required: sectionRequired,
        });
      } else {
        await api.createSection({
          routineId,
          name: sectionName.trim(),
          icon: sectionIcon,
          required: sectionRequired,
          order: routine ? routine.sections.length : 0,
        });
      }
      setSectionModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar la sección");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(section: RoutineSectionFull) {
    Alert.alert(
      "Eliminar sección",
      `¿Deseas eliminar la sección "${section.name}" y sus actividades asociadas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteSection(section._id);
              await load();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
  }

  async function handleDeleteRoutine() {
    Alert.alert(
      "Eliminar rutina",
      `¿Deseas eliminar la rutina "${routineName}"? Sus secciones y actividades ya no aparecerán, pero el historial ya registrado se conserva.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteRoutine(routineId);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar la rutina");
            }
          },
        },
      ]
    );
  }

  // --- Manejo Tareas / Actividades ---
  function openAddTask(sectionId: string) {
    setTargetSectionId(sectionId);
    setEditingTask(null);
    setTaskTitle("");
    setTaskType("checkbox");
    setTaskIcon("checklist");
    setTaskRequired(true);
    setTaskRequiresPhoto(false);
    setTaskRequiresComment(false);
    setTaskModalVisible(true);
  }

  function openEditTask(sectionId: string, task: Task) {
    setTargetSectionId(sectionId);
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskType(task.type);
    setTaskIcon(task.icon || "checklist");
    setTaskRequired(task.required);
    setTaskRequiresPhoto(task.requiresPhoto);
    setTaskRequiresComment(task.requiresComment);
    setTaskModalVisible(true);
  }

  async function handleSaveTask() {
    if (!taskTitle.trim()) {
      Alert.alert("Dato requerido", "Ingresa el título de la actividad.");
      return;
    }
    setSavingTask(true);
    try {
      const section = routine?.sections.find((s) => s._id === targetSectionId);
      if (editingTask) {
        await api.updateTask(editingTask._id, {
          title: taskTitle.trim(),
          type: taskType,
          icon: taskIcon || "checklist",
          required: taskRequired,
          requiresPhoto: taskRequiresPhoto,
          requiresComment: taskRequiresComment,
        });
      } else {
        await api.createTask({
          sectionId: targetSectionId,
          title: taskTitle.trim(),
          type: taskType,
          icon: taskIcon || "checklist",
          required: taskRequired,
          requiresPhoto: taskRequiresPhoto,
          requiresComment: taskRequiresComment,
          order: section ? section.tasks.length : 0,
        });
      }
      setTaskModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar la actividad");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    Alert.alert(
      "Eliminar actividad",
      `¿Deseas eliminar "${task.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteTask(task._id);
              await load();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
  }

  if (loading || !routine) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl * 2 }]}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{routineName}</Text>
            <Text style={styles.subtitle}>Configuración de Secciones y Actividades</Text>
          </View>
          <Pressable style={styles.addSectionBtn} onPress={openAddSection}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addSectionBtnText}>Sección</Text>
          </Pressable>
        </View>

        {routine.sections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Esta rutina no tiene secciones todavía.</Text>
            <Pressable style={[styles.actionButton, { marginTop: spacing.md }]} onPress={openAddSection}>
              <Text style={styles.actionButtonText}>+ Agregar primera sección</Text>
            </Pressable>
          </View>
        ) : (
          routine.sections.map((section) => (
            <View key={section._id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconBadge}>
                  <RoutineIcon name={section.icon} contextText={section.name} size={22} color={colors.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>{section.name}</Text>
                  <Text style={styles.sectionMeta}>
                    {section.tasks.length} actividades · {section.required ? "Obligatoria" : "Opcional"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Pressable style={styles.iconBtn} onPress={() => openEditSection(section)}>
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => handleDeleteSection(section)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>

              {/* Lista de Actividades de la Sección */}
              <View style={styles.tasksContainer}>
                {section.tasks.length === 0 ? (
                  <Text style={styles.noTasksText}>Sin actividades en esta sección.</Text>
                ) : (
                  section.tasks.map((task) => (
                    <View key={task._id} style={styles.taskRow}>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <View style={styles.taskIconBadge}>
                          <RoutineIcon name={task.icon || "checklist"} contextText={task.title} size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitleText}>{task.title}</Text>
                          <View style={{ flexDirection: "row", gap: 6, marginTop: 2, alignItems: "center" }}>
                            <Text style={styles.taskTypeBadge}>{task.type}</Text>
                            {task.required && <Text style={styles.taskRequiredBadge}>Requerida</Text>}
                            {task.requiresPhoto && <Text style={styles.taskPhotoBadge}>Foto</Text>}
                          </View>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable style={styles.iconBtnSmall} onPress={() => openEditTask(section._id, task)}>
                          <Ionicons name="pencil" size={14} color={colors.textMuted} />
                        </Pressable>
                        <Pressable style={styles.iconBtnSmall} onPress={() => handleDeleteTask(task)}>
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}

                <Pressable style={styles.addTaskBtn} onPress={() => openAddTask(section._id)}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.addTaskBtnText}>Agregar actividad</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable style={styles.deleteRoutineBtn} onPress={handleDeleteRoutine}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteRoutineBtnText}>Eliminar Rutina</Text>
        </Pressable>
      </ScrollView>

      {/* Modal Sección */}
      <Modal visible={sectionModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSection ? "Editar sección" : "Nueva sección"}
            </Text>

            <Text style={styles.modalLabel}>Nombre de la sección</Text>
            <TextInput
              style={styles.modalInput}
              value={sectionName}
              onChangeText={setSectionName}
              placeholder="ej. Limpieza de Barra"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Ícono de la sección</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                {SEMANTIC_ICON_LIST.map((item) => (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.iconSelectBtn,
                      sectionIcon === item.key && styles.iconSelectBtnSelected,
                    ]}
                    onPress={() => setSectionIcon(item.key)}
                  >
                    <RoutineIcon
                      name={item.key}
                      size={20}
                      color={sectionIcon === item.key ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.iconSelectBtnText,
                        sectionIcon === item.key && styles.iconSelectBtnTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Sección obligatoria</Text>
              <Switch
                value={sectionRequired}
                onValueChange={setSectionRequired}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSectionModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveSection}
                disabled={savingSection}
              >
                {savingSection ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Actividad */}
      <Modal visible={taskModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTask ? "Editar actividad" : "Nueva actividad"}
            </Text>

            <Text style={styles.modalLabel}>Título de la actividad</Text>
            <TextInput
              style={styles.modalInput}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="ej. Limpiar molino de café"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Ícono de la actividad</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                {SEMANTIC_ICON_LIST.map((item) => (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.iconSelectBtn,
                      taskIcon === item.key && styles.iconSelectBtnSelected,
                    ]}
                    onPress={() => setTaskIcon(item.key)}
                  >
                    <RoutineIcon
                      name={item.key}
                      size={20}
                      color={taskIcon === item.key ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.iconSelectBtnText,
                        taskIcon === item.key && styles.iconSelectBtnTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Tipo de actividad</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {TASK_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[
                      styles.typePill,
                      taskType === t.value && styles.typePillSelected,
                    ]}
                    onPress={() => setTaskType(t.value)}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        taskType === t.value && styles.typePillTextSelected,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Actividad obligatoria</Text>
              <Switch
                value={taskRequired}
                onValueChange={setTaskRequired}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Requiere foto obligatoria</Text>
              <Switch
                value={taskRequiresPhoto}
                onValueChange={setTaskRequiresPhoto}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setTaskModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveTask}
                disabled={savingTask}
              >
                {savingTask ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: spacing.lg,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  addSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  addSectionBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  iconBtnSmall: {
    padding: 4,
    borderRadius: radius.sm,
  },
  tasksContainer: {
    marginTop: spacing.sm,
  },
  noTasksText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: spacing.xs,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  taskTitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  taskTypeBadge: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: colors.pendingBg,
    color: colors.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  taskRequiredBadge: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#FDECEA",
    color: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  taskPhotoBadge: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#E8F5E9",
    color: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  addTaskBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  typePillTextSelected: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    minWidth: 90,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  iconSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  iconSelectBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconSelectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  iconSelectBtnTextSelected: {
    color: colors.white,
    fontWeight: "700",
  },
  taskIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnSave: {
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: {
    color: colors.white,
    fontWeight: "700",
  },
  deleteRoutineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  deleteRoutineBtnText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 14,
  },
});
