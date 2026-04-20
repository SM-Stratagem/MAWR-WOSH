import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";

interface UAELicensePlateProps {
  city: string;
  code: string;
  number: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export function UAELicensePlate({
  city,
  code,
  number,
  style: customStyle,
  onPress,
}: UAELicensePlateProps) {
  const renderPlate = () => {
    const cityLower = city.toLowerCase();
    
    switch(cityLower) {
      case "dubai":
        return renderDubaiPlate();
      case "abu dhabi":
        return renderAbuDhabiPlate();
      case "sharjah":
        return renderSharjahPlate();
      case "ajman":
        return renderAjmanPlate();
      case "fujairah":
        return renderFujairahPlate();
      case "ras al khaimah":
        return renderRasAlKhaimahPlate();
      case "umm al quwain":
        return renderUmmAlQuwainPlate();
      default:
        return renderDubaiPlate();
    }
  };

  const renderDubaiPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.dubai, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>دبي</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAbuDhabiPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.abuDhabi, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>أبو ظبي</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSharjahPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.sharjah, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>الشارقة</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAjmanPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.ajman, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>عجمان</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFujairahPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.fujairah, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>الفجيرة</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRasAlKhaimahPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.rasAlKhaimah, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>رأس الخيمة</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
  </TouchableOpacity>
  );

  const renderUmmAlQuwainPlate = () => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.plate, styles.ummAlQuwain, customStyle]}
    >
      <View style={styles.plateLeft}>
        <Text style={styles.plateCode}>{code}</Text>
      </View>
      <View style={styles.plateMiddle}>
        <Text style={styles.plateUAE}>U.A.E</Text>
        <Text style={styles.plateCityArabic}>أم القيوين</Text>
      </View>
      <View style={styles.plateRight}>
        <Text style={styles.plateNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );

  return renderPlate();
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 280,
    height: 60,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plateLeft: {
    justifyContent: "center",
  },
  plateCode: {
    backgroundColor: "#000000",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: "center",
    minWidth: 50,
  },
  plateMiddle: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 8,
  },
  plateUAE: {
    backgroundColor: "#000000",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    textAlign: "center",
    minWidth: 30,
  },
  plateCityArabic: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    writingDirection: "rtl",
  },
  plateRight: {
    justifyContent: "center",
  },
  plateNumber: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: "center",
    minWidth: 80,
  },
  dubai: {
    backgroundColor: "#ffffff",
  },
  abuDhabi: {
    backgroundColor: "#ffffff",
  },
  sharjah: {
    backgroundColor: "#ffffff",
  },
  ajman: {
    backgroundColor: "#ffffff",
  },
  fujairah: {
    backgroundColor: "#ffffff",
  },
  rasAlKhaimah: {
    backgroundColor: "#ffffff",
  },
  ummAlQuwain: {
    backgroundColor: "#ffffff",
  },
});

UAELicensePlate.defaultProps = {
  city: "dubai",
  code: "1234567",
  number: "1234",
};

export default UAELicensePlate;
