// Script to drop phone number unique indexes from MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function dropPhoneIndexes() {
  if (!process.env.MONGODB_URI) {
    console.log('❌ Error: MONGODB_URI not found in environment variables');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB Atlas...');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Drop phone indexes from all relevant collections
    const collections = [
      'consumersignuprequests',
      'deliverysignuprequests', 
      'shopkeepersignuprequests'
    ];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        
        // List all indexes
        const indexes = await collection.indexes();
        console.log(`\n📋 Indexes for ${collectionName}:`, indexes.map(idx => idx.name));
        
        // Drop phone index if it exists
        const phoneIndexes = indexes.filter(idx => 
          idx.name.includes('phone') || 
          idx.key?.phone !== undefined
        );
        
        // Drop email index if it exists (since email is not used in consumer signup)
        const emailIndexes = indexes.filter(idx => 
          idx.name.includes('email') || 
          idx.key?.email !== undefined
        );
        
        for (const phoneIndex of phoneIndexes) {
          try {
            await collection.dropIndex(phoneIndex.name);
            console.log(`✅ Dropped phone index '${phoneIndex.name}' from ${collectionName}`);
          } catch (dropError) {
            if (dropError.code === 27) {
              console.log(`ℹ️  Phone index '${phoneIndex.name}' does not exist in ${collectionName}`);
            } else {
              console.error(`❌ Error dropping phone index from ${collectionName}:`, dropError.message);
            }
          }
        }
        
        for (const emailIndex of emailIndexes) {
          try {
            await collection.dropIndex(emailIndex.name);
            console.log(`✅ Dropped email index '${emailIndex.name}' from ${collectionName}`);
          } catch (dropError) {
            if (dropError.code === 27) {
              console.log(`ℹ️  Email index '${emailIndex.name}' does not exist in ${collectionName}`);
            } else {
              console.error(`❌ Error dropping email index from ${collectionName}:`, dropError.message);
            }
          }
        }
        
        if (phoneIndexes.length === 0) {
          console.log(`ℹ️  No phone indexes found in ${collectionName}`);
        }
        
        if (emailIndexes.length === 0) {
          console.log(`ℹ️  No email indexes found in ${collectionName}`);
        }
        
      } catch (collectionError) {
        console.log(`ℹ️  Collection ${collectionName} does not exist or error:`, collectionError.message);
      }
    }
    
    console.log('\n🎉 Phone index cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

// Run the script
dropPhoneIndexes();
