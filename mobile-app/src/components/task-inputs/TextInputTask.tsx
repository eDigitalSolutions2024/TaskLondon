import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

export default function TextInputTask({ result, submitting, onSubmit }: TaskInputProps) {
  const [value, setValue] = useState((result?.value as string) ?? "");

  async function handleSubmit() {
    if (!value.trim()) {
      Alert.alert("Campo vacío", "Escribe una respuesta antes de guardar.");
      return;
    }
    await onSubmit({ value: value.trim() });
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Escribe aquí..."
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  submitButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
  },
});
