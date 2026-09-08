import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { RootStackParamList } from "./types";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import RoutineDetailScreen from "../screens/RoutineDetailScreen";
import SectionDetailScreen from "../screens/SectionDetailScreen";
import RunSummaryScreen from "../screens/RunSummaryScreen";
import AdminRoutineManagerScreen from "../screens/AdminRoutineManagerScreen";
import UsersManagerScreen from "../screens/UsersManagerScreen";

import ThematicSplash from "../components/ThematicSplash";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isAuthenticating, isLoggingOut, authMessage, authMode } = useAuth();

  if (isLoading) {
    return (
      <ThematicSplash
        mode="general"
        message="Iniciando London Cafe CDJ..."
        subMessage="Preparando tus rutinas y tareas del día"
      />
    );
  }

  if (isAuthenticating) {
    return (
      <ThematicSplash
        mode={authMode}
        message={authMessage || "Iniciando sesión..."}
      />
    );
  }

  if (isLoggingOut) {
    return (
      <ThematicSplash
        mode="despedida"
        message="Cerrando sesión de forma segura..."
        subMessage="¡Gracias por tu dedicación en London Cafe!"
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="RoutineDetail"
              component={RoutineDetailScreen}
              options={({ route }) => ({ title: route.params.routineName })}
            />
            <Stack.Screen
              name="SectionDetail"
              component={SectionDetailScreen}
              options={({ route }) => ({ title: route.params.sectionName })}
            />
            <Stack.Screen name="RunSummary" component={RunSummaryScreen} options={{ title: "Resumen", headerBackVisible: false }} />
            <Stack.Screen
              name="AdminRoutineManager"
              component={AdminRoutineManagerScreen}
              options={({ route }) => ({ title: `Configurar: ${route.params.routineName}` })}
            />
            <Stack.Screen
              name="UsersManager"
              component={UsersManagerScreen}
              options={{ title: "Colaboradores" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
