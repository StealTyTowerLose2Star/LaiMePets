import { useEffect, useState, lazy, Suspense } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePetStore } from '@/stores/petStore';
import { useRouter } from '@/hooks/useRouter';
import { ToastContainer } from '@/components/ui';

// 按路由懒加载页面
const Welcome = lazy(() => import('@/pages/Welcome'));
const CreatePet = lazy(() => import('@/pages/CreatePet'));
const Desktop = lazy(() => import('@/pages/Desktop'));
const Settings = lazy(() => import('@/pages/Settings'));
const ThreeDemo = lazy(() => import('@/pages/ThreeDemo'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
        <span className="text-caption text-neutral-500">加载中...</span>
      </div>
    </div>
  );
}

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadProfiles = usePetStore((s) => s.loadProfiles);
  const currentRoute = useRouter((s) => s.current);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadSettings();
    loadProfiles();
    setMounted(true);
  }, [loadSettings, loadProfiles]);

  if (!mounted) {
    return <PageLoader />;
  }

  return (
    <div className={theme} data-app="lai-me-pet">
      <Suspense fallback={<PageLoader />}>
        {currentRoute.page === 'welcome' && <Welcome />}
        {currentRoute.page === 'create-pet' && <CreatePet />}
        {currentRoute.page === 'desktop' && <Desktop />}
        {currentRoute.page === 'settings' && <Settings />}
        {currentRoute.page === 'three-demo' && <ThreeDemo />}
      </Suspense>
      <ToastContainer />
    </div>
  );
}
