// Simplified car data for immediate use
// Will be expanded with full makes/models data

export const popularMakes = [
  'Toyota', 'Nissan', 'Hyundai', 'Honda', 'Ford', 'Mercedes-Benz', 'BMW', 'Audi', 'Kia', 'Mazda', 'Chevrolet',
  'Volkswagen', 'Lexus', 'Tesla', 'Peugeot', 'Renault', 'Suzuki', 'Mitsubishi', 'Mazda',
];

export const getModelsByMake = (make: string): string[] => {
  const models: Record<string, string[]> = {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', '4Runner', 'Tacoma', 'Tundra'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Fit', 'Jazz', 'City', 'HR-V'],
    'Ford': ['F-150', 'Mustang', 'Focus', 'Explorer', 'Escape'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLB', 'GLE'],
    'BMW': ['3 Series', '5 Series', 'X1', 'X3', 'X5', 'X6', 'X7', 'Z4'],
    'Nissan': ['Altima', 'Sentra', 'Versa', 'Note', 'Leaf', 'Juke', 'Pathfinder', 'Armada'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Palisade', 'Creta', 'Venue', 'Kona', 'Ioniq', 'Sonata', 'Elantra'],
    'Kia': ['Telluride', 'Sorento', 'Sportage', 'Seltos', 'Forte', 'K5', 'Rio', 'Cadenza', 'EV6'],
    'Chevrolet': ['Silverado', 'Tahoe', 'Suburban', 'Equinox', 'Traverse', 'Trax', 'Blazer', 'Camaro', 'Corvette', 'Malibu'],
    'Volkswagen': ['Golf', 'Passat', 'Jetta', 'Arteon', 'Touareg', 'Polo'],
  };
  
  return models[make] || [];
};

export const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 2;
};

export const validatePlate = (plateNumber: string): { valid: boolean, error: string | null } => {
  if (!plateNumber || plateNumber.length < 4 || plateNumber.length > 7) {
    return { valid: false, error: "Plate must be 4-7 characters" };
  }
  
  // Basic alphanumeric check
  const plateRegex = /^[A-Z0-9]{4,5}$/;
  const isValid = plateRegex.test(plateNumber);
  
  if (!isValid) {
    return { valid: false, error: "Plate must be alphanumeric (4-7 chars)" };
  }
  
  // Check for restricted sequences
  const restrictedPatterns = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  const isRestricted = restrictedPatterns.some(pattern => plateNumber.includes(pattern));
  
  if (isRestricted) {
    return { valid: false, error: "Restricted plate number" };
  }
  
  return { valid: true, error: null };
};
