import React from "react";
import { DimensionValue, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface WatermarkIcon {
  name: IconName;
  size: number;
  top: number;
  left: DimensionValue; // porcentaje ("12%") o número, para poder caer en cualquier punto horizontal
  rotate: string;
  opacity: number;
}

// Set amplio de íconos temáticos de cafetería, distribuido en toda el área de
// la pantalla (no solo los bordes) usando posiciones horizontales en
// porcentaje para que aparezcan también en el centro. Reutilizado en Login,
// Home y RoutineDetail para un fondo consistente y con más presencia visual.
const DEFAULT_ICONS: WatermarkIcon[] = [
  { name: "coffee", size: 38, top: 20, left: "8%", rotate: "-15deg", opacity: 0.09 },
  { name: "tea", size: 30, top: 45, left: "46%", rotate: "10deg", opacity: 0.07 },
  { name: "coffee-to-go", size: 30, top: 60, left: "82%", rotate: "-8deg", opacity: 0.08 },
  { name: "clock-outline", size: 32, top: 140, left: "28%", rotate: "12deg", opacity: 0.07 },
  { name: "silverware-fork-knife", size: 30, top: 155, left: "68%", rotate: "-18deg", opacity: 0.07 },
  { name: "bread-slice", size: 32, top: 165, left: "5%", rotate: "16deg", opacity: 0.07 },
  { name: "food-croissant", size: 38, top: 250, left: "85%", rotate: "-15deg", opacity: 0.08 },
  { name: "cookie", size: 28, top: 260, left: "38%", rotate: "8deg", opacity: 0.07 },
  { name: "muffin", size: 34, top: 275, left: "12%", rotate: "18deg", opacity: 0.08 },
  { name: "cup-water", size: 28, top: 340, left: "58%", rotate: "-10deg", opacity: 0.06 },
  { name: "coffee-maker", size: 38, top: 360, left: "80%", rotate: "-10deg", opacity: 0.08 },
  { name: "calendar-check", size: 32, top: 365, left: "20%", rotate: "-12deg", opacity: 0.07 },
  { name: "cake-variant", size: 30, top: 440, left: "45%", rotate: "14deg", opacity: 0.07 },
  { name: "shield-check-outline", size: 34, top: 460, left: "6%", rotate: "-8deg", opacity: 0.08 },
  { name: "broom", size: 32, top: 470, left: "78%", rotate: "18deg", opacity: 0.07 },
  { name: "chef-hat", size: 34, top: 545, left: "32%", rotate: "-14deg", opacity: 0.08 },
  { name: "glass-mug-variant", size: 30, top: 560, left: "88%", rotate: "10deg", opacity: 0.07 },
  { name: "cash", size: 28, top: 570, left: "10%", rotate: "-10deg", opacity: 0.06 },
  { name: "storefront-outline", size: 34, top: 650, left: "55%", rotate: "12deg", opacity: 0.07 },
  { name: "cupcake", size: 30, top: 665, left: "18%", rotate: "-16deg", opacity: 0.06 },
  { name: "ice-cream", size: 30, top: 680, left: "72%", rotate: "10deg", opacity: 0.06 },
  { name: "coffee", size: 32, top: 750, left: "40%", rotate: "-12deg", opacity: 0.07 },
  { name: "tea", size: 28, top: 770, left: "4%", rotate: "14deg", opacity: 0.06 },
  { name: "receipt", size: 28, top: 780, left: "86%", rotate: "-8deg", opacity: 0.06 },
  { name: "food-croissant", size: 30, top: 860, left: "62%", rotate: "16deg", opacity: 0.06 },
  { name: "shield-check-outline", size: 30, top: 880, left: "15%", rotate: "8deg", opacity: 0.06 },
];

interface Props {
  icons?: WatermarkIcon[];
}

export default function ThemedWatermark({ icons = DEFAULT_ICONS }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {icons.map((icon, idx) => (
        <View
          key={idx}
          style={{
            position: "absolute",
            top: icon.top,
            left: icon.left,
            transform: [{ rotate: icon.rotate }],
            opacity: icon.opacity,
          }}
        >
          <MaterialCommunityIcons name={icon.name} size={icon.size} color={colors.primary} />
        </View>
      ))}
    </View>
  );
}
