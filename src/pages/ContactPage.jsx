import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { submitComplaint } from '@/services/complaints';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { ChevronDown, Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const FAQS = [
  {
    q: 'How does Porch Light verify property titles and RERA status?',
    a: 'Every listing submitted by our verified agents must include a legitimate state RERA registration number and municipal sanctions. Our internal moderation desk cross-references these credentials directly with state RERA registries before granting publication status.',
  },
  {
    q: 'Can real estate agents buy or rent properties on the platform?',
    a: 'Agent profiles are designated specifically for listing management, client visits, and negotiations. To preserve platform neutrality, agent accounts cannot book visits or make purchase offers on other listings.',
  },
  {
    q: 'What is the token advance payment policy?',
    a: 'Token advances are held in an escrow simulation until legal due diligence is fulfilled. Token confirmations and receipts are immediately accessible in your user dashboard as downloadable PDF documents.',
  },
  {
    q: 'How do 360 degree virtual tours work?',
    a: 'Premium residences with values exceeding 2 Cr or rent over 1 Lakh/month feature calibrated 360 panoramic captures. You can pan, zoom, and navigate the rooms on any desktop or mobile device without external software.',
  },
];

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await submitComplaint({
        subject: data.subject || 'Website Inquiry',
        description: data.message,
        category: 'General Support',
      });
      toast.success('Support inquiry dispatched. Our desk will reply within 24 hours.');
      setSubmitted(true);
      reset();
    } catch (err) {
      toast.error(err.message || 'Failed to submit support inquiry.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      {/* Header */}
      <div>
        <Tag variant="purple" className="mb-3">Concierge Desk</Tag>
        <h1 className="font-serif text-fluid-h1 text-deep-purple tracking-tight mb-2">
          Contact Porch Light
        </h1>
        <p className="font-sans text-base text-dark-gray/70 max-w-2xl">
          Whether you seek assistance with title verification, need help scheduling a private viewing, or have an inquiry, our concierge team is at your disposal.
        </p>
      </div>

      {/* Split: Contact Form + Regional Offices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Support Form */}
        <div className="lg:col-span-7 p-8 rounded-3xl bg-porcelain border border-dark-gray/15 shadow-sm space-y-6">
          <h2 className="font-serif text-2xl text-deep-purple">
            Dispatch a Direct Message
          </h2>

          {submitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <div className="font-serif text-2xl text-emerald-900">
                Message Received
              </div>
              <p className="font-mono text-xs text-emerald-800/80 max-w-sm mx-auto">
                Your ticket has been logged into our support queue. A representative will contact you shortly.
              </p>
              <Button
                variant="dark"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="mt-2"
              >
                Send Another Note
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
                    Your Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="e.g. Ananya Rao"
                    className="w-full bg-porcelain border border-dark-gray/25 rounded-md px-3.5 py-2.5 text-sm text-dark-gray focus:outline-none focus:border-deep-purple"
                  />
                  {errors.name && (
                    <span className="font-mono text-[11px] text-rose-600 block mt-1">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Enter a valid email address',
                      },
                    })}
                    placeholder="ananya@example.com"
                    className="w-full bg-porcelain border border-dark-gray/25 rounded-md px-3.5 py-2.5 text-sm text-dark-gray focus:outline-none focus:border-deep-purple"
                  />
                  {errors.email && (
                    <span className="font-mono text-[11px] text-rose-600 block mt-1">
                      {errors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  {...register('subject', { required: 'Subject is required' })}
                  placeholder="e.g. Inquiring regarding Bangalore RERA certificate status"
                  className="w-full bg-porcelain border border-dark-gray/25 rounded-md px-3.5 py-2.5 text-sm text-dark-gray focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
                  Message Details
                </label>
                <textarea
                  rows={5}
                  {...register('message', { required: 'Message is required' })}
                  placeholder="How can our desk assist you today?"
                  className="w-full bg-porcelain border border-dark-gray/25 rounded-md p-3.5 text-sm text-dark-gray focus:outline-none focus:border-deep-purple"
                />
                {errors.message && (
                  <span className="font-mono text-[11px] text-rose-600 block mt-1">
                    {errors.message.message}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="dark"
                className="w-full py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Transmitting...' : 'Dispatch Message'}
              </Button>
            </form>
          )}
        </div>

        {/* Regional Hubs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-8 rounded-3xl bg-porcelain-tint border border-dark-gray/15 space-y-6">
            <h2 className="font-serif text-2xl text-deep-purple">
              Regional Desks
            </h2>

            <div className="space-y-4 font-mono text-xs text-dark-gray/80">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-dark-gray">Bengaluru (Headquarters)</div>
                  <div>Indiranagar 100ft Road, HAL 2nd Stage, Bengaluru 560038</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-dark-gray">Kochi Sanctuary Office</div>
                  <div>Panampilly Nagar Main Avenue, Ernakulam, Kochi 682036</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-dark-gray">Mumbai Marine Hub</div>
                  <div>Nariman Point, Marine Drive, Mumbai 400021</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-gray/10 space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-dark-gray/70">
                <Mail className="w-4 h-4 text-deep-purple" />
                <span>concierge@porchlight.in</span>
              </div>
              <div className="flex items-center gap-2 text-dark-gray/70">
                <Phone className="w-4 h-4 text-deep-purple" />
                <span>+91 80 4912 3000 (Mon - Sat, 9 AM - 6 PM)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="max-w-3xl space-y-6">
        <div>
          <span className="font-mono text-xs uppercase text-heather-purple">
            Answers & Clarity
          </span>
          <h2 className="font-serif text-3xl text-deep-purple tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-dark-gray/15 border-y border-dark-gray/15">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-serif text-xl text-dark-gray hover:text-deep-purple transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? 'rotate-180 text-deep-purple' : 'text-dark-gray/40'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-3 font-sans text-sm text-dark-gray/70 leading-relaxed pr-6">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
