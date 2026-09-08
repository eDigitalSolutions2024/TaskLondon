import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

export default function SelectionInput({ task, result, submitting, onSubmit }: TaskInputProps) {
  const options = task.config?.options ?? [];
  const current = result?.value as string | undefined;

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = current === option;
        return (
          <Pressable
            key={option}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSubmit({ value: option })}
            disabled={submitting}
          >
            {submitting && active ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
            )}
          </Pressable>
        );
      })}
      {options.length === 0 && <Text style={styles.empty}>Sin opciones configuradas</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontWeight: "600",
  },
  optionTextActive: {
    color: colors.white,
  },
  empty: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
