const { MongoClient } = require('mongodb');

async function fixConsumerLogin() {
  const uri = process.env.MONGODB_URI || 'your_mongodb_connection_string';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('consumersignuprequests');

    // Consumer data for Amit Kumar
    const consumerData = {
      name: "Amit Kumar",
      phone: "8699000919",
      homeAddress: "Village Sundarpur",
      rationCardId: "PB3456789012",
      aadharNumber: "345678901234",
      pin: "$2a$10$7eUdvTW/UqYF3lJ8Zo5f5eYY5p5n9YhW3CeV7nM2sW8Qg9zP1r2Ka", // hashed "123456"
      status: "approved",
      approvedAt: new Date(),
      blockchainTxHash: "manual-sync",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if already exists
    const existing = await collection.findOne({ aadharNumber: "345678901234" });
    if (existing) {
      console.log('Consumer already exists in database');
      return;
    }

    // Insert the consumer
    const result = await collection.insertOne(consumerData);
    console.log('✅ Consumer added successfully with ID:', result.insertedId);
    console.log('🔑 Login credentials:');
    console.log('   Aadhaar: 345678901234');
    console.log('   PIN: 123456');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixConsumerLogin();
