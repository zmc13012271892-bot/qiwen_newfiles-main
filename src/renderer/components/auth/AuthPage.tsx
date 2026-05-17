import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { loginUser, registerUser, setLocalMode } from '../../store/slices/authSlice';

type AuthMode = 'login' | 'register';

interface FormState {
  username: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  rememberMe: boolean;
}

export const AuthPage: React.FC<{ onOffline?: () => void }> = ({ onOffline }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormState>({
    username: '', password: '', confirmPassword: '',
    displayName: '', rememberMe: true,
  });

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!form.displayName.trim()) return setError('请输入昵称');
      if (form.username.length < 3) return setError('用户名至少3位');
      if (form.password.length < 6) return setError('密码至少6位');
      if (form.password !== form.confirmPassword) return setError('两次密码不一致');
    } else {
      if (!form.username.trim()) return setError('请输入用户名');
      if (!form.password) return setError('请输入密码');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await dispatch(loginUser({
          emailOrUsername: form.username,
          password: form.password,
          rememberMe: form.rememberMe,
        })).unwrap();
        // 登录成功，App.tsx 的 useEffect 会接管跳转
      } else {
        await dispatch(registerUser({
          email: '',
          username: form.username,
          password: form.password,
          displayName: form.displayName,
        })).unwrap();
        // 注册成功直接登录态，App.tsx 接管跳转
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOffline = () => {
    // 只调用父级回调，不在这里 dispatch
    // 父级 App.tsx 的 onOffline 会处理 setLocalMode + 页面跳转
    onOffline?.();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#08080e',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 60% at 15% 50%, rgba(200,169,110,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 85% 30%, rgba(74,158,255,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 60% 60% at 50% 100%, rgba(184,138,240,0.04) 0%, transparent 60%)
        `,
      }} />

      {/* Left panel */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 48, borderRight: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 80, height: 80,
            background: 'linear-gradient(145deg, #d4b47a, #8b6230)',
            borderRadius: 20, marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontFamily: '"Noto Serif SC", serif', color: '#fff',
            boxShadow: '0 0 60px rgba(200,169,110,0.3), 0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          文
        </motion.div>

        <h1 style={{
          fontSize: 36, fontWeight: 300, letterSpacing: 6,
          fontFamily: '"Noto Serif SC", serif', color: '#e8e6e0', marginBottom: 12,
        }}>启 文</h1>
        <p style={{ fontSize: 13, color: 'rgba(200,169,110,0.5)', letterSpacing: 3, marginBottom: 56 }}>
          QIWEN STUDIO
        </p>

        {[
          { icon: '✦', text: '本地优先，数据完全属于你' },
          { icon: '◎', text: '专注写作，告别干扰' },
          { icon: '⊕', text: '文献管理，告别手动引用' },
          { icon: '⟳', text: 'AI 写作助手，一键润色' },
        ].map((f, i) => (
          <motion.div
            key={f.text}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 16, width: '100%', maxWidth: 280,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(200,169,110,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#c8a96e',
              border: '0.5px solid rgba(200,169,110,0.2)',
            }}>
              {f.icon}
            </div>
            <span style={{ fontSize: 13.5, color: 'rgba(232,230,224,0.65)', lineHeight: 1.5 }}>
              {f.text}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 440, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 48px',
        }}
      >
        <AnimatePresence exitBeforeEnter>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          >
            <h2 style={{
              fontSize: 24, fontWeight: 400, color: '#e8e6e0',
              marginBottom: 6, letterSpacing: -0.3,
            }}>
              {mode === 'login' ? '欢迎回来' : '创建账户'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(155,152,144,0.8)', marginBottom: 32 }}>
              {mode === 'login' ? '登录以继续您的创作' : '账户数据保存在本地，安全私密'}
            </p>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                    fontSize: 13.5, lineHeight: 1.5,
                    background: 'rgba(255,107,107,0.08)',
                    border: '0.5px solid rgba(255,107,107,0.25)',
                    color: '#ff6b6b',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'register' && (
                <InputField
                  label="昵称"
                  placeholder="如何称呼您？"
                  value={form.displayName}
                  onChange={set('displayName')}
                />
              )}

              <InputField
                label="用户名"
                placeholder={mode === 'register' ? '3位以上，字母/数字/下划线' : '输入用户名'}
                value={form.username}
                onChange={set('username')}
              />

              <div style={{ position: 'relative' }}>
                <InputField
                  label="密码"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? '至少6位' : '输入密码'}
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, bottom: 11,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(155,152,144,0.6)', fontSize: 12,
                  }}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>

              {mode === 'register' && (
                <InputField
                  label="确认密码"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="再次输入密码"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                />
              )}

              {mode === 'login' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'rgba(155,152,144,0.8)' }}>
                  <input
                    type="checkbox" checked={form.rememberMe} onChange={set('rememberMe')}
                    style={{ accentColor: '#c8a96e', width: 14, height: 14 }}
                  />
                  记住我
                </label>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                style={{
                  marginTop: 6, padding: '13px',
                  background: loading ? 'rgba(200,169,110,0.4)' : 'linear-gradient(135deg, #c8a96e, #a07840)',
                  color: '#fff', border: 'none', borderRadius: 11,
                  fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: 0.3,
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(200,169,110,0.35)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading && <Spinner />}
                {loading ? '处理中...' : mode === 'login' ? '登录' : '创建账户'}
              </motion.button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13.5, color: 'rgba(155,152,144,0.6)' }}>
              {mode === 'login' ? (
                <>还没有账户？{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8a96e', fontSize: 13.5 }}
                  >
                    免费注册
                  </button>
                </>
              ) : (
                <>已有账户？{' '}
                  <button
                    onClick={() => { setMode('login'); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8a96e', fontSize: 13.5 }}
                  >
                    立即登录
                  </button>
                </>
              )}
            </div>

            {/* 不注册直接用 */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <button
                onClick={handleOffline}
                style={{
                  background: 'none', border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 9, padding: '9px 20px', cursor: 'pointer',
                  color: 'rgba(155,152,144,0.7)', fontSize: 13,
                  fontFamily: 'inherit', transition: 'all 0.15s', width: '100%',
                }}
                onMouseOver={e => { (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'); (e.currentTarget.style.color = '#9b9890'); }}
                onMouseOut={e => { (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = 'rgba(155,152,144,0.7)'); }}
              >
                不注册，直接使用
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', placeholder, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, color: 'rgba(155,152,144,0.8)', marginBottom: 6, letterSpacing: 0.3 }}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 14px',
          background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: `0.5px solid ${focused ? 'rgba(200,169,110,0.4)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 10, fontSize: 14, color: '#e8e6e0',
          outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.2s, background 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(200,169,110,0.08)' : 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

const Spinner = () => (
  <div style={{
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  }} />
);
