import { FormEvent, useEffect, useMemo, useState } from 'react';
import logoUrl from './assets/logo.svg';

type Category = 'TRAVEL' | 'COOKING' | 'FITNESS' | 'FINANCE' | 'IT_TECH' | 'GAME' | 'EDUCATION' | 'HOBBY_DIY' | 'SELF_IMPROVEMENT' | 'ENTERTAINMENT' | 'FASHION_BEAUTY';
type Goal = 'VIEWS' | 'SUBSCRIBE' | 'ENGAGEMENT' | 'INFO' | 'CONVERSION' | 'BRANDING' | 'RETENTION';
type Status = 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED';
type InputForm = { title: string; category: Category; goal: Goal; topic: string; durationSec: 60; location: string; locationMood: string };
type Scene = { index: number; section: string; scene_type: string; time_range: string; duration_sec: number; title: string; description: string; direction: string; script: string };
type GeneratedPlan = { summary?: string; location_setting?: string; props?: string[]; equipment?: string[]; scenes?: Scene[]; full_script?: string };
type PlanSummary = { id: string; title: string; category: Category; status: Status; createdAt: string };
type PlanDetail = PlanSummary & { inputForm: InputForm; generatedPlan: GeneratedPlan; updatedAt: string };
type ApiResponse<T> = { status: number; data: T; error?: string };

const API = 'https://content-planner-api.kindglacier-476f4763.koreacentral.azurecontainerapps.io';
const categories: { value: Category; label: string; icon: string }[] = [
  { value: 'TRAVEL', label: '여행', icon: '✦' }, { value: 'COOKING', label: '요리', icon: '◒' }, { value: 'FITNESS', label: '운동', icon: '⌁' }, { value: 'FINANCE', label: '재테크', icon: '₩' },
  { value: 'IT_TECH', label: 'IT · 테크', icon: '⌘' }, { value: 'GAME', label: '게임', icon: '◈' }, { value: 'EDUCATION', label: '교육', icon: '◌' }, { value: 'HOBBY_DIY', label: '취미 · DIY', icon: '✎' },
  { value: 'SELF_IMPROVEMENT', label: '자기계발', icon: '↗' }, { value: 'ENTERTAINMENT', label: '엔터테인먼트', icon: '♡' }, { value: 'FASHION_BEAUTY', label: '패션 · 뷰티', icon: '✿' },
];
const goals: { value: Goal; label: string }[] = [
  { value: 'VIEWS', label: '조회수' }, { value: 'SUBSCRIBE', label: '구독자' }, { value: 'ENGAGEMENT', label: '참여 유도' }, { value: 'INFO', label: '정보 전달' }, { value: 'CONVERSION', label: '전환' }, { value: 'BRANDING', label: '브랜딩' }, { value: 'RETENTION', label: '시청 유지' },
];
const statusLabel: Record<Status, string> = { DRAFT: '초안', GENERATING: '생성 중', COMPLETED: '완성', FAILED: '실패' };
const emptyForm = (): InputForm => ({ title: '', category: 'SELF_IMPROVEMENT', goal: 'ENGAGEMENT', topic: '', durationSec: 60, location: '', locationMood: '' });
const categoryName = (value: Category) => categories.find((item) => item.value === value)?.label ?? value;

function Logo() { return <img className="brand-logo" src={logoUrl} alt="Swipsion AI" />; }
function Arrow() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>; }
function Sparkle() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z" /></svg>; }

export default function App() {
  const [form, setForm] = useState<InputForm>(emptyForm);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selected, setSelected] = useState<PlanDetail | null>(null);
  const [token, setToken] = useState(() => localStorage.getItem('swipsion-token') ?? '');
  const [username, setUsername] = useState(() => localStorage.getItem('swipsion-username') ?? '');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [auth, setAuth] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [sceneIndex, setSceneIndex] = useState(0);
  const valid = useMemo(() => Boolean(form.title.trim() && form.topic.trim()), [form]);
  const setField = <K extends keyof InputForm>(key: K, value: InputForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const api = async <T,>(path: string, options: RequestInit = {}, accessToken = token) => {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...options.headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) } });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(body?.error ?? '요청을 처리하지 못했습니다.');
    return body as ApiResponse<T>;
  };
  const loadPlans = async () => {
    if (!token) return;
    try { const result = await api<PlanSummary[]>('/api/plans?pageable=%7B%22page%22%3A0%2C%22size%22%3A30%7D'); setPlans(result.data ?? []); }
    catch (error) { setNotice(error instanceof Error ? error.message : '기획안을 불러오지 못했습니다.'); }
  };
  useEffect(() => { void loadPlans(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const generatePlan = async () => {
    if (!token) { setAuthOpen(true); setAuthNotice('기획안을 생성하고 저장하려면 먼저 로그인해 주세요.'); return; }
    if (!valid) { setNotice('콘텐츠 제목과 주제를 입력해 주세요.'); return; }
    setBusy(true); setNotice('Swipsion AI가 콘텐츠 설계서를 만들고 있어요.');
    try {
      const result = await api<PlanDetail>('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputForm: form }) });
      setSelected(result.data); setSceneIndex(0); setPlans((items) => [result.data, ...items.filter((item) => item.id !== result.data.id)]); setNotice('콘텐츠 설계서가 완성됐어요.');
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { setNotice(error instanceof Error ? error.message : '기획안 생성에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  const openPlan = async (id: string) => {
    setBusy(true);
    try { const result = await api<PlanDetail>(`/api/plans/${id}`); setSelected(result.data); setSceneIndex(0); document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (error) { setNotice(error instanceof Error ? error.message : '기획안을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const deletePlan = async () => {
    if (!selected || !window.confirm('이 기획안을 삭제할까요?')) return;
    try { await api(`/api/plans/${selected.id}`, { method: 'DELETE' }); setPlans((items) => items.filter((item) => item.id !== selected.id)); setSelected(null); setNotice('기획안을 삭제했습니다.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : '기획안을 삭제하지 못했습니다.'); }
  };
  const authenticate = async (event: FormEvent) => {
    event.preventDefault(); setAuthNotice('');
    if (authMode === 'signup' && !/^[a-zA-Z0-9_]{3,20}$/.test(auth.username)) { setAuthNotice('아이디는 영문, 숫자, 밑줄(_)만 사용해 3~20자로 입력해 주세요.'); return; }
    if (authMode === 'signup' && (auth.password.length < 8 || auth.password.length > 64)) { setAuthNotice('비밀번호는 8~64자로 입력해 주세요.'); return; }
    setAuthBusy(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auth) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error ?? '인증에 실패했습니다.');
      if (authMode === 'signup') { setAuthMode('login'); setAuth((value) => ({ ...value, password: '' })); setAuthNotice('가입이 완료됐어요. 비밀번호를 입력해 로그인해 주세요.'); return; }
      localStorage.setItem('swipsion-token', data.data.accessToken); localStorage.setItem('swipsion-username', auth.username); setToken(data.data.accessToken); setUsername(auth.username); setAuthOpen(false); setNotice(`${auth.username}님, 반가워요.`);
    } catch (error) { setAuthNotice(error instanceof Error ? error.message : '인증에 실패했습니다.'); }
    finally { setAuthBusy(false); }
  };
  const signOut = () => { localStorage.removeItem('swipsion-token'); localStorage.removeItem('swipsion-username'); setToken(''); setUsername(''); setPlans([]); setSelected(null); };
  const generated = selected?.generatedPlan;
  const scenes = generated?.scenes ?? [];
  const activeScene = scenes[sceneIndex];

  return <div className="swipsion-app">
    <header className="topbar"><a href="#top" className="wordmark"><Logo /><span>Swipsion <b>AI</b></span></a><nav><a href="#create">새 기획</a><a href="#library">내 기획안</a></nav>{token ? <div className="user-tools"><span>{username}</span><button onClick={signOut}>로그아웃</button></div> : <button className="login-button" onClick={() => { setAuthNotice(''); setAuthOpen(true); }}>로그인 <Arrow /></button>}</header>
    <main id="top"><section className="hero"><div className="hero-shape shape-a" /><div className="hero-shape shape-b" /><div className="hero-shape shape-c" /><p className="eyebrow"><Sparkle /> AI CONTENT PLANNER</p><h1>당신의 한 문장이<br /><em>다음 콘텐츠가 돼요.</em></h1><p>아이디어만 들려주세요. Swipsion AI가 시청자의 마음을 움직이는 콘텐츠 설계서로 바꿔 드릴게요.</p><a href="#create" className="hero-button">기획 시작하기 <Arrow /></a></section>
      <section id="create" className="planner"><div className="section-head"><div><p className="eyebrow">CREATE WITH AI</p><h2>무엇을 이야기하고 싶나요?</h2><span>몇 가지 정보만 알려주시면 콘텐츠의 구조와 장면별 대본까지 설계해 드려요.</span></div><b>01 <i /> 02</b></div><div className="planner-grid"><div className="form-card"><Field label="콘텐츠 제목" required><input value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="예: 퇴근 후 1시간, 나를 위한 저녁 루틴" /></Field><Field label="카테고리" required><div className="category-grid">{categories.map((category) => <button type="button" key={category.value} onClick={() => setField('category', category.value)} className={form.category === category.value ? 'selected' : ''}><i>{category.icon}</i><span>{category.label}</span></button>)}</div></Field><Field label="영상 목표" required><div className="goal-grid">{goals.map((goal) => <button type="button" key={goal.value} onClick={() => setField('goal', goal.value)} className={form.goal === goal.value ? 'selected' : ''}>{goal.label}</button>)}</div></Field><Field label="콘텐츠 주제" required><textarea value={form.topic} onChange={(event) => setField('topic', event.target.value)} placeholder="전하고 싶은 이야기와 시청자가 얻어갈 경험을 자유롭게 적어 주세요." /></Field><details><summary>촬영 조건을 더 설정할래요 <span>+</span></summary><div className="detail-grid"><Field label="촬영 장소"><input value={form.location} onChange={(event) => setField('location', event.target.value)} placeholder="예: 집, 카페, 야외" /></Field><Field label="원하는 분위기"><input value={form.locationMood} onChange={(event) => setField('locationMood', event.target.value)} placeholder="예: 따뜻하고 차분한 무드" /></Field></div></details><button className="generate-button" disabled={busy} onClick={generatePlan}><Sparkle /> {busy ? '설계서를 만들고 있어요…' : 'AI 콘텐츠 설계하기'} <Arrow /></button>{notice && <p className="notice">{notice}</p>}</div><aside className="guide-card"><p>YOUR PLAN INCLUDES</p><div className="guide-mark"><Logo /></div><h3>하나의 아이디어가<br />완성도 높은 콘텐츠로</h3><ul><li><b>01</b> 콘텐츠 핵심 메시지</li><li><b>02</b> 장면별 타임라인</li><li><b>03</b> 촬영 · 연출 가이드</li><li><b>04</b> 전체 내레이션 대본</li></ul></aside></div></section>
      <section id="result" className="result-area">{selected ? <><div className="result-head"><div><p className="eyebrow">CONTENT BLUEPRINT</p><h2>{selected.title}</h2><p>{generated?.summary ?? '생성된 콘텐츠 설계서'}</p></div><div><span className={`status ${selected.status.toLowerCase()}`}>{statusLabel[selected.status]}</span><button className="delete-button" onClick={deletePlan}>삭제</button></div></div><div className="facts"><Fact label="카테고리" value={categoryName(selected.category)} /><Fact label="촬영 설정" value={generated?.location_setting || selected.inputForm.location || '자유 설정'} /><Fact label="준비물" value={generated?.props?.join(' · ') || '별도 소품 없음'} /><Fact label="장비" value={generated?.equipment?.join(' · ') || '스마트폰 촬영'} /></div>{scenes.length ? <div className="timeline"><div className="scene-list">{scenes.map((scene, index) => <button key={`${scene.index}-${scene.title}`} className={sceneIndex === index ? 'active' : ''} onClick={() => setSceneIndex(index)}><b>{String(index + 1).padStart(2, '0')}</b><span>{scene.section}</span><small>{scene.time_range}</small></button>)}</div><article className="scene-content"><div className="scene-meta"><span>{activeScene?.scene_type}</span><span>{activeScene?.time_range} · {activeScene?.duration_sec}초</span></div><h3>{activeScene?.title}</h3><p>{activeScene?.description}</p><div className="scene-box"><b>촬영 · 연출</b><p>{activeScene?.direction}</p></div><div className="scene-box script"><b>대본</b><p>“{activeScene?.script}”</p></div></article></div> : <div className="pending-result">생성 결과를 준비 중이에요. 잠시 후 목록에서 다시 열어 보세요.</div>}<article className="full-script"><p>FULL SCRIPT</p><h3>전체 대본</h3><div>{generated?.full_script || '전체 대본이 준비되면 이곳에 표시됩니다.'}</div></article></> : <div className="empty-result"><span><Sparkle /></span><h2>아직 시작하지 않은<br />이야기가 기다리고 있어요.</h2><p>콘텐츠 정보를 입력하고 첫 번째 설계서를 만들어 보세요.</p></div>}</section>
      <section id="library" className="library"><div className="library-head"><div><p className="eyebrow">MY LIBRARY</p><h2>내 콘텐츠 기획안</h2></div>{token && <button onClick={loadPlans}>새로고침 <Arrow /></button>}</div>{plans.length ? <div className="plan-list">{plans.map((plan, index) => <button key={plan.id} onClick={() => openPlan(plan.id)}><b>{String(index + 1).padStart(2, '0')}</b><div><span>{categoryName(plan.category)}</span><h3>{plan.title}</h3><p>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(plan.createdAt))}</p></div><em className={plan.status.toLowerCase()}>{statusLabel[plan.status]}</em><Arrow /></button>)}</div> : <div className="library-empty"><Logo /><p>{token ? '아직 만든 콘텐츠 기획안이 없어요.' : '로그인하면 만든 콘텐츠 기획안을 이곳에서 다시 볼 수 있어요.'}</p></div>}</section></main>
    {authOpen && <div className="modal-backdrop" onMouseDown={() => setAuthOpen(false)}><form className="auth-modal" onSubmit={authenticate} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setAuthOpen(false)}>×</button><Logo /><h2>{authMode === 'login' ? '다시 만나 반가워요.' : '새로운 이야기를 시작해요.'}</h2><p>{authMode === 'login' ? '로그인하고 나만의 콘텐츠 기획안을 저장하세요.' : '아이디와 비밀번호로 계정을 만들어 주세요.'}</p><label>아이디<input value={auth.username} onChange={(event) => setAuth((value) => ({ ...value, username: event.target.value }))} placeholder={authMode === 'signup' ? '영문·숫자·_ 3~20자' : '아이디 입력'} required /></label><label>비밀번호<input type="password" value={auth.password} onChange={(event) => setAuth((value) => ({ ...value, password: event.target.value }))} placeholder={authMode === 'signup' ? '8~64자 입력' : '비밀번호 입력'} required /></label>{authNotice && <p className="auth-notice">{authNotice}</p>}<button className="auth-submit" disabled={authBusy}>{authBusy ? '처리 중…' : authMode === 'login' ? '로그인' : '회원가입'}</button><button type="button" className="switch-mode" onClick={() => { setAuthMode((current) => current === 'login' ? 'signup' : 'login'); setAuthNotice(''); }}>{authMode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}</button></form></div>}
    <footer><a href="#top" className="wordmark"><Logo /><span>Swipsion <b>AI</b></span></a><p>Swipe into your next story.</p></footer>
  </div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="field"><label>{label}{required && <b> *</b>}</label>{children}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
