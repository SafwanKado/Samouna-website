import React from 'react';
import { useFirebaseLoading } from '../context/FirebaseLoadingContext';
import { motion, AnimatePresence } from 'motion/react';
import { Croissant, RefreshCw } from 'lucide-react';

const GlobalLoader: React.FC = () => {
  const { isVerifyingPermissions, activeFetchesCount } = useFirebaseLoading();

  return (
    <AnimatePresence>
      {/* 1. Full screen skeleton placeholder during initial startup/connection permissions check */}
      {isVerifyingPermissions && (
        <motion.div
          key="initial-permissions-skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
          className="fixed inset-0 bg-stone-50 z-[9999] overflow-y-auto"
        >
          {/* Mock Header Skeleton */}
          <div className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-6 sticky top-0">
            <div className="flex items-center gap-2">
              <Croissant className="w-8 h-8 text-orange-700/40 animate-pulse" />
              <div className="h-6 w-24 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-stone-200 rounded-full animate-pulse" />
              <div className="h-8 w-20 bg-stone-200 rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* Pulsing Alert Badge indicating secure permission validation */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100/50 px-4 py-2 rounded-full text-xs text-orange-800 font-semibold shadow-sm animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 text-orange-700 animate-spin" />
                <span>Verifying secure network permission...</span>
              </div>
            </div>

            {/* Mock Hero Banner Skeleton */}
            <div className="h-56 sm:h-80 rounded-3xl bg-stone-200/80 animate-pulse relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-stone-200/50 via-stone-300/50 to-stone-200/50 -translate-x-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }} />
              <div className="space-y-3 px-6 text-center z-10">
                <div className="h-10 w-64 bg-stone-300 rounded-xl mx-auto animate-pulse" />
                <div className="h-5 w-48 bg-stone-300/70 rounded-lg mx-auto animate-pulse" />
              </div>
            </div>

            {/* Mock Search Bar Skeleton */}
            <div className="max-w-xl mx-auto -mt-8 sm:-mt-10 px-4 sm:px-0 z-20 relative">
              <div className="w-full h-14 bg-white border border-stone-200 rounded-2xl shadow-xl animate-pulse flex items-center px-4 gap-3">
                <div className="w-5 h-5 bg-stone-200 rounded-full" />
                <div className="h-4 w-40 bg-stone-100 rounded" />
              </div>
            </div>

            {/* Mock Bakery Grid Skeletons */}
            <div className="space-y-4 pt-4">
              <div className="h-8 w-36 bg-stone-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-sm flex flex-col h-80 space-y-4">
                    {/* Bakery Image Shape */}
                    <div className="h-48 bg-stone-200/60 animate-pulse relative">
                      <div className="absolute top-4 left-4 w-8 h-8 bg-stone-300/40 rounded-full" />
                      <div className="absolute top-4 right-4 w-12 h-6 bg-stone-300/40 rounded-lg" />
                    </div>
                    {/* Bakery Text Content */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="h-5 w-1/2 bg-stone-200 rounded animate-pulse" />
                        <div className="h-4 w-5/6 bg-stone-100 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-full bg-stone-100/60 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Top-border loading indicator during standard background queries */}
      {!isVerifyingPermissions && activeFetchesCount > 0 && (
        <React.Fragment key="active-background-loader">
          {/* Neon orange top edge visual line */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-orange-100 z-[9999] overflow-hidden">
            <div className="h-full bg-orange-600 w-1/3 animate-loading-line" />
          </div>

          {/* Elegant Floating synchronization glassmorphic card in bottom or corner for touch feedback */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 z-[999] bg-white/85 backdrop-blur-md border border-stone-200/60 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2.5"
          >
            <div className="bg-orange-50 p-1.5 rounded-full flex items-center justify-center">
              <Croissant className="w-4 h-4 text-orange-700 animate-[spin_3s_linear_infinite]" />
            </div>
            <span className="text-xs text-stone-600 font-bold tracking-tight">
              Updating bakery network...
            </span>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoader;
