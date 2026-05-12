/**
 * Mock Billing Data
 * =================
 * Realistic sample subscription and invoice data for the billing dashboard.
 * 
 * In production, this data will be fetched from Supabase:
 * - subscriptions table (user_id, plan_id, status, current_price, next_billing_date, created_at, updated_at)
 * - invoices table (user_id, subscription_id, amount, date, status, description, pdf_url)
 * - addon_subscriptions table (user_id, addon_id, enabled, since_date)
 */

import { MockUserBillingData, Invoice, Subscription } from "@/lib/types/pricing"

/**
 * Sample mock user billing data
 * Replace this with actual Supabase queries in production
 */
export function getMockUserBillingData(userId: string): MockUserBillingData {
  const today = new Date()
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 12)

  // Adjust if we're past the 12th of current month
  if (today.getDate() >= 12) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  }

  const invoices: Invoice[] = [
    {
      id: "inv_001",
      subscriptionId: "sub_001",
      userId: userId,
      planName: "Growth",
      amount: 29,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth(), 12),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 12),
      status: "paid",
      description: "Growth plan subscription",
      pdfUrl: "/invoices/inv_001.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc123456",
    },
    {
      id: "inv_002",
      subscriptionId: "sub_001",
      userId: userId,
      planName: "Growth",
      amount: 48,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 1, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 12),
      status: "paid",
      description: "Growth plan subscription + Booking Add-on",
      pdfUrl: "/invoices/inv_002.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc789456",
    },
    {
      id: "inv_003",
      subscriptionId: "sub_001",
      userId: userId,
      planName: "Growth",
      amount: 48,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 2, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 2, 12),
      status: "paid",
      description: "Growth plan subscription + Booking Add-on",
      pdfUrl: "/invoices/inv_003.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc456789",
    },
    {
      id: "inv_004",
      subscriptionId: "sub_001",
      userId: userId,
      planName: "Growth",
      amount: 48,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 3, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 3, 12),
      status: "paid",
      description: "Growth plan subscription + Booking Add-on",
      pdfUrl: "/invoices/inv_004.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc123789",
    },
    {
      id: "inv_005",
      subscriptionId: "sub_001",
      userId: userId,
      planName: "Growth",
      amount: 48,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 4, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 4, 12),
      status: "paid",
      description: "Growth plan subscription + Booking Add-on",
      pdfUrl: "/invoices/inv_005.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc456123",
    },
  ]

  return {
    userId: userId,
    currentPlan: "growth",
    status: "active",
    currentPrice: 29,
    nextBillingDate: nextBillingDate,
    addons: {
      bookingAddon: true,
    },
    invoices: invoices,
    createdAt: new Date("2026-01-12"),
  }
}

/**
 * Get mock subscription details for a specific user
 * In production: query from Supabase subscriptions table
 */
export function getMockSubscription(userId: string): Subscription | null {
  const billingData = getMockUserBillingData(userId)

  if (!billingData) return null

  return {
    id: "sub_001",
    userId: userId,
    planId: billingData.currentPlan,
    status: billingData.status,
    currentPrice: billingData.currentPrice,
    currency: "EUR",
    billingCycleStart: new Date(
      billingData.nextBillingDate.getFullYear(),
      billingData.nextBillingDate.getMonth(),
      12
    ),
    billingCycleEnd: billingData.nextBillingDate,
    nextBillingDate: billingData.nextBillingDate,
    createdAt: billingData.createdAt,
    updatedAt: new Date(),
    addons: billingData.addons,
    stripeCustomerId: "cus_" + userId.substring(0, 8).toUpperCase(),
    stripeSubscriptionId: "sub_1Hsj2U2eZvKYlo2Cc123456",
    stripePriceId: "price_1Hsj2U2eZvKYlo2Cc123456",
  }
}

/**
 * Sample data for different user scenarios
 * Use these for testing different plan states
 */

export const MOCK_USER_LITE_PLAN = (userId: string): MockUserBillingData => {
  const today = new Date()
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 20)

  return {
    userId,
    currentPlan: "lite",
    status: "active",
    currentPrice: 9,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices: [
      {
        id: "inv_lite_001",
        subscriptionId: "sub_lite_001",
        userId,
        planName: "Lite",
        amount: 9,
        currency: "EUR",
        date: new Date(today.getFullYear(), today.getMonth(), 20),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 20),
        status: "paid",
        description: "Lite plan subscription",
      },
    ],
    createdAt: new Date("2025-12-20"),
  }
}

export const MOCK_USER_TRIAL = (userId: string): MockUserBillingData => {
  const today = new Date()
  const nextBillingDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

  return {
    userId,
    currentPlan: "growth",
    status: "trial",
    currentPrice: 0,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices: [],
    createdAt: today,
  }
}

export const MOCK_USER_CANCELED = (userId: string): MockUserBillingData => {
  const today = new Date()
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 15)

  return {
    userId,
    currentPlan: "lite",
    status: "canceled",
    currentPrice: 9,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices: [
      {
        id: "inv_cancel_001",
        subscriptionId: "sub_cancel_001",
        userId,
        planName: "Lite",
        amount: 9,
        currency: "EUR",
        date: new Date(today.getFullYear(), today.getMonth(), 15),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
        status: "paid",
        description: "Final invoice - subscription canceled",
      },
    ],
    createdAt: new Date("2025-11-15"),
  }
}
