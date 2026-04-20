import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function SearchableSelect({
  label,
  placeholder = "Search...",
  options,
  value,
  onSelect,
  disabled = false,
}: SearchableSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search
        ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
        : options,
    [search, options]
  );

  const handleSelect = (opt: string) => {
    onSelect(opt);
    setExpanded(false);
    setSearch("");
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded && !disabled && (
        <View style={styles.dropdown}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type to search..."
            placeholderTextColor={colors.text_secondary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <ScrollView style={styles.optionsList} nestedScrollEnabled>
            {filtered.length === 0 && (
              <Text style={styles.noResults}>No results</Text>
            )}
            {filtered.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.option, value === opt && styles.optionSelected]}
                onPress={() => handleSelect(opt)}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === opt && styles.optionTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text_secondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    backgroundColor: colors.surface_container_highest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  triggerDisabled: {
    opacity: 0.4,
  },
  triggerText: {
    color: colors.text_primary,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  placeholder: {
    color: colors.text_secondary,
  },
  chevron: {
    color: colors.text_secondary,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  dropdown: {
    backgroundColor: colors.surface_container,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 220,
    overflow: "hidden",
  },
  searchInput: {
    backgroundColor: colors.surface_container_highest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text_primary,
    fontSize: 15,
  },
  optionsList: {
    maxHeight: 180,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text_primary,
    fontSize: 15,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  noResults: {
    color: colors.text_secondary,
    textAlign: "center",
    paddingVertical: spacing.md,
    fontSize: 14,
  },
});
