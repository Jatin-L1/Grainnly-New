const fs = require('fs');
const path = require('path');

// Read the current mock data
const mockDataPath = path.join(__dirname, 'client', 'public', 'mockdata.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

// Generate unique phone numbers starting from 8000000001
let phoneCounter = 8000000001;

// Update each record with a unique phone number
const updatedMockData = mockData.map((user, index) => {
  if (user.phoneNumber) {
    // Generate unique phone number
    const uniquePhone = (phoneCounter + index).toString();
    return {
      ...user,
      phoneNumber: uniquePhone
    };
  }
  return user;
});

// Write the updated mock data back to the file
fs.writeFileSync(mockDataPath, JSON.stringify(updatedMockData, null, 2));

console.log('✅ Mock data updated with unique phone numbers!');
console.log(`📞 Updated ${updatedMockData.filter(u => u.phoneNumber).length} phone numbers`);
