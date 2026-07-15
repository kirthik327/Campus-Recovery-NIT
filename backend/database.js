import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_PATH = path.join(__dirname, 'data', 'local_db.json');
let isMongo = false;

// Ensure data folder exists
const ensureLocalFolder = () => {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({
      users: [],
      items: [],
      claims: [],
      notifications: []
    }, null, 2));
  }
};

// Local JSON DB Helper Actions
const readLocalDB = () => {
  ensureLocalFolder();
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local JSON db, resetting:', err);
    return { users: [], items: [], claims: [], notifications: [] };
  }
};

const writeLocalDB = (data) => {
  ensureLocalFolder();
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
};

// Database Initialization
export async function connectDB(mongoUri) {
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB at:', mongoUri);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000
      });
      isMongo = true;
      console.log('Successfully connected to MongoDB!');
      return true;
    } catch (err) {
      console.warn('MongoDB connection failed. Falling back to local JSON database.', err.message);
    }
  } else {
    console.log('No MONGODB_URI provided. Initializing local JSON database...');
  }
  
  ensureLocalFolder();
  isMongo = false;
  console.log(`Local JSON Database initialized at: ${LOCAL_DB_PATH}`);
  return false;
}

// -------------------------------------------------------------
// MongoDB Schemas & Models
// -------------------------------------------------------------
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registerNumber: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  contact: { type: String, default: '' },
  department: { type: String, default: '' },
  year: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['lost', 'found'], required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'claimed', 'returned'], default: 'pending' },
  images: [{ type: String }],
  ocrText: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  reportedBy: { type: String, required: true }, // username or userId
  claimedBy: { type: String, default: null },
  claimCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const ClaimSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  claimantId: { type: String, required: true },
  claimantName: { type: String, required: true },
  claimantContact: { type: String, required: true },
  proofDescription: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MongoUser = mongoose.model('User', UserSchema);
const MongoItem = mongoose.model('Item', ItemSchema);
const MongoClaim = mongoose.model('Claim', ClaimSchema);
const MongoNotification = mongoose.model('Notification', NotificationSchema);

// -------------------------------------------------------------
// Unified Database Wrapper Interface
// -------------------------------------------------------------
export const db = {
  getMode: () => (isMongo ? 'MongoDB' : 'LocalJSON'),

  users: {
    find: async (query = {}) => {
      if (isMongo) return MongoUser.find(query);
      const dbData = readLocalDB();
      return dbData.users.filter(u => {
        return Object.keys(query).every(k => u[k] === query[k]);
      });
    },
    findOne: async (query = {}) => {
      if (isMongo) return MongoUser.findOne(query);
      const dbData = readLocalDB();
      return dbData.users.find(u => {
        return Object.keys(query).every(k => u[k] === query[k]);
      }) || null;
    },
    findById: async (id) => {
      if (isMongo) return MongoUser.findById(id);
      const dbData = readLocalDB();
      return dbData.users.find(u => u._id === id || u.id === id) || null;
    },
    create: async (userData) => {
      if (isMongo) return MongoUser.create(userData);
      const dbData = readLocalDB();
      const newUser = {
        _id: uuidv4(),
        createdAt: new Date().toISOString(),
        role: 'student',
        contact: '',
        ...userData
      };
      dbData.users.push(newUser);
      writeLocalDB(dbData);
      return newUser;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (isMongo) return MongoUser.findByIdAndUpdate(id, updates, { new: true });
      const dbData = readLocalDB();
      const idx = dbData.users.findIndex(u => u._id === id || u.id === id);
      if (idx === -1) return null;
      dbData.users[idx] = { ...dbData.users[idx], ...updates };
      writeLocalDB(dbData);
      return dbData.users[idx];
    }
  },

  items: {
    find: async (query = {}) => {
      if (isMongo) return MongoItem.find(query).sort({ createdAt: -1 });
      const dbData = readLocalDB();
      let results = dbData.items.filter(item => {
        return Object.keys(query).every(k => {
          if (query[k] && typeof query[k] === 'object' && '$ne' in query[k]) {
            return item[k] !== query[k].$ne;
          }
          return item[k] === query[k];
        });
      });
      return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findById: async (id) => {
      if (isMongo) return MongoItem.findById(id);
      const dbData = readLocalDB();
      return dbData.items.find(i => i._id === id) || null;
    },
    create: async (itemData) => {
      if (isMongo) return MongoItem.create(itemData);
      const dbData = readLocalDB();
      const newItem = {
        _id: uuidv4(),
        status: 'pending',
        images: [],
        ocrText: '',
        qrCode: '',
        claimedBy: null,
        claimCount: 0,
        createdAt: new Date().toISOString(),
        ...itemData
      };
      dbData.items.push(newItem);
      writeLocalDB(dbData);
      return newItem;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (isMongo) return MongoItem.findByIdAndUpdate(id, updates, { new: true });
      const dbData = readLocalDB();
      const idx = dbData.items.findIndex(i => i._id === id);
      if (idx === -1) return null;
      dbData.items[idx] = { ...dbData.items[idx], ...updates };
      writeLocalDB(dbData);
      return dbData.items[idx];
    },
    deleteOne: async (query = {}) => {
      if (isMongo) return MongoItem.deleteOne(query);
      const dbData = readLocalDB();
      const initialLength = dbData.items.length;
      dbData.items = dbData.items.filter(item => {
        return !Object.keys(query).every(k => item[k] === query[k]);
      });
      writeLocalDB(dbData);
      return { deletedCount: initialLength - dbData.items.length };
    }
  },

  claims: {
    find: async (query = {}) => {
      if (isMongo) return MongoClaim.find(query).sort({ createdAt: -1 });
      const dbData = readLocalDB();
      let results = dbData.claims.filter(claim => {
        return Object.keys(query).every(k => claim[k] === query[k]);
      });
      return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findById: async (id) => {
      if (isMongo) return MongoClaim.findById(id);
      const dbData = readLocalDB();
      return dbData.claims.find(c => c._id === id) || null;
    },
    create: async (claimData) => {
      if (isMongo) return MongoClaim.create(claimData);
      const dbData = readLocalDB();
      const newClaim = {
        _id: uuidv4(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...claimData
      };
      dbData.claims.push(newClaim);
      
      // Increment claim count on item
      const itemIdx = dbData.items.findIndex(i => i._id === claimData.itemId);
      if (itemIdx !== -1) {
        dbData.items[itemIdx].claimCount = (dbData.items[itemIdx].claimCount || 0) + 1;
      }

      writeLocalDB(dbData);
      return newClaim;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (isMongo) return MongoClaim.findByIdAndUpdate(id, updates, { new: true });
      const dbData = readLocalDB();
      const idx = dbData.claims.findIndex(c => c._id === id);
      if (idx === -1) return null;
      dbData.claims[idx] = { ...dbData.claims[idx], ...updates };
      writeLocalDB(dbData);
      return dbData.claims[idx];
    }
  },

  notifications: {
    find: async (query = {}) => {
      if (isMongo) return MongoNotification.find(query).sort({ createdAt: -1 });
      const dbData = readLocalDB();
      let results = dbData.notifications.filter(n => {
        return Object.keys(query).every(k => n[k] === query[k]);
      });
      return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    create: async (notifData) => {
      if (isMongo) return MongoNotification.create(notifData);
      const dbData = readLocalDB();
      const newNotif = {
        _id: uuidv4(),
        read: false,
        createdAt: new Date().toISOString(),
        ...notifData
      };
      dbData.notifications.push(newNotif);
      writeLocalDB(dbData);
      return newNotif;
    },
    updateMany: async (query = {}, updates = {}) => {
      if (isMongo) return MongoNotification.updateMany(query, updates);
      const dbData = readLocalDB();
      let updatedCount = 0;
      dbData.notifications = dbData.notifications.map(n => {
        const matches = Object.keys(query).every(k => n[k] === query[k]);
        if (matches) {
          updatedCount++;
          return { ...n, ...updates };
        }
        return n;
      });
      writeLocalDB(dbData);
      return { modifiedCount: updatedCount };
    }
  }
};
