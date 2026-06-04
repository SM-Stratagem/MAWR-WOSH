import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";
import { getUserFacingErrorMessage } from "../lib/errors";

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

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

  // Google Places search state
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReverseGeocodeCoords = useRef<{ latitude: number; longitude: number } | null>(null);

  const { setBookingData } = useBookingStore();
  const createAddress = useMutation(api.addresses.createAddress);
  const addresses = useQuery(api.addresses.listMyAddresses) || [];

  const apiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined);

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
        const nextRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(nextRegion);
        scheduleReverseGeocode(nextRegion.latitude, nextRegion.longitude, 100);
      } catch (error) {
        console.error("Location error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (reverseGeocodeTimeout.current) clearTimeout(reverseGeocodeTimeout.current);
    };
  }, []);

  // Google Places Autocomplete
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }

    if (!apiKey) {
      console.warn("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:ae&types=address`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Places search failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "OK" && data.predictions) {
        setPredictions(data.predictions.slice(0, 5));
        setShowPredictions(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Places search error:", error);
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setAddress(text);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchPlaces(text);
    }, 500);
  };

  const selectPrediction = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setSearchQuery(prediction.description);
    setAddress(prediction.description);

    // Get place details for coordinates
    if (!apiKey) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${apiKey}`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Place details failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "OK" && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error("Place details error:", error);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const nextRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(nextRegion);
      scheduleReverseGeocode(nextRegion.latitude, nextRegion.longitude, 100);
    } catch (error) {
      console.error("Current location error:", error);
      Alert.alert("Error", "Could not get current location");
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!apiKey) return;

    const previous = lastReverseGeocodeCoords.current;
    if (
      previous &&
      Math.abs(previous.latitude - lat) < 0.0001 &&
      Math.abs(previous.longitude - lng) < 0.0001
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
        { method: "GET" }
      );
      if (!response.ok) {
        throw new Error(`Reverse geocode failed: ${response.status}`);
      }

      const data = await response.json();
      lastReverseGeocodeCoords.current = { latitude: lat, longitude: lng };

      if (data.status === "OK" && data.results?.[0]?.formatted_address) {
        const formatted = data.results[0].formatted_address;
        setSearchQuery(formatted);
        setAddress(formatted);
      }
    } catch (error) {
      console.error("Reverse geocode error:", error);
    }
  };

  const scheduleReverseGeocode = (lat: number, lng: number, delay = 700) => {
    if (reverseGeocodeTimeout.current) {
      clearTimeout(reverseGeocodeTimeout.current);
    }
    reverseGeocodeTimeout.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, delay);
  };

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
      Alert.alert("Could not save address", getUserFacingErrorMessage(error, "Failed to save address. Please try again."));
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text_secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for an address..."
            placeholderTextColor={colors.text_secondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => predictions.length > 0 && setShowPredictions(true)}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {showPredictions && predictions.length > 0 && (
          <View style={styles.predictionsContainer}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => selectPrediction(item)}
                >
                  <Ionicons name="location" size={16} color={colors.text_secondary} />
                  <View style={styles.predictionText}>
                    <Text style={styles.predictionMainText} numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.predictionSecondaryText} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>

      {!apiKey && (
        <View style={styles.mapWarning}>
          <Text style={styles.mapWarningText}>
            Google Maps key is missing. Address search and map lookup are running in manual mode.
          </Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={(newRegion) => {
            setRegion(newRegion);
            scheduleReverseGeocode(newRegion.latitude, newRegion.longitude);
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={region}
            draggable
            onDragEnd={(e) => {
              const newRegion = {
                latitude: e.nativeEvent.coordinate.latitude,
                longitude: e.nativeEvent.coordinate.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setRegion(newRegion);
              scheduleReverseGeocode(newRegion.latitude, newRegion.longitude, 100);
            }}
          />
        </MapView>

        <TouchableOpacity style={styles.locationButton} onPress={handleCurrentLocation}>
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Full Address *"
          placeholderTextColor={colors.text_secondary}
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setSearchQuery(text);
          }}
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
  mapWarning: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface_container_high,
  },
  mapWarningText: {
    color: colors.text_secondary,
    fontSize: 12,
    lineHeight: 16,
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text_primary,
    height: "100%",
  },
  predictionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 200,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  predictionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  predictionMainText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text_primary,
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: colors.text_secondary,
    marginTop: 2,
  },
  locationButton: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
