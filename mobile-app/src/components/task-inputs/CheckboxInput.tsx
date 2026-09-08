import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

export default function CheckboxInput({ result, submitting, onSubmit }: TaskInputProps) {
  const checked = result?.value === true;

  return (
    <Pressable
      style={[styles.row, checked && styles.rowChecked]}
      onPress={() => onSubmit({ value: !checked })}
      disabled={submitting}
      hitSlop={4}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {submitting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          checked && <Ionicons name="checkmark" size={18} color={colors.white} />
        )}
      </View>
      <Text style={styles.label}>{checked ? "Completado" : "Marcar como hecho"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowChecked: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  boxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  label: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },
});
