import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { carMakes, carModels, carTrims, POPULAR_MAKES } from "../../constants/carData";
import { UAE_REGIONS, getCodeOptions } from "../../constants/plateData";
import UAELicensePlate from "../../components/UAELicensePlate";
import SearchableSelect from "../../components/SearchableSelect";
import { getUserFacingErrorMessage } from "../../lib/errors";

// SUV/Truck keywords to determine icon type
const SUV_KEYWORDS = ['suv', 'truck', 'jeep', '4x4', '4wd', 'off-road', 'tank', 'defender', 'wrangler', 'bronco', 'gx', 'lx', 'land cruiser', 'prado', 'patrol', 'tahoe', 'suburban', 'escalade', 'navigator', 'range rover', 'sport', 'velar', 'discovery'];

const isSUV = (make: string, model: string) => {
  const fullName = `${make} ${model}`.toLowerCase();
  return SUV_KEYWORDS.some(keyword => fullName.includes(keyword));
};

const CAR_COLORS = [
  { key: "white", label: "White" },
  { key: "black", label: "Black" },
  { key: "silver", label: "Silver" },
  { key: "gray", label: "Gray" },
  { key: "red", label: "Red" },
  { key: "blue", label: "Blue" },
  { key: "green", label: "Green" },
  { key: "brown", label: "Brown" },
  { key: "beige", label: "Beige" },
  { key: "gold", label: "Gold" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - i));

type FormStep = "make" | "model" | "trim" | "year" | "plate" | "color" | "review";

function CarPhoto({ storageId }: { storageId: string }) {
  const photoUrl = useQuery(api.cars.getPhotoUrl, { storageId });
  if (!photoUrl) return null;
  return (
    <View style={styles.carPhotoContainer}>
      <Image source={{ uri: photoUrl }} style={styles.carPhoto} />
    </View>
  );
}

export default function CarsScreen() {
  const router = useRouter();
  const { userId, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [showAddForm, setShowAddForm] = useState(false);
  const [step, setStep] = useState<FormStep>("make");

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [plateCity, setPlateCity] = useState("");
  const [plateCode, setPlateCode] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [color, setColor] = useState("");
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const cars = useQuery(api.cars.listMyCars) || [];
  const createCarMutation = useMutation(api.cars.createCar);
  const deleteCarMutation = useMutation(api.cars.deleteCar);
  const generateUploadUrl = useMutation(api.cars.generateUploadUrl);
  const saveCarPhoto = useMutation(api.cars.saveCarPhoto);
  


  const models = useMemo(() => (make ? carModels[make] || [] : []), [make]);
  const trims = useMemo(() => (make && model ? carTrims[make]?.[model] || [] : []), [make, model]);
  const codeOptions = useMemo(() => getCodeOptions(plateCity), [plateCity]);

  const resetForm = () => {
    setMake("");
    setModel("");
    setTrim("");
    setYear(String(CURRENT_YEAR));
    setPlateCity("");
    setPlateCode("");
    setPlateNumber("");
    setColor("");
    setNickname("");
    setPhotoUri(null);
    setStep("make");
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("Vehicle Photo", "How would you like to add a photo?", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uri);
      const blob = await response.blob();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });

      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Photo upload failed:", error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!make || !model) {
      Alert.alert("Error", "Please select make and model");
      return;
    }
    if (!plateCity || !plateCode || !plateNumber) {
      Alert.alert("Error", "Please complete plate details");
      return;
    }
    
    if (!userId || !isSignedIn) {
      Alert.alert("Error", "You must be logged in to add a car");
      return;
    }

    try {
      setSaving(true);
      
      const plateStr = `${plateCode} ${plateNumber}`;

      let photoStorageId: string | null = null;
      if (photoUri) {
        photoStorageId = await uploadPhoto(photoUri);
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out - please check your connection")), 15000);
      });
      
      await Promise.race([
        createCarMutation({
          make,
          model,
          year: Number(year),
          plateNumber: plateStr,
          plateRegion: plateCity.toLowerCase(),
          color: color || undefined,
          nickname: nickname || `${make} ${model}`,
          photoStorageId: photoStorageId || undefined,
        } as any),
        timeoutPromise
      ]);
      
      setSaving(false);
      setShowAddForm(false);
      resetForm();
      Alert.alert("Success", "Car added successfully!");
    } catch (error: any) {
      setSaving(false);
      Alert.alert("Could not add car", getUserFacingErrorMessage(error, "Failed to add car. Please try again."));
    }
  };

  const handleDeleteCar = (carId: string) => {
    Alert.alert("Delete Car", "Are you sure you want to remove this car?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCarMutation({ carId: carId as any });
          } catch (error: any) {
            Alert.alert("Could not delete car", getUserFacingErrorMessage(error, "Failed to delete car. Please try again."));
          }
        },
      },
    ]);
  };

  const renderStepIndicator = () => {
    const steps: { key: FormStep; label: string }[] = [
      { key: "make", label: "Make" },
      { key: "model", label: "Model" },
      { key: "year", label: "Year" },
      { key: "plate", label: "Plate" },
      { key: "color", label: "Color" },
      { key: "review", label: "Review" },
    ];
    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <View
              style={[
                styles.stepDot,
                i <= currentIdx && styles.stepDotActive,
                i === currentIdx && styles.stepDotCurrent,
              ]}
            />
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, i < currentIdx && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderMakeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Make</Text>
      <SearchableSelect
        label="Car Make"
        placeholder="Search all makes..."
        options={carMakes}
        value={make}
        onSelect={(v) => {
          setMake(v);
          setModel("");
          setTrim("");
          setStep("model");
        }}
      />
      <Text style={styles.sectionLabel}>Popular</Text>
      <View style={styles.chipGrid}>
        {POPULAR_MAKES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, make === m && styles.chipSelected]}
            onPress={() => {
              setMake(m);
              setModel("");
              setTrim("");
              setStep("model");
            }}
          >
            <Text style={[styles.chipText, make === m && styles.chipTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderModelStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep("make")}>
        <Text style={styles.backButtonText}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepTitle}>{make} — Select Model</Text>
      <SearchableSelect
        label="Model"
        placeholder={`Search ${make} models...`}
        options={models}
        value={model}
        onSelect={(v) => {
          setModel(v);
          setTrim("");
          if (trims.length > 0 || (carTrims[make] && carTrims[make][v])) {
            setStep("trim");
          } else {
            setStep("year");
          }
        }}
      />
    </View>
  );

  const renderTrimStep = () => {
    const availableTrims = carTrims[make]?.[model] || [];
    if (availableTrims.length === 0) {
      setStep("year");
      return null;
    }
    return (
      <View style={styles.stepContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep("model")}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>
          {make} {model} — Trim
        </Text>
        <SearchableSelect
          label="Trim (optional)"
          placeholder="Select trim..."
          options={availableTrims}
          value={trim}
          onSelect={(v) => {
            setTrim(v);
            setStep("year");
          }}
        />
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            setTrim("");
            setStep("year");
          }}
        >
          <Text style={styles.skipButtonText}>Skip — No trim</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderYearStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (carTrims[make]?.[model]?.length) setStep("trim");
          else setStep("model");
        }}
      >
        <Text style={styles.backButtonText}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepTitle}>Select Year</Text>
      <SearchableSelect
        label="Year"
        placeholder="Select year..."
        options={YEAR_OPTIONS}
        value={year}
        onSelect={(v) => setYear(v)}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("plate")}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlateStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep("year")}>
        <Text style={styles.backButtonText}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepTitle}>License Plate</Text>

      <SearchableSelect
        label="Emirate / City"
        placeholder="Select emirate..."
        options={UAE_REGIONS.map((r) => r.label)}
        value={UAE_REGIONS.find((r) => r.key === plateCity)?.label || ""}
        onSelect={(v) => {
          const region = UAE_REGIONS.find((r) => r.label === v);
          if (region) {
            setPlateCity(region.key);
            setPlateCode("");
          }
        }}
      />

      <View style={styles.regionChips}>
        {UAE_REGIONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.regionChip, plateCity === r.key && styles.chipSelected]}
            onPress={() => {
              setPlateCity(r.key);
              setPlateCode("");
            }}
          >
            <Text style={styles.regionArabic}>{r.arabic}</Text>
            <Text style={[styles.chipText, plateCity === r.key && styles.chipTextSelected]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SearchableSelect
        label="Plate Code"
        placeholder="Select code..."
        options={codeOptions}
        value={plateCode}
        onSelect={setPlateCode}
        disabled={!plateCity}
      />

      <Text style={styles.fieldLabel}>Plate Number</Text>
      <TextInput
        style={styles.plateInput}
        placeholder="e.g. 12345"
        placeholderTextColor={colors.ink_dim}
        value={plateNumber}
        onChangeText={setPlateNumber}
        keyboardType="number-pad"
        maxLength={5}
      />

      {plateCity && plateCode && plateNumber.length > 0 && (
        <View style={styles.platePreview}>
          <UAELicensePlate city={plateCity.toLowerCase()} code={plateCode} number={plateNumber} />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!plateCity || !plateCode || !plateNumber) && styles.primaryButtonDisabled,
        ]}
        onPress={() => plateCity && plateCode && plateNumber && setStep("color")}
        disabled={!plateCity || !plateCode || !plateNumber}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderColorStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep("plate")}>
        <Text style={styles.backButtonText}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepTitle}>Car Color</Text>
      <View style={styles.chipGrid}>
        {CAR_COLORS.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, color === c.key && styles.chipSelected]}
            onPress={() => setColor(c.key)}
          >
            <Text style={[styles.chipText, color === c.key && styles.chipTextSelected]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Nickname (optional)</Text>
      <TextInput
        style={styles.textInput}
        placeholder={`e.g. My ${make} ${model}`}
        placeholderTextColor={colors.ink_dim}
        value={nickname}
        onChangeText={setNickname}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("review")}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep("color")}>
        <Text style={styles.backButtonText}>{"< Back"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepTitle}>Review</Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Make / Model</Text>
          <Text style={styles.reviewValue}>
            {make} {model}
          </Text>
        </View>
        {trim ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Trim</Text>
            <Text style={styles.reviewValue}>{trim}</Text>
          </View>
        ) : null}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Year</Text>
          <Text style={styles.reviewValue}>{year}</Text>
        </View>
        {color ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Color</Text>
            <Text style={styles.reviewValue}>
              {CAR_COLORS.find((c) => c.key === color)?.label}
            </Text>
          </View>
        ) : null}
        {nickname ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Nickname</Text>
            <Text style={styles.reviewValue}>{nickname}</Text>
          </View>
        ) : null}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Plate</Text>
          <Text style={styles.reviewValue}>
            {plateCity} — {plateCode} {plateNumber}
          </Text>
        </View>

        {plateCity && plateCode && plateNumber && (
          <View style={styles.platePreview}>
            <UAELicensePlate
              city={plateCity.toLowerCase()}
              code={plateCode}
              number={plateNumber}
            />
          </View>
        )}
      </View>

      {/* Photo Upload */}
      <Text style={styles.fieldLabel}>Vehicle Photo (optional)</Text>
      <TouchableOpacity style={styles.photoUploadArea} onPress={showPhotoOptions}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={32} color={colors.ink_dim} />
            <Text style={styles.photoPlaceholderText}>TAP TO ADD PHOTO</Text>
          </View>
        )}
      </TouchableOpacity>
      {photoUri && (
        <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhotoUri(null)}>
          <Text style={styles.removePhotoText}>REMOVE PHOTO</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.ink} /> : (
          <Text style={styles.primaryButtonText}>Add Car</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case "make": return renderMakeStep();
      case "model": return renderModelStep();
      case "trim": return renderTrimStep();
      case "year": return renderYearStep();
      case "plate": return renderPlateStep();
      case "color": return renderColorStep();
      case "review": return renderReviewStep();
    }
  };

  if (showAddForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setShowAddForm(false);
              resetForm();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Car</Text>
          <View style={{ width: 60 }} />
        </View>
        {renderStepIndicator()}
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cars</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
          <Text style={styles.addButtonText}>+ Add Car</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {cars.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No cars yet</Text>
            <Text style={styles.emptySubtext}>Add your first car to start booking washes</Text>
          </View>
        ) : (
          cars.map((car: any) => (
            <View key={car._id} style={styles.carCard}>
              {car.photoStorageId && <CarPhoto storageId={car.photoStorageId} />}
              <View style={styles.carHeader}>
                <View style={styles.carTitleRow}>
                  <Ionicons 
                    name={isSUV(car.make, car.model) ? "car-sport" : "car"} 
                    size={24} 
                    color={colors.accent}
                    style={styles.carIcon}
                  />
                  <Text style={styles.carName}>
                    {car.nickname || `${car.make} ${car.model}`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCar(car._id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.carDetails}>
                <Text style={styles.detailText}>
                  {car.make} {car.model}
                  {car.year ? ` • ${car.year}` : ""}
                  {car.color ? ` • ${car.color}` : ""}
                </Text>
              </View>
              {car.plateNumber && (
                <View style={styles.plateSection}>
                  <View style={styles.plateHeader}>
                    <Text style={styles.plateCityLabel}>
                      {UAE_REGIONS.find(r => r.key.toLowerCase() === (car.plateRegion || "dubai").toLowerCase())?.label || 'Dubai'}
                    </Text>
                  </View>
                  <View style={styles.plateContainer}>
                    <UAELicensePlate
                      city={car.plateRegion || "dubai"}
                      code={car.plateNumber.split(' ')[0] || ""}
                      number={car.plateNumber.split(' ')[1] || car.plateNumber}
                    />
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line_soft,
    backgroundColor: colors.paper,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.ink, letterSpacing: -0.5 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  cancelButtonText: { fontSize: 10, fontWeight: "500", color: colors.ink_dim, letterSpacing: 1.4 },
  addButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  addButtonText: { color: colors.on_ink, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  list: { flex: 1 },
  listContent: { padding: spacing.lg },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl * 2 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  emptySubtext: { fontSize: 13, color: colors.ink_dim },
  carCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  carHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  carName: { fontSize: 28, fontWeight: "700", color: colors.ink, letterSpacing: -0.5 },
  deleteButton: {
    backgroundColor: colors.hot,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  deleteButtonText: { color: colors.on_accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  carDetails: { marginBottom: spacing.sm },
  detailText: { fontSize: 13, color: colors.ink_dim },
  plateContainer: { alignItems: "center", marginTop: spacing.sm },
  formScroll: { flex: 1 },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bg_deep },
  stepDotActive: { backgroundColor: colors.accent },
  stepDotCurrent: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.bg_deep, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.accent },
  stepContent: { padding: spacing.lg },
  stepTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  regionChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    backgroundColor: colors.bg_soft,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: "500" },
  chipTextSelected: { color: colors.on_ink },
  regionChip: {
    backgroundColor: colors.bg_soft,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 80,
  },
  regionArabic: { color: colors.ink_dim, fontSize: 12, marginBottom: 2 },
  plateInput: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
  },
  platePreview: { alignItems: "center", marginVertical: spacing.lg },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.on_accent, fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  skipButtonText: { color: colors.ink_dim, fontSize: 13, fontWeight: "500" },
  backButton: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  backButtonText: { color: colors.ink_dim, fontSize: 13 },
  reviewCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  reviewLabel: { fontSize: 10, color: colors.ink_dim, fontWeight: "500", letterSpacing: 1.4 },
  reviewValue: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  carTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.md,
  },
  carIcon: {
    marginRight: spacing.sm,
  },
  plateSection: {
    marginTop: spacing.md,
    backgroundColor: colors.bg_soft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  plateHeader: {
    marginBottom: spacing.sm,
  },
  plateCityLabel: {
    fontSize: 10,
    color: colors.ink_dim,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  photoUploadArea: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  photoPlaceholder: {
    width: "100%",
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  photoPlaceholderText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  removePhotoButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  removePhotoText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.hot,
    letterSpacing: 1.4,
  },
  carPhotoContainer: {
    width: "100%",
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    backgroundColor: colors.bg_soft,
  },
  carPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
