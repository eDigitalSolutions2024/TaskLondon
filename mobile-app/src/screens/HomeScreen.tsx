import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/endpoints";
import { RootStackParamList } from "../navigation/types";
import { Routine, RoutineRun, RoutineRunHistory, RoutineSection, RoutineType, Shift } from "../types";
import { colors, radius, spacing } from "../theme";
import ProgressBar from "../components/ProgressBar";
import RoutineIcon from "../components/RoutineIcon";
import ThematicSplash from "../components/ThematicSplash";
import ThemedWatermark from "../components/ThemedWatermark";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

interface RoutineCardData {
  routine: Routine;
  run: RoutineRun | null;
  percentage: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// dateStr viene como YYYY-MM-DD; se arma en horario local para que no se
// corra un día por interpretación UTC.
function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const label = dt.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  if (dateStr === todayStr()) return `Hoy · ${capitalized}`;
  if (dateStr === daysAgoStr(1)) return `Ayer · ${capitalized}`;
  return capitalized;
}

interface HistoryDayGroup {
  day: string;
  items: RoutineRunHistory[];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, establishment, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"rutinas" | "secciones" | "historial">("rutinas");
  const [items, setItems] = useState<RoutineCardData[]>([]);
  const [sections, setSections] = useState<RoutineSection[]>([]);
  const [historyItems, setHistoryItems] = useState<RoutineRunHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(() => new Set([todayStr()]));
  // Cuántos días hacia atrás trae el historial. Arranca en 14 (13 días atrás
  // + hoy) y el admin puede pedir más con el botón "Ver días anteriores".
  const [historyDaysBack, setHistoryDaysBack] = useState(3); // 4 días (hoy + 3 atrás)

  // Modal de creación de rutina (solo admin)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineType, setNewRoutineType] = useState<RoutineType>("custom");
  const [newRoutineShift, setNewRoutineShift] = useState<Shift | "ambos">("ambos");
  const [newRoutineSchedule, setNewRoutineSchedule] = useState("");
  const [creatingRoutine, setCreatingRoutine] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [routines, runs, allSections, history] = await Promise.all([
        api.getRoutines(user.establishmentId),
        api.getRuns({ establishmentId: user.establishmentId, date: todayStr() }),
        api.getSections(user.establishmentId),
        user.role === "admin"
          ? api.getHistory({ establishmentId: user.establishmentId, from: daysAgoStr(historyDaysBack), to: todayStr() })
          : Promise.resolve([]),
      ]);

      const runsByRoutine = new Map<string, RoutineRun>();
      for (const run of runs) runsByRoutine.set(run.routineId, run);

      const withProgress = await Promise.all(
        routines.map(async (routine): Promise<RoutineCardData> => {
          const run = runsByRoutine.get(routine._id) ?? null;
          if (!run) return { routine, run: null, percentage: 0 };
          try {
            const full = await api.getRun(run._id);
            return { routine, run, percentage: full.progress.percentage };
          } catch {
            return { routine, run, percentage: 0 };
          }
        })
      );

      setItems(withProgress);
      setSections(allSections);
      setHistoryItems(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, historyDaysBack]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Agrupa el historial por día para desplegarlo como acordeón (no una lista
  // plana de todas las rutinas) — el backend ya entrega date desc, createdAt
  // desc, así que solo se preserva ese orden al agrupar.
  const historyByDay = useMemo<HistoryDayGroup[]>(() => {
    const map = new Map<string, RoutineRunHistory[]>();
    for (const item of historyItems) {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
    return Array.from(map.entries())
      .map(([day, list]) => ({ day, items: list }))
      .sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [historyItems]);

  function toggleHistoryDay(day: string) {
    setExpandedHistoryDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const [adminShiftFilter, setAdminShiftFilter] = useState<"todos" | "apertura" | "cierre">("todos");

  // Una rutina "pertenece" a un turno si su campo shift coincide o si es 'ambos'
  // (o no está definido, para compatibilidad con datos antiguos sin el campo).
  function routineMatchesShift(routineShift: string | undefined, targetShift: "apertura" | "cierre"): boolean {
    if (!routineShift || routineShift === "ambos") return true;
    return routineShift === targetShift;
  }

  // Filtrado de rutinas según turno de colaborador o filtro de administrador
  const filteredItems = useMemo(() => {
    if (user?.role === "admin") {
      if (adminShiftFilter === "apertura" || adminShiftFilter === "cierre") {
        return items.filter((i) => routineMatchesShift(i.routine.shift, adminShiftFilter));
      }
      return items;
    }

    return items.filter((i) => routineMatchesShift(i.routine.shift, user?.shift === "cierre" ? "cierre" : "apertura"));
  }, [items, user, adminShiftFilter]);

  // Filtrado de secciones según turno o filtro de admin
  const filteredSections = useMemo(() => {
    const shiftOf = (s: RoutineSection) => (typeof s.routineId === "object" ? s.routineId.shift : undefined);

    if (user?.role === "admin") {
      if (adminShiftFilter === "apertura" || adminShiftFilter === "cierre") {
        return sections.filter((s) => routineMatchesShift(shiftOf(s), adminShiftFilter));
      }
      return sections;
    }

    return sections.filter((s) => {
      return routineMatchesShift(shiftOf(s), user?.shift === "cierre" ? "cierre" : "apertura");
    });
  }, [sections, user, adminShiftFilter]);

  // Estadísticas globales del turno (calculadas sobre las rutinas del turno activo)
  const shiftStats = useMemo(() => {
    const totalRoutines = filteredItems.length;
    const completedRoutines = filteredItems.filter((i) => i.run?.status === "completed").length;
    const totalActivities = filteredItems.reduce((acc, i) => acc + (i.routine.activitiesCount || 0), 0);
    const overallPercentage =
      totalRoutines > 0
        ? Math.round(filteredItems.reduce((acc, i) => acc + (i.percentage || 0), 0) / totalRoutines)
        : 0;

    return {
      totalRoutines,
      completedRoutines,
      totalActivities,
      overallPercentage,
      isAllCompleted: totalRoutines > 0 && completedRoutines === totalRoutines,
    };
  }, [filteredItems]);

  function actionLabel(run: RoutineRun | null): string {
    if (!run) return "Comenzar Rutina";
    if (run.status === "completed") return "Ver Resumen";
    return "Continuar Rutina";
  }

  function openRoutine(item: RoutineCardData) {
    navigation.navigate("RoutineDetail", { routineId: item.routine._id, routineName: item.routine.name });
  }

  function openRoutineBySection(section: RoutineSection) {
    const routineId = typeof section.routineId === "object" ? section.routineId._id : section.routineId;
    const routineName = typeof section.routineId === "object" ? section.routineId.name : section.name;
    navigation.navigate("RoutineDetail", { routineId, routineName });
  }

  function openCreateRoutine() {
    setNewRoutineName("");
    setNewRoutineType("custom");
    setNewRoutineShift("ambos");
    setNewRoutineSchedule("");
    setCreateModalVisible(true);
  }

  async function handleCreateRoutine() {
    if (!newRoutineName.trim()) {
      Alert.alert("Dato requerido", "Ingresa el nombre de la rutina.");
      return;
    }
    if (!user) return;
    setCreatingRoutine(true);
    try {
      await api.createRoutine({
        name: newRoutineName.trim(),
        type: newRoutineType,
        shift: newRoutineShift,
        schedule: newRoutineSchedule.trim() || undefined,
        establishmentId: user.establishmentId,
      });
      setCreateModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo crear la rutina");
    } finally {
      setCreatingRoutine(false);
    }
  }

  function openHistoryRoutine(hist: RoutineRunHistory) {
    const routineId = typeof hist.routineId === "object" ? hist.routineId._id : hist.routineId;
    const routineName = typeof hist.routine === "object" ? hist.routine.name : "Rutina";
    // historyRunId fuerza a RoutineDetailScreen a cargar ESTA ejecución pasada
    // (getRun directo) en vez de startRun, que siempre trae/crea la de HOY.
    navigation.navigate("RoutineDetail", { routineId, routineName, historyRunId: hist._id, readOnly: true });
  }

  if (loading) {
    const shiftMode = user?.role === "admin" ? "admin" : user?.shift === "cierre" ? "cierre" : user?.shift === "apertura" ? "apertura" : "general";
    return (
      <ThematicSplash
        mode={shiftMode}
        message={user?.role === "admin" ? "Iniciando Panel de Administración..." : "Cargando rutinas y tareas..."}
        subMessage={user?.role === "admin" ? "Supervisión y control de todas las operaciones" : "Sincronizando información de London Cafe"}
      />
    );
  }

  const isAdmin = user?.role === "admin";
  const shiftName = isAdmin ? "Supervisión General" : user?.shift === "cierre" ? "Turno de Cierre" : "Turno de Apertura";
  const isCierre = !isAdmin && user?.shift === "cierre";

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Fondo con marca de agua temática */}
      <ThemedWatermark />

      {/* 1. Header Institucional */}
      <View style={styles.header}>
        <View style={styles.headerUserRow}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/Logo.webp")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>
                {greeting()}, {user?.name?.split(" ")[0] ?? "equipo"}
              </Text>
              {user?.role === "admin" ? (
                <View style={styles.adminRoleBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.white} />
                  <Text style={styles.adminRoleBadgeText}>ADMIN</Text>
                </View>
              ) : (
                <View style={styles.employeeRoleBadge}>
                  <Ionicons name="person" size={10} color={colors.primary} />
                  <Text style={styles.employeeRoleBadgeText}>COLABORADOR</Text>
                </View>
              )}
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={styles.establishment}>{establishment?.name || "London Cafe CDJ"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {user?.role === "admin" && (
            <Pressable
              style={styles.usersButton}
              onPress={() => navigation.navigate("UsersManager")}
              hitSlop={8}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </Pressable>
          )}
          <Pressable style={styles.logoutButton} onPress={logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logout}>Salir</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Hero Card: Resumen del Turno & Progreso */}
      <View
        style={[
          styles.heroCard,
          isAdmin ? styles.heroCardAdmin : isCierre ? styles.heroCardCierre : styles.heroCardApertura,
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={[styles.heroShiftBadge, isAdmin && styles.heroShiftBadgeAdmin]}>
            <MaterialCommunityIcons
              name={isAdmin ? "shield-crown" : isCierre ? "weather-night" : "weather-sunset-up"}
              size={18}
              color={isAdmin ? "#FDE68A" : colors.white}
            />
            <Text style={[styles.heroShiftText, isAdmin && styles.heroShiftTextAdmin]}>{shiftName}</Text>
          </View>
          <Text style={styles.heroDate}>
            {new Date().toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>

        <View style={styles.heroProgressRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroProgressTitle}>
              {isAdmin ? "Monitoreo de Rutinas Operativas" : "Progreso General del Turno"}
            </Text>
            <Text style={styles.heroProgressSubtitle}>
              {shiftStats.completedRoutines} de {shiftStats.totalRoutines} rutinas ejecutadas hoy
            </Text>
          </View>
          <Text style={styles.heroPercentageText}>{shiftStats.overallPercentage}%</Text>
        </View>

        <View style={styles.heroProgressBarTrack}>
          <View
            style={[
              styles.heroProgressBarFill,
              isAdmin && styles.heroProgressBarFillAdmin,
              { width: `${Math.max(4, shiftStats.overallPercentage)}%` },
            ]}
          />
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroStatValue}>{shiftStats.totalRoutines} Rutinas</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Ionicons name="checkbox-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroStatValue}>{shiftStats.totalActivities} Actividades</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <MaterialCommunityIcons
              name={shiftStats.isAllCompleted ? "check-decagram" : "progress-clock"}
              size={14}
              color="rgba(255,255,255,0.85)"
            />
            <Text style={styles.heroStatValue}>
              {shiftStats.isAllCompleted ? "Completado" : "En Curso"}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Selector de Pestañas (Modo Admin) */}
      {user?.role === "admin" && (
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === "rutinas" && styles.tabButtonActive]}
            onPress={() => setActiveTab("rutinas")}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={activeTab === "rutinas" ? colors.white : colors.primary}
            />
            <Text
              style={[styles.tabButtonText, activeTab === "rutinas" && styles.tabButtonTextActive]}
            >
              Rutinas
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === "secciones" && styles.tabButtonActive]}
            onPress={() => setActiveTab("secciones")}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={activeTab === "secciones" ? colors.white : colors.primary}
            />
            <Text
              style={[styles.tabButtonText, activeTab === "secciones" && styles.tabButtonTextActive]}
            >
              Secciones
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === "historial" && styles.tabButtonActive]}
            onPress={() => setActiveTab("historial")}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === "historial" ? colors.white : colors.primary}
            />
            <Text
              style={[styles.tabButtonText, activeTab === "historial" && styles.tabButtonTextActive]}
            >
              Historial
            </Text>
          </Pressable>
        </View>
      )}

      {user?.role === "admin" && (
        <View style={styles.adminFilterRow}>
          <Text style={styles.adminFilterLabel}>Filtro de Turno:</Text>
          <View style={styles.adminFilterPills}>
            <Pressable
              style={[
                styles.adminFilterPill,
                adminShiftFilter === "todos" && styles.adminFilterPillActive,
              ]}
              onPress={() => setAdminShiftFilter("todos")}
            >
              <Text
                style={[
                  styles.adminFilterPillText,
                  adminShiftFilter === "todos" && styles.adminFilterPillTextActive,
                ]}
              >
                Todos
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.adminFilterPill,
                adminShiftFilter === "apertura" && styles.adminFilterPillActive,
              ]}
              onPress={() => setAdminShiftFilter("apertura")}
            >
              <Ionicons
                name="sunny-outline"
                size={12}
                color={adminShiftFilter === "apertura" ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.adminFilterPillText,
                  adminShiftFilter === "apertura" && styles.adminFilterPillTextActive,
                ]}
              >
                Apertura
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.adminFilterPill,
                adminShiftFilter === "cierre" && styles.adminFilterPillActive,
              ]}
              onPress={() => setAdminShiftFilter("cierre")}
            >
              <Ionicons
                name="moon-outline"
                size={12}
                color={adminShiftFilter === "cierre" ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.adminFilterPillText,
                  adminShiftFilter === "cierre" && styles.adminFilterPillTextActive,
                ]}
              >
                Cierre
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* 4. Lista Principal de Rutinas */}
      {activeTab === "rutinas" || user?.role !== "admin" ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.routine._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            isAdmin ? (
              <Pressable style={styles.createRoutineBtn} onPress={openCreateRoutine}>
                <Ionicons name="add-circle" size={18} color={colors.white} />
                <Text style={styles.createRoutineBtnText}>Nueva rutina</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
                <Text style={styles.empty}>No hay rutinas asignadas para este turno o establecimiento.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isCompleted = item.run?.status === "completed";
            const inProgress = item.run && !isCompleted;

            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => openRoutine(item)}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconBadge,
                      isCompleted && styles.iconBadgeCompleted,
                      inProgress && styles.iconBadgeInProgress,
                    ]}
                  >
                    <RoutineIcon
                      name={item.routine.icon}
                      contextText={item.routine.name}
                      size={26}
                      color={isCompleted ? colors.success : colors.primary}
                    />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{item.routine.name}</Text>
                      {isCompleted ? (
                        <View style={styles.statusCompletedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                          <Text style={styles.statusCompletedText}>Completada</Text>
                        </View>
                      ) : inProgress ? (
                        <View style={styles.statusProgressBadge}>
                          <Ionicons name="time" size={12} color={colors.warning} />
                          <Text style={styles.statusProgressText}>En curso</Text>
                        </View>
                      ) : (
                        <View style={styles.statusPendingBadge}>
                          <Ionicons name="ellipse-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.statusPendingText}>Por iniciar</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.metaPill}>
                        <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>{item.routine.sectionsCount} secciones</Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Ionicons name="checkbox-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>{item.routine.activitiesCount} actividades</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Barra de Progreso Individual */}
                <View style={styles.progressWrap}>
                  <ProgressBar percentage={item.percentage} />
                  <View style={styles.progressInfoRow}>
                    <Text style={styles.progressLabel}>{item.percentage}% completado</Text>
                    {isCompleted && (
                      <Text style={styles.progressCompletedLabel}>
                        <Ionicons name="checkmark-done" size={13} color={colors.success} /> Finalizada hoy
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <View
                    style={[
                      styles.actionButton,
                      isCompleted ? styles.actionButtonCompleted : styles.actionButtonActive,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>{actionLabel(item.run)}</Text>
                    <Ionicons
                      name={isCompleted ? "eye-outline" : "arrow-forward-circle-outline"}
                      size={18}
                      color={colors.white}
                    />
                  </View>

                  {user?.role === "admin" && (
                    <Pressable
                      style={styles.cardAdminBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate("AdminRoutineManager", {
                          routineId: item.routine._id,
                          routineName: item.routine.name,
                        });
                      }}
                    >
                      <Ionicons name="settings-outline" size={18} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      ) : activeTab === "secciones" ? (
        /* 5. Vista de Secciones */
        <FlatList
          data={filteredSections}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={48} color={colors.textMuted} />
                <Text style={styles.empty}>No hay secciones para el turno seleccionado.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const routineName = typeof item.routineId === "object" ? item.routineId.name : "Rutina";
            const routineId = typeof item.routineId === "object" ? item.routineId._id : item.routineId;
            return (
              <Pressable
                style={({ pressed }) => [styles.sectionPremiumCard, pressed && styles.cardPressed]}
                onPress={() => openRoutineBySection(item)}
              >
                <View style={styles.sectionPremiumHeader}>
                  <View style={styles.sectionIconBadgePremium}>
                    <RoutineIcon name={item.icon} contextText={item.name} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.sectionTitleBlockPremium}>
                    <View style={styles.sectionBadgeRow}>
                      <View style={styles.sectionRoutinePill}>
                        <Ionicons name="calendar-outline" size={11} color={colors.primary} />
                        <Text style={styles.sectionRoutineBadgeText}>{routineName}</Text>
                      </View>
                      <View style={item.required ? styles.requiredBadgeWrap : styles.optionalBadgeWrap}>
                        <Text style={item.required ? styles.requiredBadgeText : styles.optionalBadgeText}>
                          {item.required ? "Obligatoria" : "Opcional"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.sectionTitlePremium}>{item.name}</Text>
                  </View>
                </View>

                {item.description ? (
                  <View style={styles.sectionDescBoxPremium}>
                    <Text style={styles.sectionDescriptionTextPremium} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.sectionCardBottomRow}>
                  <View style={styles.sectionMetaTasksPill}>
                    <Ionicons name="checkbox-outline" size={13} color={colors.primary} />
                    <Text style={styles.sectionMetaTasksText}>
                      {item.tasksCount ?? 0} actividades configuradas
                    </Text>
                  </View>

                  <View style={styles.sectionCardActionsRow}>
                    <View style={styles.sectionOpenBtnPremium}>
                      <Text style={styles.sectionOpenBtnTextPremium}>Abrir Rutina</Text>
                      <Ionicons name="arrow-forward-circle" size={18} color={colors.white} />
                    </View>
                    {user?.role === "admin" && (
                      <Pressable
                        style={styles.cardAdminBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate("AdminRoutineManager", {
                            routineId,
                            routineName,
                          });
                        }}
                      >
                        <Ionicons name="settings-outline" size={18} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        /* 6. Vista de Historial / Auditoría — agrupado por día */
        <FlatList
          data={historyByDay}
          keyExtractor={(group) => group.day}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListFooterComponent={
            historyDaysBack < 91 ? (
              <Pressable
                style={styles.loadMoreHistoryBtn}
                onPress={() => setHistoryDaysBack((prev) => Math.min(prev + 4, 91))}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.loadMoreHistoryText}>Ver 4 días más ({historyDaysBack + 1} días en total)</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={styles.empty}>No hay historial de rutinas ejecutadas en los últimos 14 días.</Text>
              </View>
            ) : null
          }
          renderItem={({ item: group }) => {
            const isOpen = expandedHistoryDays.has(group.day);
            const completadas = group.items.filter((r) => r.status === "completed").length;
            const totalIncidents = group.items.reduce((sum, r) => sum + (r.incidentsCount || 0), 0);

            return (
              <View style={styles.dayGroup}>
                <Pressable style={styles.dayHeader} onPress={() => toggleHistoryDay(group.day)}>
                  <View style={styles.dayHeaderLeft}>
                    <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={16} color={colors.primary} />
                    <Text style={styles.dayHeaderLabel}>{formatDayLabel(group.day)}</Text>
                  </View>
                  <View style={styles.dayHeaderBadges}>
                    <View style={styles.dayCountBadge}>
                      <Text style={styles.dayCountBadgeText}>
                        {group.items.length} {group.items.length === 1 ? "rutina" : "rutinas"}
                      </Text>
                    </View>
                    <View style={styles.dayCompletedBadge}>
                      <Text style={styles.dayCompletedBadgeText}>{completadas} completadas</Text>
                    </View>
                    {totalIncidents > 0 && (
                      <View style={styles.dayIncidentBadge}>
                        <Ionicons name="warning" size={10} color={colors.danger} />
                        <Text style={styles.dayIncidentBadgeText}>{totalIncidents}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {isOpen &&
                  group.items.map((item) => {
                    const routineName = typeof item.routine === "object" && item.routine?.name ? item.routine.name : "Rutina";
                    const routineIcon = typeof item.routine === "object" && item.routine?.icon ? item.routine.icon : "checklist";
                    const isCompleted = item.status === "completed";
                    const percentage = item.progress?.percentage ?? 0;

                    return (
                      <Pressable
                        key={item._id}
                        style={({ pressed }) => [styles.card, styles.dayCard, pressed && styles.cardPressed]}
                        onPress={() => openHistoryRoutine(item)}
                      >
                        <View style={styles.cardHeader}>
                          <View style={[styles.iconBadge, isCompleted && styles.iconBadgeCompleted]}>
                            <RoutineIcon name={routineIcon} contextText={routineName} size={24} color={isCompleted ? colors.success : colors.primary} />
                          </View>
                          <View style={styles.cardHeaderText}>
                            <View style={styles.cardTitleRow}>
                              <Text style={styles.cardTitle}>{routineName}</Text>
                              <View style={[styles.shiftBadge, item.shift === "cierre" ? styles.shiftBadgeCierre : styles.shiftBadgeApertura]}>
                                <Ionicons
                                  name={item.shift === "cierre" ? "moon-outline" : "sunny-outline"}
                                  size={10}
                                  color={colors.white}
                                />
                                <Text style={styles.shiftBadgeText}>{item.shift?.toUpperCase()}</Text>
                              </View>
                            </View>

                            <View style={styles.historyMetaRow}>
                              <View style={styles.metaPill}>
                                <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                                <Text style={styles.cardMeta}>{item.employee?.name || "Colaborador"}</Text>
                              </View>
                              <View style={styles.metaPill}>
                                <Ionicons name="camera-outline" size={12} color={colors.textMuted} />
                                <Text style={styles.cardMeta}>{item.photosCount || 0} fotos</Text>
                              </View>
                              {item.incidentsCount > 0 && (
                                <View style={styles.metaPill}>
                                  <Ionicons name="warning" size={12} color={colors.danger} />
                                  <Text style={[styles.cardMeta, { color: colors.danger, fontWeight: "700" }]}>
                                    {item.incidentsCount} incidencias
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.progressWrap}>
                          <ProgressBar percentage={percentage} />
                          <View style={styles.progressInfoRow}>
                            <Text style={styles.progressLabel}>
                              {item.progress?.completedActivities ?? 0} de {item.progress?.totalActivities ?? 0} actividades
                            </Text>
                            <Text style={[styles.progressLabel, { fontWeight: "700", color: isCompleted ? colors.success : colors.primary }]}>
                              {percentage}% {isCompleted ? "(Completada)" : "(En progreso)"}
                            </Text>
                          </View>
                        </View>

                        <Pressable style={[styles.actionButton, styles.actionButtonActive]} onPress={() => openHistoryRoutine(item)}>
                          <Text style={styles.actionButtonText}>Auditar Rutina</Text>
                          <Ionicons name="shield-checkmark-outline" size={18} color={colors.white} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
              </View>
            );
          }}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva rutina</Text>

            <Text style={styles.modalLabel}>Nombre</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Revisión de cámaras"
              placeholderTextColor={colors.textMuted}
              value={newRoutineName}
              onChangeText={setNewRoutineName}
            />

            <Text style={styles.modalLabel}>Turno</Text>
            <View style={styles.modalPillRow}>
              {(["apertura", "cierre", "ambos"] as const).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.modalPill, newRoutineShift === s && styles.modalPillActive]}
                  onPress={() => setNewRoutineShift(s)}
                >
                  <Text style={[styles.modalPillText, newRoutineShift === s && styles.modalPillTextActive]}>
                    {s === "apertura" ? "Apertura" : s === "cierre" ? "Cierre" : "Ambos"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.modalPillRow}>
              {(["apertura", "operacion", "cierre", "cambio_turno", "custom"] as RoutineType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.modalPill, newRoutineType === t && styles.modalPillActive]}
                  onPress={() => setNewRoutineType(t)}
                >
                  <Text style={[styles.modalPillText, newRoutineType === t && styles.modalPillTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Horario (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. 06:00 - 08:00"
              placeholderTextColor={colors.textMuted}
              value={newRoutineSchedule}
              onChangeText={setNewRoutineSchedule}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setCreateModalVisible(false)} disabled={creatingRoutine}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalBtnSave} onPress={handleCreateRoutine} disabled={creatingRoutine}>
                {creatingRoutine ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Crear</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginRight: spacing.sm + 2,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerText: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  greeting: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  establishment: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  adminRoleBadge: {
    backgroundColor: colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adminRoleBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  employeeRoleBadge: {
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.2)",
  },
  employeeRoleBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  usersButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.2)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(198, 40, 40, 0.08)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(198, 40, 40, 0.2)",
  },
  logout: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 12,
  },

  /* Hero Card */
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  heroCardApertura: {
    backgroundColor: colors.primary,
  },
  heroCardCierre: {
    backgroundColor: "#1A2238",
  },
  heroCardAdmin: {
    backgroundColor: "#1C0A0E",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.45)",
  },
  heroShiftBadgeAdmin: {
    backgroundColor: "rgba(212, 175, 55, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  heroShiftTextAdmin: {
    color: "#FDE68A",
  },
  heroProgressBarFillAdmin: {
    backgroundColor: "#D4AF37",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  heroShiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  heroShiftText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  heroProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  heroProgressTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  heroProgressSubtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  heroPercentageText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  heroProgressBarTrack: {
    height: 7,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  heroProgressBarFill: {
    height: "100%",
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.sm,
  },
  heroStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  heroStatValue: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },

  /* Tabs */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.sm,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  tabButtonTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  adminFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(122, 28, 40, 0.05)",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.12)",
  },
  adminFilterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  adminFilterPills: {
    flexDirection: "row",
    gap: 6,
  },
  adminFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.15)",
  },
  adminFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  adminFilterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  adminFilterPillTextActive: {
    color: colors.white,
  },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.15)",
    gap: spacing.xs,
  },
  adminBannerText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    flex: 1,
  },

  /* List & Cards */
  list: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(122, 28, 40, 0.15)",
  },
  iconBadgeCompleted: {
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    borderColor: "rgba(46, 125, 50, 0.25)",
  },
  iconBadgeInProgress: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  statusCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.25)",
  },
  statusCompletedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "800",
  },
  statusProgressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusProgressText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: "800",
  },
  statusPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPendingText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  progressWrap: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  progressInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  progressCompletedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.md - 2,
    minHeight: 44,
    borderRadius: radius.sm,
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonCompleted: {
    backgroundColor: colors.textMuted,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  cardAdminBtn: {
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Secciones & Historial */
  sectionPremiumCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionPremiumHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm + 2,
  },
  sectionIconBadgePremium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(122, 28, 40, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  sectionTitleBlockPremium: {
    flex: 1,
  },
  sectionTitlePremium: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  sectionDescBoxPremium: {
    backgroundColor: "rgba(122, 28, 40, 0.03)",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.md,
  },
  sectionDescriptionTextPremium: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  sectionCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(122, 28, 40, 0.08)",
    paddingTop: spacing.sm + 2,
    gap: spacing.sm,
  },
  sectionMetaTasksPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(122, 28, 40, 0.06)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  sectionMetaTasksText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  sectionOpenBtnPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionOpenBtnTextPremium: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
  },
  sectionBadgeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sectionRoutinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionRoutineBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  requiredBadgeWrap: {
    backgroundColor: "rgba(198, 40, 40, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  optionalBadgeWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionalBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shiftBadgeApertura: {
    backgroundColor: colors.primary,
  },
  shiftBadgeCierre: {
    backgroundColor: "#1A2238",
  },
  shiftBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  historyMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },

  /* Historial agrupado por día */
  dayGroup: {
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  dayHeaderLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    textTransform: "capitalize",
  },
  dayHeaderBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dayCountBadge: {
    backgroundColor: "rgba(122, 28, 40, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayCountBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  dayCompletedBadge: {
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayCompletedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },
  dayIncidentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(198, 40, 40, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayIncidentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },
  dayCard: {
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  loadMoreHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  loadMoreHistoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  createRoutineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  createRoutineBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  modalPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  modalPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  modalPillTextActive: {
    color: colors.white,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancelText: {
    color: colors.text,
    fontWeight: "600",
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSaveText: {
    color: colors.white,
    fontWeight: "700",
  },
});
