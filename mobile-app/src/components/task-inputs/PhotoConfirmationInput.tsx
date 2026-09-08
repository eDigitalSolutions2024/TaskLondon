import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as api from "../../api/endpoints";
import { toAbsoluteUrl } from "../../api/client";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

import { promptPhotoSelection } from "../../utils/photoPicker";

// Confirmation (correcto / problema) that also requires a photo to be attached
// before the result can be submitted.
export default function PhotoConfirmationInput({ result, submitting, onSubmit }: TaskInputProps) {
  const [choice, setChoice] = useState<"correcto" | "problema" | null>((result?.value as any) ?? null);
  const [comment, setComment] = useState(result?.comment ?? "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | undefined>(result?.photoUrl);
  const [uploading, setUploading] = useState(false);

  const busy = uploading || submitting;
  const displayUri = photoUri ?? toAbsoluteUrl(uploadedPhotoUrl);

  async function pickPhoto() {
    setUploading(true);
    try {
      const results = await promptPhotoSelection({
        title: "Adjuntar fotografía de confirmación",
        message: "Selecciona el origen para adjuntar la foto requerida:",
      });
      if (results && results[0]) {
        setPhotoUri(results[0].uri);
        setUploadedPhotoUrl(results[0].url);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!choice) {
      Alert.alert("Selecciona una opción", "Indica si está correcto o hay un problema.");
      return;
    }
    if (!uploadedPhotoUrl) {
      Alert.alert("Falta la foto", "Esta actividad requiere una fotografía.");
      return;
    }
    if (choice === "problema" && !comment.trim()) {
      Alert.alert("Falta comentario", "Describe el problema encontrado.");
      return;
    }
    await onSubmit({
      value: choice,
      photoUrl: uploadedPhotoUrl,
      comment: choice === "problema" ? comment.trim() : undefined,
    });
  }

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.okButton, choice === "correcto" && styles.okButtonActive]}
          onPress={() => setChoice("correcto")}
          disabled={busy}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.buttonText}>Correcto</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.problemButton, choice === "problema" && styles.problemButtonActive]}
          onPress={() => setChoice("problema")}
          disabled={busy}
        >
          <Ionicons name="close-circle" size={18} color={colors.danger} />
          <Text style={styles.buttonText}>Hay problema</Text>
        </Pressable>
      </View>

      {choice === "problema" && (
        <TextInput
          style={styles.commentInput}
          placeholder="Describe el problema..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
        />
      )}

      {!!displayUri && <Image source={{ uri: displayUri }} style={styles.preview} />}

      <Pressable style={styles.photoButton} onPress={pickPhoto} disabled={busy}>
        {uploading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={styles.photoButtonText}>
              {uploadedPhotoUrl ? "Cambiar foto" : "Adjuntar foto (requerida)"}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={busy}>
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>{result ? "Actualizar" : "Guardar"}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  okButton: {
    borderColor: colors.success,
    backgroundColor: colors.background,
  },
  okButtonActive: {
    backgroundColor: colors.successBg,
  },
  problemButton: {
    borderColor: colors.danger,
    backgroundColor: colors.background,
  },
  problemButtonActive: {
    backgroundColor: colors.dangerBg,
  },
  buttonText: {
    fontWeight: "700",
    color: colors.text,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  photoButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
  },
});
