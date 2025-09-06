// db.js - PostgreSQL version for Supabase

const { Pool } = require('pg');

// Initialize the PostgreSQL connection pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Create all tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        username TEXT,
        englishLevel TEXT,
        learningGoals TEXT,
        googleId TEXT,
        subscriptionStatus TEXT DEFAULT 'free',
        stripeCustomerId TEXT,
        avatarUrl TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        userId INTEGER,
        role TEXT,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vocabulary (
        id SERIAL PRIMARY KEY,
        userId INTEGER,
        word TEXT,
        definition TEXT,
        dateAdded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        correctCount INTEGER DEFAULT 0,
        difficultyLevel INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        userId INTEGER,
        status TEXT DEFAULT 'new',
        dateSubmitted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        billing_interval TEXT NOT NULL, -- 'monthly' or 'yearly'
        features TEXT NOT NULL, -- JSON string of features
        is_active BOOLEAN DEFAULT true,
        stripePriceId TEXT,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        planId INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'active', 'canceled', 'expired'
        startDate TIMESTAMP NOT NULL,
        endDate TIMESTAMP,
        stripeCustomerId TEXT,
        stripeSubscriptionId TEXT,
        cancelAtPeriodEnd BOOLEAN DEFAULT false,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dateUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (planId) REFERENCES subscription_plans(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        subscriptionId INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending'
        stripePaymentIntentId TEXT,
        stripeInvoiceId TEXT,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tests_taken (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        score INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pronunciation_practice (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        word TEXT NOT NULL,
        score INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS study_reminders (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        time TEXT NOT NULL,
        frequency TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS study_goals (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        dailyWords INTEGER DEFAULT 10,
        weeklyHours INTEGER DEFAULT 5,
        targetDate DATE,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Clear existing subscription plans to avoid duplicates
    try {
      await db.query('DELETE FROM subscription_plans');
    } catch (err) {
      console.log('Error clearing subscription plans:', err.message);
    }

    // Insert subscription plans with correct pricing
    await db.query(`
      INSERT INTO subscription_plans (id, name, description, price, billing_interval, features) VALUES
      (1, 'Free', 'Basic vocabulary learning with limited features', 0, 'monthly', '["Basic AI conversation (20 messages/day)", "2 tests per day", "Basic games", "Unlimited vocabulary storage"]'),
      (2, 'Premium Monthly', 'Full access to all features with monthly billing', 4.99, 'monthly', '["Unlimited AI conversation", "Unlimited tests", "All games & activities", "Pronunciation practice", "Offline mode", "Email support"]'),
      (3, 'Premium Yearly', 'Full access to all features with yearly billing (save 16%)', 49.99, 'yearly', '["Unlimited AI conversation", "Unlimited tests", "All games & activities", "Pronunciation practice", "Offline mode", "Priority support"]')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        billing_interval = EXCLUDED.billing_interval,
        features = EXCLUDED.features
    `);

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_userId ON messages(userId);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_userId_timestamp ON messages(userId, timestamp);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_userId ON vocabulary(userId);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_dateAdded ON vocabulary(dateAdded);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_correctCount ON vocabulary(correctCount);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_userId_correctCount ON vocabulary(userId, correctCount);
      CREATE INDEX IF NOT EXISTS idx_users_googleId ON users(googleId);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions(userId);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_userId_status ON subscriptions(userId, status);
      CREATE INDEX IF NOT EXISTS idx_payment_history_userId ON payment_history(userId);
      CREATE INDEX IF NOT EXISTS idx_payment_history_dateCreated ON payment_history(dateCreated);
      CREATE INDEX IF NOT EXISTS idx_tests_taken_userId ON tests_taken(userId);
      CREATE INDEX IF NOT EXISTS idx_tests_taken_timestamp ON tests_taken(timestamp);
      CREATE INDEX IF NOT EXISTS idx_feedback_userId ON feedback(userId);
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_dateSubmitted ON feedback(dateSubmitted);
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

// Initialize database when the module is loaded
initializeDatabase();

// Export the database pool
module.exports = db;
