import React, { createContext, useContext } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ReceiptPrinterContext = createContext(null);

const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
    const y = index % 2 === 0 ? '100%' : `calc(100% - ${receiptToothDepth}px)`;
    return `${x}% ${y}`;
  }
).join(', ');

export const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const printingTransformKeyframes = [
  'translateY(calc(-100% + 2px))',
  'translateY(-91%)',
  'translateY(-91%)',
  'translateY(-81%)',
  'translateY(-81%)',
  'translateY(-70%)',
  'translateY(-70%)',
  'translateY(-58%)',
  'translateY(-58%)',
  'translateY(-45%)',
  'translateY(-45%)',
  'translateY(-32%)',
  'translateY(-32%)',
  'translateY(-20%)',
  'translateY(-20%)',
  'translateY(-10%)',
  'translateY(-10%)',
  'translateY(-3%)',
  'translateY(-3%)',
  'translateY(0%)',
];

const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6,
  0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

const defaultStatusLabels = {
  processing: 'Verifying payment with Stripe...',
  printing: 'Dispensing official transaction receipt...',
  complete: 'Transaction confirmed & completed',
};

function useReceiptPrinter(component) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

function ReceiptPrinterRoot({
  'aria-label': ariaLabel = 'Receipt printer',
  animate = true,
  children,
  className,
  feedMotion = 'stepped',
  stage = 'processing',
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn(
          'relative isolate flex w-full max-w-md flex-col items-center mx-auto select-none',
          className
        )}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'relative isolate w-full overflow-hidden rounded-2xl border border-charcoal/30 bg-[#212124] p-3 pb-7 shadow-2xl text-sand font-mono',
        className
      )}
      {...props}
    >
      {children}
      {/* Printer slot dispenser slit */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-3 z-40 h-2.5 rounded-sm border border-black/60 bg-black/80 shadow-inner"
      />
    </div>
  );
}

function ReceiptPrinterHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'relative z-10 flex h-10 items-center justify-between px-2 mb-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'relative z-10 isolate overflow-hidden rounded-xl border border-white/10 bg-[#161618] p-4 text-[#F1ECE3] shadow-inner font-sans',
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ReceiptPrinterStatus({ children, className, ...props }) {
  const { animate, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Status');
  const isComplete = stage === 'complete';

  return (
    <div className={cn('flex min-w-0 items-center gap-2 font-mono text-xs', className)} {...props}>
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        <AnimatePresence initial={false} mode="sync">
          {isComplete ? (
            <motion.span
              key="complete"
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: animate ? 0 : 1, scale: shouldMove ? 0.94 : 1 }}
              exit={{ opacity: animate ? 0 : 1, scale: shouldMove ? 0.96 : 1 }}
              transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
              className="col-start-1 row-start-1 text-emerald-400"
            >
              <CheckCircle2 className="size-4 text-emerald-400" />
            </motion.span>
          ) : (
            <motion.span
              key="working"
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: animate ? 0 : 1, scale: shouldMove ? 0.94 : 1 }}
              exit={{ opacity: animate ? 0 : 1, scale: shouldMove ? 0.96 : 1 }}
              transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
              className="col-start-1 row-start-1 text-amber-300"
            >
              <Loader2 className={cn('size-4 text-amber-300', animate && 'animate-spin')} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div aria-live="polite" className="grid min-w-0 flex-1 items-center" role="status">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={stage}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: animate ? 0 : 1, y: shouldMove ? 4 : 0 }}
            exit={{ opacity: animate ? 0 : 1, y: shouldMove ? -4 : 0 }}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
            className={cn(
              'col-start-1 row-start-1 truncate text-xs font-mono',
              isComplete ? 'text-emerald-400' : 'text-amber-200/90'
            )}
          >
            {children ?? defaultStatusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({ children, className, style, ...props }) {
  return (
    <article
      className={cn(
        'relative z-10 min-h-[22rem] bg-[#F7F4EE] border border-amber-900/10 px-6 pt-6 pb-9 font-mono text-charcoal shadow-md',
        className
      )}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({ children, className, ...props }) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Output');
  const isReceiptVisible = stage !== 'processing';
  const shouldUseSteppedFeed = feedMotion === 'stepped' && stage === 'printing' && shouldMove;

  return (
    <div
      className={cn(
        'relative z-50 -mt-3.5 min-h-[24rem] w-[calc(92%)] max-w-full overflow-hidden px-2',
        className
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 -top-1 z-20 h-2 bg-black/30 blur-[4px]"
        />
      ) : null}

      <motion.div
        animate={{
          opacity: isReceiptVisible ? 1 : 0,
          transform:
            stage === 'printing' && shouldMove
              ? shouldUseSteppedFeed
                ? printingTransformKeyframes
                : 'translateY(0%)'
              : isReceiptVisible || !shouldMove
              ? 'translateY(0%)'
              : 'translateY(calc(-100% + 2px))',
        }}
        aria-hidden={stage !== 'complete'}
        className="relative isolate"
        initial={false}
        transition={{
          opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
          transform: {
            duration: shouldMove ? 1.75 : 0,
            ease: shouldUseSteppedFeed ? 'linear' : easeInOut,
            times: shouldUseSteppedFeed ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const ReceiptPrinter = {
  Root: ReceiptPrinterRoot,
  Machine: ReceiptPrinterMachine,
  Header: ReceiptPrinterHeader,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
};

