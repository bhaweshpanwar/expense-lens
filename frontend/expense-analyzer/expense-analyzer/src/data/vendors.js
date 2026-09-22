// Vendors that Sharma Furniture & Hardware regularly deals with

export const vendors = [
  { id: 'gupta-timber', name: 'Gupta Timber', category: 'Raw Materials' },
  { id: 'sharma-electricals', name: 'Sharma Electricals', category: 'Electricity & Utilities' },
  { id: 'verma-hardware', name: 'Verma Hardware', category: 'Raw Materials' },
  { id: 'local-transport', name: 'Local Transport', category: 'Transportation' },
  { id: 'city-packaging', name: 'City Packaging', category: 'Packaging' },
  { id: 'rajesh-electricals', name: 'Rajesh Electricals', category: 'Maintenance' },
  { id: 'shree-plywood', name: 'Shree Plywood House', category: 'Raw Materials' },
  { id: 'landlord-property', name: 'Agarwal Properties', category: 'Rent' },
  { id: 'staff-wages', name: 'Workshop Staff', category: 'Labour' },
  { id: 'stationery-mart', name: 'Modern Stationery Mart', category: 'Office Supplies' },
  { id: 'print-media', name: 'Indore Print & Media', category: 'Marketing' },
];

export const getVendorByName = (name) => vendors.find((v) => v.name === name);
