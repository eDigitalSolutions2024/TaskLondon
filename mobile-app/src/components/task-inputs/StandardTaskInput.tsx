import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as api from "../../api/endpoints";
import { toAbsoluteUrl } from "../../api/client";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";
import { promptPhotoSelection } from "../../utils/photoPicker";

export type EvaluationStatus = "bien" | "falla" | "na";

export default function StandardTaskInput({ task, result, submitting, onSubmit }: TaskInputProps) {
  // Inicializar estado evaluativo
  const initialStatus = (): EvaluationStatus | null => {
    const val = result?.value;
    if (val === "bien" || val === "correcto" || val === true) return "bien";
    if (val === "falla" || val === "problema" || val === false) return "falla";
    if (val === "na" || val === "n/a") return "na";
    if (typeof val === "string" && ["bien", "falla", "na"].includes(val)) {
      return val as EvaluationStatus;
    }
    return null;
  };

  // Inicializar fotos existentes
  const initialPhotos = (): string[] => {
    if (result?.photoUrls && Array.isArray(result.photoUrls) && result.photoUrls.length > 0) {
      return result.photoUrls;
    }
    if (result?.photoUrl) {
      return [result.photoUrl];
    }
    return [];
  };

  const [status, setStatus] = useState<EvaluationStatus | null>(initialStatus());
  const [comment, setComment] = useState(result?.comment ?? "");
  const [photos, setPhotos] = useState<string[]>(initialPhotos());
  const [uploading, setUploading] = useState(false);

  const busy = uploading || submitting;

  async function handleAddPhoto() {
    setUploading(true);
    try {
      const results = await promptPhotoSelection({
        title: "Evidencia fotográfica",
        message: "Selecciona cómo deseas registrar la foto de esta actividad:",
        allowsMultiple: true,
      });
      if (results && results.length > 0) {
        setPhotos((prev) => [...prev, ...results.map((r) => r.url)]);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!status) {
      Alert.alert("Evaluación requerida", "Por favor selecciona una opción: Bien, Falla o N/A.");
      return;
    }

    if (photos.length === 0) {
      Alert.alert("Fotografía obligatoria", "Para marcar la tarea como completada debes agregar forzosamente al menos una foto.");
      return;
    }

    if (status === "falla" && !comment.trim()) {
      Alert.alert("Comentario requerido", "Por favor describe el motivo de la falla encontrada.");
      return;
    }

    await onSubmit({
      value: status,
      photoUrl: photos[0],
      photoUrls: photos,
      comment: comment.trim() || undefined,
    });
  }

  return (
    <View style={styles.container}>
      {/* Selector de 3 opciones: BIEN / FALLA / N/A */}
      <View style={styles.optionsRow}>
        <Pressable
          style={[styles.optionBtn, styles.bienBtn, status === "bien" && styles.bienBtnActive]}
          onPress={() => setStatus("bien")}
          disabled={busy}
        >
          <Ionicons
            name={status === "bien" ? "checkmark-circle" : "checkmark-circle-outline"}
            size={20}
            color={status === "bien" ? colors.white : colors.success}
          />
          <Text style={[styles.optionBtnText, status === "bien" && styles.optionBtnTextActive]}>Bien</Text>
        </Pressable>

        <Pressable
          style={[styles.optionBtn, styles.fallaBtn, status === "falla" && styles.fallaBtnActive]}
          onPress={() => setStatus("falla")}
          disabled={busy}
        >
          <Ionicons
            name={status === "falla" ? "close-circle" : "close-circle-outline"}
            size={20}
            color={status === "falla" ? colors.white : colors.danger}
          />
          <Text style={[styles.optionBtnText, status === "falla" && styles.optionBtnTextActive]}>Falla</Text>
        </Pressable>

        <Pressable
          style={[styles.optionBtn, styles.naBtn, status === "na" && styles.naBtnActive]}
          onPress={() => setStatus("na")}
          disabled={busy}
        >
          <Ionicons
            name={status === "na" ? "remove-circle" : "remove-circle-outline"}
            size={20}
            color={status === "na" ? colors.white : colors.textMuted}
          />
          <Text style={[styles.optionBtnText, status === "na" && styles.optionBtnTextActive]}>N/A</Text>
        </Pressable>
      </View>

      {/* Campo de comentario si es Falla o si se desea dejar nota */}
      {status === "falla" ? (
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>
            Descripción de la falla <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Describe la falla o inconveniente observado..."
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
          />
        </View>
      ) : (
        <TextInput
          style={styles.optionalCommentInput}
          placeholder="Observaciones adicionales (opcional)..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
        />
      )}

      {/* Sección de Fotos (Obligatoria y con soporte multi-foto) */}
      <View style={styles.photosSection}>
        <View style={styles.photosHeader}>
          <Text style={styles.photosTitle}>
            Fotos de evidencia <Text style={styles.requiredAsterisk}>* (Obligatoria)</Text>
          </Text>
          <Text style={styles.photosCountBadge}>
            {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          </Text>
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
            {photos.map((photo, index) => (
              <View key={`${photo}-${index}`} style={styles.photoThumbWrapper}>
                <Image source={{ uri: toAbsoluteUrl(photo) }} style={styles.photoThumb} />
                <Pressable
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemovePhoto(index)}
                  disabled={busy}
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Botón para agregar más fotos */}
        <Pressable
          style={[styles.addPhotoBtn, photos.length === 0 && styles.addPhotoBtnHighlight]}
          onPress={handleAddPhoto}
          disabled={busy}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.addPhotoBtnText}>
                {photos.length === 0 ? "Tomar / Agregar foto (Requerida)" : "Agregar otra foto +"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Botón de Guardar / Completar Tarea */}
      <Pressable
        style={[styles.saveBtn, (!status || photos.length === 0) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={busy}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
            <Text style={styles.saveBtnText}>
              {result ? "Actualizar Tarea" : "Guardar y Completar Tarea"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    minHeight: 46,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  bienBtn: {
    borderColor: colors.success,
    backgroundColor: colors.background,
  },
  bienBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  fallaBtn: {
    borderColor: colors.danger,
    backgroundColor: colors.background,
  },
  fallaBtnActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  naBtn: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  naBtnActive: {
    backgroundColor: colors.textMuted,
    borderColor: colors.textMuted,
  },
  optionBtnText: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.text,
  },
  optionBtnTextActive: {
    color: colors.white,
  },
  commentContainer: {
    marginBottom: spacing.md,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  requiredAsterisk: {
    color: colors.danger,
    fontWeight: "bold",
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 65,
    textAlignVertical: "top",
    backgroundColor: colors.dangerBg,
    color: colors.text,
    fontSize: 14,
  },
  optionalCommentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  photosSection: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  photosTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  photosCountBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photosScroll: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  photoThumbWrapper: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
    backgroundColor: colors.card,
    gap: spacing.xs,
  },
  addPhotoBtnHighlight: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  addPhotoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
