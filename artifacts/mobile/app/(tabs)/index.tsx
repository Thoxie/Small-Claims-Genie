import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateCase, useGetCaseStats, useListCases } from "@workspace/api-client-react";
import { CaseCard } from "@/components/CaseCard";
import { StagingBanner } from "@/components/StagingBanner";
import { useLanguage } from "@/contexts/language-context";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { data: cases, isLoading, refetch, isRefetching } = useListCases();
  const { data: stats } = useGetCaseStats();
  const createCase = useCreateCase();
  const { lang, setLang } = useLanguage();
  const es = lang === "es";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onNewCase = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newCase = await createCase.mutateAsync({
        data: { title: "New Case" },
      });
      refetch();
      router.push(`/case/${newCase.id}`);
    } catch {
      Alert.alert(
        es ? "Error" : "Error",
        es ? "No se pudo crear el caso. Por favor inténtalo de nuevo." : "Could not create a new case. Please try again.",
      );
    }
  }, [createCase, router, refetch, es]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (es) {
      if (hour < 12) return "Buenos días";
      if (hour < 17) return "Buenas tardes";
      return "Buenas noches";
    }
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "";

  const caseList = cases ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StagingBanner />
      <FlatList
        data={caseList}
        keyExtractor={(c) => String(c.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingTop: topPad + 8, paddingBottom: bottomPad + 90 }]}
        ListHeaderComponent={
          <>
            {/* Greeting header */}
            <View style={styles.header}>
              {/* Left: shield icon + greeting */}
              <View style={styles.headerLeft}>
                <View style={[styles.shieldBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="shield" size={20} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {firstName ? firstName : es ? "Bienvenido" : "Welcome back"}
                  </Text>
                </View>
              </View>
              {/* Right: EN / ES language toggle */}
              <View style={[styles.langToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setLang("en")}
                  style={[styles.langBtn, styles.langBtnLeft, !es && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.langBtnText, { color: !es ? colors.primaryForeground : colors.mutedForeground }]}>
                    EN
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLang("es")}
                  style={[styles.langBtn, styles.langBtnRight, es && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.langBtnText, { color: es ? colors.primaryForeground : colors.mutedForeground }]}>
                    ES
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Stats row */}
            {stats && (
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{stats.total ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{es ? "Total" : "Total"}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: colors.teal }]}>{stats.byStatus?.['intake_complete'] ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{es ? "Listo" : "Ready"}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: colors.accent }]}>{stats.byStatus?.['filed'] ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{es ? "Presentado" : "Filed"}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {caseList.length > 0 ? (es ? "Tus Casos" : "Your Cases") : ""}
            </Text>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="briefcase" size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {es ? "Sin casos aún" : "No cases yet"}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                {es
                  ? "Crea tu primer caso para comenzar. Toma unos 5 minutos completar el formulario."
                  : "Create your first case to get started. It takes about 5 minutes to complete the intake form."}
              </Text>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
                onPress={onNewCase}
                disabled={createCase.isPending}
              >
                {createCase.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
                    {es ? "Iniciar Nuevo Caso" : "Start a New Case"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CaseCard
            item={item}
            onPress={() => router.push(`/case/${item.id}`)}
          />
        )}
      />

      {/* FAB */}
      {caseList.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 90 }]}
          onPress={onNewCase}
          disabled={createCase.isPending}
          testID="new-case-fab"
        >
          {createCase.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flexGrow: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  greeting: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" },
  name: { fontSize: 24, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  shieldBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  langToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 12,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnLeft: {
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  },
  langBtnRight: {
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular" },
  sectionTitle: { fontSize: 18, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  loadingWrap: { paddingTop: 80, alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  emptyBody: { fontSize: 14, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular", lineHeight: 22 },
  startBtn: { height: 52, borderRadius: 12, paddingHorizontal: 32, alignItems: "center", justifyContent: "center", marginTop: 8 },
  startBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
