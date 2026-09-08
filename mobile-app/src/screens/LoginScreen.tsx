import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";
import ThematicSplash from "../components/ThematicSplash";
import ThemedWatermark from "../components/ThemedWatermark";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [shift, setShift] = useState<"apertura" | "cierre">(() => {
    const hour = new Date().getHours();
    return hour >= 15 ? "cierre" : "apertura";
  });
  const [submitting, setSubmitting] = useState(false);

  // Detección en tiempo real de si el usuario está escribiendo una cuenta de administrador
  const trimmedLower = name.trim().toLowerCase();
  const isAdminInput =
    trimmedLower.includes("admin") ||
    trimmedLower === "administrador" ||
    trimmedLower === "supervisor" ||
    trimmedLower === "admin@londoncafe.com";

  async function handleLogin() {
    if (!name.trim()) {
      Alert.alert("Dato requerido", "Por favor ingresa tu nombre de usuario o colaborador.");
      return;
    }
    setSubmitting(true);
    try {
      await login(name.trim(), undefined, isAdminInput ? undefined : shift);
    } catch (err) {
      Alert.alert("No se pudo iniciar sesión", err instanceof Error ? err.message : "Intenta de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Fondo con marca de agua temática */}
      <ThemedWatermark />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado Principal con Logo en Relieve */}
          <View style={styles.header}>
            <View style={styles.logoRingOuter}>
              <View style={styles.logoRingInner}>
                <Image
                  source={require("../../assets/Logo.webp")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.brandBadge}>
              <MaterialCommunityIcons name="coffee" size={14} color={colors.primary} />
              <Text style={styles.brandBadgeText}>LONDON CAFE CDJ</Text>
              <MaterialCommunityIcons name="coffee" size={14} color={colors.primary} />
            </View>

            <Text style={styles.brandTitle}>Control Operativo & Calidad</Text>
            <Text style={styles.brandSubtitle}>
              Registro de turnos, listas de verificación y supervisión integral
            </Text>
          </View>

          {/* Tarjeta de Inicio de Sesión */}
          <View style={[styles.card, isAdminInput && styles.cardAdmin]}>
            {/* Indicador de Tipo de Perfil */}
            {isAdminInput ? (
              <View style={styles.adminAccessBadge}>
                <MaterialCommunityIcons name="shield-crown" size={16} color="#D4AF37" />
                <Text style={styles.adminAccessBadgeText}>Acceso Administrativo / Supervisor</Text>
              </View>
            ) : null}

            {/* Campo: Nombre del Empleado o Administrador */}
            <Text style={styles.inputLabel}>
              <Ionicons
                name={isAdminInput ? "shield-checkmark-outline" : "person-outline"}
                size={14}
                color={colors.primary}
              />{" "}
              {isAdminInput ? "Usuario Administrador" : "Colaborador"}
            </Text>
            <View style={[styles.inputWrapper, isAdminInput && styles.inputWrapperAdmin]}>
              <MaterialCommunityIcons
                name={isAdminInput ? "shield-account" : "account-circle-outline"}
                size={22}
                color={isAdminInput ? "#7A1C28" : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Nombre o usuario..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Selector de Turno (Solo visible para colaboradores) */}
            {!isAdminInput ? (
              <>
                <Text style={styles.inputLabel}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} /> Selecciona tu turno operativo
                </Text>

                <View style={styles.shiftContainer}>
                  {/* Opción: Apertura */}
                  <Pressable
                    style={[
                      styles.shiftCard,
                      shift === "apertura" && styles.shiftCardActive,
                    ]}
                    onPress={() => setShift("apertura")}
                  >
                    <View
                      style={[
                        styles.shiftIconBox,
                        shift === "apertura" && styles.shiftIconBoxActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="weather-sunset-up"
                        size={24}
                        color={shift === "apertura" ? colors.white : colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.shiftTitle,
                        shift === "apertura" && styles.shiftTitleActive,
                      ]}
                    >
                      Apertura
                    </Text>
                    <Text
                      style={[
                        styles.shiftDescription,
                        shift === "apertura" && styles.shiftDescriptionActive,
                      ]}
                    >
                      Barra & Mañana
                    </Text>
                  </Pressable>

                  {/* Opción: Cierre */}
                  <Pressable
                    style={[
                      styles.shiftCard,
                      shift === "cierre" && styles.shiftCardActive,
                    ]}
                    onPress={() => setShift("cierre")}
                  >
                    <View
                      style={[
                        styles.shiftIconBox,
                        shift === "cierre" && styles.shiftIconBoxActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="weather-night"
                        size={24}
                        color={shift === "cierre" ? colors.white : colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.shiftTitle,
                        shift === "cierre" && styles.shiftTitleActive,
                      ]}
                    >
                      Cierre
                    </Text>
                    <Text
                      style={[
                        styles.shiftDescription,
                        shift === "cierre" && styles.shiftDescriptionActive,
                      ]}
                    >
                      Limpieza & Noche
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              /* Banner explicativo del Admin Mode */
              <View style={styles.adminExplanationBox}>
                <Ionicons name="information-circle-outline" size={18} color="#7A1C28" />
                <Text style={styles.adminExplanationText}>
                  Como administrador entrarás directamente al Panel de Control sin vincularte a un turno operativo.
                </Text>
              </View>
            )}

            {/* Botón Principal de Ingreso */}
            <Pressable
              style={[
                styles.submitButton,
                isAdminInput && styles.submitButtonAdmin,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {isAdminInput ? "Entrar al Panel de Control" : "Ingresar al turno"}
                  </Text>
                  <Ionicons
                    name={isAdminInput ? "shield-checkmark" : "arrow-forward-circle"}
                    size={22}
                    color={colors.white}
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* Pie de pantalla */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={14} color={colors.primary} />
            <Text style={styles.footerText}>
              London Cafe CDJ · Conexión Segura con el Establecimiento
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {submitting && (
        <ThematicSplash
          isOverlay
          mode={isAdminInput ? "admin" : shift}
          message={
            isAdminInput
              ? "Iniciando Panel de Administración..."
              : `Iniciando turno de ${shift === "apertura" ? "Apertura" : "Cierre"}...`
          }
          subMessage={
            isAdminInput
              ? "Supervisión y control de todas las operaciones"
              : "¡Que tengas un excelente servicio en London Cafe!"
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(122, 28, 40, 0.25)",
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  logoRingInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.2)",
    marginBottom: spacing.xs,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  shiftContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  shiftCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  shiftCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(122, 28, 40, 0.05)",
  },
  shiftIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs + 2,
  },
  shiftIconBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shiftTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  shiftTitleActive: {
    color: colors.primary,
  },
  shiftDescription: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: 2,
  },
  shiftDescriptionActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonAdmin: {
    backgroundColor: "#7A1C28",
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.35,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  cardAdmin: {
    borderColor: "rgba(212, 175, 55, 0.5)",
    backgroundColor: "#FFFFFF",
  },
  adminAccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#1A0A0E",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#D4AF37",
    marginBottom: spacing.md,
  },
  adminAccessBadgeText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inputWrapperAdmin: {
    borderColor: "rgba(122, 28, 40, 0.4)",
    backgroundColor: "rgba(122, 28, 40, 0.03)",
  },
  adminExplanationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.18)",
    marginBottom: spacing.xl,
  },
  adminExplanationText: {
    flex: 1,
    fontSize: 12,
    color: "#7A1C28",
    fontWeight: "600",
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
