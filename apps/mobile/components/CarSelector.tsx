import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";

interface CarSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (make: string, model: string) => void;
  allMakes?: string[];
  popularMakes?: string[];
  getModelsByMake?: (make: string) => string[];
}

interface Car {
  make: string;
  model: string;
  year?: number;
}

export function CarSelector({ visible, onClose, onSelect, allMakes = [], popularMakes = [], getModelsByMake }: CarSelectorProps) {
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [showModels, setShowModels] = useState(false);

  const filteredMakes = selectedMake ? [selectedMake] : (
    searchQuery ? allMakes.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())) : allMakes
  );

  const models = selectedMake && getModelsByMake ? getModelsByMake(selectedMake) : [];
  const filteredModels = searchQuery && !selectedMake
    ? models.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
    : models;

  const handleMakeSelect = (make: string) => {
    setSelectedMake(make);
    setSelectedModel("");
    setShowModels(true);
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
  };

  const handleComplete = () => {
    if (selectedMake && selectedModel) {
      onSelect(selectedMake, selectedModel);
      onClose();
    }
  };

  const yearOptions: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 30; y--) {
    yearOptions.push(y);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Your Car</Text>
        </View>

        <ScrollView style={styles.modalBody}>
          {!showModels ? (
            // Make Selection
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Makes</Text>
              <View style={styles.makeList}>
                {popularMakes.slice(0, 6).map((make) => (
                  <TouchableOpacity
                    key={make}
                    style={[
                      styles.makeOption,
                      selectedMake === make && styles.makeOptionSelected,
                    ]}
                    onPress={() => handleMakeSelect(make)}
                  >
                    <Text style={styles.makeOptionText}>{make}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>All Makes</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search makes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView style={styles.makeList}>
                {filteredMakes.map((make) => (
                  <TouchableOpacity
                    key={make}
                    style={[
                      styles.makeOption,
                      selectedMake === make && styles.makeOptionSelected,
                    ]}
                    onPress={() => handleMakeSelect(make)}
                  >
                    <Text style={styles.makeOptionText}>{make}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            // Model Selection
            <View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowModels(false)}
              >
                <Text style={styles.backButtonText}>← Back to Makes</Text>
              </TouchableOpacity>

              <Text style={styles.selectedMakeTitle}>{selectedMake}</Text>
              
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${selectedMake} models...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <ScrollView style={styles.modelList}>
                {filteredModels.map((model) => (
                  <TouchableOpacity
                    key={model}
                    style={[
                      styles.modelOption,
                      selectedModel === model && styles.modelOptionSelected,
                    ]}
                    onPress={() => handleModelSelect(model)}
                  >
                    <Text style={styles.modelOptionText}>{model}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.yearSection}>
                <Text style={styles.sectionTitle}>Year</Text>
                <View style={styles.yearList}>
                  {yearOptions.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        selectedYear === year && styles.yearOptionSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={styles.yearOptionText}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={handleComplete}
              >
                <Text style={styles.selectButtonText}>Select {selectedMake} {selectedModel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginTop: "auto",
    maxHeight: "80%",
    marginBottom: "auto",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text_primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  makeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  makeOption: {
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 100,
  },
  makeOptionSelected: {
    backgroundColor: colors.primary,
  },
  makeOptionText: {
    color: colors.text_primary,
    fontSize: 14,
    fontWeight: "500",
  },
  modelList: {
    gap: spacing.sm,
  },
  modelOption: {
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  modelOptionSelected: {
    backgroundColor: colors.primary,
  },
  modelOptionText: {
    color: colors.text_primary,
    fontSize: 14,
    fontWeight: "500",
  },
  yearSection: {
    marginTop: spacing.lg,
  },
  yearList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  yearOption: {
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  yearOptionSelected: {
    backgroundColor: colors.primary,
  },
  yearOptionText: {
    color: colors.text_primary,
    fontSize: 14,
    fontWeight: "500",
  },
  searchInput: {
    backgroundColor: colors.surface_container_highest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text_primary,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  backButtonText: {
    color: colors.text_secondary,
    fontSize: 16,
    fontWeight: "500",
  },
  selectedMakeTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    alignItems: "center",
  },
  selectButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CarSelector;
