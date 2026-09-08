import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

// Shared implementation for "temperature" and "quantity" task types — both are
// a numeric value plus an optional unit shown from task.config.unit.
export default function NumericInput({ task, result, submitting, onSubmit }: TaskInputProps) {
  const [value, setValue] = useState(result?.value != null ? String(result.value) : "");

  const unit = task.config?.unit;
  const min = task.config?.min;
  const max = task.config?.max;

  async function handleSubmit() {
    const numeric = Number(value);
    if (value.trim() === "" || Number.isNaN(numeric)) {
      Alert.alert("Valor inválido", "Ingresa un número válido.");
      return;
    }
    await onSubmit({ value: numeric });
  }

  const hint =
    min !== undefined && max !== undefined
      ? `Rango esperado: ${min} - ${max}${unit ? ` ${unit}` : ""}`
      : min !== undefined
      ? `Mínimo: ${min}${unit ? ` ${unit}` : ""}`
      : max !== undefined
      ? `Máximo: ${max}${unit ? ` ${unit}` : ""}`
      : undefined;

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value}
          onChangeText={setValue}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        {!!unit && <Text style={styles.unit}>{unit}</Text>}
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>{result ? "Actualizar" : "Guardar"}</Text>
          )}
        </Pressable>
      </View>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  unit: {
    color: colors.textMuted,
    fontWeight: "600",
    marginRight: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
