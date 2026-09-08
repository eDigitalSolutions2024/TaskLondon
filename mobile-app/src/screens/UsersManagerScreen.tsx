import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as api from "../api/endpoints";
import { ManagedUser } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "UsersManager">;

type RoleValue = "admin" | "employee";
type ShiftValue = "apertura" | "cierre";

export default function UsersManagerScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleValue>("employee");
  const [shift, setShift] = useState<ShiftValue>("apertura");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getUsers(currentUser.establishmentId);
      setUsers(data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudieron cargar los colaboradores");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openCreate() {
    setEditingUser(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("employee");
    setShift("apertura");
    setModalVisible(true);
  }

  function openEdit(u: ManagedUser) {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email || "");
    setPassword("");
    setRole(u.role);
    setShift(u.shift || "apertura");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim() || !username.trim()) {
      Alert.alert("Datos requeridos", "Ingresa nombre y usuario para el colaborador.");
      return;
    }
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: name.trim(),
          username: username.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
          role,
          shift: role === "employee" ? shift : undefined,
        });
      } else {
        await api.createUser({
          name: name.trim(),
          username: username.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
          role,
          shift: role === "employee" ? shift : undefined,
          establishmentId: currentUser.establishmentId,
        });
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar el colaborador");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u: ManagedUser) {
    const verb = u.active ? "desactivar" : "reactivar";
    Alert.alert(
      u.active ? "Desactivar colaborador" : "Reactivar colaborador",
      `¿Seguro que quieres ${verb} a ${u.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: u.active ? "Desactivar" : "Reactivar",
          style: u.active ? "destructive" : "default",
          onPress: async () => {
            try {
              if (u.active) {
                await api.deactivateUser(u.id);
              } else {
                await api.updateUser(u.id, { active: true });
              }
              await load();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo actualizar");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl * 2 }]}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Colaboradores</Text>
            <Text style={styles.subtitle}>Alta y administración de administradores y empleados</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Ionicons name="person-add" size={16} color={colors.white} />
            <Text style={styles.addBtnText}>Nuevo</Text>
          </Pressable>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aún no hay colaboradores registrados.</Text>
            <Pressable style={[styles.actionButton, { marginTop: spacing.md }]} onPress={openCreate}>
              <Text style={styles.actionButtonText}>+ Agregar primer colaborador</Text>
            </Pressable>
          </View>
        ) : (
          users.map((u) => (
            <Pressable key={u.id} style={styles.userCard} onPress={() => openEdit(u)}>
              <View style={[styles.avatar, u.role === "admin" && styles.avatarAdmin]}>
                <Ionicons
                  name={u.role === "admin" ? "shield-checkmark" : "person"}
                  size={20}
                  color={u.role === "admin" ? "#FDE68A" : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.userTitleRow}>
                  <Text style={styles.userName}>{u.name}</Text>
                  {!u.active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Inactivo</Text>
                    </View>
                  )}
                </View>
                <View style={styles.userMetaRow}>
                  <Text style={styles.userMeta}>@{u.username}</Text>
                  <View style={[styles.roleBadge, u.role === "admin" && styles.roleBadgeAdmin]}>
                    <Text style={[styles.roleBadgeText, u.role === "admin" && styles.roleBadgeTextAdmin]}>
                      {u.role === "admin" ? "Administrador" : "Colaborador"}
                    </Text>
                  </View>
                  {u.role === "employee" && u.shift && (
                    <View style={styles.shiftBadge}>
                      <Ionicons
                        name={u.shift === "cierre" ? "moon-outline" : "sunny-outline"}
                        size={10}
                        color={colors.textMuted}
                      />
                      <Text style={styles.shiftBadgeText}>{u.shift === "cierre" ? "Cierre" : "Apertura"}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(u)}>
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => handleToggleActive(u)}>
                  <Ionicons
                    name={u.active ? "person-remove-outline" : "person-add-outline"}
                    size={16}
                    color={u.active ? colors.danger : colors.success}
                  />
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Modal Crear/Editar Colaborador */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingUser ? "Editar colaborador" : "Nuevo colaborador"}</Text>

              <Text style={styles.modalLabel}>Nombre completo</Text>
              <TextInput
                style={styles.modalInput}
                value={name}
                onChangeText={setName}
                placeholder="ej. Juan Pérez"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalLabel}>Usuario (para iniciar sesión)</Text>
              <TextInput
                style={styles.modalInput}
                value={username}
                onChangeText={setUsername}
                placeholder="ej. juan"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.modalLabel}>Correo (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={email}
                onChangeText={setEmail}
                placeholder="ej. juan@londoncafe.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.modalLabel}>
                Contraseña {editingUser ? "(dejar vacío para no cambiar)" : "(opcional)"}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={password}
                onChangeText={setPassword}
                placeholder={editingUser ? "••••••••" : "Puede entrar solo con su nombre de usuario"}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <Text style={styles.modalLabel}>Rol</Text>
              <View style={styles.pillRow}>
                <Pressable
                  style={[styles.pill, role === "employee" && styles.pillSelected]}
                  onPress={() => setRole("employee")}
                >
                  <Ionicons name="person" size={14} color={role === "employee" ? colors.white : colors.primary} />
                  <Text style={[styles.pillText, role === "employee" && styles.pillTextSelected]}>Colaborador</Text>
                </Pressable>
                <Pressable
                  style={[styles.pill, role === "admin" && styles.pillSelected]}
                  onPress={() => setRole("admin")}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={role === "admin" ? colors.white : colors.primary}
                  />
                  <Text style={[styles.pillText, role === "admin" && styles.pillTextSelected]}>Administrador</Text>
                </Pressable>
              </View>

              {role === "employee" && (
                <>
                  <Text style={styles.modalLabel}>Turno habitual</Text>
                  <View style={styles.pillRow}>
                    <Pressable
                      style={[styles.pill, shift === "apertura" && styles.pillSelected]}
                      onPress={() => setShift("apertura")}
                    >
                      <Ionicons
                        name="sunny-outline"
                        size={14}
                        color={shift === "apertura" ? colors.white : colors.primary}
                      />
                      <Text style={[styles.pillText, shift === "apertura" && styles.pillTextSelected]}>Apertura</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.pill, shift === "cierre" && styles.pillSelected]}
                      onPress={() => setShift("cierre")}
                    >
                      <Ionicons
                        name="moon-outline"
                        size={14}
                        color={shift === "cierre" ? colors.white : colors.primary}
                      />
                      <Text style={[styles.pillText, shift === "cierre" && styles.pillTextSelected]}>Cierre</Text>
                    </Pressable>
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalBtnSaveText}>Guardar</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  addBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(122, 28, 40, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAdmin: {
    backgroundColor: "#1C0A0E",
    borderColor: "rgba(212, 175, 55, 0.45)",
  },
  userTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  inactiveBadge: {
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    flexWrap: "wrap",
  },
  userMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  roleBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeAdmin: {
    backgroundColor: "#1C0A0E",
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  roleBadgeTextAdmin: {
    color: "#FDE68A",
  },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  pillTextSelected: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    minWidth: 90,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  modalBtnSave: {
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: {
    color: colors.white,
    fontWeight: "700",
  },
});
