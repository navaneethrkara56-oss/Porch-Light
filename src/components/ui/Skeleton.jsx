import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn('animate-pulse motion-reduce:animate-none bg-dark-gray/10 rounded-md', className)}
      {...props}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="border border-dark-gray/15 rounded-[20px] p-5 sm:p-6 bg-porcelain shadow-sm flex flex-col md:flex-row gap-5 md:gap-6 animate-pulse motion-reduce:animate-none">
      <Skeleton className="w-full md:w-72 lg:w-80 h-52 sm:h-56 md:h-auto rounded-[16px] shrink-0" />
      <div className="flex-1 flex flex-col justify-between py-1 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-7 w-3/4 rounded-md mb-2" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-dark-gray/10">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
        <div className="pt-3 border-t border-dark-gray/10 flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertyDetailsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading sanctuary details"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">Loading property details...</span>

      {/* Breadcrumb / Top Bar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <span className="text-dark-gray/20 font-mono text-xs">/</span>
          <Skeleton className="h-4 w-28 rounded-full" />
          <span className="text-dark-gray/20 font-mono text-xs">/</span>
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* Title & Price Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-dark-gray/10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <Skeleton className="h-8 sm:h-10 w-80 sm:w-96 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded-md" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-4 w-20 rounded-md ml-auto" />
          <Skeleton className="h-8 sm:h-10 w-44 rounded-lg ml-auto" />
        </div>
      </div>

      {/* Gallery Collage Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[380px] sm:h-[480px] lg:h-[520px]">
        {/* Main Hero Photo Slot (7 cols) */}
        <div className="lg:col-span-7 h-full">
          <Skeleton className="w-full h-full rounded-[20px]" />
        </div>
        {/* 2x2 Secondary Photo Grid (5 cols) */}
        <div className="hidden lg:grid col-span-5 grid-cols-2 gap-4 h-full">
          <Skeleton className="w-full h-full rounded-[20px]" />
          <Skeleton className="w-full h-full rounded-[20px]" />
          <Skeleton className="w-full h-full rounded-[20px]" />
          <Skeleton className="w-full h-full rounded-[20px]" />
        </div>
      </div>

      {/* 2-Column Main Content & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Left Column: Key Specs, Narrative, Amenities (Order 2 on mobile, 1 on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-8 space-y-8">
          {/* Key Dimensions Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-6">
            <Skeleton className="h-4 w-48 rounded-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-7 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Narrative Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>

          {/* Amenities Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <Skeleton className="h-5 w-40 rounded" />
            <div className="flex flex-wrap gap-2.5">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full" />
              ))}
            </div>
          </div>

          {/* Access & Connectivity Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <Skeleton className="h-5 w-56 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right Column: Agent Verification & Action Box (Order 1 on mobile, 2 on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-4 space-y-6">
          {/* Agent Card */}
          <div className="p-6 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
            </div>
          </div>

          {/* Action Box */}
          <div className="p-6 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="h-3 w-48 rounded mx-auto" />
          </div>

          {/* Calculator Card */}
          <div className="p-6 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
