// services/stripeService.js
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');

const stripeService = {
  // Create a Stripe customer
  async createCustomer(user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username || 'Snowwords User',
        metadata: {
          userId: user.id
        }
      });
      
      // Update user with Stripe customer ID
      await db.query('UPDATE users SET stripeCustomerId = $1 WHERE id = $2', 
        [customer.id, user.id]);
        
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  },
  
  // Get or create customer
  async getOrCreateCustomer(user) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.stripecustomerid) { // Note: PostgreSQL returns lowercase column names
        try {
          const customer = await stripe.customers.retrieve(user.stripecustomerid);
          if (!customer.deleted) return customer;
        } catch (err) {
          console.log('Error retrieving customer, will create new one:', err.message);
        }
      }
      
      // Create new customer if not exists or was deleted
      return await this.createCustomer(user);
    } catch (error) {
      console.error('Error getting/creating Stripe customer:', error);
      throw error;
    }
  },
  
  // Create checkout session for subscription
  async createCheckoutSession(userId, planId, successUrl, cancelUrl) {
    try {
      // Get user and plan
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      const planResult = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
      
      const user = userResult.rows[0];
      const plan = planResult.rows[0];
      
      if (!user || !plan) {
        throw new Error('User or plan not found');
      }
      
      console.log(`Creating checkout for ${user.username}, plan: ${plan.name}, price: $${plan.price}`);
      
      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(user);
      
      // Create checkout session using price_data (the correct way)
      console.log('Creating checkout session with price_data...');
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(parseFloat(plan.price) * 100), // Convert to cents
              recurring: {
                interval: plan.billing_interval === 'monthly' ? 'month' : 'year'
              },
              product_data: {
                name: plan.name,
                description: plan.description || `Snowwords Premium Subscription`
              }
            },
            quantity: 1,
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id.toString(),
          planId: plan.id.toString()
        }
      });
      
      console.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },
  
  // Handle successful subscription creation
  async createSubscription(session) {
    try {
      // Extract metadata
      const { userId, planId } = session.metadata;
      
      // Record subscription in database
      const now = new Date();
      const endDate = new Date();
      
      // Set end date based on plan interval
      const planResult = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
      const plan = planResult.rows[0];
      
      if (plan.billing_interval === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      await db.query(`
        INSERT INTO subscriptions (
          userId, planId, status, startDate, endDate,
          stripeCustomerId, stripeSubscriptionId
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId, 
        planId, 
        'active', 
        now.toISOString(), 
        endDate.toISOString(),
        session.customer,
        session.subscription
      ]);
      
      // Update user subscription status
      await db.query('UPDATE users SET subscriptionStatus = $1 WHERE id = $2',
        ['premium', userId]);
        
      return { success: true };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }
};

module.exports = stripeService;
