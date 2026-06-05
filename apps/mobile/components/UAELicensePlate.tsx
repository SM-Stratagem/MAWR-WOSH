import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";

interface UAELicensePlateProps {
  city: string;
  code: string;
  number: string;
  style?: ViewStyle;
  onPress?: () => void;
}

type EmirateConfig = {
  arabic: string;
  accentColor: string;
  codeBg: string;
  codeColor: string;
  numberBg: string;
  numberColor: string;
  borderColor: string;
  uaeBg: string;
  uaeColor: string;
};

const EMIRATE_CONFIGS: Record<string, EmirateConfig> = {
  dubai: {
    arabic: "دبي",
    accentColor: "#000000",
    codeBg: "#000000",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#000000",
    uaeBg: "#000000",
    uaeColor: "#ffffff",
  },
  "abu dhabi": {
    arabic: "أبو ظبي",
    accentColor: "#CC0000",
    codeBg: "#CC0000",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#1a1a1a",
    uaeBg: "#1a1a1a",
    uaeColor: "#ffffff",
  },
  sharjah: {
    arabic: "الشارقة",
    accentColor: "#006C35",
    codeBg: "#006C35",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#006C35",
    uaeBg: "#006C35",
    uaeColor: "#ffffff",
  },
  ajman: {
    arabic: "عجمان",
    accentColor: "#000000",
    codeBg: "#000000",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#000000",
    uaeBg: "#000000",
    uaeColor: "#ffffff",
  },
  fujairah: {
    arabic: "الفجيرة",
    accentColor: "#1a3a5c",
    codeBg: "#1a3a5c",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#1a3a5c",
    uaeBg: "#1a3a5c",
    uaeColor: "#ffffff",
  },
  "ras al khaimah": {
    arabic: "رأس الخيمة",
    accentColor: "#4a2c0a",
    codeBg: "#4a2c0a",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#4a2c0a",
    uaeBg: "#4a2c0a",
    uaeColor: "#ffffff",
  },
  "umm al quwain": {
    arabic: "أم القيوين",
    accentColor: "#2d5a27",
    codeBg: "#2d5a27",
    codeColor: "#ffffff",
    numberBg: "#ffffff",
    numberColor: "#000000",
    borderColor: "#2d5a27",
    uaeBg: "#2d5a27",
    uaeColor: "#ffffff",
  },
};

function getCodeBoxStyle(city: string) {
  const config = EMIRATE_CONFIGS[city.toLowerCase()];
  if (!config) return {};
  return {
    backgroundColor: config.codeBg,
  };
}

function getNumberStyle(city: string) {
  const config = EMIRATE_CONFIGS[city.toLowerCase()];
  if (!config) return {};
  return {
    color: config.numberColor,
  };
}

function PlateSection({
  city,
  code,
  number,
}: {
  city: string;
  code: string;
  number: string;
}) {
  const config = EMIRATE_CONFIGS[city.toLowerCase()] || EMIRATE_CONFIGS.dubai;

  return (
    <View style={[styles.plateInner, { borderColor: config.borderColor }]}>
      {/* Left: Code box */}
      <View style={[styles.codeBox, { backgroundColor: config.codeBg }]}>
        <Text style={[styles.codeText, { color: config.codeColor }]}>{code}</Text>
      </View>

      {/* Center: UAE + City */}
      <View style={styles.centerSection}>
        <View style={[styles.uaeLabel, { backgroundColor: config.uaeBg }]}>
          <Text style={[styles.uaeText, { color: config.uaeColor }]}>U.A.E</Text>
        </View>
        <Text style={[styles.cityArabic, { color: config.accentColor }]}>
          {config.arabic}
        </Text>
      </View>

      {/* Right: Number */}
      <View style={[styles.numberBox, { backgroundColor: config.numberBg }]}>
        <Text style={[styles.numberText, { color: config.numberColor }]}>
          {number}
        </Text>
      </View>
    </View>
  );
}

export function UAELicensePlate({
  city,
  code,
  number,
  style: customStyle,
  onPress,
}: UAELicensePlateProps) {
  const config = EMIRATE_CONFIGS[city.toLowerCase()] || EMIRATE_CONFIGS.dubai;

  const PlateContent = (
    <View
      style={[
        styles.plate,
        { borderColor: config.borderColor },
        customStyle,
      ]}
    >
      {/* Top accent strip for Abu Dhabi and Sharjah */}
      {(city.toLowerCase() === "abu dhabi" || city.toLowerCase() === "sharjah") && (
        <View
          style={[
            styles.accentStrip,
            { backgroundColor: config.accentColor },
          ]}
        />
      )}

      <PlateSection city={city} code={code} number={number} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {PlateContent}
      </TouchableOpacity>
    );
  }

  return PlateContent;
}

const styles = StyleSheet.create({
  plate: {
    width: 280,
    height: 70,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  accentStrip: {
    height: 6,
    width: "100%",
  },
  plateInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  codeBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  codeText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  uaeLabel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  uaeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  cityArabic: {
    fontSize: 14,
    fontWeight: "700",
    writingDirection: "rtl",
  },
  numberBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  numberText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
});

UAELicensePlate.defaultProps = {
  city: "dubai",
  code: "A",
  number: "12345",
};

export default UAELicensePlate;
