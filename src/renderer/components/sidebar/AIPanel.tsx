import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// ── 类型 ─────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── 快捷操作配置 ──────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'continue', icon: '✦', title: '继续写作', desc: '从当前位置延伸内容',
    prompt: (doc: string) => `请根据以下文档内容，自然地继续写作，保持相同的风格和语气，续写150-300字：\n\n${doc.slice(-800)}` },
  { id: 'polish',   icon: '⟳', title: '改写润色', desc: '提升语言表达质量',
    prompt: (doc: string) => `请对以下文本进行改写润色，保留核心意思，提升语言表达质量、逻辑清晰度和可读性：\n\n${doc.slice(0, 1200)}` },
  { id: 'summary',  icon: '◎', title: '提炼摘要', desc: '生成结构化摘要',
    prompt: (doc: string) => `请为以下文档生成一份简洁的结构化摘要（200字以内），包含核心观点和主要内容：\n\n${doc.slice(0, 2000)}` },
  { id: 'outline',  icon: '≡', title: '生成大纲', desc: '提取文档结构大纲',
    prompt: (doc: string) => `请分析以下文档内容，生成一份清晰的层级大纲：\n\n${doc.slice(0, 2000)}` },
  { id: 'polish_zh', icon: '文', title: '中文优化', desc: '优化中文表达和用词',
    prompt: (doc: string) => `请优化以下中文文本的表达，改正不自然的用词，使语言更流畅地道：\n\n${doc.slice(0, 1200)}` },
  { id: 'expand',   icon: '⊕', title: '扩展内容', desc: '对选定内容详细展开',
    prompt: (doc: string) => `请对以下内容进行详细扩展，增加具体细节、例子或论据，使内容更充实：\n\n${doc.slice(0, 1200)}` },
];

// ── 工具函数 ──────────────────────────────────────────────────
function getEditor(): any {
  return (window as any).__activeEditor || null;
}

function getDocContent(): string {
  const ed = getEditor();
  return ed ? ed.getText().slice(0, 3000) : '';
}

function insertToEditor(text: string) {
  const ed = getEditor();
  if (!ed) return false;
  try {
    ed.chain().focus().insertContent(text).run();
    return true;
  } catch { return false; }
}

// ── API Key 存储 ──────────────────────────────────────────────
const KEY_STORAGE = 'qiwen_doubao_apikey';
const MODEL_STORAGE = 'qiwen_doubao_model';

function getApiKey(): string { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; } }
function saveApiKey(k: string) { try { localStorage.setItem(KEY_STORAGE, k); } catch {} }
function getModel(): string { try { return localStorage.getItem(MODEL_STORAGE) || 'doubao-seed-1-6-flash-250615'; } catch { return 'doubao-seed-1-6-flash-250615'; } }
function saveModel(m: string) { try { localStorage.setItem(MODEL_STORAGE, m); } catch {} }

// ── 流式调用 Anthropic API ────────────────────────────────────
// 豆包 API 兼容 OpenAI 格式，用标准 SSE 流式
async function streamChat(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        // 豆包/OpenAI 格式：choices[0].delta.content
        const text = j?.choices?.[0]?.delta?.content || '';
        if (text) onChunk(text);
      } catch {}
    }
  }
}

// ── 设置面板 ─────────────────────────────────────────────────
const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [key, setKey] = useState(getApiKey);
  const [model, setModel] = useState(getModel);
  const [show, setShow] = useState(false);

  const handleSave = () => {
    saveApiKey(key.trim());
    saveModel(model);
    onClose();
  };

  const inputS: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    background: 'var(--bg-surface3)', border: '0.5px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 12.5, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-surface2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>豆包 API 设置</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Anthropic API Key</div>
        <div style={{ position: 'relative' as const }}>
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="火山方舟 API Key（从控制台获取）"
            style={{ ...inputS, paddingRight: 32 }}
          />
          <button onClick={() => setShow(v => !v)} style={{
            position: 'absolute' as const, right: 8, top: '50%', transform: 'translateY(-50%)',
            border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12, padding: 0,
          }}>
            {show ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>模型</div>
        <select value={model} onChange={e => saveModel(e.target.value) || setModel(e.target.value)}
          style={{ ...inputS, appearance: 'none' as const }}>
          <option value="doubao-seed-1-6-flash-250615">豆包 Seed 1.6 Flash（免费·快速）</option>
          <option value="doubao-seed-1-6-thinking-250615">豆包 Seed 1.6 Thinking（免费·推理）</option>
          <option value="doubao-1-5-pro-32k-250115">豆包 1.5 Pro 32K（均衡）</option>
          <option value="doubao-1-5-lite-32k-250115">豆包 1.5 Lite 32K（轻量）</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>取消</button>
        <button onClick={handleSave} style={{ flex: 2, padding: '7px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#c8a96e,#9a7040)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>保存</button>
      </div>

      <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Key 仅存储本地，不经过任何服务器。
        <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" target="_blank" rel="noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none', marginLeft: 4 }}>获取豆包 API Key →</a>
      </div>
    </div>
  );
};

// ── 主 AI 面板 ────────────────────────────────────────────────
export const AIPanel: React.FC<{ documentContent?: string }> = ({ documentContent = '' }) => {
  const [tab, setTab] = useState<'quick' | 'chat'>('quick');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKeyState] = useState(getApiKey);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
    setApiKeyState(getApiKey());
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setActiveAction(null);
  }, []);

  const callAI = useCallback(async (msgs: Message[], onDone: (full: string) => void) => {
    const key = getApiKey();
    if (!key) { setShowSettings(true); return; }
    setError('');
    setStreaming(true);
    setStreamText('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let full = '';
    try {
      await streamChat(msgs, key, getModel(), (chunk) => {
        full += chunk;
        setStreamText(full);
      }, ctrl.signal);
      onDone(full);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e?.message || '请求失败';
      if (msg.includes('401') || msg.includes('invalid') || msg.includes('authentication') || msg.includes('Unauthorized')) {
        setError('API Key 无效，请检查设置');
        setShowSettings(true);
      } else {
        setError(msg);
      }
    } finally {
      setStreaming(false);
      setStreamText('');
      setActiveAction(null);
      abortRef.current = null;
    }
  }, []);

  // ── 快捷操作 ───────────────────────────────────────────────
  const handleQuickAction = useCallback(async (action: typeof QUICK_ACTIONS[0]) => {
    const docText = documentContent || getDocContent();
    if (!docText.trim()) {
      setError('文档内容为空，请先写一些内容');
      return;
    }
    setActiveAction(action.id);
    const prompt = action.prompt(docText);
    setTab('quick');
    await callAI([{ role: 'user', content: prompt }], (full) => {
      // 显示结果在快捷结果区域
      setMessages(prev => [{
        role: 'assistant' as const,
        content: `**${action.title}结果：**\n\n${full}`,
      }, ...prev.filter(m => !m.content.startsWith(`**${action.title}结果`))]);
    });
  }, [documentContent, callAI]);

  // ── 对话 ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setTab('chat');

    // 构建上下文（带文档内容作 system 消息）
    const docText = documentContent || getDocContent();
    const systemContent = docText
      ? `你是一位写作助手。用户正在编写以下文档，请基于此内容回答问题：\n\n${docText.slice(0, 2000)}`
      : '你是一位写作助手，请帮助用户完成写作任务。';

    const apiMsgs = [
      { role: 'user', content: systemContent + '\n\n---\n\n' + text },
      ...newMsgs.slice(1).map(m => ({ role: m.role, content: m.content })),
    ].slice(-10); // 最多保留10条上下文

    await callAI(apiMsgs.map(m => m as Message), (full) => {
      setMessages(prev => [...prev, { role: 'assistant', content: full }]);
    });
  }, [input, streaming, messages, documentContent, callAI]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsert = useCallback((content: string) => {
    // 把 markdown 粗体标记去掉后插入
    const clean = content.replace(/\*\*[^*]+结果：\*\*\n\n/, '');
    if (!insertToEditor(clean)) {
      // 如果编辑器不可用，复制到剪贴板
      navigator.clipboard.writeText(clean).catch(() => {});
      setError('已复制到剪贴板（编辑器未聚焦）');
      setTimeout(() => setError(''), 2500);
    }
  }, []);

  const noKey = !apiKey;

  // ── 样式常量 ─────────────────────────────────────────────
  const tabBtnS = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', fontSize: 12, fontFamily: 'inherit',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: active ? 'var(--accent)' : 'var(--text-tertiary)',
    borderBottom: `1.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%', overflow: 'hidden' }}>

      {/* 设置面板 */}
      {showSettings && <SettingsPanel onClose={handleSettingsClose} />}

      {/* 顶部：标签 + 设置按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <button style={tabBtnS(tab === 'quick')} onClick={() => setTab('quick')}>快捷操作</button>
        <button style={tabBtnS(tab === 'chat')} onClick={() => setTab('chat')}>对话</button>
        <button
          onClick={() => setShowSettings(v => !v)}
          title="API 设置"
          style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: noKey ? '#c8a96e' : 'var(--text-tertiary)', flexShrink: 0, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ⚙
        </button>
      </div>

      {/* 无 Key 提示 */}
      {noKey && !showSettings && (
        <div style={{ padding: '10px 12px', background: 'rgba(200,169,110,0.08)', borderBottom: '0.5px solid rgba(200,169,110,0.2)', fontSize: 12, color: '#c8a96e', lineHeight: 1.6 }}>
          需要配置豆包 API Key 才能使用 AI 功能
          <button onClick={() => setShowSettings(true)} style={{ display: 'block', marginTop: 6, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#c8a96e,#9a7040)', color: '#fff', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>
            配置豆包 API Key
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{ padding: '7px 12px', background: 'rgba(232,122,122,0.1)', borderBottom: '0.5px solid rgba(232,122,122,0.2)', fontSize: 11.5, color: '#e87a7a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {error}
          <button onClick={() => setError('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e87a7a', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── 快捷操作 tab ─────────────────────────────────────── */}
      {tab === 'quick' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
          {/* 操作按钮 */}
          <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.8px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, marginBottom: 8 }}>选择操作</div>
            {QUICK_ACTIONS.map(action => (
              <div key={action.id}
                onClick={() => !streaming && handleQuickAction(action)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 5, cursor: streaming ? 'not-allowed' : 'pointer',
                  border: `0.5px solid ${activeAction === action.id ? 'rgba(200,169,110,0.5)' : 'var(--border)'}`,
                  background: activeAction === action.id ? 'rgba(200,169,110,0.1)' : 'var(--bg-surface2)',
                  opacity: streaming && activeAction !== action.id ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => { if (!streaming) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,169,110,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,169,110,0.06)'; }}}
                onMouseOut={e => { if (activeAction !== action.id) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface2)'; }}}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, background: activeAction === action.id ? 'rgba(200,169,110,0.2)' : 'var(--bg-surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'var(--accent)' }}>
                  {activeAction === action.id && streaming ? '⟳' : action.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{action.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{action.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 流式输出 / 结果 */}
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 12px 12px' }}>
            {streaming && streamText && (
              <div style={{ background: 'var(--bg-surface2)', borderRadius: 10, border: '0.5px solid var(--border)', padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', marginBottom: 6, letterSpacing: '0.5px' }}>正在生成<span style={{ animation: 'blink 1s step-end infinite' }}>...</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{streamText}</div>
              </div>
            )}
            {!streaming && messages.filter(m => m.role === 'assistant').slice(0, 1).map((msg, i) => (
              <div key={i} style={{ background: 'var(--bg-surface2)', borderRadius: 10, border: '0.5px solid var(--border)', padding: '10px 12px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const, marginBottom: 10 }}>
                  {msg.content.replace(/\*\*[^*]+结果：\*\*\n\n/, '')}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleInsert(msg.content)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#c8a96e,#9a7040)', color: '#fff', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit', fontWeight: 500 }}>
                    插入文档
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(msg.content.replace(/\*\*[^*]+结果：\*\*\n\n/, ''))} style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>
                    复制
                  </button>
                  <button onClick={() => setMessages([])} style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>
                    清除
                  </button>
                </div>
              </div>
            ))}
            {streaming && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <button onClick={stop} style={{ padding: '6px 16px', borderRadius: 7, border: '0.5px solid rgba(232,122,122,0.4)', background: 'rgba(232,122,122,0.08)', color: '#e87a7a', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  停止
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 对话 tab ─────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
          {/* 消息列表 */}
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '10px 12px' }}>
            {messages.length === 0 && !streaming && (
              <div style={{ textAlign: 'center' as const, padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 12.5 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                向 AI 提问，或描述你需要的帮助
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' as const }}>
                    <div style={{ maxWidth: '85%', padding: '8px 11px', borderRadius: '12px 12px 3px 12px', background: 'linear-gradient(135deg,#c8a96e,#9a7040)', color: '#fff', fontSize: 12.5, lineHeight: 1.6 }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ maxWidth: '95%' }}>
                    <div style={{ padding: '8px 11px', borderRadius: '3px 12px 12px 12px', background: 'var(--bg-surface2)', border: '0.5px solid var(--border)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' as const }}>
                      {msg.content}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      <button onClick={() => handleInsert(msg.content)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: 'rgba(200,169,110,0.15)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>插入</button>
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: 'var(--bg-surface3)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>复制</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {streaming && streamText && (
              <div style={{ maxWidth: '95%', padding: '8px 11px', borderRadius: '3px 12px 12px 12px', background: 'var(--bg-surface2)', border: '0.5px solid var(--border)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' as const }}>
                {streamText}<span style={{ display: 'inline-block', width: 6, height: 13, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'middle', borderRadius: 1, animation: 'blink 0.8s step-end infinite' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区 */}
          <div style={{ padding: '8px 12px 10px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
            {streaming && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <button onClick={stop} style={{ padding: '4px 14px', borderRadius: 6, border: '0.5px solid rgba(232,122,122,0.4)', background: 'rgba(232,122,122,0.08)', color: '#e87a7a', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>停止</button>
              </div>
            )}
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{ display: 'block', marginBottom: 5, padding: '0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'inherit' }}>
                清空对话
              </button>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="提问或描述需求... (Enter 发送, Shift+Enter 换行)"
                rows={2}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 9,
                  background: 'var(--bg-surface3)', border: '0.5px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 12.5, outline: 'none',
                  fontFamily: 'inherit', resize: 'none' as const, lineHeight: 1.5,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                style={{
                  width: 34, height: 34, borderRadius: 9, border: 'none', flexShrink: 0,
                  background: input.trim() && !streaming ? 'linear-gradient(135deg,#c8a96e,#9a7040)' : 'var(--bg-surface3)',
                  color: input.trim() && !streaming ? '#fff' : 'var(--text-tertiary)',
                  cursor: input.trim() && !streaming ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* blink 动画 */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
};
