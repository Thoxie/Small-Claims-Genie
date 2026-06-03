import { useAuth, useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StagingBanner } from "@/components/StagingBanner";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const onSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : user?.emailAddresses?.[0]?.emailAddress ?? "User";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StagingBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20 }]}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.initials, { color: colors.primaryForeground }]}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user?.emailAddresses?.[0]?.emailAddress}
          </Text>
        </View>

        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.row}>
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Email</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user?.emailAddresses?.[0]?.emailAddress}
                </Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.tealLight }]}>
                <Text style={[styles.verifiedText, { color: colors.teal }]}>Verified</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Feather name="info" size={18} color={colors.mutedForeground} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>App Version</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>1.0.0</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Feather name="shield" size={18} color={colors.mutedForeground} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>California Small Claims</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>Up to $12,500</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}
          onPress={onSignOut}
          testID="sign-out-btn"
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          Small Claims Genie provides general legal information, not legal advice. For advice about your specific situation, consult a licensed attorney.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginBottom: 32, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  initials: { fontSize: 28, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  name: { fontSize: 20, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  email: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular" },
  section: { marginBottom: 20, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", marginTop: 1 },
  verifiedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedText: { fontSize: 11, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  divider: { height: 1, marginHorizontal: 14 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  signOutText: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  legal: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", lineHeight: 16 },
});
