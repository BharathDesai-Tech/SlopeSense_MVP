export interface NortheastLocation {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'moderate' | 'high';
}

export const northeastLocations: NortheastLocation[] = [
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7362, severity: 'moderate' },
  { id: 'silchar', name: 'Silchar', state: 'Assam', latitude: 24.8273, longitude: 92.7979, severity: 'moderate' },
  { id: 'dibrugarh', name: 'Dibrugarh', state: 'Assam', latitude: 27.4728, longitude: 94.9120, severity: 'high' },
  { id: 'tezpur', name: 'Tezpur', state: 'Assam', latitude: 26.6339, longitude: 92.8000, severity: 'moderate' },
  { id: 'shillong', name: 'Shillong', state: 'Meghalaya', latitude: 25.5788, longitude: 91.8933, severity: 'high' },
  { id: 'tura', name: 'Tura', state: 'Meghalaya', latitude: 25.5138, longitude: 90.2202, severity: 'moderate' },
  { id: 'imphal', name: 'Imphal', state: 'Manipur', latitude: 24.8170, longitude: 93.9368, severity: 'high' },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', latitude: 25.6741, longitude: 94.1109, severity: 'high' },
  { id: 'dimapur', name: 'Dimapur', state: 'Nagaland', latitude: 25.9090, longitude: 93.7278, severity: 'moderate' },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', latitude: 23.7307, longitude: 92.7173, severity: 'moderate' },
  { id: 'lunglei', name: 'Lunglei', state: 'Mizoram', latitude: 22.8671, longitude: 92.7477, severity: 'low' },
  { id: 'agartala', name: 'Agartala', state: 'Tripura', latitude: 23.8315, longitude: 91.2868, severity: 'moderate' },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', latitude: 27.1004, longitude: 93.6065, severity: 'high' },
  { id: 'naharlagun', name: 'Naharlagun', state: 'Arunachal Pradesh', latitude: 27.1245, longitude: 93.6926, severity: 'moderate' },
  { id: 'pasighat', name: 'Pasighat', state: 'Arunachal Pradesh', latitude: 28.0667, longitude: 95.3298, severity: 'high' },
  { id: 'bomdila', name: 'Bomdila', state: 'Arunachal Pradesh', latitude: 27.2645, longitude: 92.4086, severity: 'moderate' },
  { id: 'tawang', name: 'Tawang', state: 'Arunachal Pradesh', latitude: 27.5860, longitude: 91.8655, severity: 'moderate' },
  { id: 'jowai', name: 'Jowai', state: 'Meghalaya', latitude: 25.4660, longitude: 92.1963, severity: 'moderate' },
  { id: 'churachandpur', name: 'Churachandpur', state: 'Manipur', latitude: 24.3326, longitude: 93.6698, severity: 'moderate' },
  { id: 'kailashahar', name: 'Kailashahar', state: 'Tripura', latitude: 24.3328, longitude: 92.0166, severity: 'low' },
  { id: 'north_lakhimpur', name: 'North Lakhimpur', state: 'Assam', latitude: 27.2352, longitude: 94.1036, severity: 'moderate' },
  { id: 'jorhat', name: 'Jorhat', state: 'Assam', latitude: 26.7509, longitude: 94.2037, severity: 'moderate' },
  { id: 'sivasagar', name: 'Sivasagar', state: 'Assam', latitude: 26.9826, longitude: 94.6425, severity: 'moderate' },
  { id: 'tinsukia', name: 'Tinsukia', state: 'Assam', latitude: 27.4922, longitude: 95.3468, severity: 'high' },
  { id: 'nagaon', name: 'Nagaon', state: 'Assam', latitude: 26.3464, longitude: 92.684, severity: 'moderate' },
  { id: 'bongaigaon', name: 'Bongaigaon', state: 'Assam', latitude: 26.4823, longitude: 90.5586, severity: 'moderate' },
  { id: 'goalpara', name: 'Goalpara', state: 'Assam', latitude: 26.1664, longitude: 90.6264, severity: 'moderate' },
  { id: 'diphu', name: 'Diphu', state: 'Assam', latitude: 25.843, longitude: 93.4316, severity: 'high' },
  { id: 'nongpoh', name: 'Nongpoh', state: 'Meghalaya', latitude: 25.9023, longitude: 91.8798, severity: 'high' },
  { id: 'mangan', name: 'Mangan', state: 'Sikkim', latitude: 27.5091, longitude: 88.5345, severity: 'high' },
  { id: 'gangtok', name: 'Gangtok', state: 'Sikkim', latitude: 27.3389, longitude: 88.6065, severity: 'high' },
  { id: 'namchi', name: 'Namchi', state: 'Sikkim', latitude: 27.1649, longitude: 88.3639, severity: 'moderate' },
  { id: 'pelling', name: 'Pelling', state: 'Sikkim', latitude: 27.305, longitude: 88.238, severity: 'high' },
  { id: 'ukhrul', name: 'Ukhrul', state: 'Manipur', latitude: 25.0967, longitude: 94.3611, severity: 'high' },
  { id: 'senapati', name: 'Senapati', state: 'Manipur', latitude: 25.267, longitude: 94.021, severity: 'high' },
  { id: 'champhai', name: 'Champhai', state: 'Mizoram', latitude: 23.465, longitude: 93.328, severity: 'moderate' },
  { id: 'kolasib', name: 'Kolasib', state: 'Mizoram', latitude: 24.2239, longitude: 92.678, severity: 'moderate' },
  { id: 'serchhip', name: 'Serchhip', state: 'Mizoram', latitude: 23.305, longitude: 92.846, severity: 'moderate' },
  { id: 'mamit', name: 'Mamit', state: 'Mizoram', latitude: 23.927, longitude: 92.489, severity: 'moderate' },
  { id: 'mokokchung', name: 'Mokokchung', state: 'Nagaland', latitude: 26.322, longitude: 94.518, severity: 'moderate' },
  { id: 'mon', name: 'Mon', state: 'Nagaland', latitude: 26.716, longitude: 95.031, severity: 'high' },
  { id: 'tuensang', name: 'Tuensang', state: 'Nagaland', latitude: 26.268, longitude: 94.824, severity: 'high' },
  { id: 'wokha', name: 'Wokha', state: 'Nagaland', latitude: 26.097, longitude: 94.259, severity: 'moderate' },
  { id: 'zunheboto', name: 'Zunheboto', state: 'Nagaland', latitude: 25.967, longitude: 94.524, severity: 'moderate' },
  { id: 'seppa', name: 'Seppa', state: 'Arunachal Pradesh', latitude: 27.365, longitude: 93.047, severity: 'high' },
  { id: 'ziro', name: 'Ziro', state: 'Arunachal Pradesh', latitude: 27.544, longitude: 93.819, severity: 'high' },
  { id: 'along', name: 'Aalo', state: 'Arunachal Pradesh', latitude: 28.17, longitude: 94.8, severity: 'high' },
  { id: 'roing', name: 'Roing', state: 'Arunachal Pradesh', latitude: 28.14, longitude: 95.84, severity: 'high' },
  { id: 'tezu', name: 'Tezu', state: 'Arunachal Pradesh', latitude: 27.912, longitude: 96.135, severity: 'high' },
  { id: 'changlang', name: 'Changlang', state: 'Arunachal Pradesh', latitude: 27.117, longitude: 96.734, severity: 'high' },
  { id: 'daporijo', name: 'Daporijo', state: 'Arunachal Pradesh', latitude: 27.986, longitude: 94.222, severity: 'high' },
  { id: 'dharmanagar', name: 'Dharmanagar', state: 'Tripura', latitude: 24.376, longitude: 92.17, severity: 'moderate' },
  { id: 'ambassa', name: 'Ambassa', state: 'Tripura', latitude: 23.934, longitude: 91.852, severity: 'moderate' },
  { id: 'belonia', name: 'Belonia', state: 'Tripura', latitude: 23.251, longitude: 91.454, severity: 'low' },
];

export const defaultLocationId = 'guwahati';
