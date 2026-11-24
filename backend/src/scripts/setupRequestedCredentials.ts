import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User, { Role, ApprovalStatus, SubscriptionStatus } from '../models/User';
import Gym, { GymStatus } from '../models/Gym';
import Branch from '../models/Branch';
import Trainer from '../models/Trainer';
import CustomerMembership, { CustomerMembershipStatus } from '../models/CustomerMembership';
import Subscription, { SubscriptionPaymentStatus } from '../models/Subscription';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGO_URI is not set!');
  process.exit(1);
}

async function setupCredentials() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri!);
  console.log('Connected to DB:', mongoose.connection.name, 'at', mongoose.connection.host);

  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // 1. SUPER ADMIN: superadminaigym@gmail.com / password123
  console.log('\n--- 1. Setting up Super Admin ---');
  const superAdminEmail = 'superadminaigym@gmail.com';
  const superAdminHash = await bcrypt.hash('password123', 10);
  let superAdmin = await User.findOne({ email: superAdminEmail });
  if (superAdmin) {
    superAdmin.passwordHash = superAdminHash;
    superAdmin.role = Role.SUPER_ADMIN;
    superAdmin.approvalStatus = ApprovalStatus.APPROVED;
    superAdmin.subscriptionStatus = SubscriptionStatus.ACTIVE;
    superAdmin.isActive = true;
    await superAdmin.save();
    console.log(`Updated Super Admin: ${superAdminEmail}`);
  } else {
    superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: superAdminEmail,
      mobile: '9876543210',
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      approvalStatus: ApprovalStatus.APPROVED,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      isActive: true,
    });
    console.log(`Created Super Admin: ${superAdminEmail}`);
  }

  // 2. GYM OWNER: forgeindiaconnectfic@gmail.com / Arun@123
  console.log('\n--- 2. Setting up Gym Owner ---');
  const gymOwnerEmail = 'forgeindiaconnectfic@gmail.com';
  const gymOwnerHash = await bcrypt.hash('Arun@123', 10);
  let gymOwner = await User.findOne({ email: gymOwnerEmail });
  if (gymOwner) {
    gymOwner.passwordHash = gymOwnerHash;
    gymOwner.role = Role.GYM_OWNER;
    gymOwner.approvalStatus = ApprovalStatus.APPROVED;
    gymOwner.subscriptionStatus = SubscriptionStatus.ACTIVE;
    gymOwner.subscriptionPlan = 'PLATINUM';
    gymOwner.subscriptionExpiry = oneYearFromNow;
    gymOwner.subscriptionExpiryDate = oneYearFromNow;
    gymOwner.paymentStatus = 'Approved';
    gymOwner.isActive = true;
    await gymOwner.save();
    console.log(`Updated Gym Owner: ${gymOwnerEmail}`);
  } else {
    gymOwner = await User.create({
      firstName: 'Arun',
      lastName: 'Owner',
      email: gymOwnerEmail,
      mobile: '9876543212',
      passwordHash: gymOwnerHash,
      role: Role.GYM_OWNER,
      approvalStatus: ApprovalStatus.APPROVED,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionPlan: 'PLATINUM',
      subscriptionStartDate: new Date(),
      subscriptionExpiry: oneYearFromNow,
      subscriptionExpiryDate: oneYearFromNow,
      paymentStatus: 'Approved',
      isActive: true,
    });
    console.log(`Created Gym Owner: ${gymOwnerEmail}`);
  }

  // Ensure Gym exists for this Gym Owner
  let gym = await Gym.findOne({ ownerId: gymOwner._id });
  if (!gym) {
    gym = await Gym.findOne(); // or any existing gym
  }
  if (!gym) {
    gym = await Gym.create({
      ownerId: gymOwner._id,
      name: 'PowerFit Gym & Fitness Hub',
      description: 'Premier fitness center with state-of-the-art facilities.',
      gymType: 'Unisex',
      trainingMode: 'both',
      status: GymStatus.ACTIVE,
      email: gymOwnerEmail,
      phone: '9876543212',
      location: {
        address: '100 Fitness Boulevard',
        area: 'Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        pinCode: '600040',
      },
      subscription: {
        plan: 'PLATINUM',
        startDate: new Date(),
        endDate: oneYearFromNow,
        status: 'Active',
      },
      subscriptionPlans: [
        { name: 'free trial', price: 0, duration: '1 day', features: 'Basic Access' },
        { name: 'basic', price: 1500, duration: '1 month', features: 'Full Access' },
        { name: 'premium annual', price: 18000, duration: '1 year', features: 'VIP Access' }
      ]
    });
    console.log(`Created Gym: ${gym.name} (ID: ${gym._id})`);
  } else {
    gym.ownerId = gymOwner._id as any;
    gym.status = GymStatus.ACTIVE;
    gym.subscription = {
      plan: 'PLATINUM',
      startDate: new Date(),
      endDate: oneYearFromNow,
      status: 'Active',
    };
    await gym.save();
    console.log(`Updated Gym: ${gym.name} for Owner: ${gymOwnerEmail}`);
  }

  // Link gym to gymOwner
  gymOwner.gymId = gym._id as any;
  await gymOwner.save();

  // Ensure Branch exists
  let branch = await Branch.findOne({ gymId: gym._id });
  if (!branch) {
    branch = await Branch.create({
      gymId: gym._id as any,
      branchName: 'Main Branch',
      branchCode: 'BR001',
      phone: '9876543212',
      email: gymOwnerEmail,
      status: GymStatus.ACTIVE,
      location: {
        address: '100 Fitness Boulevard',
        area: 'Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        pinCode: '600040',
      },
      operatingHours: {
        openingTime: '06:00 AM',
        closingTime: '10:00 PM',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
      trainingMode: 'both',
      services: ['Cardio', 'Strength', 'CrossFit'],
      facilities: ['AC', 'Locker Room', 'Showers'],
    });
    console.log(`Created Branch: ${branch.branchName}`);
  }

  // Ensure Subscription record exists for Gym Owner
  await Subscription.findOneAndUpdate(
    { userId: gymOwner._id },
    {
      userId: gymOwner._id,
      gymId: gym._id,
      plan: 'PLATINUM',
      billingCycle: 'Annual',
      amount: 49999,
      status: SubscriptionPaymentStatus.ACTIVE,
      startDate: new Date(),
      endDate: oneYearFromNow,
      paymentMethod: 'UPI',
    },
    { upsert: true, new: true }
  );
  console.log(`Ensured active Subscription for Gym Owner`);

  // 3. TRAINER: forgeindiaconnecthr@gmail.com / Arun@123
  console.log('\n--- 3. Setting up Trainer ---');
  const trainerEmail = 'forgeindiaconnecthr@gmail.com';
  const trainerHash = await bcrypt.hash('Arun@123', 10);
  let trainerUser = await User.findOne({ email: trainerEmail });
  if (trainerUser) {
    trainerUser.passwordHash = trainerHash;
    trainerUser.role = Role.TRAINER;
    trainerUser.approvalStatus = ApprovalStatus.APPROVED;
    trainerUser.subscriptionStatus = SubscriptionStatus.ACTIVE;
    trainerUser.isActive = true;
    trainerUser.gymId = gym._id as any;
    trainerUser.branchId = branch._id as any;
    await trainerUser.save();
    console.log(`Updated Trainer User: ${trainerEmail}`);
  } else {
    trainerUser = await User.create({
      firstName: 'Arun',
      lastName: 'Trainer',
      email: trainerEmail,
      mobile: '9876543213',
      passwordHash: trainerHash,
      role: Role.TRAINER,
      approvalStatus: ApprovalStatus.APPROVED,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      isActive: true,
      gymId: gym._id as any,
      branchId: branch._id as any,
    });
    console.log(`Created Trainer User: ${trainerEmail}`);
  }

  // Ensure Trainer profile doc exists with Active status
  let trainerDoc = await Trainer.findOne({ userId: trainerUser._id });
  if (trainerDoc) {
    trainerDoc.gymId = gym._id as any;
    trainerDoc.branchId = branch._id as any;
    trainerDoc.status = 'Active';
    trainerDoc.name = 'Arun Trainer';
    trainerDoc.email = trainerEmail;
    await trainerDoc.save();
    console.log(`Updated Trainer Profile: ${trainerEmail}`);
  } else {
    trainerDoc = await Trainer.create({
      userId: trainerUser._id as any,
      gymId: gym._id as any,
      branchId: branch._id as any,
      trainerId: 'TR-' + Date.now().toString().slice(-4),
      name: 'Arun Trainer',
      email: trainerEmail,
      phone: '9876543213',
      trainingMode: 'both',
      status: 'Active',
      specialization: 'Strength & Conditioning',
      experience: 5,
      totalEarnings: 0,
      availableBalance: 0,
      withdrawnAmount: 0,
      pendingWithdrawal: 0,
    });
    console.log(`Created Trainer Profile: ${trainerEmail}`);
  }

  // 4. CUSTOMER: renugopal5457@gmail.com / Renu@123
  console.log('\n--- 4. Setting up Customer ---');
  const customerEmail = 'renugopal5457@gmail.com';
  const customerHash = await bcrypt.hash('Renu@123', 10);
  let customerUser = await User.findOne({ email: customerEmail });
  if (customerUser) {
    customerUser.passwordHash = customerHash;
    customerUser.role = Role.MEMBER;
    customerUser.approvalStatus = ApprovalStatus.APPROVED;
    customerUser.subscriptionStatus = SubscriptionStatus.ACTIVE;
    customerUser.subscriptionPlan = 'premium annual';
    customerUser.subscriptionExpiry = oneYearFromNow;
    customerUser.subscriptionExpiryDate = oneYearFromNow;
    customerUser.isActive = true;
    customerUser.gymId = gym._id as any;
    customerUser.branchId = branch._id as any;
    await customerUser.save();
    console.log(`Updated Customer User: ${customerEmail}`);
  } else {
    customerUser = await User.create({
      firstName: 'Renu',
      lastName: 'Gopal',
      email: customerEmail,
      mobile: '9876543214',
      passwordHash: customerHash,
      role: Role.MEMBER,
      approvalStatus: ApprovalStatus.APPROVED,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionPlan: 'premium annual',
      subscriptionStartDate: new Date(),
      subscriptionExpiry: oneYearFromNow,
      subscriptionExpiryDate: oneYearFromNow,
      isActive: true,
      gymId: gym._id as any,
      branchId: branch._id as any,
    });
    console.log(`Created Customer User: ${customerEmail}`);
  }

  // Ensure CustomerMembership doc exists
  await CustomerMembership.findOneAndUpdate(
    { userId: customerUser._id },
    {
      userId: customerUser._id,
      gymId: gym._id,
      branchId: branch._id,
      planName: 'premium annual',
      price: 18000,
      finalAmount: 18000,
      status: CustomerMembershipStatus.ACTIVE,
      startDate: new Date(),
      endDate: oneYearFromNow,
      paymentMethod: 'UPI',
      features: ['All Access VIP', 'Trainer Guidance'],
      duration: '1 year',
    },
    { upsert: true, returnDocument: 'after' }
  );
  console.log(`Ensured active CustomerMembership for: ${customerEmail}`);

  console.log('\n==========================================');
  console.log('ALL 4 CREDENTIALS SUCCESSFULLY CONFIGURED!');
  console.log('==========================================');
  await mongoose.disconnect();
}

setupCredentials().catch((err) => {
  console.error('Error setting up credentials:', err);
  process.exit(1);
});
