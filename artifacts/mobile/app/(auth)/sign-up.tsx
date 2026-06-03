import { useSignUp } from "@clerk/clerk-expo";
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

type Step = "form" | "verify";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const onSignUp = async () => {
    if (!isLoaded || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }> };
      setError(e?.errors?.[0]?.message ?? "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || !otp.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Verification could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }> };
      setError(e?.errors?.[0]?.message ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StagingBanner />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
          </View>

          {step === "form" ? (
            <View style={styles.form}>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>Create account</Text>
              <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
                Free to start — no credit card needed
              </Text>

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
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
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
                onPress={onSignUp}
                disabled={loading || !email.trim() || password.length < 8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                  Already have an account?{" "}
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Pressable>
                    <Text style={[styles.footerLink, { color: colors.teal }]}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>Verify your email</Text>
              <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to {email}
              </Text>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Verification code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontSize: 22, letterSpacing: 8, textAlign: "center" }]}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={onVerify}
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep("form"); setError(""); setOtp(""); }}>
                <Text style={[styles.footerLink, { color: colors.teal, textAlign: "center", marginTop: 8 }]}>
                  Back to sign up
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 36, gap: 8 },
  logoImage: { width: 220, height: 100 },
  form: { gap: 16 },
  formTitle: { fontSize: 22, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  formSubtitle: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", marginBottom: 4 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, fontFamily: "PlusJakartaSans_400Regular", borderWidth: 1 },
  passwordRow: { flexDirection: "row", gap: 8 },
  passwordInput: { flex: 1 },
  eyeBtn: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  submitBtn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitText: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular" },
  footerLink: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
});
