/**
 * Pricing & Billing Type Definitions
 * ===================================
 * Central TypeScript types for the SaaS pricing and subscription system.
 * Prepared for future Stripe integration with Supabase.
 */

// ===== PLANS =====

export type PlanId = "lite" | "growth" | "booking-addon"

export interface PricingPlan {
  id: PlanId
  name: string
  description: string
  monthlyPrice: number
  annualPrice?: number
  currency: "EUR"
  features: string[]
  badge?: string
  isAddon: boolean
  isPopular: boolean
  cta: string
}

// ===== SUBSCRIPTION STATUS =====

export type SubscriptionStatus = "active" | "trial" | "past_due" | "canceled" | "expired"

export interface Subscription {
  id: string
  userId: string
  planId: PlanId
  status: SubscriptionStatus
  currentPrice: number
  currency: "EUR"
  billingCycleStart: Date
  billingCycleEnd: Date
  nextBillingDate: Date
  createdAt: Date
  updatedAt: Date
  // Addons
  addons: {
    bookingAddon: boolean
  }
  // Stripe references (for future integration)
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
}

// ===== INVOICES =====

export interface Invoice {
  id: string
  subscriptionId: string
  userId: string
  planName: string
  amount: number
  currency: "EUR"
  date: Date
  dueDate: Date
  status: "draft" | "paid" | "past_due" | "uncollectible" | "void"
  description: string
  pdfUrl?: string
  stripeInvoiceId?: string
}

// ===== FEATURES COMPARISON =====

export interface FeatureComparison {
  feature: string
  lite: boolean | string
  growth: boolean | string
  bookingAddon: boolean | string
}

// ===== API RESPONSES =====

export interface GetSubscriptionResponse {
  subscription: Subscription | null
  error?: string
}

export interface UpdateSubscriptionResponse {
  success: boolean
  subscription?: Subscription
  error?: string
}

// ===== MOCK DATA INTERFACES =====

export interface MockUserBillingData {
  userId: string
  currentPlan: PlanId
  status: SubscriptionStatus
  currentPrice: number
  nextBillingDate: Date
  addons: {
    bookingAddon: boolean
  }
  invoices: Invoice[]
  createdAt: Date
}

// ===== COMPONENT PROPS =====

export interface PricingCardProps {
  plan: PricingPlan
  isSelected?: boolean
  isPopular?: boolean
  onSelectPlan?: (planId: PlanId) => void
  onToggleAddon?: (addonId: string, enabled: boolean) => void
}

export interface FeatureListProps {
  features: string[]
  className?: string
}

export interface BillingStatusBadgeProps {
  status: SubscriptionStatus
  className?: string
}

export interface PlanComparisonTableProps {
  currentPlanId: PlanId
  onUpgrade?: (planId: PlanId) => void
  onDowngrade?: (planId: PlanId) => void
}

export interface AddonToggleCardProps {
  addonId: "bookingAddon"
  addonName: string
  isEnabled: boolean
  monthlyPrice: number
  features: string[]
  onToggle?: (enabled: boolean) => void
}

export interface InvoiceHistoryTableProps {
  invoices: Invoice[]
  isLoading?: boolean
  onDownloadPDF?: (invoiceId: string) => void
}

export interface BillingSummarySidebarProps {
  currentPlan: PricingPlan
  nextBillingDate: Date
  monthlyCharge: number
  addonsPrice?: number
  onManageSubscription?: () => void
  onEditPayment?: () => void
}
