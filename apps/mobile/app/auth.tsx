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
import { colors, spacing, borderRadius } from "../constants/theme";

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
              console.log("[Auth] Error updating sign-up:", updateErr?.message || updateErr);
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
      console.log("[Auth] Error completing sign-in:", err?.message || err);
      Alert.alert("Error", err?.message || "Something went wrong");
    }
  }, [signUpSetActive, router]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const result = await googleOAuth();
      await completeOAuthSignIn(result, "Google");
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || err?.message || "Failed to sign in with Google";
      console.log("[Auth] Google OAuth error:", message);
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
      console.log("[Auth] Apple OAuth error:", message);
      if (err?.code !== "session_cancelled") {
        Alert.alert("Error", message);
      }
    }
  }, [appleOAuth, completeOAuthSignIn]);

  const handleEmailSignIn = useCallback(async () => {
    if (!isLoaded || !email || !password) return;

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
        Alert.alert("Error", "Account not found. Please sign up first.");
      } else {
        Alert.alert("Error", err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, signIn, signInSetActive, router]);

  const handleEmailSignUp = useCallback(async () => {
    if (!isLoaded || !email || !password || !name) return;

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: name,
      });

      if (result.status === "complete") {
        await signUpSetActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, name, signUp, signUpSetActive, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>WASH</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleSignIn}
          >
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.text_secondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.text_secondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.text_secondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchModeText}>
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 40,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text_primary,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text_secondary,
    marginTop: spacing.sm,
  },
  socialButtons: {
    gap: spacing.md,
  },
  socialButton: {
    backgroundColor: colors.surface_container_high,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  socialButtonText: {
    color: colors.text_primary,
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surface_container_high,
  },
  dividerText: {
    color: colors.text_secondary,
    marginHorizontal: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface_container_highest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text_primary,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  switchMode: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
  },
  backButton: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  backButtonText: {
    color: colors.text_secondary,
    fontSize: 14,
  },
});