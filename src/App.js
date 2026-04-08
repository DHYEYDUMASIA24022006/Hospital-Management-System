import './App.css';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import patientSeed from './data/patients-80.json';

const ROOM_TYPES = ['General', 'Normal', 'Deluxe', 'ICU'];
const HOSPITAL_BEDS = 1000;
const BED_CAPACITY = { General: 400, Normal: 300, Deluxe: 200, ICU: 100 };
const LIVE_TIME_ACCELERATION = 180;
const ROOM_RATES = { General: 1800, Normal: 3200, Deluxe: 5200, ICU: 9800 };
const THEME_STORAGE_KEY = 'hospital-theme';
const USERS_STORAGE_KEY = 'hospital-users';
const SESSION_STORAGE_KEY = 'hospital-session-user';
const APP_STATE_STORAGE_KEY = 'hospital-app-state-v1';
const API_STATE_ENDPOINT = '/api/state';
const DOCTORS = [
  { id: 1, name: 'Dr. House', specialty: 'Cardiology', maxPatients: 20 },
  { id: 2, name: 'Dr. Priya Sharma', specialty: 'Cardiology', maxPatients: 24 },
  { id: 3, name: 'Dr. Alan Reed', specialty: 'Pulmonology', maxPatients: 24 },
  { id: 4, name: 'Dr. Neha Kapoor', specialty: 'Pulmonology', maxPatients: 20 },
  { id: 5, name: 'Dr. Arjun Mehta', specialty: 'Neurology', maxPatients: 20 },
  { id: 6, name: 'Dr. Susan Lim', specialty: 'Neurology', maxPatients: 18 },
  { id: 7, name: 'Dr. Kavya Iyer', specialty: 'Orthopedics', maxPatients: 26 },
  { id: 8, name: 'Dr. Rohan Nair', specialty: 'Orthopedics', maxPatients: 22 },
  { id: 9, name: 'Dr. Omar Siddiqui', specialty: 'Nephrology', maxPatients: 18 },
  { id: 10, name: 'Dr. Meera Joshi', specialty: 'Gastroenterology', maxPatients: 20 },
  { id: 11, name: 'Dr. Isha Menon', specialty: 'Dermatology', maxPatients: 16 },
  { id: 12, name: 'Dr. Nikhil Batra', specialty: 'General Medicine', maxPatients: 30 },
  { id: 13, name: 'Dr. Grace Thomas', specialty: 'General Medicine', maxPatients: 28 },
  { id: 14, name: 'Dr. Rahul Verma', specialty: 'Emergency Medicine', maxPatients: 24 },
  { id: 15, name: 'Dr. Liam Chen', specialty: 'Emergency Medicine', maxPatients: 22 },
  { id: 16, name: 'Dr. Fatima Noor', specialty: 'Gastroenterology', maxPatients: 18 },
  { id: 17, name: 'Dr. Arvind Rao', specialty: 'Nephrology', maxPatients: 16 },
  { id: 18, name: 'Dr. Rebecca Paul', specialty: 'Pulmonology', maxPatients: 18 },
  { id: 19, name: 'Dr. Ethan Blake', specialty: 'Cardiology', maxPatients: 18 },
  { id: 20, name: 'Dr. Ayesha Khan', specialty: 'General Medicine', maxPatients: 24 },
  { id: 21, name: 'Dr. Vikram Sethi', specialty: 'Infectious Disease', maxPatients: 22 },
  { id: 22, name: 'Dr. Julia Fernandes', specialty: 'Infectious Disease', maxPatients: 18 },
  { id: 23, name: 'Dr. Harshad Vora', specialty: 'Trauma Surgery', maxPatients: 16 },
  { id: 24, name: 'Dr. Elina Roy', specialty: 'Trauma Surgery', maxPatients: 14 },
  { id: 25, name: 'Dr. Martin Dsouza', specialty: 'Critical Care', maxPatients: 18 },
  { id: 26, name: 'Dr. Pooja Nanda', specialty: 'Critical Care', maxPatients: 16 }
];
DOCTORS.forEach((doctor) => { doctor.maxPatients *= 2; });
const SPECIALTY_KEYWORDS = [
  { specialty: 'Cardiology', words: ['heart', 'cardiac', 'chest pain', 'blood pressure', 'stroke', 'rhythm'] },
  { specialty: 'Pulmonology', words: ['asthma', 'pneumonia', 'bronch', 'lung', 'covid', 'respiratory', 'chest congestion'] },
  { specialty: 'Neurology', words: ['migraine', 'seizure', 'vertigo', 'panic', 'head injury'] },
  { specialty: 'Orthopedics', words: ['fracture', 'injury', 'burn', 'trauma'] },
  { specialty: 'Nephrology', words: ['kidney', 'urinary'] },
  { specialty: 'Gastroenterology', words: ['liver', 'stomach', 'append', 'ulcer', 'gall bladder', 'gastro', 'food poisoning'] },
  { specialty: 'Dermatology', words: ['skin', 'allergy', 'rash'] },
  { specialty: 'Infectious Disease', words: ['sepsis', 'dengue', 'malaria', 'typhoid', 'chikungunya', 'viral'] },
  { specialty: 'Trauma Surgery', words: ['accident', 'trauma', 'fracture', 'head injury', 'burn'] },
  { specialty: 'Critical Care', words: ['failure', 'critical', 'stroke', 'shock'] }
];
const DISEASE_PROFILES = [
  { words: ['heart failure', 'stroke', 'sepsis', 'burn', 'road accident', 'trauma', 'kidney failure'], stayHours: [96, 360], treatmentCost: 24000, diagnostics: 6500, procedure: 18000 },
  { words: ['pneumonia', 'appendicitis', 'covid', 'dengue', 'malaria', 'chest pain'], stayHours: [48, 168], treatmentCost: 14500, diagnostics: 4200, procedure: 9500 },
  { words: ['fracture', 'infection', 'kidney stone', 'liver', 'thyroid', 'asthma', 'typhoid'], stayHours: [24, 120], treatmentCost: 9200, diagnostics: 3000, procedure: 4200 },
  { words: ['migraine', 'viral fever', 'food poisoning', 'allergy', 'flu', 'vertigo', 'dehydration', 'panic', 'sinus'], stayHours: [6, 48], treatmentCost: 3800, diagnostics: 1200, procedure: 0 }
];

class PriorityQueue {
  constructor() {
    this.heap = [];
  }
  _cmp(a, b) {
    if (a.emergencyLevel !== b.emergencyLevel) return b.emergencyLevel - a.emergencyLevel;
    return a.arrivalTime - b.arrivalTime;
  }
  insert(p) {
    this.heap.push(p);
    let i = this.heap.length - 1;
    while (i > 0) {
      const par = Math.floor((i - 1) / 2);
      if (this._cmp(this.heap[i], this.heap[par]) < 0) {
        [this.heap[i], this.heap[par]] = [this.heap[par], this.heap[i]];
        i = par;
      } else break;
    }
  }
  extract() {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let best = i;
        if (l < this.heap.length && this._cmp(this.heap[l], this.heap[best]) < 0) best = l;
        if (r < this.heap.length && this._cmp(this.heap[r], this.heap[best]) < 0) best = r;
        if (best !== i) {
          [this.heap[i], this.heap[best]] = [this.heap[best], this.heap[i]];
          i = best;
        } else break;
      }
    }
    return top;
  }
  peek() {
    return this.heap[0] || null;
  }
  toSortedArray() {
    const tmp = new PriorityQueue();
    tmp.heap = [...this.heap];
    const res = [];
    while (tmp.heap.length) res.push(tmp.extract());
    return res;
  }
  get size() {
    return this.heap.length;
  }
}

class Trie {
  constructor() {
    this.root = {};
  }
  insert(name) {
    let node = this.root;
    for (const ch of name.toLowerCase()) {
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node.$ = true;
  }
  _collect(node, prefix, results) {
    if (node.$) results.push(prefix);
    for (const ch in node) {
      if (ch !== '$') this._collect(node[ch], prefix + ch, results);
    }
  }
  search(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node[ch]) return [];
      node = node[ch];
    }
    const results = [];
    this._collect(node, prefix.toLowerCase(), results);
    return results;
  }
}

class MedianFinder {
  constructor() {
    this.low = [];
    this.high = [];
    this.total = 0;
    this.count = 0;
  }
  _pushMax(h, v) {
    h.push(-v);
    let i = h.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (h[i] < h[p]) {
        [h[i], h[p]] = [h[p], h[i]];
        i = p;
      } else break;
    }
  }
  _pushMin(h, v) {
    h.push(v);
    let i = h.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (h[i] < h[p]) {
        [h[i], h[p]] = [h[p], h[i]];
        i = p;
      } else break;
    }
  }
  _popMax(h) {
    const top = -h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let b = i;
        if (l < h.length && h[l] < h[b]) b = l;
        if (r < h.length && h[r] < h[b]) b = r;
        if (b !== i) {
          [h[i], h[b]] = [h[b], h[i]];
          i = b;
        } else break;
      }
    }
    return top;
  }
  _popMin(h) {
    const top = h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let b = i;
        if (l < h.length && h[l] < h[b]) b = l;
        if (r < h.length && h[r] < h[b]) b = r;
        if (b !== i) {
          [h[i], h[b]] = [h[b], h[i]];
          i = b;
        } else break;
      }
    }
    return top;
  }
  add(val) {
    this.total += val;
    this.count++;
    if (!this.low.length || val <= -this.low[0]) this._pushMax(this.low, val);
    else this._pushMin(this.high, val);
    if (this.low.length > this.high.length + 1) this._pushMin(this.high, this._popMax(this.low));
    if (this.high.length > this.low.length) this._pushMax(this.low, this._popMin(this.high));
  }
  getMedian() {
    if (!this.count) return 0;
    if (this.low.length > this.high.length) return -this.low[0];
    if (!this.low.length) return 0;
    return (-this.low[0] + this.high[0]) / 2;
  }
}

class BedHeap {
  constructor(n) {
    this.heap = Array.from({ length: n }, (_, i) => i + 1);
    this.occupied = new Set();
    this.typeHeaps = { General: [], Normal: [], Deluxe: [], ICU: [] };
    for (let i = 1; i <= n; i++) {
      this.typeHeaps[this.getBedType(i)].push(i);
    }
  }
  getBedType(bed) {
    if (bed <= BED_CAPACITY.General) return 'General';
    if (bed <= BED_CAPACITY.General + BED_CAPACITY.Normal) return 'Normal';
    if (bed <= BED_CAPACITY.General + BED_CAPACITY.Normal + BED_CAPACITY.Deluxe) return 'Deluxe';
    return 'ICU';
  }
  _extractMin(arr) {
    if (!arr.length) return -1;
    return arr.shift();
  }
  _insertSorted(arr, val) {
    let i = 0;
    while (i < arr.length && arr[i] < val) i++;
    arr.splice(i, 0, val);
  }
  assign(preferred = 'General') {
    let bed = this._extractMin(this.typeHeaps[preferred]);
    if (bed === -1) {
      for (const t of ROOM_TYPES) {
        bed = this._extractMin(this.typeHeaps[t]);
        if (bed !== -1) break;
      }
    }
    if (bed === -1) return -1;
    this.occupied.add(bed);
    return bed;
  }
  release(bed) {
    this.occupied.delete(bed);
    this._insertSorted(this.typeHeaps[this.getBedType(bed)], bed);
  }
  occupyExisting(bed) {
    const type = this.getBedType(bed);
    const arr = this.typeHeaps[type];
    const idx = arr.indexOf(bed);
    if (idx !== -1) arr.splice(idx, 1);
    this.occupied.add(bed);
  }
  get free() {
    return ROOM_TYPES.reduce((sum, t) => sum + this.typeHeaps[t].length, 0);
  }
  freeByType(type) {
    return this.typeHeaps[type].length;
  }
  isOccupied(bed) {
    return this.occupied.has(bed);
  }
}

function App() {

  const pqRef = useRef(new PriorityQueue());
  const trieRef = useRef(new Trie());
  const mfRef = useRef(new MedianFinder());
  const bedsRef = useRef(new BedHeap(HOSPITAL_BEDS));
  const nextIdRef = useRef(1);
  const doctorLoadsRef = useRef(
    DOCTORS.reduce((acc, doctor) => {
      acc[doctor.id] = 0;
      return acc;
    }, {})
  );

  const [activePanel, setActivePanel] = useState('dashboard');
  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [bulkAllocateCount, setBulkAllocateCount] = useState(50);
  const [regName, setRegName] = useState('');
  const [regDisease, setRegDisease] = useState('');
  const [regRoomType, setRegRoomType] = useState('General');
  const [regEmergency, setRegEmergency] = useState(3);
  const [admitted, setAdmitted] = useState([]);
  const [discharged, setDischarged] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [dischargeDayFilter, setDischargeDayFilter] = useState('today');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [toasts, setToasts] = useState([]);
  const [demoImported, setDemoImported] = useState(false);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [liveInflow, setLiveInflow] = useState(6);
  const [liveIntervalSec, setLiveIntervalSec] = useState(5);
  const [, setTick] = useState(0);
  const didAutoImportRef = useRef(false);
  const admittedRef = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
      setTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    admittedRef.current = admitted;
  }, [admitted]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    if (currentUser) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [currentUser]);

  const formatTime = (sec) => {
    let val = sec;
    if (val < 0) val = 0;
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = val % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const fmtDate = (ts) => new Date(ts).toLocaleTimeString();
  const toUpperName = (text) => text.trim().toUpperCase();
  const getInitials = useCallback((text) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, []);
  const displayName = useCallback((p) => `[${p.initials || getInitials(p.name)}] ${p.name}`, [getInitials]);
  const emerLabel = (l) => ['', 'Stable', 'Minor', 'Moderate', 'Severe', 'Critical', 'Urgent', 'Code Red'][l] || l;
  const emergencyNote = (level) => {
    if (level >= 7) return 'Immediate resuscitation team activated.';
    if (level === 6) return 'Priority trauma/critical response required.';
    if (level === 5) return 'High priority monitoring and rapid intervention.';
    if (level === 4) return 'Fast-track diagnostics advised.';
    return 'Standard emergency protocol.';
  };
  const roomBadgeClass = (roomType) => `room-badge room-${roomType.toLowerCase()}`;
  const inferSpecialty = useCallback((disease) => {
    const text = disease.toLowerCase();
    const found = SPECIALTY_KEYWORDS.find((item) => item.words.some((word) => text.includes(word)));
    return found ? found.specialty : 'General Medicine';
  }, []);
  const allocateDoctor = useCallback((disease) => {
    const specialty = inferSpecialty(disease);
    const inSpecialty = DOCTORS.filter((doctor) => doctor.specialty === specialty);
    const specialtyChoices = inSpecialty
      .filter((doctor) => doctorLoadsRef.current[doctor.id] < doctor.maxPatients)
      .sort((a, b) => doctorLoadsRef.current[a.id] - doctorLoadsRef.current[b.id]);
    const fallbackChoices = DOCTORS
      .filter((doctor) => doctorLoadsRef.current[doctor.id] < doctor.maxPatients)
      .sort((a, b) => doctorLoadsRef.current[a.id] - doctorLoadsRef.current[b.id]);
    const selected = specialtyChoices[0] || fallbackChoices[0] || null;
    if (!selected) return { specialty, doctorId: null, doctorName: 'Unassigned (At Capacity)' };
    doctorLoadsRef.current[selected.id] += 1;
    return { specialty, doctorId: selected.id, doctorName: selected.name };
  }, [inferSpecialty]);
  const releaseDoctor = useCallback((doctorId) => {
    if (!doctorId || !(doctorId in doctorLoadsRef.current)) return;
    doctorLoadsRef.current[doctorId] = Math.max(0, doctorLoadsRef.current[doctorId] - 1);
  }, []);
  const syncBedsFromAdmitted = useCallback((admittedList) => {
    const rebuilt = new BedHeap(HOSPITAL_BEDS);
    admittedList.forEach((p) => {
      if (p?.bedNo > 0 && p.bedNo <= HOSPITAL_BEDS) rebuilt.occupyExisting(p.bedNo);
    });
    bedsRef.current = rebuilt;
  }, []);
  const getDiseaseProfile = useCallback((disease) => {
    const txt = disease.toLowerCase();
    const matched = DISEASE_PROFILES.find((profile) => profile.words.some((word) => txt.includes(word)));
    return matched || { stayHours: [8, 36], treatmentCost: 2200 };
  }, []);
  const estimateStayHours = useCallback((patient, roomTypeOverride) => {
    const profile = getDiseaseProfile(patient.disease);
    const [minStay, maxStay] = profile.stayHours;
    const spread = Math.max(1, maxStay - minStay);
    const baseStay = minStay + ((patient.id * 11 + patient.emergencyLevel * 7) % spread);
    const roomType = roomTypeOverride || patient.roomType || patient.preferredRoom || 'Normal';
    const roomFactor = { General: 0.95, Normal: 1, Deluxe: 1.08, ICU: 1.28 }[roomType] || 1;
    const emergencyFactor = 1 + (Math.max(1, Math.min(7, patient.emergencyLevel || 3)) - 3) * 0.11;
    const diseaseFactor = profile.treatmentCost >= 20000 ? 1.22 : profile.treatmentCost >= 12000 ? 1.1 : 1;
    const adjusted = Math.round(baseStay * roomFactor * emergencyFactor * diseaseFactor);
    return Math.max(2, adjusted);
  }, [getDiseaseProfile]);
  const getEffectiveStayMs = useCallback(
    (patient) => (patient.estimatedStayHours * 60 * 60 * 1000) / LIVE_TIME_ACCELERATION,
    []
  );
  const estimateWaitSeconds = useCallback((patient, queueDepth) => {
    const baseByEmergency = { 7: 60, 6: 2 * 60, 5: 5 * 60, 4: 10 * 60, 3: 16 * 60, 2: 24 * 60, 1: 36 * 60 };
    const loadFactor = Math.floor((queueDepth / Math.max(1, HOSPITAL_BEDS)) * 55 * 60);
    const variability = (patient.id * 41 + queueDepth * 17) % (9 * 60);
    const capped = (baseByEmergency[patient.emergencyLevel] || 12 * 60) + loadFactor + variability;
    return Math.min(3 * 60 * 60, Math.max(60, capped));
  }, []);
  const safeMoney = (num) => {
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.round(num));
  };
  const createFeedback = useCallback((patient) => {
    const complaintTypes = ['Cleanliness', 'Waiting Time', 'Staff Responsiveness', 'Billing Desk', 'Food Quality', 'No Major Complaint'];
    const complaintBodies = [
      'Admission process was smooth but initial room transfer took longer than expected.',
      'Nursing team was attentive; however, medicine delivery missed one scheduled window.',
      'Housekeeping standards were good, though washroom sanitization can be more frequent.',
      'Doctor communication was clear, but attendants wanted more frequent status updates.',
      'Discharge billing queue was busy during peak hours and felt slightly delayed.',
      'Overall experience remained stable with no significant concerns.'
    ];
    const suggestions = [
      'Add one more billing counter during evening discharge rush.',
      'Introduce digital nursing call tracking for quicker non-emergency responses.',
      'Increase attendant communication rounds to every 4 hours.',
      'Expand housekeeping checks for shared facilities at fixed intervals.',
      'Provide bedside discharge summary preview before final bill generation.',
      'Maintain current quality standards and continue periodic audits.'
    ];
    const rating = 3 + (patient.id % 3);
    const idx = (patient.id + patient.emergencyLevel) % complaintTypes.length;
    return {
      rating,
      complaintType: complaintTypes[idx],
      complaintText: complaintBodies[(idx + patient.id) % complaintBodies.length],
      suggestion: suggestions[(idx + patient.emergencyLevel) % suggestions.length]
    };
  }, []);
  const buildBill = useCallback((patient, dischargeTime) => {
    const rawStay = Number((dischargeTime - patient.bedAllocTime) / (1000 * 60 * 60));
    const stayHours = Math.max(1, Math.ceil(Number.isFinite(rawStay) ? rawStay : 1));
    const roomRate = ROOM_RATES[patient.roomType] || ROOM_RATES.General;
    const roomCharge = safeMoney(stayHours * roomRate);
    const profile = getDiseaseProfile(patient.disease);
    const emergencyCharge = safeMoney(patient.emergencyLevel * 950);
    const doctorFee = safeMoney(1400 + patient.emergencyLevel * 700);
    const nursingCharge = safeMoney(Math.ceil(stayHours / 24) * 950);
    const pharmacyCharge = safeMoney(profile.treatmentCost * 0.35);
    const diagnosticsCharge = safeMoney(profile.diagnostics + patient.emergencyLevel * 350);
    const procedureCharge = safeMoney(profile.procedure);
    const treatmentCharge = safeMoney(profile.treatmentCost);
    const serviceCharge = 1400;
    const subtotal = safeMoney(roomCharge + emergencyCharge + doctorFee + nursingCharge + pharmacyCharge + diagnosticsCharge + procedureCharge + treatmentCharge + serviceCharge);
    const gst = safeMoney(subtotal * 0.05);
    const insuranceDiscount = patient.id % 4 === 0 ? safeMoney(subtotal * 0.12) : 0;
    const total = safeMoney(subtotal + gst - insuranceDiscount);
    return {
      stayHours,
      roomRate,
      roomCharge,
      emergencyCharge,
      doctorFee,
      nursingCharge,
      pharmacyCharge,
      diagnosticsCharge,
      procedureCharge,
      treatmentCharge,
      serviceCharge,
      subtotal,
      gst,
      insuranceDiscount,
      total
    };
  }, [getDiseaseProfile]);
  const handleAuthSubmit = () => {
    try {
      const email = authEmail.trim().toLowerCase();
      if (!email || !authPassword.trim()) return pushToast('Email and password are required.', 'error');
      if (authMode === 'signup') {
        if (!authName.trim()) return pushToast('Please enter your full name.', 'error');
        if (users.some((u) => u.email === email)) return pushToast('User already exists. Please sign in.', 'error');
        const newUser = { id: Date.now(), name: authName.trim(), email, password: authPassword };
        setUsers((prev) => [...prev, newUser]);
        setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email });
        pushToast(`Welcome ${newUser.name}`, 'success');
        return;
      }
      const existing = users.find((u) => u.email === email && u.password === authPassword);
      if (!existing) return pushToast('Sign in failed: invalid credentials.', 'error');
      setCurrentUser({ id: existing.id, name: existing.name, email: existing.email });
      pushToast(`Welcome back ${existing.name}`, 'success');
    } catch {
      pushToast('Sign in failed due to a system error.', 'error');
    }
  };
  const handleSignOut = () => {
    try {
      if (!currentUser) return pushToast('Sign out failed: no active session.', 'error');
      setCurrentUser(null);
      pushToast('Signed out successfully.', 'success');
    } catch {
      pushToast('Sign out failed due to a system error.', 'error');
    }
  };

  const pushToast = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, 3000);
  };

  const buildSnapshot = useCallback(() => ({
    waitingHeap: pqRef.current.heap,
    admitted,
    discharged,
    doctorLoads: doctorLoadsRef.current,
    nextId: nextIdRef.current,
    demoImported,
    beds: {
      typeHeaps: bedsRef.current.typeHeaps,
      occupied: Array.from(bedsRef.current.occupied)
    },
    median: {
      low: mfRef.current.low,
      high: mfRef.current.high,
      total: mfRef.current.total,
      count: mfRef.current.count
    }
  }), [admitted, discharged, demoImported]);

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.waitingHeap)) return false;
    pqRef.current = new PriorityQueue();
    pqRef.current.heap = snapshot.waitingHeap;

    bedsRef.current = new BedHeap(HOSPITAL_BEDS);
    if (snapshot.beds?.typeHeaps && snapshot.beds?.occupied) {
      bedsRef.current.typeHeaps = snapshot.beds.typeHeaps;
      bedsRef.current.occupied = new Set(snapshot.beds.occupied);
    }

    doctorLoadsRef.current = snapshot.doctorLoads || doctorLoadsRef.current;
    nextIdRef.current = Number(snapshot.nextId) || nextIdRef.current;
    mfRef.current = new MedianFinder();
    mfRef.current.low = snapshot.median?.low || [];
    mfRef.current.high = snapshot.median?.high || [];
    mfRef.current.total = Number(snapshot.median?.total) || 0;
    mfRef.current.count = Number(snapshot.median?.count) || 0;

    const restoredAdmitted = Array.isArray(snapshot.admitted) ? snapshot.admitted : [];
    const restoredDischarged = Array.isArray(snapshot.discharged) ? snapshot.discharged : [];
    setAdmitted(restoredAdmitted);
    setDischarged(restoredDischarged);
    setDemoImported(Boolean(snapshot.demoImported));

    trieRef.current = new Trie();
    [...pqRef.current.heap, ...restoredAdmitted, ...restoredDischarged].forEach((p) => {
      if (p?.name) trieRef.current.insert(p.name);
    });
    return true;
  }, []);

  const waitingList = pqRef.current.toSortedArray();
  const nextPatient = pqRef.current.peek();
  const allPatients = [...waitingList, ...admitted, ...discharged];
  const freeBeds = Math.max(0, HOSPITAL_BEDS - admitted.length);
  const generalEnd = BED_CAPACITY.General;
  const normalEnd = BED_CAPACITY.General + BED_CAPACITY.Normal;
  const deluxeEnd = BED_CAPACITY.General + BED_CAPACITY.Normal + BED_CAPACITY.Deluxe;
  const bedFreeByType = {
    General: Math.max(0, BED_CAPACITY.General - admitted.filter((p) => p.bedNo > 0 && p.bedNo <= generalEnd).length),
    Normal: Math.max(0, BED_CAPACITY.Normal - admitted.filter((p) => p.bedNo > generalEnd && p.bedNo <= normalEnd).length),
    Deluxe: Math.max(0, BED_CAPACITY.Deluxe - admitted.filter((p) => p.bedNo > normalEnd && p.bedNo <= deluxeEnd).length),
    ICU: Math.max(0, BED_CAPACITY.ICU - admitted.filter((p) => p.bedNo > deluxeEnd && p.bedNo <= HOSPITAL_BEDS).length)
  };
  const occupiedBeds = HOSPITAL_BEDS - freeBeds;
  const occupancyPct = Math.round((occupiedBeds / HOSPITAL_BEDS) * 100);

  const registerPatient = () => {
    const name = regName.trim();
    if (!name) {
      pushToast('Name cannot be empty!', 'error');
      return;
    }
    if (!regDisease.trim()) {
      pushToast('Please enter disease/suffering.', 'error');
      return;
    }
    const p = {
      id: nextIdRef.current++,
      name: toUpperName(name),
      initials: getInitials(name),
      disease: regDisease.trim(),
      preferredRoom: regRoomType,
      roomType: '',
      emergencyLevel: Number(regEmergency),
      arrivalTime: Date.now(),
      bedNo: -1,
      bedAllocTime: 0,
      specialty: inferSpecialty(regDisease.trim()),
      doctorId: null,
      doctorName: 'Pending Allocation',
      emergencyMsg: emergencyNote(Number(regEmergency)),
      estimatedStayHours: estimateStayHours({ id: nextIdRef.current, disease: regDisease.trim(), emergencyLevel: Number(regEmergency) })
    };
    pqRef.current.insert(p);
    trieRef.current.insert(p.name);
    setRegName('');
    setRegDisease('');
    setRegRoomType('General');
    setRegEmergency(3);
    pushToast(`Patient "${name}" registered (ID: ${p.id}, Level ${p.emergencyLevel})`, 'success');
    setTick((x) => x + 1);
  };

  const enqueueAutoPatient = useCallback((count = 1) => {
    let added = 0;
    for (let i = 0; i < count; i++) {
      const seed = patientSeed[(nextIdRef.current + i) % patientSeed.length];
      if (!seed) continue;
      const emergencyLevel = Math.max(1, Math.min(7, Number(seed.emergencyLevel) || 2));
      const p = {
        id: nextIdRef.current++,
        name: toUpperName(seed.name || `PATIENT ${nextIdRef.current}`),
        initials: getInitials(seed.name || `PATIENT ${nextIdRef.current}`),
        disease: seed.disease || 'GENERAL CHECKUP',
        preferredRoom: ROOM_TYPES.includes(seed.preferredRoom) ? seed.preferredRoom : 'General',
        roomType: '',
        emergencyLevel,
        arrivalTime: Date.now(),
        bedNo: -1,
        bedAllocTime: 0,
        specialty: inferSpecialty(seed.disease || 'GENERAL CHECKUP'),
        doctorId: null,
        doctorName: 'Pending Allocation',
        emergencyMsg: emergencyNote(emergencyLevel),
        estimatedStayHours: estimateStayHours({ id: nextIdRef.current, disease: seed.disease || 'GENERAL CHECKUP', emergencyLevel })
      };
      pqRef.current.insert(p);
      trieRef.current.insert(p.name);
      added++;
    }
    if (added) setTick((x) => x + 1);
    return added;
  }, [estimateStayHours, getInitials, inferSpecialty]);

  const allocateNextPatient = useCallback((silent = false) => {
    if (pqRef.current.size === 0) {
      if (!silent) pushToast('No patients in waiting queue.', 'error');
      return false;
    }
    if (bedsRef.current.free === 0) {
      if (!silent) pushToast('No free beds available!', 'error');
      return false;
    }
    const p = pqRef.current.extract();
    const bed = bedsRef.current.assign(p.preferredRoom);
    const doctorAssigned = allocateDoctor(p.disease);
    p.bedNo = bed;
    p.roomType = bedsRef.current.getBedType(bed);
    p.estimatedStayHours = estimateStayHours(p, p.roomType);
    p.bedAllocTime = Date.now();
    p.specialty = doctorAssigned.specialty;
    p.doctorId = doctorAssigned.doctorId;
    p.doctorName = doctorAssigned.doctorName;
    const waitSec = estimateWaitSeconds(p, pqRef.current.size + admitted.length);
    p.arrivalTime = Date.now() - waitSec * 1000;
    p.bedAllocTime = Date.now();
    mfRef.current.add(waitSec);
    setAdmitted((prev) => [...prev, p]);
    if (!silent) pushToast(`${displayName(p)} -> Bed ${bed} (${p.roomType}) | Wait: ${formatTime(waitSec)} | ${p.emergencyMsg}`, 'success');
    setTick((x) => x + 1);
    return true;
  }, [admitted.length, allocateDoctor, estimateWaitSeconds, displayName, estimateStayHours]);

  const allocateBed = () => {
    allocateNextPatient(false);
  };
  const allocateMultipleBeds = () => {
    const requested = Math.max(1, Math.min(50, Number(bulkAllocateCount) || 50));
    const allocatable = Math.min(requested, pqRef.current.size, bedsRef.current.free);
    if (allocatable <= 0) {
      pushToast('No eligible patients/beds for bulk allocation.', 'error');
      return;
    }
    let done = 0;
    for (let i = 0; i < allocatable; i++) {
      if (allocateNextPatient(true)) done++;
    }
    pushToast(`${done} patients allocated successfully.`, done ? 'success' : 'error');
    setTick((x) => x + 1);
  };

  const dischargePatient = useCallback((id, opts = {}) => {
    const current = admittedRef.current.find((p) => p.id === id);
    if (!current) return;

    const p = { ...current, dischargeTime: Date.now() };
    const estimatedDischarge = p.bedAllocTime + p.estimatedStayHours * 60 * 60 * 1000;
    // For auto-discharge, respect estimated stay completion.
    // For manual discharge button, discharge immediately in real time.
    if (opts.silent && p.dischargeTime < estimatedDischarge) p.dischargeTime = estimatedDischarge;
    p.bill = buildBill(p, p.dischargeTime);
    p.feedback = createFeedback(p);

    bedsRef.current.release(p.bedNo);
    releaseDoctor(p.doctorId);
    setAdmitted((prev) => prev.filter((x) => x.id !== id));
    setDischarged((old) => {
      const alreadyAdded = old.some((x) => x.id === p.id && x.bedAllocTime === p.bedAllocTime);
      if (alreadyAdded) return old;
      return [...old, p];
    });
    if (!opts.silent) pushToast(`Patient ${displayName(p)} discharged. Bed ${p.bedNo} freed.`, 'success');
    setTick((x) => x + 1);
  }, [buildBill, createFeedback, releaseDoctor, displayName]);

  useEffect(() => {
    if (!stateHydrated) return;
    if (!liveMode) return;
    const cadence = Math.max(2, Number(liveIntervalSec) || 5);
    const inflow = Math.max(1, Math.min(20, Number(liveInflow) || 6));
    const liveTimer = setInterval(() => {
      const shouldGrowQueue = pqRef.current.size < 300;
      if (shouldGrowQueue) enqueueAutoPatient(inflow);
      const duePatients = admitted.filter((p) => Date.now() >= (p.bedAllocTime + getEffectiveStayMs(p)));
      duePatients.forEach((p) => dischargePatient(p.id, { silent: true }));
      if (!duePatients.length && pqRef.current.size > 0 && bedsRef.current.free > 0) {
        const cycles = bedsRef.current.free > 10 ? 2 : 1;
        for (let i = 0; i < cycles; i++) allocateNextPatient(true);
      }
    }, cadence * 1000);
    return () => clearInterval(liveTimer);
  }, [admitted, allocateNextPatient, dischargePatient, enqueueAutoPatient, stateHydrated, liveMode, liveInflow, liveIntervalSec, getEffectiveStayMs]);

  const importDemoPatients = useCallback((opts = {}) => {
    if (demoImported) {
      if (!opts.silent) pushToast('Demo patients are already imported.', 'info');
      return;
    }
    let added = 0;
    patientSeed.forEach((entry, index) => {
      const cleanedName = toUpperName(entry.name || '');
      if (!cleanedName) return;
      const p = {
        id: nextIdRef.current++,
        name: cleanedName,
        initials: getInitials(cleanedName),
        disease: entry.disease || 'GENERAL CHECKUP',
        preferredRoom: ROOM_TYPES.includes(entry.preferredRoom) ? entry.preferredRoom : 'General',
        roomType: '',
        emergencyLevel: Number(entry.emergencyLevel) || 2,
        arrivalTime: Date.now() - (6 * 60 * 60 * 1000 + ((added + index) * 17 * 60 * 1000) % (18 * 60 * 60 * 1000)),
        bedNo: -1,
        bedAllocTime: 0,
        specialty: inferSpecialty(entry.disease || 'GENERAL CHECKUP'),
        doctorId: null,
        doctorName: 'Pending Allocation',
        emergencyMsg: emergencyNote(Number(entry.emergencyLevel) || 2),
        estimatedStayHours: estimateStayHours({ id: nextIdRef.current, disease: entry.disease || 'GENERAL CHECKUP', emergencyLevel: Number(entry.emergencyLevel) || 2 })
      };
      pqRef.current.insert(p);
      trieRef.current.insert(p.name);
      added++;
    });

    if (opts.bootstrapFlow) {
      const initiallyAdmitted = [];
      const initiallyDischarged = [];
      const targetWaiting = 80;
      const targetProcessed = Math.max(0, added - targetWaiting);
      const targetFinalDischarged = 90;
      let processed = 0;

      while (processed < targetProcessed) {
        if (bedsRef.current.free === 0 && initiallyAdmitted.length) {
          const dischargeNow = { ...initiallyAdmitted.shift() };
          dischargeNow.dischargeTime = dischargeNow.bedAllocTime + dischargeNow.estimatedStayHours * 60 * 60 * 1000;
          dischargeNow.bill = buildBill(dischargeNow, dischargeNow.dischargeTime);
          dischargeNow.feedback = createFeedback(dischargeNow);
          bedsRef.current.release(dischargeNow.bedNo);
          initiallyDischarged.push(dischargeNow);
        }

        const patient = pqRef.current.extract();
        if (!patient) break;
        const bed = bedsRef.current.assign(patient.preferredRoom);
        if (bed === -1) break;
        const doctorAssigned = allocateDoctor(patient.disease);
        patient.bedNo = bed;
        patient.roomType = bedsRef.current.getBedType(bed);
        patient.estimatedStayHours = estimateStayHours(patient, patient.roomType);
        const waitSec = estimateWaitSeconds(patient, Math.max(1, targetProcessed - processed));
        patient.bedAllocTime = patient.arrivalTime + waitSec * 1000;
        patient.specialty = doctorAssigned.specialty;
        patient.doctorId = doctorAssigned.doctorId;
        patient.doctorName = doctorAssigned.doctorName;
        mfRef.current.add(waitSec);
        initiallyAdmitted.push(patient);
        processed++;
      }

      while (initiallyDischarged.length < targetFinalDischarged && initiallyAdmitted.length) {
        const patient = { ...initiallyAdmitted.shift() };
        const daysAgo = initiallyDischarged.length % 7; // 0=today, 1=yesterday, 2..6 last five days
        const dischargeBase = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
        const timeBucket = ((patient.id * 61) % (18 * 60 * 60)) + 3 * 60 * 60;
        patient.dischargeTime = dischargeBase - timeBucket * 1000;
        const stayMs = patient.estimatedStayHours * 60 * 60 * 1000;
        patient.bedAllocTime = patient.dischargeTime - stayMs;
        patient.bill = buildBill(patient, patient.dischargeTime);
        patient.feedback = createFeedback(patient);
        bedsRef.current.release(patient.bedNo);
        releaseDoctor(patient.doctorId);
        initiallyDischarged.push(patient);
      }

      setAdmitted(initiallyAdmitted);
      setDischarged(initiallyDischarged);
      setSelectedBill(null);
    }

    setDemoImported(true);
    if (!opts.silent) pushToast(`${added} demo patients imported successfully.`, 'success');
    setTick((x) => x + 1);
  }, [demoImported, allocateDoctor, inferSpecialty, releaseDoctor, buildBill, estimateStayHours, createFeedback, estimateWaitSeconds, getInitials]);

  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      try {
        const res = await fetch(API_STATE_ENDPOINT);
        if (!res.ok) throw new Error('api-not-ready');
        const remote = await res.json();
        const ok = applySnapshot(remote);
        if (!ok) {
          const localRaw = localStorage.getItem(APP_STATE_STORAGE_KEY);
          const local = localRaw ? JSON.parse(localRaw) : null;
          if (local) applySnapshot(local);
        }
      } catch {
        try {
          const localRaw = localStorage.getItem(APP_STATE_STORAGE_KEY);
          const local = localRaw ? JSON.parse(localRaw) : null;
          if (local) applySnapshot(local);
        } catch {
          // ignore corrupted local state
        }
      } finally {
        if (alive) setStateHydrated(true);
      }
    };
    hydrate();
    return () => { alive = false; };
  }, [applySnapshot]);

  useEffect(() => {
    if (!stateHydrated) return;
    if (didAutoImportRef.current) return;
    didAutoImportRef.current = true;
    if (!demoImported) importDemoPatients({ silent: true, bootstrapFlow: true });
  }, [importDemoPatients, stateHydrated, demoImported]);

  useEffect(() => {
    syncBedsFromAdmitted(admitted);
  }, [admitted, syncBedsFromAdmitted]);

  useEffect(() => {
    if (!stateHydrated) return;
    const snapshot = buildSnapshot();
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(snapshot));
    fetch(API_STATE_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    }).catch(() => {
      // fallback already persisted locally
    });
  }, [stateHydrated, buildSnapshot, clock]);

  const criticalPatients = [...waitingList.filter((p) => p.emergencyLevel >= 6), ...admitted.filter((p) => p.emergencyLevel >= 6)].slice(0, 8);
  const dist = [0, 0, 0, 0, 0, 0, 0];
  allPatients.forEach((p) => {
    dist[p.emergencyLevel - 1]++;
  });
  const maxDist = Math.max(...dist, 1);
  const peak = allPatients.reduce((m, p) => Math.max(m, p.emergencyLevel), 0);

  const suggestions = useMemo(() => {
    const prefix = searchInput.trim().toLowerCase();
    if (!prefix) return [];
    const raw = trieRef.current.search(prefix);
    return [...new Set(raw)].slice(0, 8);
  }, [searchInput]);

  const activeSearch = (selectedSearch || searchInput).trim().toLowerCase();
  const searchRows = [
    ...waitingList.map((p) => ({ ...p, status: 'waiting' })),
    ...admitted.map((p) => ({ ...p, status: 'admitted' })),
    ...discharged.map((p) => ({ ...p, status: 'discharged' }))
  ].filter((p) => (activeSearch ? p.name.toLowerCase().includes(activeSearch) : false));
  const dischargedDesc = [...discharged].sort((a, b) => b.dischargeTime - a.dischargeTime);
  const dayStart = (ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const todayStart = dayStart(Date.now());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const lastFiveDayStarts = Array.from({ length: 5 }, (_, i) => todayStart - (i + 2) * 24 * 60 * 60 * 1000);
  const getDateLabel = (startTs) =>
    new Date(startTs).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const daySections = [
    { key: 'today', label: 'Today', match: (p) => dayStart(p.dischargeTime) === todayStart },
    { key: 'yesterday', label: 'Yesterday', match: (p) => dayStart(p.dischargeTime) === yesterdayStart },
    ...lastFiveDayStarts.map((startTs) => ({
      key: `d-${startTs}`,
      label: getDateLabel(startTs),
      match: (p) => dayStart(p.dischargeTime) === startTs
    }))
  ];
  const activeDaySection = daySections.find((s) => s.key === dischargeDayFilter) || daySections[0];
  const filteredDischarged = dischargedDesc.filter(activeDaySection.match);

  if (!currentUser) {
    return (
      <div className={`app-shell auth-shell ${theme === 'light' ? 'theme-light' : ''}`}>
        <div className="auth-card">
          <div className="logo auth-logo">
            <div className="logo-icon"><span className="logo-heart">✚</span></div>
            Medi<span>Nova Prime</span>
          </div>
          <h2>{authMode === 'signup' ? 'Create account' : 'Welcome back'}</h2>
          <p className="auth-sub">Sign in to access the hospital dashboard.</p>
          {authMode === 'signup' && (
            <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Full name" />
          )}
          <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email address" />
          <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" />
          <button className="btn btn-primary" onClick={handleAuthSubmit}>
            {authMode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
          <button className="btn btn-ghost" onClick={() => setAuthMode((m) => (m === 'signup' ? 'signin' : 'signup'))}>
            {authMode === 'signup' ? 'Already have an account? Sign In' : 'New here? Create account'}
          </button>
          {!!users.length && <div className="auth-sub">Registered users: {users.length}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${theme === 'light' ? 'theme-light' : ''}`}>
      <header>
        <div className="logo">
          <div className="logo-icon">
            <span className="logo-heart">✚</span>
          </div>
          Medi<span>Nova Prime</span>
        </div>
        <div className="header-stats">
          <div className="hstat"><strong>{currentUser.name}</strong>{currentUser.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setTheme((old) => (old === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setLiveMode((v) => !v)}>
            {liveMode ? 'Live: ON' : 'Live: OFF'}
          </button>
          <div className="hstat"><strong>{waitingList.length}</strong>Waiting</div>
          <div className="hstat"><strong>{admitted.length}</strong>Admitted</div>
          <div className="hstat"><strong>{freeBeds}</strong>Free Beds</div>
          <div className="hstat live-clock"><span className="live-dot"></span>{clock}</div>
        </div>
      </header>

      <div className="layout">
        <nav>
          <div className="nav-label">Navigation</div>
          {['dashboard', 'register', 'waiting', 'admitted', 'discharged', 'beds', 'stats', 'search', 'doctors', 'about'].map((id, i) => (
            <button key={id} className={`nav-btn ${activePanel === id ? 'active' : ''}`} onClick={() => setActivePanel(id)}>
              <span className="icon">{['◈', '+', '⏳', '🛏', '✓', '⊞', '◎', '⌕', '🩺', 'ℹ'][i]}</span>
              {['Dashboard', 'Register Patient', 'Waiting Queue', 'Admitted', 'Discharged', 'Bed Map', 'Statistics', 'Search', 'Doctors', 'About Us'][i]}
              {id === 'waiting' && <span className="nav-badge red">{waitingList.length}</span>}
              {id === 'admitted' && <span className="nav-badge green">{admitted.length}</span>}
              {id === 'discharged' && <span className="nav-badge blue">{discharged.length}</span>}
            </button>
          ))}
        </nav>

        <main>
          {activePanel === 'dashboard' && (
            <div className="panel active">
              <div className="page-title">Dashboard</div>

              <div className="stats-grid">
                <div className="stat-card cyan"><div className="stat-label">FREE BEDS</div><div className="stat-val">{freeBeds}</div><div className="stat-sub">of {HOSPITAL_BEDS} total</div></div>
                <div className="stat-card red"><div className="stat-label">WAITING</div><div className="stat-val">{waitingList.length}</div><div className="stat-sub">in queue</div></div>
                <div className="stat-card green"><div className="stat-label">ADMITTED</div><div className="stat-val">{admitted.length}</div><div className="stat-sub">in beds</div></div>
                <div className="stat-card yellow"><div className="stat-label">DISCHARGED</div><div className="stat-val">{discharged.length}</div><div className="stat-sub">total history</div></div>
              </div>

              <div className="two-col">
                <div className="card next-queue-card">
                  <div className="card-title">Next In Queue</div>
                  {nextPatient ? (
                    <div className="next-queue-body">
                      <div className="next-row next-row-top">
                        <div>
                          <div className="next-name">{displayName(nextPatient)}</div>
                          <div className="next-meta">ID: {nextPatient.id}</div>
                        </div>
                        <span className={`badge badge-${nextPatient.emergencyLevel}`}>LVL {nextPatient.emergencyLevel} - {emerLabel(nextPatient.emergencyLevel)}</span>
                      </div>
                      <div className="next-wait">Waiting: <span>{formatTime(Math.floor((Date.now() - nextPatient.arrivalTime) / 1000))}</span></div>
                      <div className="next-note">{nextPatient.emergencyMsg}</div>
                    </div>
                  ) : (
                    <div className="empty"><span className="empty-icon">⏳</span>Queue is empty</div>
                  )}
                  <div className="action-row">
                    <button className="btn btn-primary" onClick={allocateBed}>Allocate Bed -&gt;</button>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Critical Patients (Level 6+)</div>
                  {criticalPatients.length ? criticalPatients.map((p) => (
                    <div key={`${p.id}-${p.bedNo}`} className="crit-row">
                      <span>{displayName(p)}</span>
                      <span className={p.bedNo > 0 ? 'ok' : 'warn'}>{p.bedNo > 0 ? `Bed ${p.bedNo}` : 'WAITING'}</span>
                    </div>
                  )) : <div className="empty"><span className="empty-icon">✓</span>No critical patients</div>}
                </div>
              </div>
              <div className="card doctor-overview">
                <div className="card-title">Doctor Availability Overview</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Doctor</th><th>Specialty</th><th>Current</th><th>Capacity</th></tr></thead>
                    <tbody>
                      {DOCTORS.map((doctor) => (
                        <tr key={doctor.id}>
                          <td>{doctor.name}</td>
                          <td>{doctor.specialty}</td>
                          <td>{doctorLoadsRef.current[doctor.id]}</td>
                          <td>{doctor.maxPatients}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'register' && (
            <div className="panel active">
              <div className="page-title">Register Patient</div>
              <div className="card">
                <div className="card-title">Patient Information</div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Full Name</label>
                    <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Enter patient full name" />
                  </div>
                  <div className="form-group full">
                    <label>Disease / Suffering</label>
                    <input value={regDisease} onChange={(e) => setRegDisease(e.target.value)} placeholder="e.g. High fever, chest pain..." />
                  </div>
                  <div className="form-group full">
                    <label>Preferred Room Type</label>
                    <select value={regRoomType} onChange={(e) => setRegRoomType(e.target.value)}>
                      {ROOM_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group emer-group">
                    <label>Emergency Level</label>
                    <div className="emer-options">
                      {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                        <div className="emer-opt" key={lvl}>
                          <input id={`e${lvl}`} type="radio" name="emer" checked={regEmergency === lvl} onChange={() => setRegEmergency(lvl)} />
                          <label htmlFor={`e${lvl}`}>{lvl} - {emerLabel(lvl)}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-primary" onClick={registerPatient}>Register &amp; Add to Queue</button>
                  <button className="btn btn-ghost" onClick={() => importDemoPatients()} disabled={demoImported}>
                    {demoImported ? 'Demo Patients Imported' : 'Import Demo Patients'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setRegName(''); setRegDisease(''); setRegRoomType('General'); setRegEmergency(3); }}>Clear</button>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'waiting' && (
            <div className="panel active">
              <div className="page-title">Waiting Queue</div>
              <div className="action-row compact">
                <button className="btn btn-primary" onClick={allocateBed}>Allocate Bed to Next -&gt;</button>
                <input
                  className="bulk-input"
                  type="number"
                  min="1"
                  max="50"
                  value={bulkAllocateCount}
                  onChange={(e) => setBulkAllocateCount(e.target.value)}
                />
                <button className="btn btn-ghost" onClick={allocateMultipleBeds}>Allocate Bulk (Max 50)</button>
                <label className="inline-ctl">Inflow</label>
                <input
                  className="bulk-input"
                  type="number"
                  min="1"
                  max="20"
                  value={liveInflow}
                  onChange={(e) => setLiveInflow(e.target.value)}
                />
                <label className="inline-ctl">Every(s)</label>
                <input
                  className="bulk-input"
                  type="number"
                  min="2"
                  max="30"
                  value={liveIntervalSec}
                  onChange={(e) => setLiveIntervalSec(e.target.value)}
                />
                <button className="btn btn-ghost" onClick={() => enqueueAutoPatient(Math.max(1, Number(liveInflow) || 3))}>Add Incoming Now</button>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Emergency</th><th>Emergency Note</th><th>Waiting Since</th><th>Wait Time</th></tr></thead>
                    <tbody>
                      {waitingList.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}</td><td>{p.id}</td><td className="name-cell">{displayName(p)}</td>
                          <td><span className={`badge badge-${p.emergencyLevel}`}>LVL {p.emergencyLevel} - {emerLabel(p.emergencyLevel)}</span></td><td>{p.emergencyMsg}</td>
                          <td>{fmtDate(p.arrivalTime)}</td><td>{formatTime(Math.floor((Date.now() - p.arrivalTime) / 1000))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!waitingList.length && <div className="empty"><span className="empty-icon">✓</span>No patients waiting</div>}
              </div>
            </div>
          )}

          {activePanel === 'admitted' && (
            <div className="panel active">
              <div className="page-title">Admitted Patients</div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Disease</th><th>Specialty</th><th>Doctor</th><th>Bed</th><th>Room</th><th>Emergency</th><th>Emergency Note</th><th>Admitted At</th><th>Action</th></tr></thead>
                    <tbody>
                      {admitted.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td><td className="name-cell">{displayName(p)}</td><td>{p.disease}</td><td>{p.specialty}</td><td>{p.doctorName}</td><td>Bed {p.bedNo}</td><td><span className={roomBadgeClass(p.roomType)}>{p.roomType}</span></td>
                          <td><span className={`badge badge-${p.emergencyLevel}`}>LVL {p.emergencyLevel}</span></td><td>{p.emergencyMsg}</td>
                          <td>{fmtDate(p.bedAllocTime)}</td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => dischargePatient(p.id)}>Discharge</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!admitted.length && <div className="empty"><span className="empty-icon">🛏</span>No patients currently admitted</div>}
              </div>
            </div>
          )}

          {activePanel === 'discharged' && (
            <div className="panel active">
              <div className="page-title">Discharge History</div>
              <div className="card">
                <div className="action-row compact">
                  {daySections.map((section) => (
                    <button
                      key={section.key}
                      className={`btn btn-sm ${dischargeDayFilter === section.key ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => {
                        setDischargeDayFilter(section.key);
                        setSelectedBill(null);
                      }}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Disease</th><th>Specialty</th><th>Doctor</th><th>Bed Was</th><th>Room</th><th>Emergency</th><th>Emergency Note</th><th>Wait Time</th><th>Discharged</th><th>Bill</th></tr></thead>
                    <tbody>
                      {filteredDischarged.map((p) => (
                        <Fragment key={`${p.id}-${p.dischargeTime}`}>
                          <tr>
                            <td>{p.id}</td><td className="name-cell">{displayName(p)}</td><td>{p.disease}</td><td>{p.specialty}</td><td>{p.doctorName}</td><td>Bed {p.bedNo}</td><td><span className={roomBadgeClass(p.roomType)}>{p.roomType}</span></td>
                            <td><span className={`badge badge-${p.emergencyLevel}`}>LVL {p.emergencyLevel}</span></td><td>{p.emergencyMsg}</td>
                            <td>{formatTime(Math.floor((p.bedAllocTime - p.arrivalTime) / 1000))}</td><td>{fmtDate(p.dischargeTime)}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBill((old) => (old?.id === p.id ? null : p))}>
                                {selectedBill?.id === p.id ? 'Hide Bill' : 'View Bill'}
                              </button>
                            </td>
                          </tr>
                          {selectedBill?.id === p.id && (
                            <tr>
                              <td colSpan="12">
                                <div className="bill-card">
                                  <div className="card-title">Patient Bill</div>
                                  <div className="bill-grid">
                                    <div>Patient: <strong>{displayName(p)}</strong></div>
                                    <div>Disease: <strong>{p.disease}</strong></div>
                                    <div>Doctor: <strong>{p.doctorName}</strong></div>
                                    <div>Room: <strong>{p.roomType}</strong></div>
                                    <div>Stay: <strong>{p.bill.stayHours >= 24 ? `${(p.bill.stayHours / 24).toFixed(1)} day(s)` : `${p.bill.stayHours} hour(s)`}</strong></div>
                                    <div>Room Charge: <strong>Rs {p.bill.roomCharge}</strong></div>
                                    <div>Emergency Charge: <strong>Rs {p.bill.emergencyCharge}</strong></div>
                                    <div>Doctor Fee: <strong>Rs {p.bill.doctorFee}</strong></div>
                                    <div>Nursing Charge: <strong>Rs {p.bill.nursingCharge}</strong></div>
                                    <div>Pharmacy Charge: <strong>Rs {p.bill.pharmacyCharge}</strong></div>
                                    <div>Diagnostics: <strong>Rs {p.bill.diagnosticsCharge}</strong></div>
                                    <div>Procedure Charge: <strong>Rs {p.bill.procedureCharge}</strong></div>
                                    <div>Treatment Charge: <strong>Rs {p.bill.treatmentCharge}</strong></div>
                                    <div>Service Charge: <strong>Rs {p.bill.serviceCharge}</strong></div>
                                    <div>Subtotal: <strong>Rs {p.bill.subtotal}</strong></div>
                                    <div>GST (5%): <strong>Rs {p.bill.gst}</strong></div>
                                    <div>Insurance Discount: <strong>Rs {p.bill.insuranceDiscount}</strong></div>
                                    <div className="bill-total">Total: Rs {p.bill.total}</div>
                                  </div>
                                  <div className="feedback-form">
                                    <div className="card-title">Discharge Feedback</div>
                                    <div className="feedback-grid">
                                      <div className="feedback-field">
                                        <label>Overall Rating (1-5)</label>
                                        <input value={p.feedback?.rating ?? createFeedback(p).rating} readOnly disabled />
                                      </div>
                                      <div className="feedback-field">
                                        <label>Complaint Type</label>
                                        <input value={p.feedback?.complaintType ?? createFeedback(p).complaintType} readOnly disabled />
                                      </div>
                                      <div className="feedback-field full">
                                        <label>Complaint Details</label>
                                        <textarea value={p.feedback?.complaintText ?? createFeedback(p).complaintText} readOnly disabled />
                                      </div>
                                      <div className="feedback-field full">
                                        <label>Suggested Improvement</label>
                                        <textarea value={p.feedback?.suggestion ?? createFeedback(p).suggestion} readOnly disabled />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filteredDischarged.length && <div className="empty"><span className="empty-icon">◎</span>No discharge records for {activeDaySection.label}</div>}
              </div>
            </div>
          )}

          {activePanel === 'beds' && (
            <div className="panel active">
              <div className="page-title">Bed Map</div>
              <div className="stats-grid bed-stats">
                <div className="stat-card green"><div className="stat-label">FREE</div><div className="stat-val">{freeBeds}</div></div>
                <div className="stat-card red"><div className="stat-label">OCCUPIED</div><div className="stat-val">{occupiedBeds}</div></div>
                <div className="stat-card cyan"><div className="stat-label">OCCUPANCY %</div><div className="stat-val">{occupancyPct}%</div></div>
              </div>
              <div className="stats-grid bed-stats room-split">
                {ROOM_TYPES.map((type) => (
                  <div className="stat-card" key={type}>
                    <div className="stat-label">{type.toUpperCase()} FREE</div>
                    <div className="stat-val">{bedFreeByType[type]}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="bed-grid full">
                  {Array.from({ length: HOSPITAL_BEDS }, (_, i) => i + 1).map((bed) => {
                    const occ = bedsRef.current.isOccupied(bed);
                    return <div key={bed} className={`bed-cell ${occ ? 'occupied' : 'free'}`}>{occ ? '🔴' : '🟢'}<div>{bed}</div><small>{bedsRef.current.getBedType(bed)}</small></div>;
                  })}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'stats' && (
            <div className="panel active">
              <div className="page-title">Statistics</div>
              <div className="two-col">
                <div className="card">
                  <div className="card-title">Waiting Time Analytics</div>
                  <div className="stat-row"><span className="stat-row-label">Median Wait Time</span><span className="stat-row-val">{mfRef.current.count ? formatTime(Math.floor(mfRef.current.getMedian())) : '—'}</span></div>
                  <div className="stat-row"><span className="stat-row-label">Average Wait Time</span><span className="stat-row-val">{mfRef.current.count ? formatTime(Math.floor(mfRef.current.total / mfRef.current.count)) : '—'}</span></div>
                  <div className="stat-row"><span className="stat-row-label">Total Patients Served</span><span className="stat-row-val">{mfRef.current.count}</span></div>
                  <div className="stat-row"><span className="stat-row-label">Peak Emergency Level</span><span className="stat-row-val">{peak ? `Level ${peak} - ${emerLabel(peak)}` : '—'}</span></div>
                </div>
                <div className="card">
                  <div className="card-title">Emergency Distribution</div>
                  {dist.map((c, i) => (
                    <div key={i} className="dist-row">
                      <span className="dist-label">LVL {i + 1}</span>
                      <div className="dist-track"><div className="dist-fill" style={{ width: `${(c / maxDist) * 100}%` }}></div></div>
                      <span className="dist-count">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'search' && (
            <div className="panel active">
              <div className="page-title">Patient Search</div>
              <div className="card">
                <div className="card-title">Search By Name Prefix</div>
                <div className="search-box">
                  <input
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setSelectedSearch('');
                    }}
                    placeholder="Type name prefix..."
                  />
                  {!!searchInput.trim() && !!suggestions.length && (
                    <div className="suggestions">
                      {suggestions.map((m) => (
                        <div key={m} className="suggestion-item" onClick={() => { setSelectedSearch(m); setSearchInput(m); }}>
                          <span className="match">{m.slice(0, searchInput.length).toUpperCase()}</span>{m.slice(searchInput.length).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!activeSearch ? null : searchRows.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>ID</th><th>Name</th><th>Disease</th><th>Doctor</th><th>Status</th><th>Room</th><th>Emergency</th><th>Bed</th></tr></thead>
                      <tbody>
                        {searchRows.map((p) => (
                          <tr key={`${p.id}-${p.status}-${p.bedNo}`}>
                            <td>{p.id}</td><td className="name-cell">{displayName(p)}</td><td>{p.disease}</td><td>{p.doctorName || 'Pending Allocation'}</td><td>{p.status}</td><td>{p.roomType || p.preferredRoom}</td>
                            <td><span className={`badge badge-${p.emergencyLevel}`}>LVL {p.emergencyLevel}</span></td>
                            <td>{p.bedNo > 0 ? `Bed ${p.bedNo}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty"><span className="empty-icon">◎</span>No patients found</div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'doctors' && (
            <div className="panel active">
              <div className="page-title">Doctors</div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Doctor</th><th>Specialty</th><th>Assigned</th><th>Max Capacity</th><th>Available Slots</th></tr></thead>
                    <tbody>
                      {DOCTORS.map((doctor) => {
                        const assigned = doctorLoadsRef.current[doctor.id];
                        const available = Math.max(0, doctor.maxPatients - assigned);
                        return (
                          <tr key={doctor.id}>
                            <td>{doctor.name}</td>
                            <td>{doctor.specialty}</td>
                            <td>{assigned}</td>
                            <td>{doctor.maxPatients}</td>
                            <td>{available}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'about' && (
            <div className="panel active">
              <div className="page-title">About Us</div>
              <div className="card">
                <div className="card-title">MediNova Prime Hospital</div>
                <p className="about-text">MediNova Prime is a multi-specialty hospital focused on emergency response, critical care, and patient-first treatment quality with advanced bed and doctor allocation systems.</p>
                <p className="about-text"><strong>Owner:</strong>Dhyey Dharmeshbhai Dumasia</p>
                <p className="about-text">Our mission is to keep wait times minimal, provide transparent billing, and ensure every patient is assigned to the right specialist quickly.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <div id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.leaving ? 'fade' : ''}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
