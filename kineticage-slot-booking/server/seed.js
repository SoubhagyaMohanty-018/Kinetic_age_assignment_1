require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Service = require('./models/Service');
const User = require('./models/User');

const services = [
  {
    name: 'Senior Wellness Check-In',
    description: 'A guided wellness consultation covering vitals, mobility, and general health check for seniors.',
    category: 'senior-wellness',
    durationMinutes: 45,
    price: 0,
    capacityPerSlot: 3,
  },
  {
    name: 'Chair Yoga & Flexibility',
    description: 'Low-impact seated yoga session designed to improve flexibility and balance for older adults.',
    category: 'senior-wellness',
    durationMinutes: 60,
    price: 199,
    capacityPerSlot: 8,
  },
  {
    name: 'Mobility Assessment',
    description: 'One-on-one physiotherapist-led assessment of gait, balance, and fall risk.',
    category: 'mobility-program',
    durationMinutes: 30,
    price: 499,
    capacityPerSlot: 1,
  },
  {
    name: 'Walking Aid Training Program',
    description: 'Personalized training session on the correct use of walkers, canes, and mobility aids.',
    category: 'mobility-program',
    durationMinutes: 45,
    price: 299,
    capacityPerSlot: 2,
  },
];

async function run() {
  await connectDB();

  await Service.deleteMany({});
  await Service.insertMany(services);
  console.log(`Seeded ${services.length} services.`);

  const adminEmail = 'admin@kineticage.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await User.hashPassword('Admin@123');
    await User.create({
      name: 'KineticAge Admin',
      email: adminEmail,
      phone: '0000000000',
      passwordHash,
      role: 'admin',
    });
    console.log(`Seeded admin user: ${adminEmail} / Admin@123`);
  }

  await mongoose.connection.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
