import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Campus Supply Rescue | Inter-Departmental Resource Exchange',
  description: 'A campus resource platform enabling college departments to publish surplus usable supplies and discover equipment before procuring new items.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 flex flex-col min-h-screen antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        
        {/* Campus Portal Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <strong className="text-slate-700 font-semibold">Campus Supply Rescue</strong>
              <p className="text-[11px] text-slate-400">“Use what already exists before buying what doesn’t.”</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Inter-Departmental Resource Exchange Platform</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

