import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

const images = [
  "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800",
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleLogin = useCallback(() => {
    router.push("/auth");
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.carousel}>
        {images.map((uri, index) => (
          <Image
            key={index}
            source={{ uri }}
            style={[
              styles.image,
              { transform: [{ translateX: (index - currentIndex) * width }] },
            ]}
            resizeMode="cover"
          />
        ))}
      </View>

      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>WASH</Text>
          <Text style={styles.tagline}>Premium Car Wash</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleLogin}
          >
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleLogin}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={handleLogin}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>

      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  carousel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    position: "absolute",
    width: width * 1.5,
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 10, 15, 0.7)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 40,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.xxl,
  },
  logo: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.text_primary,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  appleButton: {
    backgroundColor: colors.text_primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  appleButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.ghost_border,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  googleButtonText: {
    color: colors.text_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  emailButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  emailButtonText: {
    color: colors.text_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  terms: {
    color: colors.text_secondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.md,
  },
  pagination: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface_container_high,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});
