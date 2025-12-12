"use client"

import { useState } from "react"

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("annually")

  const pricing = {
    starter: {
      monthly: 0,
      annually: 0,
    },
    professional: {
      monthly: 20,
      annually: 16, // 20% discount for annual
    },
    enterprise: {
      monthly: 200,
      annually: 160, // 20% discount for annual
    },
  }

  return (
    null
  )
}
