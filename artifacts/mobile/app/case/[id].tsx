import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CaseWithDetails,
  useDeleteDocument,
  useGetCase,
  useListDocuments,
  useSaveIntakeProgress,
} from "@workspace/api-client-react";
import { AIGeniePanel } from "@/components/AIGeniePanel";
import { HelpGenieSheet } from "@/components/HelpGenieSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";
import { appendRNFile } from "@/lib/rn-form-data";
import { streamSSE } from "@/lib/stream";
import { getBaseUrl } from "@/lib/api-base-url";
import {
  requestNotificationPermission,
  scheduleHearingReminders,
} from "@/lib/notifications";

const TABS = [
  { key: "intake", label: "Intake", icon: "clipboard" as const },
  { key: "documents", label: "Documents", icon: "file-text" as const },
  { key: "demand-letter", label: "Demand Letter", icon: "mail" as const },
  { key: "court-forms", label: "Court Forms", icon: "printer" as const },
  { key: "hearing-prep", label: "Hearing Prep", icon: "mic" as const },
  { key: "deadlines", label: "Deadlines", icon: "calendar" as const },
  { key: "ai-chat", label: "AI Chat", icon: "message-circle" as const },
];

// ─── Intake Tab ──────────────────────────────────────────────────────────────

const CASE_REVIEW_PROMPT = "Please do a full review of my case. Check my venue, eligibility, prior demand, and overall readiness. Let me know if anything looks wrong or could hurt my case.";

function IntakeTab({ caseId, caseData, onCheckCase }: { caseId: number; caseData: CaseWithDetails; onCheckCase?: () => void }) {
  const colors = useColors();
  const save = useSaveIntakeProgress();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plaintiffName: caseData.plaintiffName ?? "",
    plaintiffPhone: caseData.plaintiffPhone ?? "",
    plaintiffAddress: caseData.plaintiffAddress ?? "",
    plaintiffCity: caseData.plaintiffCity ?? "",
    plaintiffState: caseData.plaintiffState ?? "CA",
    plaintiffZip: caseData.plaintiffZip ?? "",
    plaintiffEmail: caseData.plaintiffEmail ?? "",
    defendantName: caseData.defendantName ?? "",
    defendantPhone: caseData.defendantPhone ?? "",
    defendantAddress: caseData.defendantAddress ?? "",
    defendantCity: caseData.defendantCity ?? "",
    defendantState: caseData.defendantState ?? "CA",
    defendantZip: caseData.defendantZip ?? "",
    jurisdictionState: caseData.jurisdictionState ?? "CA",
    claimType: caseData.claimType ?? "",
    claimAmount: caseData.claimAmount != null ? String(caseData.claimAmount) : "",
    claimDescription: caseData.claimDescription ?? "",
    incidentDate: caseData.incidentDate ?? "",
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm((prev) => ({ ...prev, [key]: v })),
  });

  const onSaveStep = async (isLastStep = false, silent = false) => {
    if (isLastStep || step === 2) {
      const amt = Number(form.claimAmount);
      if (form.jurisdictionState === "TX" && form.claimAmount && amt > 20000) {
        Alert.alert(
          "Claim Amount Too High",
          "Texas small claims court has a $20,000 limit. Please reduce your claim amount or file in district court instead.",
        );
        return;
      }
      if (form.jurisdictionState === "FL" && form.claimAmount && amt > 8000) {
        Alert.alert(
          "Claim Amount Too High",
          "Florida small claims court has an $8,000 limit. Please reduce your claim amount or file in county court instead.",
        );
        return;
      }
    }
    setSaving(true);
    try {
      await save.mutateAsync({
        id: caseId,
        data: {
          data: {
            ...form,
            claimAmount: form.claimAmount ? Number(form.claimAmount) : undefined,
            jurisdictionState: form.jurisdictionState as "CA" | "FL" | "TX",
          },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isLastStep) {
        if (!silent) Alert.alert("Saved", "Your intake information has been saved.");
      } else {
        setStep(2);
      }
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );

  const Field = ({
    label,
    placeholder,
    valueKey,
    keyboardType = "default",
    multiline = false,
  }: {
    label: string;
    placeholder: string;
    valueKey: keyof typeof form;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    multiline?: boolean;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMultiline,
          { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        {...field(valueKey)}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Step indicator */}
      <View style={[styles.intakeStepBar, { borderBottomColor: colors.border }]}>
        {[
          { num: 1, label: "Parties" },
          { num: 2, label: "Claim" },
        ].map((s, i) => (
          <TouchableOpacity
            key={s.num}
            style={styles.intakeStepItem}
            onPress={() => setStep(s.num as 1 | 2)}
          >
            <View style={[
              styles.intakeStepDot,
              { backgroundColor: step === s.num ? colors.primary : step > s.num ? colors.teal : colors.border },
            ]}>
              {step > s.num
                ? <Feather name="check" size={10} color="#fff" />
                : <Text style={styles.intakeStepNum}>{s.num}</Text>}
            </View>
            <Text style={[styles.intakeStepLabel, { color: step === s.num ? colors.primary : colors.mutedForeground }]}>
              {s.label}
            </Text>
            {i < 1 && <View style={[styles.intakeStepLine, { backgroundColor: step > 1 ? colors.teal : colors.border }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {step === 1 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.tabContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title="YOUR INFORMATION" />
          <Field label="Full Name" placeholder="Jane Smith" valueKey="plaintiffName" />
          <Field label="Email" placeholder="jane@example.com" valueKey="plaintiffEmail" keyboardType="email-address" />
          <Field label="Phone" placeholder="(555) 555-5555" valueKey="plaintiffPhone" keyboardType="phone-pad" />
          <Field label="Street Address" placeholder="123 Main St" valueKey="plaintiffAddress" />
          <View style={styles.row3}>
            <View style={{ flex: 2 }}><Field label="City" placeholder="Los Angeles" valueKey="plaintiffCity" /></View>
            <View style={{ flex: 1 }}><Field label="State" placeholder="CA" valueKey="plaintiffState" /></View>
            <View style={{ flex: 1 }}><Field label="ZIP" placeholder="90001" valueKey="plaintiffZip" keyboardType="numeric" /></View>
          </View>

          <Section title="DEFENDANT INFORMATION" />
          <Field label="Defendant Name" placeholder="John Doe or ABC Corp" valueKey="defendantName" />
          <Field label="Phone" placeholder="(555) 555-5555" valueKey="defendantPhone" keyboardType="phone-pad" />
          <Field label="Street Address" placeholder="456 Oak Ave" valueKey="defendantAddress" />
          <View style={styles.row3}>
            <View style={{ flex: 2 }}><Field label="City" placeholder="Los Angeles" valueKey="defendantCity" /></View>
            <View style={{ flex: 1 }}><Field label="State" placeholder="CA" valueKey="defendantState" /></View>
            <View style={{ flex: 1 }}><Field label="ZIP" placeholder="90001" valueKey="defendantZip" keyboardType="numeric" /></View>
          </View>

          <Section title="FILING STATE" />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>
            Which state are you filing in?
          </Text>
          <View style={[styles.statePickerRow]}>
            {([
              { value: "CA", label: "California (CA)" },
              { value: "FL", label: "Florida (FL)" },
              { value: "TX", label: "Texas (TX)" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statePill,
                  { borderColor: form.jurisdictionState === opt.value ? colors.primary : colors.border,
                    backgroundColor: form.jurisdictionState === opt.value ? colors.primary : colors.secondary },
                ]}
                onPress={() => setForm((prev) => ({ ...prev, jurisdictionState: opt.value }))}
              >
                <Text style={[styles.statePillText, { color: form.jurisdictionState === opt.value ? colors.primaryForeground : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={() => onSaveStep(false)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save &amp; Continue</Text>
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.tabContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title="CLAIM DETAILS" />
          <Field label="Claim Type" placeholder="e.g. Security Deposit, Contract Dispute" valueKey="claimType" />
          <Field label="Amount Sought ($)" placeholder="e.g. 5000" valueKey="claimAmount" keyboardType="numeric" />
          {(() => {
            const amt = Number(form.claimAmount);
            if (form.jurisdictionState === "TX" && amt > 20000) {
              return (
                <View style={[styles.claimLimitWarn, { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }]}>
                  <Feather name="alert-triangle" size={14} color="#b45309" />
                  <Text style={[styles.claimLimitWarnText, { color: "#b45309" }]}>
                    Texas small claims limit is $20,000. Claims above this must be filed in district court.
                  </Text>
                </View>
              );
            }
            if (form.jurisdictionState === "FL" && amt > 8000) {
              return (
                <View style={[styles.claimLimitWarn, { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }]}>
                  <Feather name="alert-triangle" size={14} color="#b45309" />
                  <Text style={[styles.claimLimitWarnText, { color: "#b45309" }]}>
                    Florida small claims limit is $8,000. Claims above this must be filed in county court.
                  </Text>
                </View>
              );
            }
            return null;
          })()}
          <Field label="Incident Date" placeholder="YYYY-MM-DD" valueKey="incidentDate" />
          <Field
            label="Describe Your Claim"
            placeholder="Describe what happened, when, and why you are owed money..."
            valueKey="claimDescription"
            multiline
          />

          <View style={styles.intakeBtnRow}>
            <TouchableOpacity
              style={[styles.intakeBackBtn, { borderColor: colors.border }]}
              onPress={() => setStep(1)}
            >
              <Feather name="arrow-left" size={16} color={colors.foreground} />
              <Text style={[styles.intakeBackBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={() => onSaveStep(true)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="save" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Intake</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {onCheckCase && (
            <TouchableOpacity
              style={[styles.checkCaseBtn, { backgroundColor: "#f59e0b", opacity: saving ? 0.7 : 1 }]}
              onPress={async () => {
                await onSaveStep(true, true);
                onCheckCase();
              }}
              disabled={saving}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.checkCaseBtnText}>AI Genie Check My Case</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

function DocumentsTab({ caseId }: { caseId: number }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const { data: docs, isLoading, refetch } = useListDocuments(caseId);
  const deleteDoc = useDeleteDocument();
  const [uploading, setUploading] = useState(false);
  const baseUrl = getBaseUrl();

  const uploadFile = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      appendRNFile(formData, "file", { uri, name, type: mimeType });
      const response = await fetch(`${baseUrl}/api/cases/${caseId}/documents`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    } catch {
      Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to capture photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
      await uploadFile(asset.uri, name, asset.mimeType ?? "image/jpeg");
    }
  };

  const onPickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
      await uploadFile(asset.uri, name, asset.mimeType ?? "image/jpeg");
    }
  };

  const onPickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadFile(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
    }
  };

  const onDelete = (docId: number, name: string) => {
    Alert.alert("Delete Document", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc.mutateAsync({ id: caseId, docId });
          refetch();
        },
      },
    ]);
  };

  const onUpload = () => {
    Alert.alert("Upload Document", "Choose a source", [
      { text: "Take Photo", onPress: onTakePhoto },
      { text: "Photo Library", onPress: onPickImage },
      { text: "Files", onPress: onPickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={docs ?? []}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyCenter}>
            <Feather name="file" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No documents yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Upload receipts, contracts, photos, or any evidence to strengthen your case.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.docIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={20} color={colors.primary} />
            </View>
            <View style={styles.docInfo}>
              <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>{item.originalName}</Text>
              {item.ocrText && !item.ocrText.startsWith("[") ? (
                <View style={[styles.ocrBadge, { backgroundColor: colors.tealLight }]}>
                  <Feather name="check-circle" size={10} color={colors.teal} />
                  <Text style={[styles.ocrText, { color: colors.teal }]}>AI scanned</Text>
                </View>
              ) : item.ocrText?.startsWith("[Processing") ? (
                <View style={[styles.ocrBadge, { backgroundColor: "#fef3c7" }]}>
                  <ActivityIndicator size={10} color="#92400e" />
                  <Text style={[styles.ocrText, { color: "#92400e" }]}>Processing…</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(item.id, item.originalName)}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={styles.fabArea}>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
          onPress={onUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="upload" size={16} color={colors.primaryForeground} />
              <Text style={[styles.uploadBtnText, { color: colors.primaryForeground }]}>Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Demand Letter Tab ────────────────────────────────────────────────────────

const LETTER_TYPES = [
  { key: "demand", label: "Demand Letter", icon: "mail" as const, step: "Step 1", endpoint: "demand-letter", pdfEndpoint: "demand-letter/pdf", filename: "demand-letter.pdf" },
  { key: "settlement", label: "Settlement Offer", icon: "check-square" as const, step: "Step 2", endpoint: "settlement-letter", pdfEndpoint: "settlement-letter/pdf", filename: "settlement-offer.pdf" },
  { key: "agreement", label: "Settlement Agreement", icon: "pen-tool" as const, step: "Step 3", endpoint: "settlement-agreement", pdfEndpoint: "settlement-agreement/pdf", filename: "settlement-agreement.pdf" },
] as const;

const TONES = [
  { key: "formal", label: "Formal", desc: "Professional & calm" },
  { key: "firm", label: "Firm", desc: "Assertive & direct" },
  { key: "friendly", label: "Friendly", desc: "Amicable & open" },
] as const;

function DemandLetterTab({ caseId }: { caseId: number }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [letterType, setLetterType] = useState<"demand" | "settlement" | "agreement">("demand");
  const [tone, setTone] = useState<"formal" | "firm" | "friendly">("formal");
  const [letterText, setLetterText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const baseUrl = getBaseUrl();

  const activeType = LETTER_TYPES.find((t) => t.key === letterType) ?? LETTER_TYPES[0];

  const onGenerate = async () => {
    setGenerating(true);
    setLetterText("");
    try {
      const token = await getToken();
      await streamSSE(
        `${baseUrl}/api/cases/${caseId}/${activeType.endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ tone }),
        },
        (chunk) => setLetterText((prev) => prev + chunk),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert("Generation Failed", (err as Error).message ?? "Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const onDownload = async () => {
    if (!letterText) return;
    setDownloading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/cases/${caseId}/${activeType.pdfEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: letterText }),
      });
      if (!response.ok) throw new Error("PDF generation failed");
      const blob = await response.blob();
      if (Platform.OS !== "web") {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const path = `${FileSystem.documentDirectory}${activeType.filename}`;
          await FileSystem.writeAsStringAsync(path, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(path, { mimeType: "application/pdf" });
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch {
      Alert.alert("Download Failed", "Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.tabSectionTitle, { color: colors.foreground }]}>Letter Type</Text>
      <View style={styles.letterTypeRow}>
        {LETTER_TYPES.map((lt) => (
          <TouchableOpacity
            key={lt.key}
            style={[
              styles.letterTypeCard,
              { borderColor: letterType === lt.key ? colors.teal : colors.border, backgroundColor: letterType === lt.key ? colors.tealLight : colors.card },
            ]}
            onPress={() => { setLetterType(lt.key); setLetterText(""); }}
          >
            <View style={styles.letterTypeTop}>
              <Feather name={lt.icon} size={14} color={letterType === lt.key ? colors.teal : colors.mutedForeground} />
              <Text style={[styles.letterTypeStep, { color: letterType === lt.key ? colors.teal : colors.mutedForeground }]}>{lt.step}</Text>
            </View>
            <Text style={[styles.letterTypeLabel, { color: letterType === lt.key ? colors.teal : colors.foreground }]} numberOfLines={2}>
              {lt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.tabSectionTitle, { color: colors.foreground }]}>Select Tone</Text>
      <View style={styles.toneRow}>
        {TONES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.toneCard,
              { borderColor: tone === t.key ? colors.primary : colors.border, backgroundColor: tone === t.key ? colors.primary : colors.card },
            ]}
            onPress={() => setTone(t.key)}
          >
            <Text style={[styles.toneLabel, { color: tone === t.key ? colors.primaryForeground : colors.foreground }]}>
              {t.label}
            </Text>
            <Text style={[styles.toneDesc, { color: tone === t.key ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
              {t.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: colors.teal, opacity: generating ? 0.7 : 1 }]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.generateBtnText}>Generating…</Text>
          </>
        ) : (
          <>
            <Feather name="zap" size={16} color="#fff" />
            <Text style={styles.generateBtnText}>{letterText ? "Regenerate" : `Generate ${activeType.label}`}</Text>
          </>
        )}
      </TouchableOpacity>

      {letterText ? (
        <>
          <View style={[styles.letterPreview, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.letterText, { color: colors.foreground }]}>{letterText}</Text>
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, { backgroundColor: colors.accent, opacity: downloading ? 0.7 : 1 }]}
            onPress={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color={colors.accentForeground} size="small" />
            ) : (
              <>
                <Feather name="download" size={16} color={colors.accentForeground} />
                <Text style={[styles.downloadBtnText, { color: colors.accentForeground }]}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : !generating ? (
        <View style={styles.emptyCenter}>
          <Feather name={activeType.icon} size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No letter yet</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Generate a {activeType.label.toLowerCase()} based on your case facts.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Court Forms Tab ──────────────────────────────────────────────────────────

const CA_FORMS = [
  { key: "sc100", label: "SC-100", desc: "Plaintiff's Claim and ORDER to Go to Small Claims Court — file this first to start your case", path: "sc100", method: "GET" as const },
  { key: "sc103", label: "SC-103", desc: "Fictitious Business Name Declaration — required if defendant uses a DBA (trade name)", path: "sc103", method: "GET" as const },
  { key: "mc030", label: "MC-030", desc: "Declaration — attach extra facts or a supporting statement that doesn't fit on SC-100", path: "mc030", method: "GET" as const },
  { key: "sc104", label: "SC-104", desc: "Proof of Service — file after defendant is personally served by an adult", path: "sc104", method: "GET" as const },
  { key: "sc105", label: "SC-105", desc: "Amendment — correct or update information on a form already filed with the court", path: "sc105", method: "GET" as const },
];

const TX_FORMS = [
  { key: "tx-petition", label: "TX Petition", desc: "Texas Small Claims Petition — file this with the Justice of the Peace court to start your case", path: "tx/petition", method: "POST" as const },
];

const TX_FEE_SCHEDULE = [
  { range: "$0 – $200", fee: "$46" },
  { range: "$201 – $500", fee: "$71" },
  { range: "$501 – $1,000", fee: "$121" },
  { range: "$1,001 – $5,000", fee: "$221" },
  { range: "$5,001 – $10,000", fee: "$271" },
  { range: "$10,001 – $20,000", fee: "$321" },
];

const FL_FEE_SCHEDULE = [
  { range: "Under $100", fee: "$55" },
  { range: "$101 – $500", fee: "$80" },
  { range: "$501 – $2,500", fee: "$175" },
  { range: "Over $2,500", fee: "$300" },
];

const CA_COLLECT_STEPS = [
  { icon: "award" as const, title: "Obtain your judgment", body: "After you win, the court enters a judgment in your favor. Get a certified copy from the clerk — you'll need it for every enforcement step." },
  { icon: "trending-up" as const, title: "Locate the defendant's assets", body: "File a Judgment Debtor Examination (EJ-125) to compel the defendant to disclose bank accounts, employer, and property. Courts schedule within 30–45 days." },
  { icon: "file-text" as const, title: "Wage garnishment", body: "File a Writ of Execution (EJ-130), then serve the employer with an Earnings Withholding Order (WG-002). Up to 25% of disposable earnings per pay period." },
  { icon: "shield" as const, title: "Bank levy", body: "Use the same Writ of Execution to direct the sheriff to levy the defendant's bank account. Identify the bank and branch from the debtor examination." },
  { icon: "clock" as const, title: "Your judgment earns interest", body: "California judgments accrue interest at 10% per year from entry. Every dollar of unpaid principal continues to grow until collected." },
  { icon: "refresh-cw" as const, title: "Renew before 10 years", body: "Small claims judgments are valid for 10 years. File an Application for Renewal of Judgment (EJ-190) before expiration to keep your collection rights alive." },
];

const FL_COLLECT_STEPS = [
  { icon: "award" as const, title: "Obtain your judgment", body: "After you win, the court enters a judgment in your favor. Get a certified copy from the clerk — you'll need it for every collection step." },
  { icon: "trending-up" as const, title: "Fact Information Sheet (Form 7.343)", body: "File this form to compel the defendant to disclose bank accounts, employer, and assets. The court can sanction a defendant who refuses to cooperate." },
  { icon: "file-text" as const, title: "Wage garnishment", body: "File a Writ of Execution with the circuit court, then serve the defendant's employer. Florida limits garnishment to 25% of disposable earnings." },
  { icon: "shield" as const, title: "Bank levy", body: "Direct the county sheriff to levy the defendant's bank account using a Writ of Execution. Identify the bank from the Fact Information Sheet." },
  { icon: "file-text" as const, title: "Judgment lien certificate", body: "File a Judgment Lien Certificate with the Florida Dept. of State to create a lien on the defendant's personal property and real estate." },
  { icon: "refresh-cw" as const, title: "Valid for 20 years", body: "Florida judgments are valid for 20 years and can be renewed. Post-judgment interest accrues at the statutory rate under Fla. Stat. 55.03." },
];

const TX_COLLECT_STEPS = [
  { icon: "award" as const, title: "Obtain your judgment", body: "After you win, the court enters a judgment. Get a certified copy from the Justice of the Peace court clerk — you'll need it for every collection step." },
  { icon: "trending-up" as const, title: "Locate the defendant's assets", body: "Request a post-judgment deposition or written interrogatories to compel the defendant to disclose bank accounts, employer, and property." },
  { icon: "shield" as const, title: "Writ of Execution", body: "Direct the constable or sheriff to seize non-exempt personal property or levy a bank account. Identify the bank and branch from interrogatories." },
  { icon: "file-text" as const, title: "Abstract of Judgment", body: "Record an Abstract of Judgment with the county clerk to create a lien on any real estate the defendant owns in that county — now or in the future." },
  { icon: "clock" as const, title: "Post-judgment interest", body: "Texas judgments earn interest at the rate set by Tex. Fin. Code § 304.003 from the date of judgment. Check the current rate with the court clerk." },
  { icon: "refresh-cw" as const, title: "Valid for 10 years", body: "Texas judgments are dormant after 10 years but can be revived by filing a scire facias motion before expiration. Keep your certified copy and act early." },
];

function CourtFormsTab({ caseId, caseData }: { caseId: number; caseData: CaseWithDetails }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ key: string; label: string; desc: string; path: string; method: "GET" | "POST" } | null>(null);
  const baseUrl = getBaseUrl();

  const isTX = caseData.jurisdictionState === "TX";
  const isFL = caseData.jurisdictionState === "FL";

  const countyId = caseData.countyId ?? "";
  const isMiamiDade = countyId === "fl-miami-dade";
  const isVolusia = countyId === "fl-volusia";
  const flFormPath = isMiamiDade ? "fl/clkct333" : isVolusia ? "fl/cl219-volusia" : "fl/statement-of-claim";
  const flFormLabel = isMiamiDade ? "CLK/CT. 333" : isVolusia ? "CL-219" : null;
  const flFilingAddress = isMiamiDade
    ? "73 W. Flagler St., Suite 133, Miami"
    : isVolusia
    ? "101 N. Alabama Ave., DeLand"
    : "your county court clerk's office";

  const flFormKey = isMiamiDade ? "fl-clkct333" : isVolusia ? "fl-cl219-volusia" : "fl-statement-of-claim";

  const FL_FORMS = [
    {
      key: flFormKey,
      label: flFormLabel ? `Statement of Claim (${flFormLabel})` : "Statement of Claim",
      desc: `Florida Statement of Claim — file this first to start your case. File at ${flFilingAddress}.`,
      path: flFormPath,
      method: "POST" as const,
    },
  ];

  const FORMS = isTX ? TX_FORMS : isFL ? FL_FORMS : CA_FORMS;

  const downloadForm = async (formKey: string, formPath: string, method: "GET" | "POST" = "GET") => {
    setReviewForm(null);
    setDownloading(formKey);
    try {
      const token = await getToken();
      const url = `${baseUrl}/api/cases/${caseId}/forms/${formPath}`;
      const response = await fetch(url, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      if (Platform.OS !== "web") {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const path = `${FileSystem.documentDirectory}${formKey}.pdf`;
          await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(path, { mimeType: "application/pdf" });
          }
        };
        reader.readAsDataURL(blob);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Download Failed", "Could not download the form. Make sure your intake information is complete.");
    } finally {
      setDownloading(null);
    }
  };

  const reviewFields = caseData ? [
    { label: "Plaintiff", value: caseData.plaintiffName ?? "—" },
    { label: "Defendant", value: caseData.defendantName ?? "—" },
    { label: "Claim Amount", value: caseData.claimAmount ? `$${Number(caseData.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—" },
    { label: "Claim Type", value: caseData.claimType ?? "—" },
    { label: "County", value: caseData.countyId ?? "—" },
    ...(caseData.hearingDate ? [{ label: "Hearing Date", value: String(caseData.hearingDate) }] : []),
  ] : [];

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.tabNote, { color: colors.mutedForeground }]}>
          Forms are pre-filled with your case information. Tap the download icon to review before generating.
        </Text>

        {FORMS.map((form) => (
          <View key={form.key} style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formCardLeft}>
              <View style={[styles.formBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.formBadgeText, { color: colors.primaryForeground }]}>{form.label}</Text>
              </View>
              <View style={styles.formInfo}>
                <Text style={[styles.formName, { color: colors.foreground }]}>{form.label}</Text>
                <Text style={[styles.formDesc, { color: colors.mutedForeground }]}>{form.desc}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.formDownloadBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => setReviewForm(form)}
              disabled={downloading === form.key}
            >
              {downloading === form.key ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="download" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        ))}

        {isTX ? (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoBoxText, { color: colors.mutedForeground }]}>
                File the TX Petition with the Justice of the Peace court in the precinct where the defendant lives or where the incident occurred.
              </Text>
            </View>
            <View style={[styles.txFeeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.txFeeTitle, { color: colors.foreground }]}>Texas Filing Fees — Tex. Gov't Code § 118.121</Text>
              {TX_FEE_SCHEDULE.map((row) => (
                <View key={row.range} style={styles.txFeeRow}>
                  <Text style={[styles.txFeeRange, { color: colors.mutedForeground }]}>{row.range}</Text>
                  <Text style={[styles.txFeeAmt, { color: colors.foreground }]}>{row.fee}</Text>
                </View>
              ))}
              <Text style={[styles.txFeeNote, { color: colors.mutedForeground }]}>
                Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)
              </Text>
            </View>
          </>
        ) : isFL ? (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoBoxText, { color: colors.mutedForeground }]}>
                In Florida, the Summons is prepared and issued by the court clerk after you file the Statement of Claim and pay the filing fee. You do not create the Summons yourself.
              </Text>
            </View>
            <View style={[styles.txFeeCard, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
              <Text style={[styles.txFeeTitle, { color: "#92400e" }]}>FL Filing Fees (Fla. Stat. 34.041)</Text>
              {FL_FEE_SCHEDULE.map((row) => (
                <View key={row.range} style={styles.txFeeRow}>
                  <Text style={[styles.txFeeRange, { color: "#b45309" }]}>{row.range}</Text>
                  <Text style={[styles.txFeeAmt, { color: "#92400e" }]}>{row.fee}</Text>
                </View>
              ))}
              <Text style={[styles.txFeeNote, { color: "#b45309" }]}>
                Additional fees apply for summons, sheriff service, and certified mail.
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoBoxText, { color: colors.mutedForeground }]}>
              The SC-100 is required to file. Submit it in person at your county courthouse clerk's office along with the filing fee.
            </Text>
          </View>
        )}

        {/* ── Collect After You Win ─────────────────────────────────────── */}
        <Text style={[styles.tabSectionTitle, { color: colors.foreground, marginTop: 8 }]}>
          Collect After You Win
        </Text>
        <Text style={[styles.tabNote, { color: colors.mutedForeground, marginBottom: 4 }]}>
          {isTX
            ? "Winning is only step one. Here's how to enforce your Texas judgment and actually collect."
            : isFL
            ? "Winning is only step one. Here's how to enforce your Florida judgment and actually collect."
            : "Winning is only step one. Here's how to enforce your California judgment and actually collect."}
        </Text>
        {(isTX ? TX_COLLECT_STEPS : isFL ? FL_COLLECT_STEPS : CA_COLLECT_STEPS).map((step) => (
          <View key={step.title} style={[styles.collectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.collectIcon, { backgroundColor: "#fef3c7" }]}>
              <Feather name={step.icon} size={16} color="#d97706" />
            </View>
            <View style={styles.collectContent}>
              <Text style={[styles.collectTitle, { color: colors.foreground }]}>{step.title}</Text>
              <Text style={[styles.collectBody, { color: colors.mutedForeground }]}>{step.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={!!reviewForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewForm(null)}
      >
        <View style={[styles.reviewSheet, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
          <View style={[styles.reviewHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Review Prefilled Info</Text>
              <Text style={[styles.reviewSubtitle, { color: colors.mutedForeground }]}>{reviewForm?.label} — {reviewForm?.desc.split("—")[0].trim()}</Text>
            </View>
            <TouchableOpacity onPress={() => setReviewForm(null)} style={styles.reviewCloseBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.reviewBody}>
            <Text style={[styles.reviewNote, { color: colors.mutedForeground }]}>
              The following information from your intake will be used to pre-fill this form. Review it before downloading.
            </Text>
            {reviewFields.map((field) => (
              <View key={field.label} style={[styles.reviewFieldRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.reviewFieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <Text style={[styles.reviewFieldValue, { color: field.value === "—" ? colors.mutedForeground : colors.foreground }]}>{field.value}</Text>
              </View>
            ))}
            {reviewFields.length === 0 && (
              <Text style={[styles.reviewNote, { color: colors.mutedForeground, textAlign: "center", marginTop: 16 }]}>
                Complete your intake to see prefilled fields.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.reviewFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.reviewCancelBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => setReviewForm(null)}
            >
              <Text style={[styles.reviewCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewDownloadBtn, { backgroundColor: colors.primary, opacity: downloading === reviewForm?.key ? 0.7 : 1 }]}
              onPress={() => reviewForm && downloadForm(reviewForm.key, reviewForm.path, reviewForm.method)}
              disabled={!!downloading}
            >
              {downloading === reviewForm?.key
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="download" size={16} color="#fff" />}
              <Text style={styles.reviewDownloadText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Hearing Prep Tab ─────────────────────────────────────────────────────────

const HEARING_TIPS = [
  { icon: "clock" as const, title: "Arrive early", body: "Arrive at least 30 minutes before your hearing time. Find the courtroom, check in with the clerk." },
  { icon: "folder" as const, title: "Bring all evidence", body: "Bring 3 copies of every document — one for the judge, one for the defendant, one for yourself." },
  { icon: "user" as const, title: "Dress professionally", body: "Business casual at minimum. First impressions matter, even in small claims court." },
  { icon: "mic" as const, title: "Keep it brief", body: "Judges hear dozens of cases. Practice your story to 2-3 minutes. Facts only — no emotions." },
  { icon: "check-square" as const, title: "Stick to the facts", body: "Cite specific dates, amounts, and events. Avoid vague statements like 'he always does this.'" },
  { icon: "message-square" as const, title: "Let the judge ask", body: "Answer questions directly. Don't volunteer extra information not asked for." },
];

function HearingPrepTab({ caseData, caseId }: { caseData: CaseWithDetails; caseId: number }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const baseUrl = getBaseUrl();
  const [mode, setMode] = useState<"statement" | "mock-trial">("statement");

  const [statement, setStatement] = useState("");
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const [mockMessages, setMockMessages] = useState<ChatMsg[]>([]);
  const [mockStarted, setMockStarted] = useState(false);
  const [mockInput, setMockInput] = useState("");
  const [mockStreaming, setMockStreaming] = useState(false);

  const generateStatement = async () => {
    setGeneratingStatement(true);
    setStatement("");
    try {
      const token = await getToken();
      let acc = "";
      await streamSSE(
        `${baseUrl}/api/cases/${caseId}/hearing-prep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Please generate a concise court-ready opening statement I can deliver at my small claims hearing. Write it from my perspective as the plaintiff. It should state who I am, what happened, the amount I am claiming, and what I am asking the court for. Keep it clear, factual, and under 2 minutes when spoken aloud." }],
          }),
        },
        (chunk) => { acc += chunk; setStatement(acc); },
      );
    } catch {
      Alert.alert("Error", "Could not generate statement. Please try again.");
    } finally {
      setGeneratingStatement(false);
    }
  };

  const startMockTrial = async () => {
    setMockStarted(true);
    setMockMessages([]);
    setMockStreaming(true);
    const aId = Date.now().toString();
    setMockMessages([{ id: aId, role: "assistant", content: "" }]);
    try {
      const token = await getToken();
      let acc = "";
      await streamSSE(
        `${baseUrl}/api/cases/${caseId}/hearing-prep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ messages: [] }),
        },
        (chunk) => { acc += chunk; setMockMessages([{ id: aId, role: "assistant", content: acc }]); },
      );
    } catch {
      setMockMessages([{ id: Date.now().toString(), role: "assistant", content: "Could not start mock trial. Please try again." }]);
    } finally {
      setMockStreaming(false);
    }
  };

  const sendMockMessage = async (text: string) => {
    if (!text.trim() || mockStreaming) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", content: text.trim() };
    const aId = (Date.now() + 1).toString();
    const historyWithUser = [userMsg, ...mockMessages];
    setMockMessages([{ id: aId, role: "assistant", content: "" }, ...historyWithUser]);
    setMockInput("");
    setMockStreaming(true);
    try {
      const token = await getToken();
      const chronological = [...historyWithUser].reverse().map((m) => ({ role: m.role, content: m.content }));
      let acc = "";
      await streamSSE(
        `${baseUrl}/api/cases/${caseId}/hearing-prep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ messages: chronological }),
        },
        (chunk) => {
          acc += chunk;
          setMockMessages((prev) => prev.map((m) => m.id === aId ? { ...m, content: acc } : m));
        },
      );
    } catch {
      setMockMessages((prev) => prev.map((m) => m.id === aId ? { ...m, content: "Error — please try again." } : m));
    } finally {
      setMockStreaming(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.modeSwitcher, { borderBottomColor: colors.border }]}>
        {(["statement", "mock-trial"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, mode === m && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setMode(m)}
          >
            <Feather name={m === "statement" ? "file-text" : "users"} size={13} color={mode === m ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.modeTabText, { color: mode === m ? colors.primary : colors.mutedForeground }, mode === m && { fontFamily: "PlusJakartaSans_700Bold" }]}>
              {m === "statement" ? "Opening Statement" : "AI Mock Trial"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "statement" ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          {caseData.hearingDate ? (
            <View style={[styles.hearingDateCard, { backgroundColor: colors.primary }]}>
              <Feather name="calendar" size={24} color={colors.accent} />
              <View>
                <Text style={[styles.hearingDateLabel, { color: "rgba(255,255,255,0.7)" }]}>Hearing Date</Text>
                <Text style={[styles.hearingDateValue, { color: colors.primaryForeground }]}>
                  {caseData.hearingDate}{caseData.hearingTime ? ` at ${caseData.hearingTime}` : ""}
                </Text>
                {caseData.courthouseName ? (
                  <Text style={[styles.hearingCourthouse, { color: "rgba(255,255,255,0.7)" }]}>{caseData.courthouseName}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.noHearingBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="calendar" size={20} color={colors.mutedForeground} />
              <Text style={[styles.noHearingText, { color: colors.mutedForeground }]}>
                No hearing date set. Add it in the Deadlines tab.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: generatingStatement ? colors.secondary : colors.primary }]}
            onPress={generateStatement}
            disabled={generatingStatement}
          >
            {generatingStatement
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Feather name="zap" size={16} color="#fff" />}
            <Text style={[styles.generateBtnText, { color: generatingStatement ? colors.mutedForeground : "#fff" }]}>
              {statement ? "Regenerate Statement" : "Generate Opening Statement"}
            </Text>
          </TouchableOpacity>

          {statement ? (
            <View style={[styles.letterPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.letterText, { color: colors.foreground, lineHeight: 22, fontSize: 13 }]}>{statement}</Text>
            </View>
          ) : !generatingStatement ? (
            <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoBoxText, { color: colors.mutedForeground }]}>
                Tap above to generate a court-ready opening statement tailored to your case facts.
              </Text>
            </View>
          ) : null}

          <Text style={[styles.tabSectionTitle, { color: colors.foreground, marginTop: 8 }]}>Hearing Day Tips</Text>
          {HEARING_TIPS.map((tip) => (
            <View key={tip.title} style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tipIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={tip.icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.foreground }]}>{tip.title}</Text>
                <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>{tip.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={180}>
          {!mockStarted ? (
            <ScrollView contentContainerStyle={[styles.tabContent, { alignItems: "center", paddingTop: 40 }]}>
              <View style={[styles.chatEmptyIcon, { backgroundColor: colors.teal }]}>
                <Feather name="users" size={24} color="#fff" />
              </View>
              <Text style={[styles.chatEmptyTitle, { color: colors.foreground, marginTop: 8 }]}>AI Mock Trial</Text>
              <Text style={[styles.chatEmptyBody, { color: colors.mutedForeground, textAlign: "center" }]}>
                Practice your hearing with an AI judge. Answer questions, get real feedback, and build confidence before the real thing.
              </Text>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: colors.teal, marginTop: 16, width: "100%" }]}
                onPress={startMockTrial}
              >
                <Feather name="play" size={16} color="#fff" />
                <Text style={[styles.generateBtnText, { color: "#fff" }]}>Start Mock Trial</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              <FlatList
                data={mockMessages}
                keyExtractor={(m) => m.id}
                renderItem={({ item }) => {
                  const isUser = item.role === "user";
                  return (
                    <View style={[styles.chatMsgRow, isUser ? styles.chatMsgUser : styles.chatMsgAssistant]}>
                      {!isUser && (
                        <View style={[styles.chatAvatar, { backgroundColor: colors.teal }]}>
                          <Feather name="users" size={10} color="#fff" />
                        </View>
                      )}
                      <View style={[styles.chatBubble, isUser
                        ? [styles.chatBubbleUser, { backgroundColor: colors.primary }]
                        : [styles.chatBubbleAssistant, { backgroundColor: colors.secondary, borderColor: colors.border }]]}>
                        {item.content
                          ? <Text style={[styles.chatBubbleText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>{item.content}</Text>
                          : <ActivityIndicator size="small" color={colors.teal} />}
                      </View>
                    </View>
                  );
                }}
                inverted
                contentContainerStyle={styles.chatList}
                showsVerticalScrollIndicator={false}
              />
              <View style={[styles.chatInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.chatInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Reply to the judge..."
                  placeholderTextColor={colors.mutedForeground}
                  value={mockInput}
                  onChangeText={setMockInput}
                  onSubmitEditing={() => sendMockMessage(mockInput)}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                <Pressable
                  style={[styles.chatSendBtn, { backgroundColor: mockInput.trim() && !mockStreaming ? colors.teal : colors.secondary }]}
                  onPress={() => sendMockMessage(mockInput)}
                  disabled={!mockInput.trim() || mockStreaming}
                >
                  {mockStreaming
                    ? <ActivityIndicator size="small" color={colors.teal} />
                    : <Feather name="send" size={16} color={mockInput.trim() ? "#fff" : colors.mutedForeground} />}
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ─── Deadlines Tab ────────────────────────────────────────────────────────────

const CA_CHECKLIST = [
  { id: "1", label: "Complete intake form", done: false },
  { id: "2", label: "Upload all evidence documents", done: false },
  { id: "3", label: "Send demand letter to defendant", done: false },
  { id: "4", label: "Download and review SC-100 form", done: false },
  { id: "5", label: "File SC-100 at courthouse clerk", done: false },
  { id: "6", label: "Arrange process server or certified mail for defendant", done: false },
  { id: "7", label: "Prepare opening statement (2-3 min)", done: false },
  { id: "8", label: "Organize evidence copies (3 sets)", done: false },
  { id: "9", label: "Confirm courthouse location and parking", done: false },
  { id: "10", label: "Arrive 30 minutes early on hearing day", done: false },
];

const TX_CHECKLIST = [
  { id: "1", label: "Complete intake form", done: false },
  { id: "2", label: "Upload all evidence documents", done: false },
  { id: "3", label: "Send demand letter to defendant", done: false },
  { id: "4", label: "Download and review TX Petition", done: false },
  { id: "5", label: "File TX Petition at Justice of the Peace court", done: false },
  { id: "6", label: "Pay filing fee at clerk's window (see fee schedule)", done: false },
  { id: "7", label: "Court issues citation — served by constable or sheriff", done: false },
  { id: "8", label: "Prepare opening statement (2-3 min)", done: false },
  { id: "9", label: "Organize evidence copies (3 sets)", done: false },
  { id: "10", label: "Arrive 30 minutes early on hearing day", done: false },
];

function DeadlinesTab({ caseData, caseId }: { caseData: CaseWithDetails; caseId: number }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const baseUrl = getBaseUrl();
  const DEFAULT_CHECKLIST = caseData.jurisdictionState === "TX" ? TX_CHECKLIST : CA_CHECKLIST;
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [dateInput, setDateInput] = useState(caseData.hearingDate ? String(caseData.hearingDate) : "");
  const [savingDate, setSavingDate] = useState(false);

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const done = checklist.filter((i) => i.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  const isTX = caseData.jurisdictionState === "TX";
  const hearingDate = caseData.hearingDate ? new Date(String(caseData.hearingDate) + "T12:00:00") : null;
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  const saveHearingDate = async () => {
    if (!dateInput.trim()) return;
    setSavingDate(true);
    try {
      const token = await getToken();
      const resp = await fetch(`${baseUrl}/api/cases/${caseId}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ hearingDate: dateInput.trim() }),
      });
      if (!resp.ok) throw new Error();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let remindersScheduled = false;
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleHearingReminders(
            caseId,
            caseData.title ?? "Your Case",
            caseData.courthouseName,
            dateInput.trim(),
            caseData.hearingTime,
            caseData.courthouseAddress,
            caseData.courthouseCity,
          );
          remindersScheduled = true;
        }
      } catch {
        // Notification scheduling failure should not block the save confirmation
      }

      if (remindersScheduled) {
        Alert.alert("Saved", "Hearing date updated. You'll be reminded the night before, at 8 AM on the day, and 2 hours before your hearing.");
      } else {
        Alert.alert("Saved", "Hearing date updated.");
      }
    } catch {
      Alert.alert("Error", "Could not save hearing date. Please try again.");
    } finally {
      setSavingDate(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.deadlineSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.deadlineSectionTitle, { color: colors.foreground }]}>Hearing Date</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.dateInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            value={dateInput}
            onChangeText={setDateInput}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.dateSaveBtn, { backgroundColor: colors.primary, opacity: savingDate || !dateInput.trim() ? 0.6 : 1 }]}
            onPress={saveHearingDate}
            disabled={savingDate || !dateInput.trim()}
          >
            {savingDate
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.dateSaveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        {hearingDate ? (
          <Text style={[styles.dateParsed, { color: colors.teal }]}>
            {fmt(hearingDate)}{caseData.hearingTime ? ` at ${caseData.hearingTime}` : ""}
          </Text>
        ) : null}
      </View>

      {hearingDate ? (
        <View style={[styles.deadlineSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.deadlineSectionTitle, { color: colors.foreground }]}>Key Deadlines</Text>
          {isTX ? (
            <>
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: colors.tealLight }]}>
                  <Feather name="user-check" size={13} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Citation served by constable/sheriff</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.teal }]}>Court handles after you file</Text>
                </View>
              </View>
              <View style={[styles.deadlineLine, { backgroundColor: colors.border }]} />
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: colors.tealLight }]}>
                  <Feather name="clock" size={13} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Trial set after service</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.teal }]}>20–45 days after citation is served</Text>
                </View>
              </View>
              <View style={[styles.deadlineLine, { backgroundColor: colors.border }]} />
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: "#fef3c7" }]}>
                  <Feather name="calendar" size={13} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Trial date</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.foreground }]}>
                    {fmt(hearingDate)}{caseData.hearingTime ? ` at ${caseData.hearingTime}` : ""}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: colors.tealLight }]}>
                  <Feather name="send" size={13} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Serve defendant — same county</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.teal }]}>By {fmt(addDays(hearingDate, -15))}</Text>
                </View>
              </View>
              <View style={[styles.deadlineLine, { backgroundColor: colors.border }]} />
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: colors.tealLight }]}>
                  <Feather name="send" size={13} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Serve defendant — different county</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.teal }]}>By {fmt(addDays(hearingDate, -20))}</Text>
                </View>
              </View>
              <View style={[styles.deadlineLine, { backgroundColor: colors.border }]} />
              <View style={styles.deadlineRow}>
                <View style={[styles.deadlineDot, { backgroundColor: "#fef3c7" }]}>
                  <Feather name="calendar" size={13} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deadlineItemLabel, { color: colors.foreground }]}>Hearing</Text>
                  <Text style={[styles.deadlineItemDate, { color: colors.foreground }]}>
                    {fmt(hearingDate)}{caseData.hearingTime ? ` at ${caseData.hearingTime}` : ""}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      ) : null}

      <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
        <View style={styles.progressTop}>
          <Text style={[styles.progressTitle, { color: colors.primaryForeground }]}>Pre-Filing Checklist</Text>
          <Text style={[styles.progressPct, { color: colors.accent }]}>{pct}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[styles.progressSub, { color: "rgba(255,255,255,0.6)" }]}>{done} of {checklist.length} complete</Text>
      </View>

      {checklist.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.checkItem, { backgroundColor: colors.card, borderColor: item.done ? colors.teal : colors.border }]}
          onPress={() => toggle(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, { borderColor: item.done ? colors.teal : colors.border, backgroundColor: item.done ? colors.teal : "transparent" }]}>
            {item.done && <Feather name="check" size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkLabel, { color: item.done ? colors.mutedForeground : colors.foreground, textDecorationLine: item.done ? "line-through" : "none" }]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── AI Chat Tab ──────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  redirect?: { target: string; question: string } | null;
}

const CHAT_SUGGESTIONS_SEP = "\nSUGGESTIONS:";
const CHAT_REDIRECT_SEP = "\nREDIRECT:";

function parseChatContent(content: string): {
  displayText: string;
  redirect: { target: string; question: string } | null;
} {
  let text = content;
  let redirect: { target: string; question: string } | null = null;
  const ridx = text.indexOf(CHAT_REDIRECT_SEP);
  if (ridx !== -1) {
    const part = text.slice(ridx + CHAT_REDIRECT_SEP.length).trim();
    text = text.slice(0, ridx);
    const pipe = part.indexOf("|");
    if (pipe !== -1) {
      redirect = { target: part.slice(0, pipe).trim(), question: part.slice(pipe + 1).trim() };
    }
  }
  const sidx = text.indexOf(CHAT_SUGGESTIONS_SEP);
  if (sidx !== -1) text = text.slice(0, sidx);
  return { displayText: text.trimEnd(), redirect };
}

const CHAT_STEP_TAB_MAP: Record<string, string> = {
  "step:intake": "intake",
  "step:documents": "documents",
  "step:demand-letter": "demand-letter",
  "step:forms": "court-forms",
  "step:prep": "hearing-prep",
  "step:deadlines": "deadlines",
  "step:chat": "ai-chat",
};

const CHAT_REDIRECT_LABELS: Record<string, string> = {
  "step:prep": "Go to Hearing Prep",
  "step:deadlines": "Go to Deadlines",
  "step:documents": "Go to My Evidence",
  "step:demand-letter": "Go to Demand Letter",
  "step:forms": "Go to Court Forms",
  "step:intake": "Go to Case Details",
  "step:chat": "Go to AI Chat",
  "help-genie": "Ask Help Genie",
};

function AIChatTab({
  caseId,
  initialMessage,
  jurisdictionState,
  onNavigateToTab,
}: {
  caseId: number;
  initialMessage?: string;
  jurisdictionState?: "CA" | "FL" | "TX";
  onNavigateToTab?: (tab: string, question?: string) => void;
}) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [helpGenieVisible, setHelpGenieVisible] = useState(false);
  const [helpGenieQuestion, setHelpGenieQuestion] = useState<string | undefined>(undefined);
  const baseUrl = getBaseUrl();

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Microphone access is needed for voice input.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = rec;
      setRecording(true);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) return;
      setTranscribing(true);
      const token = await getToken();
      const formData = new FormData();
      appendRNFile(formData, "audio", { uri, name: "voice.m4a", type: "audio/m4a" });
      const resp = await fetch(`${baseUrl}/api/cases/${caseId}/chat/voice`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (resp.ok) {
        const data = await resp.json() as { text?: string };
        if (data.text) setInput(data.text);
      }
    } catch {
      Alert.alert("Transcription Failed", "Could not transcribe audio. Please type your message.");
    } finally {
      setTranscribing(false);
    }
  };

  const PROMPTS = [
    "What are my chances of winning?",
    "How do I serve the defendant?",
    "What documents should I bring?",
    "How do I calculate my damages?",
  ];

  const onExportWord = useCallback(async () => {
    if (messages.length === 0) return;
    setExportingWord(true);
    try {
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/cases/${caseId}/chat/export/docx?scope=all`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const path = `${FileSystem.documentDirectory}case-chat.docx`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      Alert.alert("Export Failed", "Could not export the conversation. Please try again.");
    } finally {
      setExportingWord(false);
    }
  }, [baseUrl, caseId, getToken, messages.length]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", content: text.trim() };
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setStreaming(true);
      const aId = (Date.now() + 1).toString();
      setMessages((prev) => [{ id: aId, role: "assistant", content: "" }, ...prev]);
      try {
        const token = await getToken();
        let accumulated = "";
        await streamSSE(
          `${baseUrl}/api/cases/${caseId}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ content: text.trim(), pageContext: "ai-chat" }),
          },
          (chunk) => {
            accumulated += chunk;
            const { displayText } = parseChatContent(accumulated);
            setMessages((prev) => prev.map((m) => m.id === aId ? { ...m, content: displayText } : m));
          },
        );
        const { displayText, redirect } = parseChatContent(accumulated);
        setMessages((prev) => prev.map((m) => m.id === aId ? { ...m, content: displayText, redirect } : m));
      } catch (err: unknown) {
        setMessages((prev) => prev.map((m) => m.id === aId ? { ...m, content: (err as Error).message ?? "Error. Try again." } : m));
      } finally {
        setStreaming(false);
      }
    },
    [caseId, baseUrl, getToken, streaming],
  );

  useEffect(() => {
    if (initialMessage) {
      const timer = setTimeout(() => sendMessage(initialMessage), 150);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMsg = useCallback(({ item }: { item: ChatMsg }) => {
    const isUser = item.role === "user";
    const showRedirect = !isUser && !streaming && item.redirect &&
      (item.redirect.target in CHAT_STEP_TAB_MAP || item.redirect.target === "help-genie");
    const redirectLabel = item.redirect ? (CHAT_REDIRECT_LABELS[item.redirect.target] ?? null) : null;
    return (
      <View>
        <View style={[styles.chatMsgRow, isUser ? styles.chatMsgUser : styles.chatMsgAssistant]}>
          {!isUser && (
            <View style={[styles.chatAvatar, { backgroundColor: colors.teal }]}>
              <Feather name="zap" size={10} color="#fff" />
            </View>
          )}
          <View style={[styles.chatBubble, isUser
            ? [styles.chatBubbleUser, { backgroundColor: colors.primary }]
            : [styles.chatBubbleAssistant, { backgroundColor: colors.secondary, borderColor: colors.border }]]}>
            {item.content
              ? <Text style={[styles.chatBubbleText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>{item.content}</Text>
              : <ActivityIndicator size="small" color={colors.teal} />}
          </View>
        </View>
        {showRedirect && redirectLabel && item.redirect && (
          <View style={styles.chatRedirectRow}>
            <TouchableOpacity
              style={[styles.chatRedirectChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
              onPress={() => {
                const { target, question } = item.redirect!;
                if (target === "help-genie") {
                  setHelpGenieQuestion(question);
                  setHelpGenieVisible(true);
                } else {
                  const tab = CHAT_STEP_TAB_MAP[target] ?? "intake";
                  onNavigateToTab?.(tab, question);
                }
              }}
            >
              <Feather name="arrow-right-circle" size={13} color={colors.teal} />
              <Text style={[styles.chatRedirectText, { color: colors.teal }]}>{redirectLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [colors, streaming, onNavigateToTab, setHelpGenieQuestion, setHelpGenieVisible]);

  return (
    <>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={180}
    >
      {/* Toolbar */}
      <View style={[styles.chatToolbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.chatToolbarBtn, { backgroundColor: showHelp ? colors.tealLight : colors.secondary, borderColor: colors.teal }]}
          onPress={() => setShowHelp((v) => !v)}
        >
          <Feather name="help-circle" size={13} color={colors.teal} />
          <Text style={[styles.chatToolbarBtnText, { color: colors.teal }]}>How to use</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatToolbarBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: messages.length === 0 || exportingWord ? 0.5 : 1 }]}
          onPress={onExportWord}
          disabled={messages.length === 0 || exportingWord}
        >
          {exportingWord
            ? <ActivityIndicator size={13} color={colors.mutedForeground} />
            : <Feather name="download" size={13} color={colors.mutedForeground} />}
          <Text style={[styles.chatToolbarBtnText, { color: colors.mutedForeground }]}>Export Word</Text>
        </TouchableOpacity>
      </View>

      {/* Help panel */}
      {showHelp && (
        <View style={[styles.chatHelpPanel, { backgroundColor: colors.tealLight, borderBottomColor: colors.teal }]}>
          <Text style={[styles.chatHelpTitle, { color: colors.teal }]}>Step 5 — Review Your Case</Text>
          {[
            "This AI has read all your case facts and every uploaded document.",
            "Ask anything: case strength, evidence gaps, what the judge will ask, how to calculate damages.",
            "Hold the mic button to speak your question — release to stop.",
            "Tap Export Word to download this conversation as a .docx file.",
          ].map((b, i) => (
            <View key={i} style={styles.chatHelpRow}>
              <Feather name="check-circle" size={12} color={colors.teal} style={{ marginTop: 2 }} />
              <Text style={[styles.chatHelpText, { color: colors.foreground }]}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        inverted
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!messages.length}
        ListEmptyComponent={
          <View style={styles.chatEmptyState}>
            <View style={[styles.chatEmptyIcon, { backgroundColor: colors.teal }]}>
              <Feather name="zap" size={24} color="#fff" />
            </View>
            <Text style={[styles.chatEmptyTitle, { color: colors.foreground }]}>AI Case Advisor</Text>
            <Text style={[styles.chatEmptyBody, { color: colors.mutedForeground }]}>
              Describe your dispute or ask about case strategy, evidence, and procedures. Or ask me anything about how Small Claims Genie works. I'm here to help.
            </Text>
            <View style={styles.promptsWrap}>
              {PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.promptPill, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
                  onPress={() => sendMessage(p)}
                >
                  <Text style={[styles.promptPillText, { color: colors.teal }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />
      <View style={[styles.chatInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {Platform.OS !== "web" && (
          <Pressable
            style={[styles.chatMicBtn, { backgroundColor: recording ? "#ef4444" : colors.secondary }]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            {transcribing
              ? <ActivityIndicator size="small" color={colors.teal} />
              : <Feather name="mic" size={16} color={recording ? "#fff" : colors.mutedForeground} />}
          </Pressable>
        )}
        <TextInput
          ref={inputRef}
          style={[styles.chatInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
          placeholder={transcribing ? "Transcribing…" : "Ask a question..."}
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          multiline
          maxLength={500}
          editable={!transcribing}
        />
        <Pressable
          style={[styles.chatSendBtn, { backgroundColor: input.trim() && !streaming ? colors.teal : colors.secondary }]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
        >
          {streaming
            ? <ActivityIndicator size="small" color={colors.teal} />
            : <Feather name="send" size={16} color={input.trim() ? "#fff" : colors.mutedForeground} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>

    <HelpGenieSheet
      visible={helpGenieVisible}
      onClose={() => setHelpGenieVisible(false)}
      initialMessage={helpGenieQuestion}
      pageContext="ai-chat"
      jurisdictionState={jurisdictionState}
      onNavigateToTab={(tab, question) => {
        setHelpGenieVisible(false);
        onNavigateToTab?.(tab, question);
      }}
    />
    </>
  );
}

// ─── Case Workspace ───────────────────────────────────────────────────────────

export default function CaseWorkspace() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = parseInt(id ?? "0", 10);
  const [activeTab, setActiveTab] = useState("intake");
  const [pendingAiMessage, setPendingAiMessage] = useState<string | undefined>(undefined);

  const { data: caseData, isLoading, refetch } = useGetCase(caseId);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.destructive} />
        <Text style={[styles.errorMsg, { color: colors.foreground }]}>Case not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.teal }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.caseTitle, { color: colors.foreground }]} numberOfLines={1}>
            {caseData.title ?? "Case"}
          </Text>
          <StatusBadge status={caseData.status ?? "draft"} />
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBarWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                activeTab === tab.key && [styles.tabItemActive, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
            >
              <Feather
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? colors.primary : colors.mutedForeground },
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === "intake" && (
          <IntakeTab
            caseId={caseId}
            caseData={caseData}
            onCheckCase={() => {
              setPendingAiMessage(CASE_REVIEW_PROMPT);
              setActiveTab("ai-chat");
            }}
          />
        )}
        {activeTab === "documents" && <DocumentsTab caseId={caseId} />}
        {activeTab === "demand-letter" && <DemandLetterTab caseId={caseId} />}
        {activeTab === "court-forms" && <CourtFormsTab caseId={caseId} caseData={caseData} />}
        {activeTab === "hearing-prep" && <HearingPrepTab caseData={caseData} caseId={caseId} />}
        {activeTab === "deadlines" && <DeadlinesTab caseData={caseData} caseId={caseId} />}
        {activeTab === "ai-chat" && (
          <AIChatTab
            caseId={caseId}
            initialMessage={pendingAiMessage}
            key={pendingAiMessage ?? "default"}
            jurisdictionState={(caseData.jurisdictionState as "CA" | "FL" | "TX") ?? "CA"}
            onNavigateToTab={(tab, question) => {
              const validTabs = TABS.map((t) => t.key);
              if (validTabs.includes(tab)) {
                setActiveTab(tab as typeof activeTab);
                if (tab === "ai-chat" && question) {
                  setPendingAiMessage(question);
                }
              }
            }}
          />
        )}
      </View>

      {/* AI Genie FAB */}
      {activeTab !== "ai-chat" && (
        <AIGeniePanel
          caseId={caseId}
          caseTitle={caseData.title ?? ""}
          pageContext={activeTab}
          jurisdictionState={(caseData.jurisdictionState as "CA" | "FL" | "TX") ?? "CA"}
          onNavigateToTab={(tab, question) => {
            const validTabs = TABS.map((t) => t.key);
            if (validTabs.includes(tab)) {
              setActiveTab(tab as typeof activeTab);
              if (tab === "ai-chat" && question) {
                setPendingAiMessage(question);
              }
            }
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", gap: 12 },
  errorMsg: { fontSize: 16, fontFamily: "PlusJakartaSans_500Medium" },
  backLink: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, gap: 4 },
  caseTitle: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },

  tabBarWrap: { borderBottomWidth: 1 },
  tabBar: { paddingHorizontal: 16, gap: 4 },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabLabel: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  tabLabelActive: { fontFamily: "PlusJakartaSans_700Bold" },

  tabContent: { padding: 16, gap: 12, paddingBottom: 120 },
  tabSectionTitle: { fontSize: 13, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 4 },
  tabNote: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },
  fieldInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    borderWidth: 1,
  },
  fieldInputMultiline: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  row3: { flexDirection: "row", gap: 8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  fabArea: { padding: 16, paddingBottom: 24 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  uploadBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },

  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  docIconWrap: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1, gap: 4 },
  docName: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  ocrBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ocrText: { fontSize: 10, fontFamily: "PlusJakartaSans_600SemiBold" },
  deleteBtn: { padding: 8 },

  toneRow: { flexDirection: "row", gap: 8 },
  toneCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, gap: 2 },
  toneLabel: { fontSize: 13, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  toneDesc: { fontSize: 10, fontFamily: "PlusJakartaSans_400Regular" },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  generateBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#fff" },
  letterPreview: { padding: 16, borderRadius: 10, borderWidth: 1 },
  letterText: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 18 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  downloadBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },

  formCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  formCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  formBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  formBadgeText: { fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  formInfo: { flex: 1 },
  formName: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  formDesc: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 2 },
  formDownloadBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  infoBoxText: { flex: 1, fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 18 },

  hearingDateCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 14, marginBottom: 4 },
  hearingDateLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular" },
  hearingDateValue: { fontSize: 18, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  hearingCourthouse: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 2 },
  noHearingBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  noHearingText: { flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  tipIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tipContent: { flex: 1, gap: 4 },
  tipTitle: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  tipBody: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 18 },

  progressCard: { padding: 20, borderRadius: 14, gap: 10, marginBottom: 4 },
  progressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 16, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  progressPct: { fontSize: 22, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressSub: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular" },
  hearingAlert: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  hearingAlertText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", flex: 1 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_400Regular" },

  chatList: { padding: 12, gap: 8, flexGrow: 1 },
  chatMsgRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  chatMsgUser: { justifyContent: "flex-end" },
  chatMsgAssistant: { justifyContent: "flex-start" },
  chatAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  chatBubble: { maxWidth: "78%", padding: 10, borderRadius: 14 },
  chatBubbleUser: { borderBottomRightRadius: 4 },
  chatBubbleAssistant: { borderBottomLeftRadius: 4, borderWidth: 1 },
  chatBubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "PlusJakartaSans_400Regular" },
  chatRedirectRow: { paddingLeft: 30, paddingTop: 6, paddingBottom: 2 },
  chatRedirectChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chatRedirectText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600" },
  chatEmptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 10 },
  chatEmptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  chatEmptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  chatEmptyBody: { fontSize: 14, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20 },
  promptsWrap: { gap: 8, width: "100%", marginTop: 8 },
  promptPill: { padding: 12, borderRadius: 10, borderWidth: 1 },
  promptPillText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  chatInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1 },
  chatInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", borderWidth: 1, maxHeight: 100, minHeight: 42 },
  chatSendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  chatMicBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  chatToolbar: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  chatToolbarBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chatToolbarBtnText: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  chatHelpPanel: { padding: 12, borderBottomWidth: 1, gap: 6 },
  chatHelpTitle: { fontSize: 13, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 2 },
  chatHelpRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  chatHelpText: { flex: 1, fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 17 },

  intakeStepBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, gap: 0 },
  intakeStepItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  intakeStepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  intakeStepNum: { fontSize: 11, fontWeight: "700", color: "#fff", fontFamily: "PlusJakartaSans_700Bold" },
  intakeStepLabel: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  intakeStepLine: { width: 32, height: 2, borderRadius: 1, marginHorizontal: 6 },
  intakeBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  intakeBackBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  intakeBackBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  checkCaseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 12, marginTop: 8 },
  checkCaseBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#fff" },

  letterTypeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  letterTypeCard: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, gap: 4, minHeight: 72, justifyContent: "space-between" },
  letterTypeTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  letterTypeStep: { fontSize: 10, fontFamily: "PlusJakartaSans_600SemiBold" },
  letterTypeLabel: { fontSize: 11, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", lineHeight: 15 },

  emptyCenter: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  emptyBody: { fontSize: 13, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20 },

  modeSwitcher: { flexDirection: "row", borderBottomWidth: 1 },
  modeTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  modeTabText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },

  deadlineSection: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  deadlineSectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  dateRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dateInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", borderWidth: 1 },
  dateSaveBtn: { height: 44, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dateSaveBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#fff" },
  dateParsed: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  deadlineDot: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deadlineItemLabel: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  deadlineItemDate: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 1 },
  deadlineLine: { height: 1, marginVertical: 4 },

  reviewSheet: { flex: 1 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 12 },
  reviewTitle: { fontSize: 17, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  reviewSubtitle: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 2, maxWidth: 260 },
  reviewCloseBtn: { padding: 4, marginTop: 2 },
  reviewBody: { padding: 20, gap: 0 },
  reviewNote: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20, marginBottom: 16 },
  reviewFieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  reviewFieldLabel: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", flex: 0.4 },
  reviewFieldValue: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", flex: 0.6, textAlign: "right" },
  reviewFooter: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  reviewCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  reviewCancelText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  reviewDownloadBtn: { flex: 2, height: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  reviewDownloadText: { fontSize: 15, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#fff" },

  statePickerRow: { flexDirection: "column", gap: 8, marginBottom: 8 },
  statePill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  statePillText: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600" },

  claimLimitWarn: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4, marginBottom: 4 },
  claimLimitWarnText: { flex: 1, fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 17 },

  txFeeCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8, gap: 8 },
  txFeeTitle: { fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginBottom: 4 },
  txFeeRow: { flexDirection: "row", justifyContent: "space-between" },
  txFeeRange: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular" },
  txFeeAmt: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600" },
  txFeeNote: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", marginTop: 4 },

  collectCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  collectIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  collectContent: { flex: 1, gap: 3 },
  collectTitle: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  collectBody: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", lineHeight: 18 },
});
