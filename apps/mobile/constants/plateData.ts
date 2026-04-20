export const UAE_REGIONS = [
  { key: "Dubai", label: "Dubai", arabic: "دبي" },
  { key: "Abu Dhabi", label: "Abu Dhabi", arabic: "أبو ظبي" },
  { key: "Sharjah", label: "Sharjah", arabic: "الشارقة" },
  { key: "Ajman", label: "Ajman", arabic: "عجمان" },
  { key: "Fujairah", label: "Fujairah", arabic: "الفجيرة" },
  { key: "Ras Al Khaimah", label: "Ras Al Khaimah", arabic: "رأس الخيمة" },
  { key: "Umm Al Quwain", label: "Umm Al Quwain", arabic: "أم القيوين" },
];

export const getCodeOptions = (city: string): string[] => {
  switch (city) {
    case "Dubai":
      return [
        ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
        "AA", "BB", "CC", "DD", "EE", "CR",
      ];
    case "Abu Dhabi":
      return [...Array.from({ length: 20 }, (_, i) => `${i + 1}`), "50"];
    case "Sharjah":
      return ["White", "1", "2", "3"];
    case "Ajman":
    case "Ras Al Khaimah":
    case "Fujairah":
    case "Umm Al Quwain":
      return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    default:
      return [];
  }
};
