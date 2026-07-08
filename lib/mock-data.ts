/**
 * Mock billing data.
 *
 * In production, this data will be fetched from Supabase.
 */

import { Invoice, MockUserBillingData, Subscription } from "@/lib/types/pricing"

export function getMockUserBillingData(userId: string): MockUserBillingData {
  const today = new Date()
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 12)

  if (today.getDate() >= 12) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  }

  const invoices: Invoice[] = [
    {
      id: "inv_001",
      subscriptionId: "sub_001",
      userId,
      planName: "Silver",
      amount: 14.95,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth(), 12),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 12),
      status: "paid",
      description: "Silver abonnement",
      pdfUrl: "/invoices/inv_001.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc123456",
    },
    {
      id: "inv_002",
      subscriptionId: "sub_001",
      userId,
      planName: "Silver",
      amount: 14.95,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 1, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 12),
      status: "paid",
      description: "Silver abonnement",
      pdfUrl: "/invoices/inv_002.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc789456",
    },
    {
      id: "inv_003",
      subscriptionId: "sub_001",
      userId,
      planName: "Bronze",
      amount: 7.95,
      currency: "EUR",
      date: new Date(today.getFullYear(), today.getMonth() - 2, 12),
      dueDate: new Date(today.getFullYear(), today.getMonth() - 2, 12),
      status: "paid",
      description: "Bronze abonnement",
      pdfUrl: "/invoices/inv_003.pdf",
      stripeInvoiceId: "in_1Hsj2U2eZvKYlo2Cc456789",
    },
  ]

  return {
    userId,
    currentPlan: "silver",
    status: "active",
    currentPrice: 14.95,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices,
    createdAt: new Date("2026-01-12"),
  }
}

export function getMockSubscription(userId: string): Subscription | null {
  const billingData = getMockUserBillingData(userId)

  return {
    id: "sub_001",
    userId,
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
    stripeCustomerId: `cus_${userId.substring(0, 8).toUpperCase()}`,
    stripeSubscriptionId: "sub_1Hsj2U2eZvKYlo2Cc123456",
    stripePriceId: "price_1Hsj2U2eZvKYlo2Cc123456",
  }
}

export const MOCK_USER_BRONZE_PLAN = (userId: string): MockUserBillingData => {
  const today = new Date()
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 20)

  return {
    userId,
    currentPlan: "bronze",
    status: "active",
    currentPrice: 7.95,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices: [
      {
        id: "inv_bronze_001",
        subscriptionId: "sub_bronze_001",
        userId,
        planName: "Bronze",
        amount: 7.95,
        currency: "EUR",
        date: new Date(today.getFullYear(), today.getMonth(), 20),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 20),
        status: "paid",
        description: "Bronze abonnement",
      },
    ],
    createdAt: new Date("2025-12-20"),
  }
}

export const MOCK_USER_TRIAL = (userId: string): MockUserBillingData => {
  const today = new Date()
  const nextBillingDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

  return {
    userId,
    currentPlan: "silver",
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
    currentPlan: "bronze",
    status: "canceled",
    currentPrice: 7.95,
    nextBillingDate,
    addons: {
      bookingAddon: false,
    },
    invoices: [
      {
        id: "inv_cancel_001",
        subscriptionId: "sub_cancel_001",
        userId,
        planName: "Bronze",
        amount: 7.95,
        currency: "EUR",
        date: new Date(today.getFullYear(), today.getMonth(), 15),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
        status: "paid",
        description: "Laatste factuur - abonnement opgezegd",
      },
    ],
    createdAt: new Date("2025-11-15"),
  }
}
