import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";

interface Props {
  percentage: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export default function ProgressBar({ percentage, color, trackColor, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor ?? colors.border }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: color ?? colors.primary, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: radius.full,
  },
});
