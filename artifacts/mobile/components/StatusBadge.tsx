import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Status = "draft" | "intake_complete" | "documents_uploaded" | "ready_to_file" | "filed";

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "#f2f3f7", text: "#454e5e" },
  intake_complete: { label: "Intake Done", bg: "#dbeafe", text: "#1e40af" },
  documents_uploaded: { label: "Docs Uploaded", bg: "#dcfce7", text: "#166534" },
  ready_to_file: { label: "Ready to File", bg: "#fef3c7", text: "#92400e" },
  filed: { label: "Filed", bg: "#ccf0ec", text: "#065f46" },
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.draft;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.2,
  },
});
