import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useMutation, useQuery } from "convex/react";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";

export default function LocationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 25.2048,
    longitude: 55.2708,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { setBookingData } = useBookingStore();
  const createAddress = useMutation("addresses:createAddress" as any);
  const addresses = useQuery("addresses:listMyAddresses" as any) || [];

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required");
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error("Location error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveAddress = async (isDefault: boolean = true) => {
    if (!address) {
      Alert.alert("Error", "Please enter an address");
      return;
    }

    setSaving(true);
    try {
      const addressId = await createAddress({
        formattedAddress: address,
        apartmentOrVilla: apartment || undefined,
        buildingOrCommunity: building || undefined,
        street: street || undefined,
        notes: notes || undefined,
        latitude: region.latitude,
        longitude: region.longitude,
        isDefault,
      });

      setBookingData({ selectedAddressId: addressId as string });
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Location</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={region}
            draggable
            onDragEnd={(e) => {
              setRegion({
                ...region,
                latitude: e.nativeEvent.coordinate.latitude,
                longitude: e.nativeEvent.coordinate.longitude,
              });
            }}
          />
        </MapView>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Full Address *"
          placeholderTextColor={colors.text_secondary}
          value={address}
          onChangeText={setAddress}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Apt/Villa"
            placeholderTextColor={colors.text_secondary}
            value={apartment}
            onChangeText={setApartment}
          />
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Building/Community"
            placeholderTextColor={colors.text_secondary}
            value={building}
            onChangeText={setBuilding}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Street"
          placeholderTextColor={colors.text_secondary}
          value={street}
          onChangeText={setStreet}
        />

        <TextInput
          style={styles.input}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.text_secondary}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={() => handleSaveAddress(true)}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save & Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.text_secondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  mapContainer: {
    height: "35%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginHorizontal: spacing.lg,
  },
  map: {
    flex: 1,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface_container_highest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text_primary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
