import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createWorkspace } from '../../store/slices/workspacesSlice';
import type { ProfessionType } from '@shared/types';
import { setActiveWorkspace, setView } from '../../store/slices/appSlice';
import { setPlugins } from '../../store/slices/pluginsSlice';
import { getPluginsForProfession } from '../../plugins/pluginRegistry';
import { ipc } from '../../utils/ipc';

const PROFESSIONS: { id: ProfessionType; icon: string; label: string; desc: string }[] = [
  { id: 'researcher', icon: '🔬', label: '学术研究', desc: '论文写作、文献管理' },
  { id: 'writer',     icon: '✍️', label: '内容创作', desc: '文章、故事、脚本' },
  { id: 'lawyer',     icon: '⚖️', label: '法律工作', desc: '合同、案例、研究' },
  { id: 'teacher',    icon: '📚', label: '教育培训', desc: '课程、教案、教材' },
  { id: 'doctor',     icon: '🩺', label: '医疗健康', desc: '病历、研究、报告' },
  { id: 'general',    icon: '💡', label: '通用知识', desc: '笔记、思考、规划' },
];

const THEMES = [
  { id: 'dark',   label: '暗金', preview: '#c8a96e', bg: '#0a0a0f' },
  { id: 'darker', label: '纯黑', preview: '#8b7355', bg: '#050508' },
  { id: 'warm',   label: '暖棕', preview: '#d4a06a', bg: '#0c0a08' },
];

const STEPS = ['欢迎', '职业', '工作区', '完成'];

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedProfession, setSelectedProfession] = useState<ProfessionType>('researcher');
  const [workspaceName, setWorkspaceName] = useState('我的工作区');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [loading, setLoading] = useState(false);

  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goPrev = () => { setDirection(-1); setStep(s => s - 1); };

  const handleFinish = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 创建工作区（这是判断是否完成引导的唯一依据）
      const ws = await dispatch(createWorkspace({
        name: workspaceName || '我的工作区',
        profession: selectedProfession,
        icon: PROFESSIONS.find(p => p.id === selectedProfession)?.icon || '📁',
      })).unwrap();
      dispatch(setActiveWorkspace(ws.id));

      // 初始化插件
      const professionPlugins = getPluginsForProfession(selectedProfession);
      dispatch(setPlugins(professionPlugins));

      // 写入设置（失败不影响流程）
      try { await ipc.invoke('settings:set', { key: 'theme', value: selectedTheme }); } catch {}

      onComplete();
    } catch (err) {
      console.error('Onboarding error:', err);
      onComplete();
    } finally {
      setLoading(false);
    }
  };


  const slides = [
    // Step 0 — Welcome
    <div key="welcome" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 100, height: 100, margin: '0 auto 36px',
          background: 'linear-gradient(145deg, #d4b47a, #7a5020)',
          borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, fontFamily: '"Noto Serif SC", serif', color: '#fff',
          boxShadow: '0 0 80px rgba(200,169,110,0.35), 0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        文
      </motion.div>
      <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: '"Noto Serif SC", serif', color: '#e8e6e0', marginBottom: 14, letterSpacing: -0.5 }}>
        欢迎使用启文
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(155,152,144,0.8)', lineHeight: 1.8, marginBottom: 8 }}>
        一款为深度创作者设计的本地优先知识管理工具
      </p>
      <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.5)', lineHeight: 1.7 }}>
        接下来我们用 1 分钟完成个性化设置
      </p>
    </div>,

    // Step 1 — Profession
    <div key="profession" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: '#e8e6e0', marginBottom: 8, textAlign: 'center' }}>您主要从事什么工作？</h2>
      <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.6)', textAlign: 'center', marginBottom: 32 }}>启文将根据您的选择优化界面和功能</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {PROFESSIONS.map((p) => (
          <motion.div
            key={p.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedProfession(p.id)}
            style={{
              padding: '16px 14px', borderRadius: 12, cursor: 'pointer',
              border: selectedProfession === p.id ? '1px solid rgba(200,169,110,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
              background: selectedProfession === p.id ? 'rgba(200,169,110,0.1)' : 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: selectedProfession === p.id ? '#c8a96e' : '#e8e6e0', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(155,152,144,0.55)', lineHeight: 1.4 }}>{p.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>,

    // Step 2 — Workspace
    <div key="workspace" style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: '#e8e6e0', marginBottom: 8 }}>给您的工作区起个名字</h2>
      <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.6)', marginBottom: 40 }}>工作区是您组织文档的顶层空间，随时可以更改</p>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input
          value={workspaceName}
          onChange={e => setWorkspaceName(e.target.value)}
          placeholder="我的工作区"
          maxLength={50}
          style={{
            width: '100%', padding: '16px 20px', fontSize: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(200,169,110,0.3)',
            borderRadius: 12, color: '#e8e6e0', outline: 'none',
            fontFamily: 'inherit', textAlign: 'center', letterSpacing: 0.3,
            boxShadow: '0 0 0 4px rgba(200,169,110,0.06)',
          }}
        />
      </div>
      <div style={{
        padding: '14px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: 'rgba(200,169,110,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {PROFESSIONS.find(p => p.id === selectedProfession)?.icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, color: '#e8e6e0', fontWeight: 500 }}>{workspaceName || '我的工作区'}</div>
          <div style={{ fontSize: 12, color: 'rgba(155,152,144,0.5)', marginTop: 2 }}>
            {PROFESSIONS.find(p => p.id === selectedProfession)?.desc}
          </div>
        </div>
      </div>
    </div>,

    // Step 3 — Theme
    <div key="theme" style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: '#e8e6e0', marginBottom: 8 }}>选择您喜欢的主题</h2>
      <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.6)', marginBottom: 36 }}>所有主题均采用暗色调，保护您的眼睛</p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {THEMES.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedTheme(t.id)}
            style={{
              cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
              border: selectedTheme === t.id ? '2px solid rgba(200,169,110,0.6)' : '1px solid rgba(255,255,255,0.08)',
              width: 120, transition: 'all 0.2s',
              boxShadow: selectedTheme === t.id ? '0 0 24px rgba(200,169,110,0.2)' : 'none',
            }}
          >
            <div style={{
              height: 80, background: t.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: t.preview, opacity: 0.9 }} />
            </div>
            <div style={{
              padding: '10px 0', textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              fontSize: 13, color: selectedTheme === t.id ? '#c8a96e' : 'rgba(155,152,144,0.7)',
              fontWeight: selectedTheme === t.id ? 500 : 400,
            }}>
              {t.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>,

    // Step 4 — Done
    <div key="done" style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(82,201,122,0.12)',
          border: '1px solid rgba(82,201,122,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: 36,
        }}
      >
        ✓
      </motion.div>
      <h2 style={{ fontSize: 26, fontWeight: 400, fontFamily: '"Noto Serif SC", serif', color: '#e8e6e0', marginBottom: 12 }}>
        一切就绪！
      </h2>
      <p style={{ fontSize: 14.5, color: 'rgba(155,152,144,0.7)', lineHeight: 1.8, marginBottom: 8 }}>
        您的工作区 <span style={{ color: '#c8a96e' }}>「{workspaceName}」</span> 已创建完毕
      </p>
      <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.5)', lineHeight: 1.7 }}>
        开始您的第一篇文档吧
      </p>
    </div>,
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#08080e', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(200,169,110,0.06) 0%, transparent 60%)',
      }} />

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 52, position: 'relative', zIndex: 1 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i < step ? '#c8a96e' : i === step ? '#c8a96e' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.4s ease',
            }} />
          </div>
        ))}
      </div>

      {/* Slide */}
      <div style={{ width: '100%', maxWidth: 600, minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <AnimatePresence custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          >
            {slides[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 48, position: 'relative', zIndex: 1 }}>
        {step > 0 && step < 4 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={goPrev}
            style={{
              padding: '11px 28px', borderRadius: 10, cursor: 'pointer',
              border: '0.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: '#9b9890',
              fontSize: 14, fontFamily: 'inherit',
            }}
          >
            上一步
          </motion.button>
        )}
        {step < 3 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={goNext}
            style={{
              padding: '11px 40px', borderRadius: 10, cursor: 'pointer',
              background: 'linear-gradient(135deg, #c8a96e, #9a7040)',
              color: '#fff', fontSize: 14, fontWeight: 500,
              border: 'none', fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(200,169,110,0.3)',
            }}
          >
            {step === 0 ? '开始设置' : '下一步'}
          </motion.button>
        )}
        {step === 3 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleFinish}
            disabled={loading}
            style={{
              padding: '13px 52px', borderRadius: 11, cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #c8a96e, #9a7040)',
              color: '#fff', fontSize: 16, fontWeight: 500,
              border: 'none', fontFamily: 'inherit',
              boxShadow: '0 4px 28px rgba(200,169,110,0.4)',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? '正在初始化...' : '开始使用启文 →'}
          </motion.button>
        )}
      </div>
    </div>
  );
};
