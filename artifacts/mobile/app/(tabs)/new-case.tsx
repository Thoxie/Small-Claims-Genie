import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useCreateCase } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function NewCaseTab() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const createCase = useCreateCase();
  const hasCreated = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/(auth)/sign-in");
      return;
    }
    if (hasCreated.current) return;
    hasCreated.current = true;
    createCase
      .mutateAsync({ data: { title: "New Case" } })
      .then((newCase) => {
        router.replace(`/case/${newCase.id}`);
      })
      .catch(() => {
        router.replace("/");
      });
  }, [isLoaded, isSignedIn, createCase, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
