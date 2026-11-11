import React from 'react';
import { PlaceholderPage } from './PlaceholderPage';

// Public pages
export function HomePage() {
  return (
    <PlaceholderPage
      title="Porch Light"
      category="Showcase"
      subtitle="Leave the light on for home. Architectural homes and commercial sanctuaries across India."
    />
  );
}

export function BuyPage() {
  return (
    <PlaceholderPage
      title="Homes & Commercial for Sale"
      category="Buy"
      subtitle="Discover verified RERA properties across Bengaluru, Mumbai, Kochi, Hyderabad, and more."
    />
  );
}

export function RentPage() {
  return (
    <PlaceholderPage
      title="Properties for Rent"
      category="Rent"
      subtitle="Curated residences and work spaces with transparent deposits and standard leases."
    />
  );
}

export function AboutPage() {
  return (
    <PlaceholderPage
      title="About Porch Light"
      category="Our Story"
      subtitle="We believe Indian real estate should feel calm, transparent, and quietly certain."
    />
  );
}

export function ContactPage() {
  return (
    <PlaceholderPage
      title="Contact Us"
      category="Support"
      subtitle="Reach our concierge desk in Bengaluru, Mumbai, or Kochi."
    />
  );
}

export function ForgotPasswordPage() {
  return (
    <PlaceholderPage
      title="Reset Password"
      category="Account Recovery"
      subtitle="Enter your registered email address to receive password reset instructions."
    />
  );
}

// Logged-in pages
export function PropertyDetailsPage() {
  return (
    <PlaceholderPage
      title="Property Details"
      category="Details"
      subtitle="Full specs, RERA ID, floor plans, and 360 virtual tour."
    />
  );
}

export function ComparePage() {
  return (
    <PlaceholderPage
      title="Compare Properties"
      category="Compare"
      subtitle="Side-by-side comparison of up to 3 properties."
    />
  );
}

export function CheckoutPage() {
  return (
    <PlaceholderPage
      title="Checkout & Token Advance"
      category="Payment"
      subtitle="Secure token amount and rental deposit simulator."
    />
  );
}

export function ProfilePage() {
  return (
    <PlaceholderPage
      title="Your Profile"
      category="Account"
      subtitle="Manage personal contact information and preferences."
    />
  );
}

export function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications"
      category="Updates"
      subtitle="Real-time visit confirmations, payment receipts, and announcement feed."
    />
  );
}

// User Dashboard
export function UserOverview() {
  return <PlaceholderPage title="User Overview" category="Dashboard" />;
}
export function UserSaved() {
  return <PlaceholderPage title="Saved Properties" category="Dashboard" />;
}
export function UserVisits() {
  return <PlaceholderPage title="Scheduled Visits" category="Dashboard" />;
}
export function UserHistory() {
  return <PlaceholderPage title="Purchases & Rentals History" category="Dashboard" />;
}
export function UserPayments() {
  return <PlaceholderPage title="Payments & Receipts" category="Dashboard" />;
}
export function UserDocuments() {
  return <PlaceholderPage title="Documents Vault" category="Dashboard" />;
}
export function UserExpenses() {
  return <PlaceholderPage title="Expense Tracker" category="Dashboard" />;
}
export function UserInquiries() {
  return <PlaceholderPage title="My Inquiries" category="Dashboard" />;
}
export function UserChat() {
  return <PlaceholderPage title="Live Messages" category="Dashboard" />;
}
export function UserComplaints() {
  return <PlaceholderPage title="Complaints & Resolution" category="Dashboard" />;
}
export function UserFeedback() {
  return <PlaceholderPage title="Agent Reviews & Feedback" category="Dashboard" />;
}

// Agent Dashboard
export function AgentOverview() {
  return <PlaceholderPage title="Agent Ledger Overview" category="Agent" />;
}
export function AgentListings() {
  return <PlaceholderPage title="My Listings" category="Agent" />;
}
export function AgentNewListing() {
  return <PlaceholderPage title="Create New Listing" category="Agent" />;
}
export function AgentVisits() {
  return <PlaceholderPage title="Visit Requests" category="Agent" />;
}
export function AgentInquiries() {
  return <PlaceholderPage title="Incoming Inquiries" category="Agent" />;
}
export function AgentIncome() {
  return <PlaceholderPage title="Income & Earnings" category="Agent" />;
}
export function AgentReviews() {
  return <PlaceholderPage title="Client Reviews" category="Agent" />;
}
export function AgentChat() {
  return <PlaceholderPage title="Client Communications" category="Agent" />;
}

// Admin Dashboard
export function AdminOverview() {
  return <PlaceholderPage title="Moderation Overview" category="Admin" />;
}
export function AdminApprovals() {
  return <PlaceholderPage title="Listing Approvals Queue" category="Admin" />;
}
export function AdminAgents() {
  return <PlaceholderPage title="Agent Verification" category="Admin" />;
}
export function AdminUsers() {
  return <PlaceholderPage title="User Accounts" category="Admin" />;
}
export function AdminComplaints() {
  return <PlaceholderPage title="Complaints Moderation" category="Admin" />;
}
export function AdminReviews() {
  return <PlaceholderPage title="Review Moderation" category="Admin" />;
}
export function AdminTransactions() {
  return <PlaceholderPage title="Platform Transactions" category="Admin" />;
}
export function AdminAnnouncements() {
  return <PlaceholderPage title="Announcements Manager" category="Admin" />;
}
export function AdminAnalytics() {
  return <PlaceholderPage title="Market Analytics" category="Admin" />;
}
