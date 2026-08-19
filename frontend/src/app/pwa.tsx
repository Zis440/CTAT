import { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// ------ PWA Install Button ------
export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 left-4 z-[9998] flex items-center gap-2 px-4 py-2.5 bg-background border-2 border-primary/20 text-text rounded-full shadow-lg hover:-translate-y-1 transition-all animate-in slide-in-from-bottom-5"
    >
      <div className="bg-primary/20 p-1.5 rounded-full">
        <Download className="h-4 w-4 text-primary" />
      </div>
      <span className="font-bold text-sm">Install App</span>
    </button>
  );
}

// ------ PWA Update Prompt ------
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-background text-text p-4 rounded-xl shadow-2xl border-2 border-primary/20 flex flex-col gap-3 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-full">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Update Available</h4>
          <p className="text-xs text-text/70">A new version of Psyichub is ready.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-1.5 text-xs font-bold text-text/70 hover:text-text hover:bg-muted rounded-md transition flex-1 sm:flex-none text-center"
        >
          Dismiss
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-background rounded-md shadow-sm hover:opacity-90 transition flex-1 sm:flex-none text-center"
        >
          Reload & Update
        </button>
      </div>
    </div>
  );
}


// #################################################################

// // # 1
// import { useState, useEffect } from 'react';
// import { Download } from 'lucide-react';

// export function PWAInstallButton() {
//   const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
//   const [showButton, setShowButton] = useState(false);

//   useEffect(() => {
//     const handler = (e: Event) => {
//       e.preventDefault();
//       setDeferredPrompt(e);
//       setShowButton(true);
//     };
//     window.addEventListener('beforeinstallprompt', handler);
//     return () => window.removeEventListener('beforeinstallprompt', handler);
//   }, []);

//   const handleInstall = async () => {
//     if (!deferredPrompt) return;
//     deferredPrompt.prompt();
//     const { outcome } = await deferredPrompt.userChoice;
//     if (outcome === 'accepted') {
//       setShowButton(false);
//     }
//     setDeferredPrompt(null);
//   };

//   if (!showButton) return null;

//   return (
//     <button
//       onClick={handleInstall}
//       className="fixed bottom-4 left-4 z-[9998] flex items-center gap-2 px-4 py-2.5 bg-background border-2 border-primary/20 text-text rounded-full shadow-lg hover:-translate-y-1 transition-all animate-in slide-in-from-bottom-5"
//     >
//       <div className="bg-primary/20 p-1.5 rounded-full">
//         <Download className="h-4 w-4 text-primary" />
//       </div>
//       <span className="font-bold text-sm">Install App</span>
//     </button>
//   );
// }





// // # 2
// import { useRegisterSW } from 'virtual:pwa-register/react';
// import { RefreshCw } from 'lucide-react';

// export function PWAUpdatePrompt() {
//   const {
//     needRefresh: [needRefresh, setNeedRefresh],
//     updateServiceWorker,
//   } = useRegisterSW();

//   if (!needRefresh) return null;

//   return (
//     <div className="fixed bottom-4 right-4 z-[9999] bg-background text-text p-4 rounded-xl shadow-2xl border-2 border-primary/20 flex flex-col gap-3 max-w-sm animate-in slide-in-from-bottom-5">
//       <div className="flex items-center gap-3">
//         <div className="bg-primary/20 p-2 rounded-full">
//           <RefreshCw className="h-5 w-5 text-primary animate-spin" />
//         </div>
//         <div>
//           <h4 className="font-bold text-sm">Update Available</h4>
//           <p className="text-xs text-text/70">A new version of Psyichub is ready.</p>
//         </div>
//       </div>
//       <div className="flex justify-end gap-2 mt-1">
//         <button
//           onClick={() => setNeedRefresh(false)}
//           className="px-3 py-1.5 text-xs font-bold text-text/70 hover:text-text hover:bg-muted rounded-md transition flex-1 sm:flex-none text-center"
//         >
//           Dismiss
//         </button>
//         <button
//           onClick={() => updateServiceWorker(true)}
//           className="px-3 py-1.5 text-xs font-bold bg-primary text-background rounded-md shadow-sm hover:opacity-90 transition flex-1 sm:flex-none text-center"
//         >
//           Reload & Update
//         </button>
//       </div>
//     </div>
//   );
// }
