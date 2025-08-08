import dbConnect from '../../../lib/mongodb.js';
import ConsumerSignupRequest from '../../../models/ConsumerSignupRequest.js';
import bcrypt from 'bcryptjs';

// Consumer data from mockdata.json
const consumerData = {
  name: "Amit Kumar",
  aadhaar: "345678901234",
  rationCardNumber: "PB3456789012",
  category: "BPL",
  village: "Village Sundarpur",
  phoneNumber: "8699000919"
};

async function addMissingConsumer() {
  try {
    await dbConnect();
    
    // Check if consumer already exists in database
    const existingConsumer = await ConsumerSignupRequest.findOne({
      aadharNumber: consumerData.aadhaar
    });
    
    if (existingConsumer) {
      console.log('✅ Consumer already exists in database:', existingConsumer.status);
      console.log('Consumer details:', {
        name: existingConsumer.name,
        aadhaar: existingConsumer.aadharNumber,
        status: existingConsumer.status,
        id: existingConsumer._id
      });
      return existingConsumer;
    }
    
    // Create new consumer record with default PIN 123456
    const defaultPin = '123456';
    const hashedPin = await bcrypt.hash(defaultPin, 10);
    
    const newConsumer = new ConsumerSignupRequest({
      name: consumerData.name,
      phone: consumerData.phoneNumber,
      homeAddress: consumerData.village,
      rationCardId: consumerData.rationCardNumber,
      aadharNumber: consumerData.aadhaar,
      pin: hashedPin,
      status: 'approved', // Set to approved since they're already on blockchain
      approvedAt: new Date(),
      blockchainTxHash: 'manual-sync', // Indicate this was manually synced
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newConsumer.save();
    
    console.log('✅ Consumer added to database successfully!');
    console.log('Login credentials:');
    console.log('Aadhaar:', consumerData.aadhaar);
    console.log('Default PIN:', defaultPin);
    console.log('Consumer ID:', newConsumer._id);
    
    return newConsumer;
    
  } catch (error) {
    console.error('❌ Error adding consumer:', error);
    throw error;
  }
}

// Run the script
addMissingConsumer()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
