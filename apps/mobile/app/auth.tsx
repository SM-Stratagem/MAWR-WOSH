import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, spacing, borderRadius } from "../constants/theme";
import { Feather } from "@expo/vector-icons";

const AUTH = {
  bg: "#242629",
  card: "rgba(247,248,244,0.92)",
  cardSolid: "#F7F8F4",
  textPrimary: "#101214",
  textSecondary: "#667078",
  muted: "#98A0A6",
  inputBg: "#ECEFEB",
  inputText: "#111315",
  inputPlaceholder: "#8B939A",
  cta: "#B8FF38",
  ctaText: "#111315",
  link: "#B8FF38",
  errorBg: "rgba(255,90,90,0.10)",
  errorBorder: "rgba(255,90,90,0.28)",
  errorText: "#D94141",
  dividerLine: "#DDE2DA",
  dividerText: "#8B939A",
  socialBg: "rgba(255,255,255,0.85)",
  socialBorder: "rgba(229,232,225,0.6)",
  inputFocusBorder: "#B8FF38",
  inputFocusShadow: "rgba(184,255,56,0.14)",
  checkBg: "#B8FF38",
  checkIcon: "#111315",
  brandText: "#F7F8F4",
  subtitleColor: "#C7CDC5",
};

const GoogleIcon = () => (
  <View style={socialStyles.iconContainer}>
    <Text style={socialStyles.googleG}>G</Text>
  </View>
);

const AppleIcon = () => (
  <View style={socialStyles.iconContainer}>
    <Text style={socialStyles.appleIcon}>&#63743;</Text>
  </View>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Feather name={visible ? "eye" : "eye-off"} size={18} color="#717980" />
);

const CheckIcon = () => (
  <Text style={{ fontSize: 11, color: AUTH.checkIcon, fontWeight: "700" }}>✓</Text>
);

export default function AuthScreen() {
  useWarmUpBrowser();

  const router = useRouter();
  const { signIn, setActive: signInSetActive, isLoaded } = useSignIn();
  const { signUp, setActive: signUpSetActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: appleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const completeOAuthSignIn = useCallback(async (
    result: Awaited<ReturnType<typeof googleOAuth>>,
    provider: string
  ) => {
    try {
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      if (result.signUp) {
        const su = result.signUp;

        if (su.status === "missing_requirements") {
          const missing = su.missingFields || [];

          if (missing.includes("username")) {
            const emailAddr = su.emailAddress || "";
            const username = emailAddr.split("@")[0] + Math.floor(Math.random() * 1000);

            try {
              const updateResult = await su.update({ username });

              if (updateResult.createdSessionId && signUpSetActive) {
                await signUpSetActive({ session: updateResult.createdSessionId });
                router.replace("/(tabs)");
                return;
              }

              if (updateResult.status === "complete" && updateResult.createdSessionId && signUpSetActive) {
                await signUpSetActive({ session: updateResult.createdSessionId });
                router.replace("/(tabs)");
                return;
              }
            } catch (updateErr: any) {
              // Silently handle sign-up update errors
            }
          }

          Alert.alert(
            "Complete Sign Up",
            "Please sign up with your email and a password to continue."
          );
          return;
        }

        if (su.status === "complete" && su.createdSessionId && signUpSetActive) {
          await signUpSetActive({ session: su.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      }

      if (result.signIn && result.signIn.status === "complete" && result.signIn.createdSessionId && result.setActive) {
        await result.setActive({ session: result.signIn.createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      Alert.alert("Sign In Failed", `${provider} sign in did not complete. Please try again.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong");
    }
  }, [signUpSetActive, router]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const result = await googleOAuth();
      await completeOAuthSignIn(result, "Google");
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || err?.message || "Failed to sign in with Google";
      if (err?.code !== "session_cancelled") {
        Alert.alert("Error", message);
      }
    }
  }, [googleOAuth, completeOAuthSignIn]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      const result = await appleOAuth();
      await completeOAuthSignIn(result, "Apple");
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || err?.message || "Failed to sign in with Apple";
      if (err?.code !== "session_cancelled") {
        Alert.alert("Error", message);
      }
    }
  }, [appleOAuth, completeOAuthSignIn]);

  const handleEmailSignIn = useCallback(async () => {
    if (!isLoaded || !email || !password) return;

    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await signInSetActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      if (err.errors?.[0]?.code === "form_identifier_not_found") {
        setErrorMessage("Account not found. Please sign up first.");
      } else {
        setErrorMessage(err.errors?.[0]?.message || err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, signIn, signInSetActive, router]);

  const handleEmailSignUp = useCallback(async () => {
    if (!isLoaded || !email || !password || !name || !signUp) return;

    if (!agreedToTerms) {
      setErrorMessage("Please agree to the Terms of Service to continue.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: name,
      });

      if (result.status === "complete" && signUpSetActive) {
        await signUpSetActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setErrorMessage(err.errors?.[0]?.message || err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, name, signUp, signUpSetActive, router, agreedToTerms]);

  const getInputStyle = (fieldName: string) => [
    styles.input,
    focusedField === fieldName && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.brand}>WOSH</Text>
          <Text style={styles.brandSubtitle}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </Text>

          {/* Error */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Fields */}
          <View style={styles.fields}>
            {isSignUp && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={getInputStyle("name")}
                  placeholder="Your name"
                  placeholderTextColor={AUTH.inputPlaceholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={getInputStyle("email")}
                placeholder="you@example.com"
                placeholderTextColor={AUTH.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[getInputStyle("password"), { flex: 1 }]}
                  placeholder={isSignUp ? "Create a password" : "••••••••"}
                  placeholderTextColor={AUTH.inputPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Options Row */}
          {!isSignUp && (
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <CheckIcon />}
                </View>
                <Text style={styles.rememberLabel}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Terms */}
          {isSignUp && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <CheckIcon />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <Text style={styles.ctaText}>Please wait...</Text>
            ) : (
              <Text style={styles.ctaText}>
                {isSignUp ? "Create account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>
              {isSignUp ? "or sign up with" : "or sign in with"}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <GoogleIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleAppleSignIn}
              activeOpacity={0.8}
            >
              <AppleIcon />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Toggle */}
        <TouchableOpacity
          style={styles.footerToggle}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setErrorMessage(null);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.footerText}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <Text style={styles.footerLink}>
            {isSignUp ? "Sign in" : "Create account"}
          </Text>
        </TouchableOpacity>

        {/* Back to home */}
        <TouchableOpacity
          style={styles.backHome}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backHomeText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 20,
    justifyContent: "center",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  brand: {
    fontSize: 44,
    fontWeight: "800",
    color: AUTH.brandText,
    letterSpacing: 8,
    textTransform: "uppercase",
  },
  brandSubtitle: {
    fontSize: 14,
    color: AUTH.subtitleColor,
    marginTop: 4,
  },
  card: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: AUTH.card,
    borderRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    color: AUTH.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: AUTH.errorBg,
    borderWidth: 1,
    borderColor: AUTH.errorBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    color: AUTH.errorText,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  fields: {
    gap: 10,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: AUTH.textPrimary,
    paddingLeft: 4,
  },
  input: {
    height: 48,
    backgroundColor: AUTH.inputBg,
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: "500",
    color: AUTH.inputText,
  },
  inputFocused: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: AUTH.inputFocusBorder,
    shadowColor: AUTH.inputFocusShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AUTH.inputBg,
    borderRadius: 18,
    height: 48,
    paddingHorizontal: 4,
  },
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#C4CAC2",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: AUTH.checkBg,
    borderColor: AUTH.checkBg,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: AUTH.textSecondary,
    flex: 1,
  },
  rememberLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: AUTH.textSecondary,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "600",
    color: AUTH.textPrimary,
    flexShrink: 0,
  },
  termsLink: {
    color: AUTH.link,
    fontWeight: "600",
  },
  ctaButton: {
    height: 50,
    backgroundColor: AUTH.cta,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: AUTH.cta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: AUTH.ctaText,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH.dividerLine,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: "500",
    color: AUTH.dividerText,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: AUTH.socialBg,
    borderWidth: 1,
    borderColor: AUTH.socialBorder,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(17,19,21,0.04)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  footerToggle: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
    color: AUTH.subtitleColor,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: AUTH.link,
  },
  backHome: {
    marginTop: 10,
    alignItems: "center",
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#D9DED7",
  },
});

const socialStyles = StyleSheet.create({
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  googleG: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4285F4",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "sans-serif-medium",
  },
  appleIcon: {
    fontSize: 24,
    color: "#000000",
  },
});
