import React from 'react';
import { Arch, Leaf, Circle } from '@/components/shapes';
import { SmartImage } from '@/components/media/SmartImage';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, Compass, Home } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Tag variant="purple" className="mb-4">Our Philosophy</Tag>
          <h1 className="font-serif text-fluid-display text-deep-purple tracking-tight leading-[1.05] mb-6">
            Leave the light on <span className="italic font-normal">for home.</span>
          </h1>
          <p className="font-sans text-xl text-dark-gray/80 leading-relaxed">
            In Indian real estate, noise has drowned out sanctuary. Porch Light was conceived as an antidote: calm, verified, unhurried spaces where architecture speaks with certainty.
          </p>
        </div>
      </section>

      {/* Visual Collage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7">
            <Arch className="h-[460px] w-full">
              <SmartImage
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
                alt="Kerala courtyard sanctuary"
                className="w-full h-full"
              />
            </Arch>
          </div>
          <div className="md:col-span-5 space-y-6">
            <Leaf className="h-64 w-full">
              <SmartImage
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80"
                alt="Contemporary architecture"
                className="w-full h-full"
              />
            </Leaf>
            <div className="p-6 rounded-2xl bg-porcelain-tint border border-dark-gray/15 font-mono text-xs text-dark-gray/70 space-y-2">
              <div className="font-bold text-deep-purple uppercase tracking-wider">
                Built on Three Tenets:
              </div>
              <div>1. Mandatory RERA Title Verification</div>
              <div>2. Standardized, Transparent INR Pricing (No Hidden Extras)</div>
              <div>3. Restraint in Design & Communication</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tenets grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <div className="w-10 h-10 rounded-full bg-deep-purple/10 flex items-center justify-center text-deep-purple">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-2xl text-deep-purple">
              Absolute Veracity
            </h3>
            <p className="font-sans text-sm text-dark-gray/70 leading-relaxed">
              Every home or commercial space listed has its RERA certificate, approved layout, and encumbrance pedigree verified before public publishing.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <div className="w-10 h-10 rounded-full bg-deep-purple/10 flex items-center justify-center text-deep-purple">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-2xl text-deep-purple">
              Spatial Immersion
            </h3>
            <p className="font-sans text-sm text-dark-gray/70 leading-relaxed">
              We insist on high-resolution architectural captures, calibrated 360 degree tours, and authentic floor plans so you comprehend proportion before stepping foot on site.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <div className="w-10 h-10 rounded-full bg-deep-purple/10 flex items-center justify-center text-deep-purple">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-2xl text-deep-purple">
              Quiet Guidance
            </h3>
            <p className="font-sans text-sm text-dark-gray/70 leading-relaxed">
              No relentless cold calls or spam notifications. Our verified regional agents respond calmly on your schedule when you are ready to visit.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-12 sm:p-16 rounded-3xl bg-dark-gray text-porcelain space-y-6">
          <h2 className="font-serif text-3xl sm:text-5xl text-porcelain">
            Come home to something real.
          </h2>
          <p className="font-mono text-xs text-porcelain/70 max-w-md mx-auto">
            Discover sanctuaries across Kochi, Bengaluru, Mumbai, Hyderabad, and Chennai.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link to="/buy">
              <Button variant="lemon">Browse Properties for Sale</Button>
            </Link>
            <Link to="/rent">
              <Button variant="outline" className="text-porcelain border-white/30 hover:text-dark-gray">
                Explore Rentals
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
