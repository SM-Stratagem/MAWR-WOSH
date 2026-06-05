import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { useTeamStore } from "../../lib/teamStore";

export default function TeamLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setTeamSession = useTeamStore((state) => state.setTeamSession);
  const session = useTeamStore((state) => state.session);
  const isSessionValid = useTeamStore((state) => state.isSessionValid);
  const login = useMutation(api.teamAuth.login);

  useEffect(() => {
    if (session && isSessionValid()) {
      router.replace("/team");
    }
  }, []);

  const handleLogin = useCallback(async () => {
    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await login({ phone: phone.trim(), pin: pin.trim() });
      setTeamSession({
        sessionId: result.sessionId,
        teamId: result.teamId,
        teamName: result.name,
        expiresAt: result.expiresAt,
      });
      router.replace("/team");
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      if (msg.includes("Invalid phone")) {
        setError("No team found with this phone number. Check with your admin.");
      } else if (msg.includes("PIN")) {
        setError("Incorrect PIN. Try again.");
      } else if (msg.includes("deactivated")) {
        setError("This team account has been deactivated.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [phone, pin, login, setTeamSession, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.header}>
          <Text style={styles.brand}>WOSH</Text>
          <Text style={styles.title}>TEAM LOGIN</Text>
          <Text style={styles.subtitle}>AUTHORIZED PERSONNEL ONLY</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+971 50 123 4567"
              placeholderTextColor={colors.ink_dim}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="4-6 digits"
              placeholderTextColor={colors.ink_dim}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.on_accent} />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButtonText}>BACK TO CUSTOMER APP</Text>
          </TouchableOpacity>
          <Text style={styles.version}>WOSH TEAM SYSTEM v1.0</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  brand: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1.5,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 2,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  errorBox: {
    backgroundColor: "rgba(255,90,90,0.12)",
    borderWidth: 1,
    borderColor: colors.hot,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  error: {
    color: colors.hot,
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.on_accent,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  backButtonText: {
    color: colors.ink_dim,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.4,
  },
  version: {
    fontSize: 9,
    color: "rgba(152,160,166,0.4)",
    letterSpacing: 1,
  },
});
