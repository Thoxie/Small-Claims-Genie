import { useSignIn } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StagingBanner } from "@/components/StagingBanner";
import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSignIn = async () => {
    if (!isLoaded || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Sign in could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }> };
      setError(e?.errors?.[0]?.message ?? "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StagingBanner />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require("@/assets/images/logo.jpg")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Your AI-powered legal assistant
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Welcome back</Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                testID="email-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  testID="password-input"
                />
                <TouchableOpacity
                  style={[styles.eyeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={onSignIn}
              disabled={loading || !email.trim() || !password}
              testID="sign-in-btn"
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Don't have an account?{" "}
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text style={[styles.footerLink, { color: colors.teal }]}>Sign Up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 40, gap: 8 },
  logoImage: { width: 220, height: 100 },
  tagline: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular" },
  form: { gap: 16 },
  formTitle: { fontSize: 22, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginBottom: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    borderWidth: 1,
  },
  passwordRow: { flexDirection: "row", gap: 8 },
  passwordInput: { flex: 1 },
  eyeBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular" },
  footerLink: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
});
