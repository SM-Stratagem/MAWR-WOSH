import { v } from "convex/values";
import { query } from "./_generated/server";

export const getCarMakes = query({
  args: {},
  handler: async () => {
    const popularMakes = [
      'Toyota', 'Nissan', 'Hyundai', 'Honda', 'Ford', 'Mercedes-Benz', 'BMW', 'Audi', 'Kia', 'Mazda', 'Chevrolet',
      'Volkswagen', 'Lexus', 'Tesla', 'Peugeot', 'Renault', 'Suzuki', 'Mitsubishi', 'Mazda',
    ];
    
    return {
      allMakes: [],
      popularMakes,
    };
  },
});

export const getCarModels = query({
  args: { make: v.string() },
  handler: async (ctx, args) => {
    const currentYear = new Date().getFullYear();
    const validYears: number[] = [];
    for (let year = currentYear; year >= currentYear - 30; year--) {
      if (year >= 1900 && year <= currentYear + 2) {
        validYears.push(year);
      }
    }
    
    return {
      models: [],
      validYears,
      defaultYear: currentYear,
    };
  },
});

export const validatePlate = query({
  args: {
    plateNumber: v.string(),
    plateRegion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pn = args.plateNumber;
    
    if (!pn || pn.length < 4 || pn.length > 7) {
      return { valid: false, error: "Plate must be 4-7 characters" };
    }
    
    // Basic alphanumeric check
    const isValid = /^[A-Z0-9]{4,5}$/.test(pn);
    
    if (!isValid) {
      return { valid: false, error: "Plate must be alphanumeric (4-7 chars)" };
    }
    
    // Check for restricted sequences
    const restrictedPatterns = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    const isRestricted = restrictedPatterns.some(pattern => pn.includes(pattern));
    
    if (isRestricted) {
      return { valid: false, error: "Restricted plate number" };
    }
    
    return { valid: true, error: null };
  },
});
