import { useState } from 'react';
import { Button } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';

type Step = 'welcome' | 'privacy' | 'guide';

/**
 * 欢迎引导页
 *
 * 三阶段：
 * 1. 品牌欢迎页
 * 2. 隐私授权
 * 3. 快速引导（3 步）
 *
 * 对应 ui-screens.md §1
 */
export default function Welcome() {
  const [step, setStep] = useState<Step>('welcome');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleEnter = () => {
    if (privacyAccepted) {
      navigate({ page: 'create-pet', step: 1 });
    } else {
      setStep('privacy');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      {step === 'welcome' && (
        <WelcomeScreen onEnter={handleEnter} />
      )}
      {step === 'privacy' && (
        <PrivacyConsent
          onAccept={() => {
            setPrivacyAccepted(true);
            setStep('guide');
          }}
          onDecline={() => setStep('welcome')}
        />
      )}
      {step === 'guide' && <QuickGuide />}
    </div>
  );
}

/** ── 品牌欢迎 ── */
function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="acrylic flex w-[480px] flex-col items-center rounded-lg px-10 py-12 text-center shadow-lg">
      {/* 宠物图标占位 */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <span className="text-4xl">🐱</span>
      </div>

      <h1 className="text-display font-bold text-brand-500">LaiMePet</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        把真实宠物，带进你的桌面
      </p>
      <p className="mt-1 text-body-sm text-neutral-400">
        通过 AI 还原你的宠物形象，随时随地与你相伴
      </p>

      <Button size="lg" className="mt-8 w-full" onClick={onEnter}>
        开始体验
      </Button>

      <p className="mt-3 text-caption text-neutral-400">
        已有宠物？从系统托盘打开即可
      </p>
    </div>
  );
}

/** ── 隐私授权 ── */
function PrivacyConsent({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="acrylic w-[400px] rounded-lg p-8 shadow-lg">
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        隐私授权
      </h2>
      <p className="mt-4 text-body text-neutral-600 dark:text-neutral-300">
        为保护您的隐私，LaiMePet 承诺：
      </p>
      <ul className="mt-3 space-y-2 text-body-sm text-neutral-500">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-success">✓</span>
          宠物照片<b className="text-neutral-700 dark:text-neutral-200">默认在本地处理</b>，不上传至任何服务器
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-success">✓</span>
          仅在选择云端生成时，加密传输照片至 AI 服务
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-success">✓</span>
          不收集个人身份信息，不上传浏览记录
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-success">✓</span>
          可随时在设置中清除所有本地数据
        </li>
      </ul>
      <div className="mt-6 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onDecline}>
          暂不使用
        </Button>
        <Button className="flex-1" onClick={onAccept}>
          同意并继续
        </Button>
      </div>
    </div>
  );
}

/** ── 快速引导 ── */
function QuickGuide() {
  const [guideStep, setGuideStep] = useState(0);

  const guides = [
    {
      title: '上传照片',
      desc: '选择 5 张以上清晰的宠物照片，AI 将自动识别并生成 3D 形象',
      icon: '📸',
    },
    {
      title: '桌面陪伴',
      desc: '宠物在桌面自由活动，工作间隙随时互动抚摸、投喂',
      icon: '🖥️',
    },
    {
      title: '随时切换',
      desc: '多宠家庭可创建多个形象，右键菜单快速切换',
      icon: '🐾',
    },
  ];

  const isLast = guideStep === guides.length - 1;
  const g = guides[guideStep];

  return (
    <div className="acrylic w-[480px] rounded-lg px-10 py-10 text-center shadow-lg">
      {/* 步骤指示器 */}
      <div className="mb-6 flex justify-center gap-2">
        {guides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-8 rounded-full transition-colors duration-fast ${
              i <= guideStep
                ? 'bg-brand-500'
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />
        ))}
      </div>

      {/* 图标 */}
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30 mx-auto">
        <span className="text-3xl">{g.icon}</span>
      </div>

      <h3 className="text-title font-semibold text-neutral-900 dark:text-neutral-100">
        {g.title}
      </h3>
      <p className="mt-2 text-body text-neutral-500">{g.desc}</p>

      <div className="mt-8 flex gap-3">
        {guideStep > 0 && (
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setGuideStep((s) => s - 1)}
          >
            上一步
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={() => {
            if (isLast) {
              navigate({ page: 'create-pet', step: 1 });
            } else {
              setGuideStep((s) => s + 1);
            }
          }}
        >
          {isLast ? '开始创建' : '下一步'}
        </Button>
      </div>
    </div>
  );
}
