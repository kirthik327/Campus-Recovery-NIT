import bcrypt from 'bcryptjs';
import { db, connectDB } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, 'data', 'local_db.json');

const MONGODB_URI = process.env.MONGODB_URI || '';

const mockUsers = [
  {
    username: 'Office Admin',
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin',
    contact: '+91 99999 88888',
    department: 'Office Management',
    registerNumber: '721000000000',
    year: 'N/A'
  },
  {
    username: 'Aarav Sharma',
    email: 'aarav@college.edu',
    password: 'password123',
    role: 'student',
    contact: '+91 98765 43210',
    department: 'Computer Science & Engineering',
    registerNumber: '721021104001',
    year: '3rd Year'
  },
  {
    username: 'Priya Patel',
    email: 'priya@college.edu',
    password: 'password123',
    role: 'student',
    contact: '+91 98888 77777',
    department: 'Electrical Engineering',
    registerNumber: '721021104002',
    year: '2nd Year'
  }
];

async function seed() {
  console.log('Seeding Database...');
  await connectDB(MONGODB_URI);

  try {
    // 1. Clear items and claims from local JSON DB if present
    if (!MONGODB_URI && fs.existsSync(LOCAL_DB_PATH)) {
      console.log('Resetting local items and claims databases...');
      const dbContent = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
      dbContent.items = [];
      dbContent.claims = [];
      dbContent.notifications = [];
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(dbContent, null, 2));
    } else if (MONGODB_URI) {
      // Clear database collections
      console.log('Clearing MongoDB items and claims collections...');
      await db.items.deleteOne({ type: { $ne: 'dummy' } }); // delete all
      // claims and notifications...
    }

    // 2. Create Users
    console.log('Creating users...');
    for (const u of mockUsers) {
      const existing = await db.users.findOne({ email: u.email });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(u.password, salt);
        await db.users.create({
          ...u,
          password: hashed
        });
        console.log(`Created user: ${u.username} (${u.role})`);
      } else {
        // Update user properties in case they already existed without department/year
        await db.users.findByIdAndUpdate(existing._id || existing.id, {
          department: u.department,
          year: u.year,
          contact: u.contact
        });
        console.log(`User already exists, updated profile fields: ${u.username}`);
      }
    }

    console.log('Seeding and database cleanup completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seed();
