import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as api from "../api/endpoints";
import { IncidentPriority } from "../types";
import { colors, radius, spacing } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  runId: string;
  sectionId?: string;
  taskId?: string;
}

const PRIORITIES: { value: IncidentPriority; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

import { promptPhotoSelection } from "../utils/photoPicker";

export default function IncidentModal({ visible, onClose, onSubmitted, runId, sectionId, taskId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IncidentPriority>("media");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("media");
    setPhotoUri(null);
    setUploadedPhotoUrl(undefined);
  }

  async function pickPhoto() {
    const results = await promptPhotoSelection({
      title: "Foto de la incidencia",
      message: "Selecciona el origen para adjuntar evidencia de la incidencia:",
    });
    if (results && results[0]) {
      setPhotoUri(results[0].uri);
      setUploadedPhotoUrl(results[0].url);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Falta el título", "Describe brevemente la incidencia.");
      return;
    }
    setSubmitting(true);
    try {
      await api.reportIncident(runId, {
        sectionId,
        taskId,
        title: title.trim(),
        description: description.trim() || undefined,
        photoUrl: uploadedPhotoUrl,
        priority,
      });

      reset();
      onSubmitted();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo reportar la incidencia");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Reportar incidencia</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Refrigerador fuera de rango"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles adicionales"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[styles.priorityChip, priority === p.value && styles.priorityChipActive]}
                >
                  <Text style={[styles.priorityText, priority === p.value && styles.priorityTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.photoButton} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={18} color={colors.text} />
              <Text style={styles.photoButtonText}>
                {photoUri ? "Foto seleccionada" : "Adjuntar foto (opcional)"}
              </Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Reportar</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  priorityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  priorityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  priorityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priorityText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
  },
  priorityTextActive: {
    color: colors.white,
  },
  photoButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.danger,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
