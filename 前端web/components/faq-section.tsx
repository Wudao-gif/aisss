"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is Brillance and who is it for?",
    answer:
      "Brillance is a comprehensive billing automation platform designed for businesses that need custom contract management. It's perfect for SaaS companies, service providers, and enterprises looking to streamline their billing processes.",
  },
  {
    question: "How does the custom contract billing work?",
    answer:
      "Our platform automatically processes your custom contracts, calculates billing amounts based on your specific terms, and generates invoices. You can set up complex pricing structures, usage-based billing, and custom billing cycles.",
  },
  {
    question: "Can I integrate Brillance with my existing tools?",
    answer:
      "Yes! Brillance integrates seamlessly with popular CRM systems, accounting software, and payment processors. We support APIs and webhooks for custom integrations with your existing workflow.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "We offer 24/7 customer support, dedicated account managers for enterprise clients, comprehensive documentation, and onboarding assistance to help you get started quickly.",
  },
  {
    question: "Is my data secure with Brillance?",
    answer:
      "Absolutely. We use enterprise-grade security measures including end-to-end encryption, SOC 2 compliance, and regular security audits. Your data is stored in secure, redundant data centers.",
  },
  {
    question: "How do I get started with Brillance?",
    answer:
      "Getting started is simple! Sign up for our free trial, connect your existing systems, and our onboarding team will help you set up your first custom billing workflow within 24 hours.",
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <div className="w-full flex justify-center items-start">
      
    </div>
  )
}
