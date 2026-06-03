import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

export function StagingBanner() {
  if (process.env.EXPO_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>STAGING ENVIRONMENT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#f59e0b",
    paddingVertical: 4,
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 4 : 4,
  },
  text: {
    color: "#78350f",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.8,
  },
});
