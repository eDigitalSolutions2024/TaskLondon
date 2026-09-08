import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme";
import { TaskInputProps } from "./types";

export default function ConfirmationInput({ result, submitting, onSubmit }: TaskInputProps) {
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [comment, setComment] = useState(result?.comment ?? "");

  const currentValue = result?.value as string | undefined;

  async function handleCorrecto() {
    await onSubmit({ value: "correcto" });
  }

  async function handleProblema() {
    if (!showProblemForm) {
      setShowProblemForm(true);
      return;
    }
    if (!comment.trim()) {
      Alert.alert("Falta comentario", "Describe el problema encontrado.");
      return;
    }
    await onSubmit({ value: "problema", comment: comment.trim() });
    setShowProblemForm(false);
  }

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.okButton, currentValue === "correcto" && styles.okButtonActive]}
          onPress={handleCorrecto}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.buttonText}>Correcto</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.button, styles.problemButton, currentValue === "problema" && styles.problemButtonActive]}
          onPress={handleProblema}
          disabled={submitting}
        >
          <Ionicons name="close-circle" size={18} color={colors.danger} />
          <Text style={styles.buttonText}>Hay problema</Text>
        </Pressable>
      </View>

      {showProblemForm && (
        <View style={styles.commentBox}>
          <TextInput
            style={styles.commentInput}
            placeholder="Describe el problema..."
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <Pressable style={styles.submitCommentButton} onPress={handleProblema} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitCommentText}>Confirmar problema</Text>
            )}
          </Pressable>
        </View>
      )}

      {currentValue === "problema" && result?.comment && !showProblemForm && (
        <Text style={styles.savedComment}>Comentario: {result.comment}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
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
  commentBox: {
    marginTop: spacing.md,
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
  },
  submitCommentButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitCommentText: {
    color: colors.white,
    fontWeight: "700",
  },
  savedComment: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
