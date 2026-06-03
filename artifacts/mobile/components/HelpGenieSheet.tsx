import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { streamSSE } from "@/lib/stream";
import { getBaseUrl } from "@/lib/api-base-url";

interface HelpMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  redirect?: { target: string; question: string } | null;
}

const SUGGESTIONS_SEP = "\nSUGGESTIONS:";
const REDIRECT_SEP = "\nREDIRECT:";

function parseHelpContent(content: string): {
  displayText: string;
  redirect: { target: string; question: string } | null;
} {
  let text = content;
  let redirect: { target: string; question: string } | null = null;
  const ridx = text.indexOf(REDIRECT_SEP);
  if (ridx !== -1) {
    const part = text.slice(ridx + REDIRECT_SEP.length).trim();
    text = text.slice(0, ridx);
    const pipe = part.indexOf("|");
    if (pipe !== -1) {
      redirect = { target: part.slice(0, pipe).trim(), question: part.slice(pipe + 1).trim() };
    }
  }
  const sidx = text.indexOf(SUGGESTIONS_SEP);
  if (sidx !== -1) text = text.slice(0, sidx);
  return { displayText: text.trimEnd(), redirect };
}

const HG_STEP_TAB_MAP: Record<string, string> = {
  "step:intake": "intake",
  "step:documents": "documents",
  "step:demand-letter": "demand-letter",
  "step:forms": "court-forms",
  "step:prep": "hearing-prep",
  "step:deadlines": "deadlines",
  "step:chat": "ai-chat",
  "case-advisor": "ai-chat",
};

const HG_REDIRECT_LABELS: Record<string, string> = {
  "step:prep": "Go to Hearing Prep",
  "step:deadlines": "Go to Deadlines",
  "step:documents": "Go to My Evidence",
  "step:demand-letter": "Go to Demand Letter",
  "step:forms": "Go to Court Forms",
  "step:intake": "Go to Case Details",
  "step:chat": "Go to AI Chat",
  "case-advisor": "Go to Case Advisor",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  initialMessage?: string;
  pageContext?: string;
  onNavigateToTab?: (tab: string, question?: string) => void;
}

export function HelpGenieSheet({ visible, onClose, initialMessage, pageContext, onNavigateToTab }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const baseUrl = getBaseUrl();
  const [messages, setMessages] = useState<HelpMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initialSentRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userMsg: HelpMsg = { id: Date.now().toString(), role: "user", content: text.trim() };
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setStreaming(true);
      const aId = (Date.now() + 1).toString();
      setMessages((prev) => [{ id: aId, role: "assistant", content: "" }, ...prev]);
      let accumulated = "";
      try {
        const token = await getToken();
        const history = messages
          .slice()
          .reverse()
          .map((m) => ({ role: m.role, content: m.content }));
        await streamSSE(
          `${baseUrl}/api/help`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: text.trim(), history, pageContext, isSignedIn: true }),
          },
          (chunk) => {
            accumulated += chunk;
            const { displayText } = parseHelpContent(accumulated);
            setMessages((prev) =>
              prev.map((m) => (m.id === aId ? { ...m, content: displayText } : m)),
            );
          },
        );
        const { displayText, redirect } = parseHelpContent(accumulated);
        setMessages((prev) =>
          prev.map((m) => (m.id === aId ? { ...m, content: displayText, redirect } : m)),
        );
      } catch (err: unknown) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aId ? { ...m, content: (err as Error).message ?? "Something went wrong." } : m,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [streaming, messages, baseUrl, getToken, pageContext],
  );

  useEffect(() => {
    if (visible && initialMessage && !initialSentRef.current) {
      initialSentRef.current = true;
      const timer = setTimeout(() => sendMessage(initialMessage), 150);
      return () => clearTimeout(timer);
    }
    if (!visible) {
      initialSentRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialMessage]);

  const renderMsg = useCallback(
    ({ item }: { item: HelpMsg }) => {
      const isUser = item.role === "user";
      const showRedirect = !isUser && !streaming && item.redirect &&
        (item.redirect.target in HG_STEP_TAB_MAP) && onNavigateToTab;
      const redirectLabel = item.redirect ? (HG_REDIRECT_LABELS[item.redirect.target] ?? null) : null;
      return (
        <View>
          <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
            {!isUser && (
              <View style={[styles.avatar, { backgroundColor: colors.teal }]}>
                <Feather name="help-circle" size={11} color="#fff" />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                isUser
                  ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                  : [styles.bubbleAssistant, { backgroundColor: colors.secondary, borderColor: colors.border }],
              ]}
            >
              {item.content ? (
                <Text style={[styles.bubbleText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
                  {item.content}
                </Text>
              ) : (
                <ActivityIndicator size="small" color={colors.teal} />
              )}
            </View>
          </View>
          {showRedirect && redirectLabel && item.redirect && (
            <View style={styles.redirectRow}>
              <TouchableOpacity
                style={[styles.redirectChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
                onPress={() => {
                  const tab = HG_STEP_TAB_MAP[item.redirect!.target] ?? "ai-chat";
                  onNavigateToTab?.(tab, item.redirect!.question);
                  handleClose();
                }}
              >
                <Feather name="arrow-right-circle" size={13} color={colors.teal} />
                <Text style={[styles.redirectText, { color: colors.teal }]}>{redirectLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [colors, streaming, onNavigateToTab],
  );

  const handleClose = useCallback(() => {
    setMessages([]);
    setInput("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <KeyboardAvoidingView
          style={[styles.sheet, { paddingBottom: insets.bottom + 8, backgroundColor: colors.card }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name="help-circle" size={16} color={colors.teal} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Genie</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>App navigation & how-to questions</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMsg}
            inverted
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Ask me how to use the app
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  I can help with uploading documents, using any feature, or understanding how California small claims court works.
                </Text>
              </View>
            }
          />

          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask how to use the app..."
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              editable={!streaming}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !streaming ? colors.teal : colors.border }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
            >
              {streaming
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600" },
  headerSub: { fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 1 },
  closeBtn: { padding: 4 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  emptyState: { alignItems: "center", paddingTop: 24, paddingHorizontal: 16, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", lineHeight: 18 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "80%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "PlusJakartaSans_400Regular" },
  redirectRow: { paddingLeft: 32, paddingTop: 6 },
  redirectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  redirectText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    borderWidth: 1,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
