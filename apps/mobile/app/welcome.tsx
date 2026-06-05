import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Animated,
  PanResponder,
} from "react-native";
import { colors } from "../constants/theme";

const { width, height } = Dimensions.get("window");

const heroImage =
  "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=1200";

const TRACK_W = width - 48;
const THUMB = 60;
const MAX = TRACK_W - THUMB - 16;

export default function WelcomeScreen() {
  const router = useRouter();
  const panX = useRef(new Animated.Value(0)).current;
  const navRef = useRef(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      const x = Math.max(0, Math.min(gs.dx, MAX));
      panX.setValue(x);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx >= MAX * 0.6 && !navRef.current) {
        navRef.current = true;
        Animated.timing(panX, {
          toValue: MAX,
          duration: 150,
          useNativeDriver: false,
        }).start(() => router.push("/auth"));
      } else {
        Animated.spring(panX, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderTerminationRequest: () => true,
  });

  const textOp = panX.interpolate({
    inputRange: [0, MAX * 0.3],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const fillW = panX.interpolate({
    inputRange: [0, MAX],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <ImageBackground
      source={{ uri: heroImage }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      {/* Header - top */}
      <View style={styles.header}>
        <Text style={styles.logo}>WOSH</Text>
        <Text style={styles.tagline}>THE STANDARD OF CARE</Text>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <View style={styles.swipeWrap}>
          <View style={styles.track} {...panResponder.panHandlers}>
            <Animated.View
              style={[styles.trackFill, { width: fillW }]}
            />
            <Animated.Text style={[styles.swipeLabel, { opacity: textOp }]}>
              LOGIN
            </Animated.Text>
            <Animated.View
              style={[styles.thumb, { transform: [{ translateX: panX }] }]}
              pointerEvents="none"
            >
              <View style={styles.tyreOuter}>
                <View style={styles.tyreInner}>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </View>
            </Animated.View>
          </View>
          <Text style={styles.hint}>Swipe to continue</Text>
        </View>

        <TouchableOpacity
          style={styles.signupBtn}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.signupText}>
            Not a Wosher?{" "}
            <Text style={styles.signupBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.footer}>
          <View style={styles.line} />
          <TouchableOpacity
            style={styles.teamBtn}
            onPress={() => router.push("/team/login")}
          >
            <Text style={styles.teamText}>TEAM LOGIN</Text>
          </TouchableOpacity>
          <Text style={styles.legal}>AUTHORIZED ACCESS ONLY. TERMS APPLY.</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, height },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(14,34,54,0.7)" },
  header: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: { fontSize: 96, fontWeight: "700", color: "#fff", letterSpacing: -3, lineHeight: 86 },
  tagline: { fontSize: 16, fontWeight: "500", color: "rgba(207,224,255,0.9)", letterSpacing: 4, marginTop: 8 },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  swipeWrap: { width: "100%", alignItems: "center", marginBottom: 12 },
  track: {
    width: TRACK_W,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  trackFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 38,
  },
  swipeLabel: {
    position: "absolute",
    alignSelf: "center",
    top: 20,
    bottom: 0,
    justifyContent: "center",
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 5,
  },
  thumb: {
    position: "absolute",
    top: 8,
    left: 8,
    width: THUMB,
    height: THUMB,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tyreOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  tyreInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { fontSize: 16, color: "#fff", fontWeight: "700" },
  hint: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 8, letterSpacing: 1 },
  signupBtn: { paddingVertical: 12 },
  signupText: { color: "rgba(255,255,255,0.7)", fontSize: 15 },
  signupBold: { fontWeight: "700", color: "#fff", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.3)" },
  dots: { flexDirection: "row", gap: 8, marginVertical: 16 },
  dot: { width: 8, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { width: 32, backgroundColor: "#fff" },
  footer: { width: "100%", alignItems: "center" },
  line: { width: "100%", height: 1, borderStyle: "dotted", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", marginBottom: 20 },
  teamBtn: { paddingVertical: 12 },
  teamText: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "500", letterSpacing: 3 },
  legal: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 2, marginTop: 8 },
});
