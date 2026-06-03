import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";

interface Case {
  id: number;
  title: string;
  status: string;
  claimAmount?: number | null;
  defendantName?: string | null;
  readinessScore?: number | null;
  claimType?: string | null;
}

interface Props {
  item: Case;
  onPress: () => void;
}

export function CaseCard({ item, onPress }: Props) {
  const colors = useColors();
  const amount = item.claimAmount
    ? `$${Number(item.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`case-card-${item.id}`}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {item.title || "Untitled Case"}
          </Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.meta}>
        {item.defendantName ? (
          <View style={styles.metaRow}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              vs. {item.defendantName}
            </Text>
          </View>
        ) : null}
        {amount ? (
          <View style={styles.metaRow}>
            <Feather name="dollar-sign" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{amount}</Text>
          </View>
        ) : null}
        {item.claimType ? (
          <View style={styles.metaRow}>
            <Feather name="tag" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.claimType}</Text>
          </View>
        ) : null}
      </View>

      {typeof item.readinessScore === "number" && item.readinessScore > 0 ? (
        <View style={styles.readiness}>
          <View style={[styles.readinessBar, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.readinessFill,
                {
                  width: `${item.readinessScore}%` as `${number}%`,
                  backgroundColor: item.readinessScore >= 70 ? colors.teal : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.readinessText, { color: colors.mutedForeground }]}>
            {item.readinessScore}% ready
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  top: {
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  readiness: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readinessBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  readinessFill: {
    height: "100%",
    borderRadius: 2,
  },
  readinessText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    minWidth: 60,
    textAlign: "right",
  },
});
