import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as api from "../../api/endpoints";
import { toAbsoluteUrl } from "../../api/client";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

import { promptPhotoSelection } from "../../utils/photoPicker";

export default function PhotoInput({ result, submitting, onSubmit }: TaskInputProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(result?.photoUrl ?? null);

  const busy = uploading || submitting;

  async function pickAndUpload() {
    setUploading(true);
    try {
      const results = await promptPhotoSelection({
        title: "Tomar o seleccionar foto",
        message: "Selecciona el origen para adjuntar la evidencia:",
      });
      if (results && results[0]) {
        setPreviewUri(results[0].uri);
        await onSubmit({ value: true, photoUrl: results[0].url });
      }
    } finally {
      setUploading(false);
    }
  }

  const displayUri = previewUri ?? toAbsoluteUrl(result?.photoUrl);

  return (
    <View>
      {!!displayUri && <Image source={{ uri: displayUri }} style={styles.preview} />}
      <Pressable style={styles.button} onPress={pickAndUpload} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={18} color={colors.white} />
            <Text style={styles.buttonText}>{result?.photoUrl ? "Cambiar foto" : "Tomar / subir foto"}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    height: 160,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
