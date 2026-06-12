export type BillingPlan = {
  code: "free" | "pro";
  name: string;
  monthlyLimit: number;
  stripePriceId?: string;
};

export const billingPlans: BillingPlan[] = [
  {
    code: "free",
    name: "Free",
    monthlyLimit: 20
  },
  {
    code: "pro",
    name: "Pro",
    monthlyLimit: 500,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY
  }
];
