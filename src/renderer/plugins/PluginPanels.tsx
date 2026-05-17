import React, { useState, useEffect, useRef } from 'react';

// ── 共享样式工具 ──────────────────────────────────────────
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'var(--bg-surface2)',
  border: '0.5px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
  marginBottom: 8,
  ...extra,
});

const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.8px',
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase' as const,
  marginBottom: 10,
};

const btn = (accent?: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 8,
  border: accent ? 'none' : '0.5px solid var(--border)',
  background: accent ? 'linear-gradient(135deg, #c8a96e, #9a7040)' : 'var(--bg-surface3)',
  color: accent ? '#fff' : 'var(--text-secondary)',
  fontSize: 12.5,
  fontWeight: accent ? 500 : 400,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
  ...extra,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: 'var(--bg-surface3)',
  border: '0.5px solid var(--border)',
  borderRadius: 7,
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
};

// ── 番茄专注计时器 ────────────────────────────────────────
export const FocusTimerPlugin: React.FC = () => {
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [rounds, setRounds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false);
            setIsBreak(prev => {
              if (!prev) setRounds(r => r + 1);
              return !prev;
            });
            return isBreak ? WORK : BREAK;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, isBreak]);

  const total = isBreak ? BREAK : WORK;
  const pct = ((total - seconds) / total) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const r = 34;
  const circ = 2 * Math.PI * r;

  const reset = () => {
    setRunning(false);
    setSeconds(isBreak ? BREAK : WORK);
  };

  return (
    <div>
      <div style={label}>番茄专注</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 90, height: 90 }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={r} fill="none" stroke="var(--bg-surface3)" strokeWidth="6" />
            <circle
              cx="45" cy="45" r={r} fill="none"
              stroke={isBreak ? '#52c97a' : '#c8a96e'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              transform="rotate(-90 45 45)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: 1 }}>{mm}:{ss}</div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isBreak ? '休息' : '专注'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn(!running)} onClick={() => setRunning(r => !r)}>{running ? '暂停' : '开始'}</button>
          <button style={btn(false)} onClick={reset}>重置</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          今日已完成 <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{rounds}</span> 轮
        </div>
      </div>
    </div>
  );
};

// ── 快速便签 ──────────────────────────────────────────────
export const QuickNotePlugin: React.FC = () => {
  const [notes, setNotes] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setNotes(n => [...n, { id: Date.now().toString(), text: input.trim(), done: false }]);
    setInput('');
  };

  return (
    <div>
      <div style={label}>快速便签</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="记录灵感、待办..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button style={btn(true, { padding: '6px 10px' })} onClick={add}>+</button>
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', opacity: 0.6 }}>暂无便签</div>
        ) : notes.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div
              onClick={() => setNotes(ns => ns.map(x => x.id === n.id ? { ...x, done: !x.done } : x))}
              style={{
                width: 14, height: 14, borderRadius: 4, marginTop: 1, flexShrink: 0, cursor: 'pointer',
                border: n.done ? 'none' : '1.5px solid var(--border)',
                background: n.done ? '#c8a96e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {n.done && <span style={{ fontSize: 9, color: '#fff' }}>✓</span>}
            </div>
            <span style={{ fontSize: 12.5, color: n.done ? 'var(--text-tertiary)' : 'var(--text-secondary)', textDecoration: n.done ? 'line-through' : 'none', flex: 1, lineHeight: 1.5 }}>{n.text}</span>
            <button onClick={() => setNotes(ns => ns.filter(x => x.id !== n.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 11, padding: 0 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 引用格式生成 ──────────────────────────────────────────
export const CitationManagerPlugin: React.FC = () => {
  const [format, setFormat] = useState<'APA' | 'MLA' | 'GB'>('APA');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [journal, setJournal] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!title.trim()) return;
    const a = author || '作者';
    if (format === 'APA') setResult(`${a} (${year}). ${title}.${journal ? ` *${journal}*.` : ''}`);
    else if (format === 'MLA') setResult(`${a}. "${title}." ${journal ? `*${journal}*, ` : ''}${year}.`);
    else setResult(`${a}. ${title}[J].${journal ? ` ${journal},` : ''} ${year}.`);
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div>
      <div style={label}>引用生成</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['APA', 'MLA', 'GB'] as const).map(f => (
          <button key={f} onClick={() => setFormat(f)} style={{ ...btn(format === f), padding: '4px 10px', fontSize: 11, flex: 1 }}>{f}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <input style={inputStyle} placeholder="作者姓名" value={author} onChange={e => setAuthor(e.target.value)} />
        <input style={inputStyle} placeholder="文章/书籍标题 *" value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 6 }}>
          <input style={{ ...inputStyle, width: '40%' }} placeholder="年份" value={year} onChange={e => setYear(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="期刊名（可选）" value={journal} onChange={e => setJournal(e.target.value)} />
        </div>
      </div>
      <button style={btn(true, { width: '100%', marginBottom: 8 })} onClick={generate}>生成引用</button>
      {result && (
        <div style={{ ...card(), position: 'relative' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, paddingRight: 24 }}>{result}</div>
          <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 13 }}>
            {copied ? '✓' : '⎘'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── 法律条款模板库 ────────────────────────────────────────
const CLAUSES = [
  { cat: '合同通用', name: '不可抗力条款', text: '因不可抗力事件导致任何一方不能履行本合同的，该方应及时通知对方，并在事件结束后__日内提供相关证明文件。因不可抗力导致的合同迟延或不履行，不视为违约。' },
  { cat: '合同通用', name: '争议解决条款', text: '因本合同引起的或与本合同有关的任何争议，双方应首先协商解决；协商不成的，任何一方可向____仲裁委员会申请仲裁。' },
  { cat: '保密协议', name: '保密义务', text: '乙方承诺对甲方提供的所有商业秘密、技术秘密及其他保密信息严格保密，未经甲方书面同意，不得向任何第三方披露。' },
  { cat: '劳动合同', name: '竞业限制', text: '员工在职期间及离职后__年内，不得从事与本公司有竞争关系的业务，不得就职于竞争对手企业。' },
  { cat: '购销合同', name: '质量保证', text: '出卖人保证所售货物符合国家强制性标准及双方约定的质量标准，质保期为____个月。' },
];

export const ClauseLibraryPlugin: React.FC = () => {
  const [cat, setCat] = useState('全部');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const cats = ['全部', ...Array.from(new Set(CLAUSES.map(c => c.cat)))];
  const filtered = CLAUSES.filter(c =>
    (cat === '全部' || c.cat === cat) &&
    (!search || c.name.includes(search) || c.text.includes(search))
  );

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div>
      <div style={label}>条款模板库</div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索条款..."
        style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 10 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ ...btn(cat === c), padding: '3px 8px', fontSize: 10 }}>{c}</button>
        ))}
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.map((c, i) => (
          <div key={i} style={card({ position: 'relative' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</div>
              <button onClick={() => copy(c.text, c.name)} style={{
                background: copied === c.name ? 'rgba(200,169,110,0.15)' : 'none',
                border: 'none', cursor: 'pointer', fontSize: 10,
                color: copied === c.name ? 'var(--accent)' : 'var(--text-tertiary)',
                padding: '2px 6px', borderRadius: 4,
              }}>{copied === c.name ? '已复制' : '复制'}</button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>{c.text.slice(0, 60)}...</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 法律术语检查 ──────────────────────────────────────────
const RISK_TERMS = ['可能', '大概', '也许', '尽量', '争取', '视情况', '酌情'];
const VAGUE_TERMS = ['等', '若干', '相关', '适当'];

export const LegalCheckerPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const risks = RISK_TERMS.filter(t => content.includes(t));
  const vagueWords = VAGUE_TERMS.filter(t => content.includes(t));
  const total = risks.length + vagueWords.length;

  return (
    <div>
      <div style={label}>法律术语检查</div>
      <div style={{ ...card(), background: total === 0 ? 'rgba(82,201,122,0.06)' : 'rgba(200,169,110,0.06)', borderColor: total === 0 ? 'rgba(82,201,122,0.2)' : 'rgba(200,169,110,0.2)' }}>
        <div style={{ fontSize: 22, fontWeight: 300, color: total === 0 ? '#52c97a' : '#c8a96e' }}>{total}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{total === 0 ? '暂无风险词汇' : '处需关注'}</div>
      </div>
      {risks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#e8824a', marginBottom: 6 }}>⚠ 模糊承诺表达</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {risks.map(t => <span key={t} style={{ background: 'rgba(232,130,74,0.1)', color: '#e8824a', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{t}</span>)}
          </div>
        </div>
      )}
      {vagueWords.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#c8a96e', marginBottom: 6 }}>○ 模糊限定词</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {vagueWords.map(t => <span key={t} style={{ background: 'rgba(200,169,110,0.1)', color: '#c8a96e', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{t}</span>)}
          </div>
        </div>
      )}
      {content.length < 10 && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', opacity: 0.6 }}>打开文档后自动分析</div>
      )}
    </div>
  );
};

// ── 案件时间线 ────────────────────────────────────────────
export const CaseTimelinePlugin: React.FC = () => {
  const [events, setEvents] = useState([
    { id: '1', date: '2024-01-15', event: '合同签订', important: true },
    { id: '2', date: '2024-03-20', event: '争议发生', important: true },
    { id: '3', date: '2024-04-01', event: '律师介入', important: false },
  ]);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newEvent, setNewEvent] = useState('');

  const addEvent = () => {
    if (!newDate || !newEvent.trim()) return;
    setEvents(e => [...e, { id: Date.now().toString(), date: newDate, event: newEvent, important: false }]
      .sort((a, b) => a.date.localeCompare(b.date)));
    setAdding(false); setNewDate(''); setNewEvent('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={label}>案件时间线</div>
        <button style={btn(false, { padding: '3px 8px', fontSize: 11 })} onClick={() => setAdding(a => !a)}>+ 添加</button>
      </div>
      {adding && (
        <div style={{ ...card(), marginBottom: 10 }}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ ...inputStyle, marginBottom: 6 }} />
          <input value={newEvent} onChange={e => setNewEvent(e.target.value)} placeholder="事件描述"
            style={{ ...inputStyle, marginBottom: 8 }} />
          <button style={btn(true, { width: '100%' })} onClick={addEvent}>添加</button>
        </div>
      )}
      <div style={{ position: 'relative', paddingLeft: 16 }}>
        <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 1, background: 'var(--border)' }} />
        {events.map(e => (
          <div key={e.id} style={{ position: 'relative', paddingBottom: 12 }}>
            <div style={{
              position: 'absolute', left: -12, top: 4, width: 8, height: 8, borderRadius: '50%',
              background: e.important ? '#c8a96e' : 'var(--bg-surface3)',
              border: `1.5px solid ${e.important ? '#c8a96e' : 'var(--border)'}`,
            }} />
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{e.date}</div>
            <div style={{ fontSize: 12.5, color: e.important ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: e.important ? 500 : 400 }}>{e.event}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 教案规划器 ────────────────────────────────────────────
export const LessonPlannerPlugin: React.FC = () => {
  const [plan, setPlan] = useState({ subject: '', grade: '', duration: '45', objectives: '', keyPoints: '', activities: '' });

  const field = (key: keyof typeof plan, placeholder: string, rows = 1) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3 }}>{placeholder}</div>
      {rows === 1 ? (
        <input value={plan[key]} onChange={e => setPlan(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder} style={inputStyle} />
      ) : (
        <textarea value={plan[key]} onChange={e => setPlan(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder} rows={rows}
          style={{ ...inputStyle, resize: 'none' as const }} />
      )}
    </div>
  );

  const exportPlan = () => {
    const text = `# 教案\n\n**学科：** ${plan.subject}\n**年级：** ${plan.grade}\n**课时：** ${plan.duration} 分钟\n\n## 教学目标\n${plan.objectives}\n\n## 重难点\n${plan.keyPoints}\n\n## 教学活动\n${plan.activities}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div style={label}>教案规划</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>{field('subject', '学科')}</div>
        <div style={{ flex: 1 }}>{field('grade', '年级')}</div>
      </div>
      {field('objectives', '教学目标', 2)}
      {field('keyPoints', '重难点', 2)}
      {field('activities', '教学环节', 3)}
      <button style={btn(true, { width: '100%' })} onClick={exportPlan}>复制为 Markdown</button>
    </div>
  );
};

// ── 题目生成器 ────────────────────────────────────────────
export const QuizGeneratorPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const [quiz, setQuiz] = useState<{ q: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 8).slice(0, 5);
      const generated = sentences.map((s, i) => ({
        type: i % 2 === 0 ? '填空题' : '判断题',
        q: i % 2 === 0
          ? s.trim().replace(/[\u4e00-\u9fa5]{2,4}/, '____') + '。'
          : s.trim() + '。（对/错）',
      }));
      setQuiz(generated.length ? generated : [{ type: '提示', q: '请先在文档中写入内容，再生成题目' }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div>
      <div style={label}>题目生成</div>
      <button style={btn(true, { width: '100%', marginBottom: 10 })} onClick={generate} disabled={loading}>
        {loading ? '生成中...' : '从文档生成题目'}
      </button>
      {quiz.map((q, i) => (
        <div key={i} style={card()}>
          <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 4 }}>{q.type}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{i + 1}. {q.q}</div>
        </div>
      ))}
    </div>
  );
};

// ── 思维导图 ──────────────────────────────────────────────
export const MindmapPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const outline = React.useMemo(() => {
    if (!content) return [];
    return content.split('\n')
      .filter(l => l.startsWith('#'))
      .map(l => ({ level: l.match(/^#+/)?.[0].length || 1, text: l.replace(/^#+\s*/, '').trim() }))
      .slice(0, 12);
  }, [content]);

  if (outline.length === 0) return (
    <div>
      <div style={label}>思维导图</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>使用 # 标题构建思维导图</div>
    </div>
  );

  const colors = ['#c8a96e', '#7eb8e8', '#82c97a', '#e8824a', '#a87ed4'];

  return (
    <div>
      <div style={label}>思维导图</div>
      {outline.map((node, i) => {
        const indent = (node.level - 1) * 14;
        const color = colors[(node.level - 1) % colors.length];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: `4px 0 4px ${indent}px` }}>
            <div style={{ width: node.level === 1 ? 8 : 5, height: node.level === 1 ? 8 : 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: node.level === 1 ? 13 : 11.5, color: node.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: node.level === 1 ? 500 : 400 }}>
              {node.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── 病历模板 ──────────────────────────────────────────────
const MEDICAL_TEMPLATES = [
  { name: '门诊病历', icon: '🏥', template: `# 门诊病历\n\n**就诊日期：** \n**科室：** \n**主诉：** \n\n## 现病史\n\n\n## 既往史\n\n\n## 体格检查\n- 体温：℃　脉搏：次/分　呼吸：次/分　血压：mmHg\n\n## 辅助检查\n\n\n## 诊断\n\n\n## 治疗方案\n` },
  { name: '手术记录', icon: '⚕️', template: `# 手术记录\n\n**手术日期：** \n**手术名称：** \n**术者：** \n\n## 术前诊断\n\n## 术中所见\n\n## 手术经过\n\n## 术后诊断\n` },
  { name: '出院小结', icon: '📋', template: `# 出院小结\n\n**住院号：** \n**入院日期：** \n**出院日期：** \n\n## 入院诊断\n\n## 诊治经过\n\n## 出院诊断\n\n## 出院医嘱\n` },
];

export const MedicalTemplatePlugin: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (template: string, name: string) => {
    navigator.clipboard.writeText(template).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    });
  };
  return (
    <div>
      <div style={label}>病历模板</div>
      {MEDICAL_TEMPLATES.map(t => (
        <div key={t.name} style={card({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</span>
          </div>
          <button onClick={() => copy(t.template, t.name)} style={btn(false, { padding: '3px 10px', fontSize: 11 })}>
            {copied === t.name ? '✓ 已复制' : '插入'}
          </button>
        </div>
      ))}
    </div>
  );
};

// ── 药品速查 ──────────────────────────────────────────────
const DRUGS = [
  { name: '阿莫西林', dose: '0.5g 每8小时', contraindication: '青霉素过敏', category: '抗生素' },
  { name: '布洛芬', dose: '200-400mg 每4-6小时', contraindication: '消化道溃疡活动期', category: '解热镇痛' },
  { name: '二甲双胍', dose: '500-2000mg/日，随餐', contraindication: '肾功能不全', category: '降糖药' },
  { name: '阿托伐他汀', dose: '10-80mg 睡前', contraindication: '活动性肝病', category: '调脂药' },
  { name: '氨氯地平', dose: '5-10mg 每日一次', contraindication: '心源性休克', category: '降压药' },
  { name: '奥美拉唑', dose: '20-40mg 每日一次', contraindication: '与阿扎那韦合用', category: '抑酸药' },
];

export const DrugReferencePlugin: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof DRUGS[0] | null>(null);
  const filtered = DRUGS.filter(d => d.name.includes(search) || d.category.includes(search));

  return (
    <div>
      <div style={label}>药品速查</div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索药品名称或分类..."
        style={{ ...inputStyle, marginBottom: 8 }} />
      {selected ? (
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selected.name}</div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>推荐剂量</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{selected.dose}</div>
          <div style={{ fontSize: 10, color: '#e8824a', marginBottom: 2 }}>禁忌</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selected.contraindication}</div>
        </div>
      ) : (
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {filtered.map(d => (
            <div key={d.name} onClick={() => setSelected(d)} style={card({ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{d.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{d.category}</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ICD 编码查询 ──────────────────────────────────────────
const ICD_DATA = [
  { code: 'J18.9', name: '肺炎（未特指）', category: '呼吸系统' },
  { code: 'I10', name: '原发性高血压', category: '循环系统' },
  { code: 'E11.9', name: '2型糖尿病（不伴并发症）', category: '内分泌' },
  { code: 'K21.0', name: '胃食管反流病', category: '消化系统' },
  { code: 'M54.5', name: '下背痛', category: '肌肉骨骼' },
  { code: 'F32.9', name: '抑郁发作（未特指）', category: '精神障碍' },
];

export const ICDLookupPlugin: React.FC = () => {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = ICD_DATA.filter(d => d.code.includes(search) || d.name.includes(search));

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div>
      <div style={label}>ICD 编码查询</div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索疾病名称或编码..."
        style={{ ...inputStyle, marginBottom: 8 }} />
      {filtered.map(d => (
        <div key={d.code} style={card({ display: 'flex', alignItems: 'center', gap: 10 })}>
          <div style={{ background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 11.5, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>{d.code}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{d.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{d.category}</div>
          </div>
          <button onClick={() => copy(d.code)} style={btn(false, { padding: '2px 8px', fontSize: 10 })}>
            {copied === d.code ? '✓' : '复制'}
          </button>
        </div>
      ))}
    </div>
  );
};

// ── 可读性分析 ────────────────────────────────────────────
export const ReadabilityPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 2);
  const avgLen = sentences.length ? Math.round(sentences.reduce((a, s) => a + s.length, 0) / sentences.length) : 0;
  const longSentences = sentences.filter(s => s.length > 50).length;
  const score = Math.max(0, Math.min(100, 100 - longSentences * 5 - Math.max(0, avgLen - 20)));
  const scoreColor = score > 70 ? '#52c97a' : score > 40 ? '#c8a96e' : '#e8824a';
  const scoreLabel = score > 70 ? '易读' : score > 40 ? '中等' : '偏难';

  return (
    <div>
      <div style={label}>可读性分析</div>
      {content.length < 20 ? (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>打开文档后自动分析</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 300, color: scoreColor }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: scoreColor }}>{scoreLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>可读性评分</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: '句子数', value: sentences.length },
              { label: '平均句长', value: `${avgLen} 字` },
              { label: '长句占比', value: `${sentences.length ? Math.round(longSentences / sentences.length * 100) : 0}%` },
              { label: '总字数', value: content.replace(/\s/g, '').length },
            ].map(s => (
              <div key={s.label} style={{ ...card({ padding: '10px 12px', marginBottom: 0 }) }}>
                <div style={{ fontSize: 16, fontWeight: 300, color: 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── 人物关系追踪 ──────────────────────────────────────────
export const CharacterTrackerPlugin: React.FC = () => {
  const [chars, setChars] = useState([
    { id: '1', name: '主角', role: '主人公', color: '#c8a96e' },
    { id: '2', name: '配角', role: '助手', color: '#7eb8e8' },
  ]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const colors = ['#c8a96e', '#7eb8e8', '#82c97a', '#e8824a', '#a87ed4', '#e87a7a'];

  const add = () => {
    if (!name.trim()) return;
    const color = colors[chars.length % colors.length];
    setChars(c => [...c, { id: Date.now().toString(), name: name.trim(), role: role.trim(), color }]);
    setName(''); setRole('');
  };

  return (
    <div>
      <div style={label}>人物追踪</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="姓名" style={{ ...inputStyle, flex: 1 }} />
        <input value={role} onChange={e => setRole(e.target.value)} placeholder="角色" style={{ ...inputStyle, flex: 1 }} />
        <button style={btn(true, { padding: '6px 10px' })} onClick={add}>+</button>
      </div>
      {chars.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 500, flexShrink: 0 }}>
            {c.name.slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</div>
            {c.role && <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{c.role}</div>}
          </div>
          <button onClick={() => setChars(cs => cs.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 11 }}>✕</button>
        </div>
      ))}
    </div>
  );
};

// ── 文风检测 ──────────────────────────────────────────────
export const StyleCheckerPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const repeated = React.useMemo(() => {
    if (!content) return [];
    const words = content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const stopWords = new Set(['这个', '那个', '是的', '可以', '我们', '他们', '一个', '没有', '进行', '通过', '相关', '以及', '但是', '因为', '所以']);
    const freq: Record<string, number> = {};
    words.filter(w => !stopWords.has(w)).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).filter(([, c]) => c >= 3).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [content]);

  const passive = (content.match(/被/g) || []).length;

  return (
    <div>
      <div style={label}>文风检测</div>
      {content.length < 20 ? (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>打开文档后自动分析</div>
      ) : (
        <>
          <div style={card()}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>被动语态频率</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 6, flex: 1, background: 'var(--bg-surface3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, passive * 5)}%`, background: passive > 10 ? '#e8824a' : '#c8a96e', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 20 }}>{passive}</span>
            </div>
          </div>
          {repeated.length > 0 && (
            <div style={card()}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8 }}>高频词汇</div>
              {repeated.map(([w, c]) => (
                <div key={w} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>「{w}」</span>
                  <span style={{ fontSize: 12, color: 'var(--accent)' }}>×{c}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── 关键词提取 ────────────────────────────────────────────
export const KeywordExtractorPlugin: React.FC<{ content?: string }> = ({ content = '' }) => {
  const keywords = React.useMemo(() => {
    if (content.length < 30) return [];
    const words = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
    const stopWords = new Set(['这个', '那个', '是的', '可以', '我们', '他们', '一个', '没有', '进行', '通过', '相关', '以及', '但是', '因为', '所以']);
    const freq: Record<string, number> = {};
    words.filter(w => !stopWords.has(w)).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).filter(([, c]) => c >= 2).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [content]);

  return (
    <div>
      <div style={label}>关键词提取</div>
      {keywords.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>
          {content.length < 30 ? '文档内容不足，请继续写作' : '未找到高频关键词'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {keywords.map(([w, c]) => (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-surface2)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{w}</span>
              <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 5px', borderRadius: 10 }}>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 大纲助手 ──────────────────────────────────────────────
export const OutlineBuilderPlugin: React.FC = () => {
  const [sections, setSections] = useState([
    { id: '1', title: '引言', target: 500 },
    { id: '2', title: '文献综述', target: 2000 },
    { id: '3', title: '研究方法', target: 1500 },
    { id: '4', title: '结果与讨论', target: 2500 },
    { id: '5', title: '结论', target: 800 },
  ]);
  const total = sections.reduce((a, s) => a + s.target, 0);

  return (
    <div>
      <div style={label}>论文大纲</div>
      {sections.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600 }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{s.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>目标 {s.target} 字</div>
          </div>
          <input type="number" value={s.target}
            onChange={e => setSections(ss => ss.map(x => x.id === s.id ? { ...x, target: Math.max(0, Number(e.target.value)) } : x))}
            style={{ width: 56, padding: '3px 6px', background: 'var(--bg-surface3)', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', outline: 'none', fontFamily: 'inherit', textAlign: 'center' as const }} />
        </div>
      ))}
      <div style={{ ...card({ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', marginTop: 8 }) }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>总目标</span>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{total.toLocaleString()} 字</span>
      </div>
    </div>
  );
};
