import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { useColors } from "@/hooks/useColors";
import { streamSSE } from "@/lib/stream";
import { getBaseUrl } from "@/lib/api-base-url";
import { HelpGenieSheet } from "@/components/HelpGenieSheet";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  redirect?: { target: string; question: string } | null;
}

interface Props {
  caseId: number;
  caseTitle?: string;
  pageContext?: string;
  jurisdictionState?: "CA" | "FL" | "TX";
  onNavigateToTab?: (tab: string, question?: string) => void;
}

const PAGE_HELP: Record<string, { title: string; bullets: string[] }> = {
  intake: {
    title: "Step 1 — Enter The Parties",
    bullets: [
      "Enter your legal name and address as the plaintiff (the person filing).",
      "Enter the defendant's full legal name and address. For businesses, add their registered agent.",
      "Select your county and courthouse — file where the defendant lives or where the incident occurred.",
    ],
  },
  documents: {
    title: "Step 3 — Upload My Evidence",
    bullets: [
      "Tap the upload button to add receipts, contracts, photos, emails, or screenshots.",
      "The app reads every file you upload so the AI can use them in its advice.",
      "More strong documents = a higher readiness score and better AI answers.",
    ],
  },
  "demand-letter": {
    title: "Step 4 — Send Demand Letter",
    bullets: [
      "Choose a mode: Demand Letter, Settlement Offer, or Settlement Agreement.",
      "Pick your tone — Firm is recommended for most cases.",
      "Download the PDF and send by certified mail with return receipt.",
    ],
  },
  "court-forms": {
    title: "Step 6 — Create Court Forms",
    bullets: [
      "Download your SC-100 (the main filing form) first — this starts your case officially.",
      "Choose how to serve the defendant: Certified Mail, Service by Adult, or Process Server.",
      "Defendant must be served at least 15 days before the hearing (20 days if different county).",
    ],
  },
  "hearing-prep": {
    title: "Step 7 — Prep for Hearing",
    bullets: [
      "Generate your Court-Ready Statement — what to say when the judge asks you to explain your case.",
      "Use AI Mock Trial to practice answering the questions a real judge would ask.",
      "Hearings are short (5–15 min). Be organized and bring numbered exhibits.",
    ],
  },
  deadlines: {
    title: "Step 8 — Deadlines",
    bullets: [
      "Check your service deadline — defendant must be served 15 days before hearing (20 if out-of-county).",
      "If you're running out of time, download SC-150 from Court Forms to postpone your hearing.",
      "Track your statute of limitations — the legal deadline to file before the court dismisses your case.",
    ],
  },
  "ai-chat": {
    title: "Step 5 — Review Your Case",
    bullets: [
      "Ask anything about your case — the AI has read all your facts and uploaded documents.",
      "Hold the mic button to speak your question, release to stop.",
      "Be specific: 'What evidence am I missing for a security deposit case?' gets better answers.",
    ],
  },
};

const DEFAULT_HELP = {
  title: "Your AI legal assistant",
  bullets: [
    "Ask anything about your case strategy, evidence, or court procedures.",
    "The Genie knows your case details — be specific for the best answers.",
    "Tap a suggested question below to get started quickly.",
  ],
};

const PAGE_INITIAL_CHIPS: Record<string, string[]> = {
  intake: ["What county do I file in?", "How do I find the defendant's address?", "What does 'agent for service' mean?"],
  documents: ["What evidence do I need?", "Can I upload phone screenshots?", "Which documents matter most?"],
  "demand-letter": ["Which tone should I choose?", "Do I have to send this first?", "How do I send the letter?"],
  "court-forms": ["How do I file the SC-100?", "Which service method is best?", "What is the filing fee?"],
  "hearing-prep": ["What should I say to the judge?", "What if they don't show up?", "What do I bring to court?"],
  deadlines: ["When must I serve the defendant?", "How do I postpone my hearing?", "What's the statute of limitations?"],
  "ai-chat": ["Is my case strong?", "What evidence am I missing?", "What will the judge ask me?"],
};

const DEFAULT_CHIPS = ["What are my chances of winning?", "What documents should I bring?", "What should I do next?"];

const SUGGESTIONS_SEP = "\nSUGGESTIONS:";
const REDIRECT_SEP_MOBILE = "\nREDIRECT:";

const MOBILE_REDIRECT_LABELS: Record<string, string> = {
  "step:prep": "Go to Hearing Prep",
  "step:deadlines": "Go to Deadlines",
  "step:documents": "Go to My Evidence",
  "step:demand-letter": "Go to Demand Letter",
  "step:forms": "Go to Court Forms",
  "step:intake": "Go to Case Details",
  "step:chat": "Go to AI Chat",
  "help-genie": "Ask about app navigation",
};

const MOBILE_STEP_TAB_MAP: Record<string, string> = {
  "step:intake": "intake",
  "step:documents": "documents",
  "step:demand-letter": "demand-letter",
  "step:forms": "court-forms",
  "step:prep": "hearing-prep",
  "step:deadlines": "deadlines",
  "step:chat": "ai-chat",
  "help-genie": "ai-chat",
};

function parseMobileAIContent(content: string): {
  displayText: string;
  suggestions: string[];
  redirect: { target: string; question: string } | null;
} {
  let text = content;
  let redirect: { target: string; question: string } | null = null;

  const ridx = text.indexOf(REDIRECT_SEP_MOBILE);
  if (ridx !== -1) {
    const part = text.slice(ridx + REDIRECT_SEP_MOBILE.length).trim();
    text = text.slice(0, ridx);
    const pipe = part.indexOf("|");
    if (pipe !== -1) {
      redirect = { target: part.slice(0, pipe).trim(), question: part.slice(pipe + 1).trim() };
    }
  }

  const sidx = text.indexOf(SUGGESTIONS_SEP);
  if (sidx === -1) return { displayText: text.trimEnd(), suggestions: [], redirect };
  const displayText = text.slice(0, sidx).trimEnd();
  const raw = text.slice(sidx + SUGGESTIONS_SEP.length).trim();
  const suggestions = raw
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
  return { displayText, suggestions, redirect };
}

function parseSuggestions(content: string): { displayText: string; suggestions: string[] } {
  const { displayText, suggestions } = parseMobileAIContent(content);
  return { displayText, suggestions };
}

export function AIGeniePanel({ caseId, caseTitle, pageContext, jurisdictionState, onNavigateToTab }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [latestAssistantId, setLatestAssistantId] = useState<string | null>(null);
  const [helpGenieVisible, setHelpGenieVisible] = useState(false);
  const [helpGenieQuestion, setHelpGenieQuestion] = useState<string | undefined>(undefined);
  const [pendingFresh, setPendingFresh] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const baseUrl = getBaseUrl();

  const countyBullet =
    jurisdictionState === "FL"
      ? "Select your Florida county where you plan to file."
      : jurisdictionState === "TX"
      ? "Select your Texas county and Justice of the Peace precinct."
      : "Select the California county where you plan to file.";

  const resolvedPageHelp: Record<string, { title: string; bullets: string[] }> = {
    ...PAGE_HELP,
    intake: {
      ...PAGE_HELP.intake,
      bullets: [
        PAGE_HELP.intake.bullets[0],
        PAGE_HELP.intake.bullets[1],
        countyBullet,
      ],
    },
  };

  const helpContent = pageContext ? (resolvedPageHelp[pageContext] ?? DEFAULT_HELP) : DEFAULT_HELP;
  const initialChips = pageContext ? (PAGE_INITIAL_CHIPS[pageContext] ?? DEFAULT_CHIPS) : DEFAULT_CHIPS;

  const onFabPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setVisible(true);
  }, [scaleAnim]);

  const sendMessage = useCallback(
    async (text: string, opts?: { fresh?: boolean }) => {
      if (!text.trim() || streaming) return;

      const useFresh = pendingFresh || opts?.fresh;
      if (pendingFresh) setPendingFresh(false);

      setShowHelp(false);
      setSuggestions([]);
      setLatestAssistantId(null);

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setStreaming(true);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        { id: assistantId, role: "assistant", content: "" },
        ...prev,
      ]);

      let accumulated = "";

      try {
        const token = await getToken();
        await streamSSE(
          `${baseUrl}/api/cases/${caseId}/chat${useFresh ? '?fresh=1' : ''}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              content: text.trim(),
              pageContext: pageContext ?? null,
            }),
          },
          (chunk) => {
            accumulated += chunk;
            const { displayText } = parseMobileAIContent(accumulated);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: displayText } : m,
              ),
            );
          },
        );

        const { displayText, suggestions: parsedSuggestions, redirect } = parseMobileAIContent(accumulated);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: displayText, redirect } : m,
          ),
        );
        if (parsedSuggestions.length > 0) {
          setSuggestions(parsedSuggestions);
          setLatestAssistantId(assistantId);
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [caseId, baseUrl, getToken, streaming, pageContext, pendingFresh],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      const showSuggestionChips =
        !isUser && item.id === latestAssistantId && suggestions.length > 0 && !streaming;
      const showRedirectButton =
        !isUser && !streaming && item.redirect && onNavigateToTab &&
        (item.redirect.target in MOBILE_STEP_TAB_MAP);
      const redirectLabel = item.redirect ? (MOBILE_REDIRECT_LABELS[item.redirect.target] ?? null) : null;

      return (
        <View style={styles.msgWrapper}>
          <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
            {!isUser && (
              <View style={[styles.avatar, { backgroundColor: colors.teal }]}>
                <Feather name="zap" size={12} color="#fff" />
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
                <Text
                  style={[
                    styles.bubbleText,
                    { color: isUser ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {item.content}
                </Text>
              ) : (
                <ActivityIndicator size="small" color={colors.teal} />
              )}
            </View>
          </View>

          {showSuggestionChips && (
            <View style={styles.suggestionRow}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestionChip, { backgroundColor: colors.secondary, borderColor: colors.teal }]}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={[styles.suggestionText, { color: colors.teal }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showRedirectButton && redirectLabel && item.redirect && (
            <View style={styles.redirectRow}>
              <TouchableOpacity
                style={[styles.redirectChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
                onPress={() => {
                  const { target, question } = item.redirect!;
                  if (target === "help-genie") {
                    setHelpGenieQuestion(question);
                    setHelpGenieVisible(true);
                    setVisible(false);
                  } else {
                    const tab = MOBILE_STEP_TAB_MAP[target] ?? "ai-chat";
                    onNavigateToTab?.(tab, question);
                    setVisible(false);
                  }
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
    [colors, latestAssistantId, suggestions, streaming, sendMessage, onNavigateToTab],
  );

  return (
    <>
      <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: colors.teal }]}
          onPress={onFabPress}
          testID="ai-genie-fab"
        >
          <Feather name="zap" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
            <View style={styles.sheetTitleRow}>
              <View style={[styles.genieIcon, { backgroundColor: colors.teal }]}>
                <Feather name="zap" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>AI Genie</Text>
                {caseTitle && (
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {caseTitle}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => { setMessages([]); setPendingFresh(true); }}
                accessibilityLabel="Refresh AI context from latest intake"
              >
                <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.helpBtn, { backgroundColor: showHelp ? colors.tealLight : colors.secondary, borderColor: colors.teal }]}
                onPress={() => setShowHelp((v) => !v)}
              >
                <Feather name="help-circle" size={14} color={colors.teal} />
                <Text style={[styles.helpBtnText, { color: colors.teal }]}>How to use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {showHelp && (
            <View style={[styles.helpPanel, { backgroundColor: colors.tealLight, borderBottomColor: colors.teal }]}>
              <Text style={[styles.helpPanelTitle, { color: colors.teal }]}>{helpContent.title}</Text>
              {helpContent.bullets.map((b, i) => (
                <View key={i} style={styles.helpBulletRow}>
                  <Feather name="check-circle" size={13} color={colors.teal} style={styles.helpBulletIcon} />
                  <Text style={[styles.helpBulletText, { color: colors.foreground }]}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              inverted
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!!messages.length}
              ListEmptyComponent={
                <ScrollView contentContainerStyle={styles.emptyState} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ask me anything</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    I can help with your case, this page, or any questions about how the app works.
                  </Text>
                  <View style={styles.promptsGrid}>
                    <TouchableOpacity
                      style={[styles.helpChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
                      onPress={() => setShowHelp((v) => !v)}
                    >
                      <Feather name="help-circle" size={13} color={colors.teal} />
                      <Text style={[styles.helpChipText, { color: colors.teal }]}>
                        How do I use this page?
                      </Text>
                    </TouchableOpacity>
                    {initialChips.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.promptChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        onPress={() => sendMessage(p)}
                      >
                        <Text style={[styles.promptText, { color: colors.foreground }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              }
            />

            <View
              style={[
                styles.inputRow,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 8,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="Ask a question..."
                placeholderTextColor={colors.mutedForeground}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage(input)}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  { backgroundColor: input.trim() && !streaming ? colors.teal : colors.secondary },
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
              >
                {streaming ? (
                  <ActivityIndicator size="small" color={colors.teal} />
                ) : (
                  <Feather name="send" size={16} color={input.trim() ? "#fff" : colors.mutedForeground} />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <HelpGenieSheet
        visible={helpGenieVisible}
        onClose={() => setHelpGenieVisible(false)}
        initialMessage={helpGenieQuestion}
        pageContext={pageContext}
        onNavigateToTab={(tab, question) => {
          setHelpGenieVisible(false);
          onNavigateToTab?.(tab, question);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    zIndex: 100,
  },
  fabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  genieIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    maxWidth: 180,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  helpBtnText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  closeBtn: { padding: 8 },
  helpPanel: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  helpPanelTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 4,
  },
  helpBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  helpBulletIcon: { marginTop: 1 },
  helpBulletText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    flex: 1,
    lineHeight: 19,
  },
  messagesList: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  msgWrapper: {
    marginBottom: 4,
  },
  msgRow: {
    flexDirection: "row",
    gap: 8,
  },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bubble: {
    maxWidth: "78%",
    padding: 12,
    borderRadius: 16,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 36,
    paddingTop: 8,
  },
  suggestionChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  redirectRow: {
    paddingLeft: 36,
    paddingTop: 8,
  },
  redirectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  redirectText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
    marginBottom: 16,
  },
  promptsGrid: {
    gap: 8,
    width: "100%",
  },
  helpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
  },
  helpChipText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  promptChip: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    borderWidth: 1,
    maxHeight: 100,
    minHeight: 42,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
