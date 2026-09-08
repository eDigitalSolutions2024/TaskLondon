import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export type SplashMode = "general" | "apertura" | "cierre" | "despedida" | "admin";

interface ThematicSplashProps {
  mode?: SplashMode;
  message?: string;
  subMessage?: string;
  isOverlay?: boolean;
}

interface ThemeConfig {
  isLight?: boolean;
  background: string;
  overlayBg: string;
  glowTop: string;
  glowCenter: string;
  accentPrimary: string;
  accentSecondary: string;
  accentRing: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeLabel: string;
  title: string;
  titleColor: string;
  mainTextColor: string;
  subTextColor: string;
  iconBadgeBg: string;
  iconBadgeBorder: string;
  iconColor: string;
  progressTrack: string;
  progressBar: string;
  footerTextColor: string;
  mainIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  phrases: string[];
  bgIcons: Array<{
    name: keyof typeof MaterialCommunityIcons.glyphMap;
    topPercent: number;
    left?: number;
    right?: number;
    rotate: string;
    size: number;
  }>;
}

const THEMES: Record<SplashMode, ThemeConfig> = {
  general: {
    isLight: true,
    background: "#F8F5F2", // Crema marfil oficial de la app
    overlayBg: "rgba(248, 245, 242, 0.96)",
    glowTop: "rgba(122, 28, 40, 0.12)",
    glowCenter: "rgba(122, 28, 40, 0.08)",
    accentPrimary: "#7A1C28", // Vino Tinto Borgoña característico London Cafe
    accentSecondary: "#520E17",
    accentRing: "rgba(122, 28, 40, 0.35)",
    cardBg: "#FFFFFF",
    cardBorder: "#E8DFD8",
    cardShadow: "#520E17",
    badgeBg: "rgba(122, 28, 40, 0.08)",
    badgeBorder: "rgba(122, 28, 40, 0.25)",
    badgeText: "#7A1C28",
    badgeLabel: "LONDON CAFE CDJ",
    title: "Operaciones & Calidad",
    titleColor: "#241819",
    mainTextColor: "#241819",
    subTextColor: "#736365",
    iconBadgeBg: "#7A1C28",
    iconBadgeBorder: "#520E17",
    iconColor: "#FFFFFF",
    progressTrack: "rgba(122, 28, 40, 0.12)",
    progressBar: "#7A1C28",
    footerTextColor: "#736365",
    mainIcon: "coffee",
    phrases: [
      "Preparando la mejor taza de café y tus rutinas...",
      "Sincronizando listas de verificación y calidad...",
      "Asegurando el estándar London Cafe...",
      "Conectando con la base de datos de operaciones...",
    ],
    bgIcons: [
      { name: "coffee", topPercent: 0.1, left: 30, rotate: "-15deg", size: 52 },
      { name: "food-croissant", topPercent: 0.16, right: 35, rotate: "20deg", size: 48 },
      { name: "clock-outline", topPercent: 0.8, left: 35, rotate: "10deg", size: 44 },
      { name: "tea", topPercent: 0.86, right: 40, rotate: "-20deg", size: 50 },
    ],
  },
  admin: {
    isLight: false,
    background: "#12080A", // Royal Burgundy Dark
    overlayBg: "rgba(18, 8, 10, 0.96)",
    glowTop: "rgba(212, 175, 55, 0.28)", // Oro imperial
    glowCenter: "rgba(122, 28, 40, 0.35)", // Borgoña
    accentPrimary: "#D4AF37", // Oro
    accentSecondary: "#F59E0B",
    accentRing: "rgba(212, 175, 55, 0.5)",
    cardBg: "rgba(35, 12, 18, 0.96)",
    cardBorder: "rgba(212, 175, 55, 0.45)",
    cardShadow: "#000000",
    badgeBg: "rgba(212, 175, 55, 0.15)",
    badgeBorder: "rgba(212, 175, 55, 0.4)",
    badgeText: "#FDE68A",
    badgeLabel: "PANEL DE SUPERVISIÓN",
    title: "Administración & Control Global",
    titleColor: "#FFFFFF",
    mainTextColor: "#FFFFFF",
    subTextColor: "#FDE68A",
    iconBadgeBg: "rgba(122, 28, 40, 0.95)",
    iconBadgeBorder: "#D4AF37",
    iconColor: "#FDE68A",
    progressTrack: "rgba(255, 255, 255, 0.12)",
    progressBar: "#D4AF37",
    footerTextColor: "rgba(255, 255, 255, 0.8)",
    mainIcon: "shield-crown",
    phrases: [
      "Iniciando modo supervisor sin restricción de turno...",
      "Accediendo a auditorías globales, historial y sucursales...",
      "Cargando métricas y gestión de rutinas activas...",
      "Sincronizando privilegios de administrador...",
    ],
    bgIcons: [
      { name: "shield-crown-outline", topPercent: 0.1, left: 30, rotate: "-10deg", size: 52 },
      { name: "chart-box-outline", topPercent: 0.16, right: 35, rotate: "15deg", size: 48 },
      { name: "account-cog-outline", topPercent: 0.8, left: 35, rotate: "12deg", size: 46 },
      { name: "file-document-check-outline", topPercent: 0.86, right: 40, rotate: "-15deg", size: 48 },
    ],
  },
  apertura: {
    isLight: false,
    background: "#1F0E04", // Amanecer cálido / Golden sunrise coffee
    overlayBg: "rgba(26, 12, 4, 0.94)",
    glowTop: "rgba(234, 88, 12, 0.45)",
    glowCenter: "rgba(245, 158, 11, 0.2)",
    accentPrimary: "#F59E0B",
    accentSecondary: "#FDE047",
    accentRing: "rgba(245, 158, 11, 0.55)",
    cardBg: "rgba(48, 20, 6, 0.95)",
    cardBorder: "rgba(245, 158, 11, 0.5)",
    cardShadow: "#000000",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeBorder: "rgba(245, 158, 11, 0.45)",
    badgeText: "#FDE68A",
    badgeLabel: "TURNO DE APERTURA",
    title: "¡Buenos Días, Equipo!",
    titleColor: "#FFFFFF",
    mainTextColor: "#FFFFFF",
    subTextColor: "#E2E8F0",
    iconBadgeBg: "rgba(180, 83, 9, 0.85)",
    iconBadgeBorder: "#F59E0B",
    iconColor: "#FDE68A",
    progressTrack: "rgba(255, 255, 255, 0.12)",
    progressBar: "#F59E0B",
    footerTextColor: "rgba(255, 255, 255, 0.7)",
    mainIcon: "weather-sunset-up",
    phrases: [
      "Calibrando molinos, dosis de espresso y vapor...",
      "Revisando temperaturas de refrigeradores y lácteos...",
      "Organizando barra, vitrinas y mise en place...",
      "¡Todo listo para abrir puertas y servir el mejor café!",
    ],
    bgIcons: [
      { name: "weather-sunny", topPercent: 0.1, left: 30, rotate: "10deg", size: 54 },
      { name: "food-croissant", topPercent: 0.16, right: 35, rotate: "-15deg", size: 50 },
      { name: "coffee-maker", topPercent: 0.8, left: 35, rotate: "-10deg", size: 46 },
      { name: "muffin", topPercent: 0.86, right: 40, rotate: "18deg", size: 48 },
    ],
  },
  cierre: {
    isLight: false,
    background: "#0A0D1A", // Noche azul zafiro & vino oscuro
    overlayBg: "rgba(10, 13, 26, 0.95)",
    glowTop: "rgba(59, 130, 246, 0.35)",
    glowCenter: "rgba(147, 197, 253, 0.15)",
    accentPrimary: "#60A5FA",
    accentSecondary: "#93C5FD",
    accentRing: "rgba(96, 165, 250, 0.55)",
    cardBg: "rgba(17, 24, 48, 0.95)",
    cardBorder: "rgba(96, 165, 250, 0.45)",
    cardShadow: "#000000",
    badgeBg: "rgba(59, 130, 246, 0.18)",
    badgeBorder: "rgba(96, 165, 250, 0.45)",
    badgeText: "#BFDBFE",
    badgeLabel: "TURNO DE CIERRE",
    title: "¡Buen Cierre de Servicio!",
    titleColor: "#FFFFFF",
    mainTextColor: "#FFFFFF",
    subTextColor: "#E2E8F0",
    iconBadgeBg: "rgba(30, 58, 138, 0.85)",
    iconBadgeBorder: "#60A5FA",
    iconColor: "#BFDBFE",
    progressTrack: "rgba(255, 255, 255, 0.12)",
    progressBar: "#60A5FA",
    footerTextColor: "rgba(255, 255, 255, 0.7)",
    mainIcon: "weather-night",
    phrases: [
      "Iniciando purga y limpieza profunda de máquinas...",
      "Auditando inventarios, mermas y corte de turno...",
      "Verificando candados, refrigeración y apagado general...",
      "¡Dejando la estación impecable para el siguiente turno!",
    ],
    bgIcons: [
      { name: "weather-night", topPercent: 0.1, left: 30, rotate: "-12deg", size: 52 },
      { name: "shield-check-outline", topPercent: 0.16, right: 35, rotate: "15deg", size: 48 },
      { name: "broom", topPercent: 0.8, left: 35, rotate: "20deg", size: 46 },
      { name: "lock-outline", topPercent: 0.86, right: 40, rotate: "-10deg", size: 48 },
    ],
  },
  despedida: {
    isLight: false,
    background: "#14070A", // Vino tinto oscuro de despedida
    overlayBg: "rgba(20, 7, 10, 0.96)",
    glowTop: "rgba(198, 40, 40, 0.35)",
    glowCenter: "rgba(122, 28, 40, 0.22)",
    accentPrimary: "#E57373",
    accentSecondary: "#FFCDD2",
    accentRing: "rgba(229, 115, 115, 0.5)",
    cardBg: "rgba(38, 14, 20, 0.96)",
    cardBorder: "rgba(229, 115, 115, 0.4)",
    cardShadow: "#000000",
    badgeBg: "rgba(229, 115, 115, 0.18)",
    badgeBorder: "rgba(229, 115, 115, 0.45)",
    badgeText: "#FFCDD2",
    badgeLabel: "SESIÓN FINALIZADA",
    title: "¡Excelente Trabajo Hoy!",
    titleColor: "#FFFFFF",
    mainTextColor: "#FFFFFF",
    subTextColor: "#F3E8EE",
    iconBadgeBg: "rgba(122, 28, 40, 0.9)",
    iconBadgeBorder: "#E57373",
    iconColor: "#FFCDD2",
    progressTrack: "rgba(255, 255, 255, 0.12)",
    progressBar: "#E57373",
    footerTextColor: "rgba(255, 255, 255, 0.7)",
    mainIcon: "door-open",
    phrases: [
      "Guardando y sincronizando todas las rutinas...",
      "Cerrando sesión de forma segura...",
      "¡Gracias por tu dedicación en London Cafe!",
      "Que tengas un excelente descanso.",
    ],
    bgIcons: [
      { name: "heart-outline", topPercent: 0.1, left: 30, rotate: "-10deg", size: 50 },
      { name: "coffee", topPercent: 0.16, right: 35, rotate: "15deg", size: 48 },
      { name: "shield-check-outline", topPercent: 0.8, left: 35, rotate: "12deg", size: 46 },
      { name: "door-open", topPercent: 0.86, right: 40, rotate: "-15deg", size: 48 },
    ],
  },
};

export default function ThematicSplash({
  mode = "general",
  message,
  subMessage,
  isOverlay = false,
}: ThematicSplashProps) {
  const theme = THEMES[mode] || THEMES.general;

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;
  const rotateGoldRing = useRef(new Animated.Value(0)).current;
  const steamAnim1 = useRef(new Animated.Value(0)).current;
  const steamAnim2 = useRef(new Animated.Value(0)).current;
  const progressBar = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-100)).current;

  // Rotación de frases dinámicas
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);

  useEffect(() => {
    // 1. Fade in inicial
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // 2. Logo entrance + suave pulso respiración
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const logoBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.98,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    logoBreath.start();

    // 3. Anillos de luz expansivos (Ripple Rings)
    const runPulseRing = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const ring1 = runPulseRing(pulseRing1, 0);
    const ring2 = runPulseRing(pulseRing2, 900);
    ring1.start();
    ring2.start();

    // 4. Rotación del anillo decorativo exterior
    const ringRotation = Animated.loop(
      Animated.timing(rotateGoldRing, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    ringRotation.start();

    // 5. Humo / Vapor de café
    const createSteamLoop = (anim: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const steam1 = createSteamLoop(steamAnim1, 1400, 0);
    const steam2 = createSteamLoop(steamAnim2, 1600, 400);
    steam1.start();
    steam2.start();

    // 6. Barra de carga interactiva (progresión continua en 5s)
    const barProgress = Animated.timing(progressBar, {
      toValue: 1,
      duration: 4800,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: false,
    });
    barProgress.start();

    // 7. Shimmer destello continuo
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 320,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    // Ciclo de frases cada 1.5s
    const phraseInterval = setInterval(() => {
      setCurrentPhraseIdx((prev) => (prev + 1) % theme.phrases.length);
    }, 1500);

    return () => {
      logoBreath.stop();
      ring1.stop();
      ring2.stop();
      ringRotation.stop();
      steam1.stop();
      steam2.stop();
      shimmerLoop.stop();
      clearInterval(phraseInterval);
    };
  }, [theme]);

  const spin = rotateGoldRing.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const ring1Scale = pulseRing1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.65],
  });

  const ring1Opacity = pulseRing1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const ring2Scale = pulseRing2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.65],
  });

  const ring2Opacity = pulseRing2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const steam1Y = steamAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const steam1Opacity = steamAnim1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.9, 0],
  });

  const steam2Y = steamAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });

  const steam2Opacity = steamAnim2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 0],
  });

  const barWidth = progressBar.interpolate({
    inputRange: [0, 1],
    outputRange: ["4%", "100%"],
  });

  const displayMessage =
    message || (mode === "admin" ? "Iniciando Panel de Administración" : mode === "apertura" ? "Iniciando Turno de Apertura" : mode === "cierre" ? "Iniciando Turno de Cierre" : "Iniciando London Cafe CDJ...");

  return (
    <Animated.View
      style={[
        isOverlay
          ? [styles.overlayContainer, { backgroundColor: theme.overlayBg }]
          : [styles.fullContainer, { backgroundColor: theme.background }],
        { opacity: fadeAnim },
      ]}
    >
      {/* Atmósfera de iluminación & Auras de color personalizadas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.ambientGlowTop, { backgroundColor: theme.glowTop }]} />
        <View style={[styles.ambientGlowCenter, { backgroundColor: theme.glowCenter }]} />

        {/* Íconos de fondo temáticos */}
        {theme.bgIcons.map((ic, i) => (
          <MaterialCommunityIcons
            key={i}
            name={ic.name}
            size={ic.size}
            color={theme.accentPrimary}
            style={[
              styles.floatingIcon,
              {
                top: height * ic.topPercent,
                left: ic.left,
                right: ic.right,
                opacity: theme.isLight ? 0.09 : 0.14,
                transform: [{ rotate: ic.rotate }],
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        {/* Zona del Logo con Anillos de Luz Radiantes */}
        <View style={styles.logoStage}>
          {/* Anillos que se expanden hacia afuera */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: theme.accentPrimary,
                backgroundColor: theme.glowCenter,
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: theme.accentPrimary,
                backgroundColor: theme.glowCenter,
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />

          {/* Anillo decorativo giratorio */}
          <Animated.View
            style={[
              styles.rotatingBorderRing,
              {
                borderColor: theme.accentRing,
                transform: [{ rotate: spin }],
              },
            ]}
          />

          {/* Logo Principal con pulso y marco */}
          <Animated.View
            style={[
              styles.logoBox,
              {
                borderColor: theme.accentPrimary,
                shadowColor: theme.cardShadow,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("../../assets/Logo.webp")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Insignia / Badge del Turno */}
        <View
          style={[
            styles.brandRow,
            {
              backgroundColor: theme.badgeBg,
              borderColor: theme.badgeBorder,
            },
          ]}
        >
          <MaterialCommunityIcons name={theme.mainIcon} size={14} color={theme.accentPrimary} />
          <Text style={[styles.royalLabel, { color: theme.badgeText }]}>{theme.badgeLabel}</Text>
          <MaterialCommunityIcons name={theme.mainIcon} size={14} color={theme.accentPrimary} />
        </View>

        <Text style={[styles.brandTitle, { color: theme.titleColor }]}>{theme.title}</Text>

        {/* Tarjeta / Banner Llamativo de Carga */}
        <View
          style={[
            styles.bannerCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              shadowColor: theme.cardShadow,
            },
          ]}
        >
          {/* Cabecera del banner con animación */}
          <View style={styles.bannerHeader}>
            <View
              style={[
                styles.coffeeIconBadge,
                {
                  backgroundColor: theme.iconBadgeBg,
                  borderColor: theme.iconBadgeBorder,
                },
              ]}
            >
              {/* Vapores animados */}
              <Animated.View
                style={[
                  styles.steamWisp,
                  { left: 13, transform: [{ translateY: steam1Y }], opacity: steam1Opacity },
                ]}
              >
                <MaterialCommunityIcons name="water" size={12} color={theme.iconColor} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.steamWisp,
                  { left: 21, transform: [{ translateY: steam2Y }], opacity: steam2Opacity },
                ]}
              >
                <MaterialCommunityIcons name="water" size={10} color={theme.iconColor} />
              </Animated.View>
              <MaterialCommunityIcons name={theme.mainIcon} size={24} color={theme.iconColor} />
            </View>

            <View style={styles.bannerTextWrap}>
              <Text style={[styles.bannerMainText, { color: theme.mainTextColor }]}>{displayMessage}</Text>
              <Text style={[styles.bannerSubText, { color: theme.subTextColor }]}>
                {subMessage || theme.phrases[currentPhraseIdx]}
              </Text>
            </View>
          </View>

          {/* Barra de progreso interactiva */}
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: barWidth, backgroundColor: theme.progressBar },
              ]}
            >
              {/* Shimmer de luz brillante */}
              <Animated.View
                style={[
                  styles.shimmerEffect,
                  { transform: [{ translateX: shimmer }] },
                ]}
              />
            </Animated.View>
          </View>

          {/* Footer de estado con indicador pulsante */}
          <View style={styles.statusFooter}>
            <View
              style={[
                styles.pulsingDot,
                {
                  backgroundColor: mode === "admin" ? "#D4AF37" : mode === "cierre" ? "#60A5FA" : mode === "apertura" ? "#F59E0B" : "#2E7D32",
                  shadowColor: mode === "admin" ? "#D4AF37" : mode === "cierre" ? "#60A5FA" : mode === "apertura" ? "#F59E0B" : "#2E7D32",
                },
              ]}
            />
            <Text style={[styles.statusFooterText, { color: theme.footerTextColor }]}>
              {mode === "admin"
                ? "Sesión Administrativa · Supervisión de todas las áreas"
                : mode === "apertura"
                ? "Calibrando estación de apertura en tiempo real"
                : mode === "cierre"
                ? "Auditando protocolo de cierre y sanitización"
                : "Sincronizando operaciones London Cafe en tiempo real"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    paddingHorizontal: 20,
  },
  ambientGlowTop: {
    position: "absolute",
    top: -100,
    alignSelf: "center",
    width: width * 1.2,
    height: 270,
    borderRadius: 135,
  },
  ambientGlowCenter: {
    position: "absolute",
    top: height * 0.28,
    alignSelf: "center",
    width: 290,
    height: 290,
    borderRadius: 145,
  },
  floatingIcon: {
    position: "absolute",
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  logoStage: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  rotatingBorderRing: {
    position: "absolute",
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  logoBox: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 8,
  },
  royalLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 22,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  coffeeIconBadge: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  steamWisp: {
    position: "absolute",
    top: -4,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerMainText: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  bannerSubText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    minHeight: 32,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
    position: "relative",
    overflow: "hidden",
  },
  shimmerEffect: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  statusFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  statusFooterText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
