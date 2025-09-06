// test-subscription.js
const db = require('./db');

console.log('🔍 Testing Subscription System...\n');

// Test 1: Check subscription plans
console.log('1. Checking subscription plans...');
try {
  const plans = db.prepare('SELECT * FROM subscription_plans').all();
  console.log(`✅ Found ${plans.length} subscription plans:`);
  plans.forEach(plan => {
    console.log(`   - ${plan.name}: $${plan.price} (${plan.billing_interval})`);
  });
} catch (error) {
  console.log('❌ Error checking subscription plans:', error.message);
}

// Test 2: Check users table structure
console.log('\n2. Checking users table...');
try {
  const users = db.prepare('SELECT id, email, username, subscriptionStatus FROM users LIMIT 3').all();
  console.log(`✅ Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`   - ${user.email} (${user.username}): ${user.subscriptionStatus}`);
  });
} catch (error) {
  console.log('❌ Error checking users:', error.message);
}

// Test 3: Check subscriptions table
console.log('\n3. Checking subscriptions table...');
try {
  const subscriptions = db.prepare(`
    SELECT s.*, p.name as planName 
    FROM subscriptions s 
    JOIN subscription_plans p ON s.planId = p.id 
    LIMIT 3
  `).all();
  console.log(`✅ Found ${subscriptions.length} active subscriptions:`);
  subscriptions.forEach(sub => {
    console.log(`   - User ${sub.userId}: ${sub.planName} (${sub.status})`);
  });
} catch (error) {
  console.log('❌ Error checking subscriptions:', error.message);
}

// Test 4: Check premium features tables
console.log('\n4. Checking premium feature tables...');
try {
  const pronunciationCount = db.prepare('SELECT COUNT(*) as count FROM pronunciation_practice').get().count;
  const remindersCount = db.prepare('SELECT COUNT(*) as count FROM study_reminders').get().count;
  const goalsCount = db.prepare('SELECT COUNT(*) as count FROM study_goals').get().count;
  
  console.log(`✅ Premium tables found:`);
  console.log(`   - Pronunciation practice records: ${pronunciationCount}`);
  console.log(`   - Study reminders: ${remindersCount}`);
  console.log(`   - Study goals: ${goalsCount}`);
} catch (error) {
  console.log('❌ Error checking premium tables:', error.message);
}

// Test 5: Test premium status check
console.log('\n5. Testing premium status logic...');
try {
  const testUser = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (testUser) {
    console.log(`✅ Test user: ${testUser.email}`);
    console.log(`   - Current status: ${testUser.subscriptionStatus}`);
    
    // Check if user has active subscription
    const activeSub = db.prepare(`
      SELECT * FROM subscriptions 
      WHERE userId = ? AND status = 'active'
    `).get(testUser.id);
    
    if (activeSub) {
      console.log(`   - Has active subscription: Yes`);
      console.log(`   - Subscription ID: ${activeSub.id}`);
    } else {
      console.log(`   - Has active subscription: No`);
    }
  } else {
    console.log('❌ No users found for testing');
  }
} catch (error) {
  console.log('❌ Error testing premium status:', error.message);
}

// Test 6: Check database indexes
console.log('\n6. Checking database indexes...');
try {
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type = 'index' 
    AND name LIKE 'idx_%'
  `).all();
  
  console.log(`✅ Found ${indexes.length} performance indexes:`);
  indexes.forEach(idx => {
    console.log(`   - ${idx.name}`);
  });
} catch (error) {
  console.log('❌ Error checking indexes:', error.message);
}

console.log('\n🎯 Subscription System Test Complete!');
console.log('\nTo test the full system:');
console.log('1. Start the server: npm start');
console.log('2. Visit: http://localhost:3000');
console.log('3. Create an account and test subscription flow');
console.log('4. Check premium features access'); 