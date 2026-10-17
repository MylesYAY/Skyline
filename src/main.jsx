import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './agent.css';

const FEEDS = [
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' }
];

const FALLBACK = [
  { title: 'Apple is shaping the next generation of personal computing', source: 'The Verge', brand: 'apple', time: '12 min ago', link: 'https://www.theverge.com/apple' },
  { title: 'Google brings its latest AI features to more everyday tools', source: 'TechCrunch', brand: 'google', time: '28 min ago', link: 'https://techcrunch.com/tag/google/' },
  { title: 'Microsoft reveals a quieter, more capable Windows experience', source: 'Ars Technica', brand: 'microsoft', time: '41 min ago', link: 'https://arstechnica.com/microsoft/' },
  { title: 'The tiny hardware ideas changing how we work and play', source: 'The Verge', brand: 'other', time: '1 hr ago', link: 'https://www.theverge.com/tech' },
  { title: 'A new wave of creators is building on the open web', source: 'TechCrunch', brand: 'other', time: '2 hrs ago', link: 'https://techcrunch.com/' },
  { title: 'Apple developers are refining the details that matter most', source: 'Ars Technica', brand: 'apple', time: '2 hrs ago', link: 'https://arstechnica.com/apple/' },
  { title: 'Google’s next hardware cycle is already taking shape', source: 'The Verge', brand: 'google', time: '3 hrs ago', link: 'https://www.theverge.com/google' },
  { title: 'Microsoft’s cloud ambitions meet a changing workplace', source: 'TechCrunch', brand: 'microsoft', time: '3 hrs ago', link: 'https://techcrunch.com/tag/microsoft/' },
  { title: 'The internet is rethinking the gadgets we keep close', source: 'Ars Technica', brand: 'other', time: '4 hrs ago', link: 'https://arstechnica.com/gadgets/' },
  { title: 'What the next generation of AI tools means for everyone', source: 'The Verge', brand: 'other', time: '5 hrs ago', link: 'https://www.theverge.com/ai-artificial-intelligence' }
];

const filters = [
  { id: 'all', label: 'All signal' }, { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' }, { id: 'microsoft', label: 'Microsoft' }, { id: 'other', label: 'Other' }
];

const WALLPAPERS = [
  'abstract-swirls.jpg', 'aesthetic.jpg', 'artificial-valley.jpg', 'bars.jpg', 'cartoon-castle.png',
  'dark-waves.jpg', 'disco.png', 'droplets.png', 'galaxy-waves.jpg', 'minimalist-black-hole.png',
  'paint.jpg', 'painting.jpg', 'painting-standing.jpg', 'pixel-earth.png', 'swirls.jpg', 'swirly-painting.jpg',
  'trippy-purple.png', 'waves.png'
].map(name => `https://raw.githubusercontent.com/SleepyCatHey/CozyPixels/main/Catppuccin/Abstract%20%26%20Artistic/${name}`);

function brandFor(text) {
  const t = text.toLowerCase();
  if (/(apple|iphone|ipad|macbook|mac |ios|watchos)/.test(t)) return 'apple';
  if (/(google|android|pixel|gemini|youtube|chrome)/.test(t)) return 'google';
  if (/(microsoft|windows|xbox|surface|azure|copilot)/.test(t)) return 'microsoft';
  return 'other';
}

function timeAgo(date) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

function clean(text = '') { return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim(); }

function App() {
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [stories, setStories] = useState(FALLBACK);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessages, setAgentMessages] = useState([{ role: 'assistant', content: 'I’m Signal. Ask me to make sense of today’s tech stories.' }]);
  const [draft, setDraft] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [wallpaperIndex, setWallpaperIndex] = useState(() => Math.floor(Math.random() * WALLPAPERS.length));

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const timer = setInterval(() => setWallpaperIndex(current => (current + 1) % WALLPAPERS.length), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.allSettled(FEEDS.map(async feed => {
      const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('feed unavailable');
      return data.items.slice(0, 8).map(item => ({
        title: clean(item.title), source: feed.name, link: item.link,
        time: timeAgo(item.pubDate), brand: brandFor(`${item.title} ${item.description || ''}`),
        description: clean(item.description || item.content || '')
      }));
    })).then(results => {
      const live = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
      if (alive && live.length) setStories(live);
    }).catch(() => {}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const visibleStories = useMemo(() => filter === 'all' ? stories : stories.filter(s => s.brand === filter), [stories, filter]);
  const dateText = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const timeText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  async function askSignal(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || agentBusy) return;
    const nextMessages = [...agentMessages, { role: 'user', content: question }];
    setAgentMessages(nextMessages); setDraft(''); setAgentBusy(true);
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!key) {
      setAgentMessages([...nextMessages, { role: 'assistant', content: 'Add your key to .env as VITE_OPENROUTER_API_KEY, then restart the app and I’ll be ready.' }]);
      setAgentBusy(false); return;
    }
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'Skyline Signal' },
        body: JSON.stringify({ model: 'openrouter/free', max_tokens: 250, messages: [
          { role: 'system', content: 'You are Signal, a compact, thoughtful tech-news companion. Reply in 2–4 short sentences. Use the supplied current feed as context when useful. Do not invent facts.' },
          { role: 'system', content: `Current headlines: ${stories.slice(0, 12).map(s => `[${s.source}] ${s.title}`).join(' | ')}` },
          ...nextMessages
        ] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Signal is temporarily unavailable.');
      setAgentMessages([...nextMessages, { role: 'assistant', content: data.choices?.[0]?.message?.content || 'I could not form a response just now.' }]);
    } catch (error) {
      setAgentMessages([...nextMessages, { role: 'assistant', content: error.message || 'Something interrupted the signal. Please try again.' }]);
    } finally { setAgentBusy(false); }
  }

  return <main className="app">
    <div key={wallpaperIndex} className="wallpaper" style={{ backgroundImage: `url("${WALLPAPERS[wallpaperIndex]}")` }} />
    <div className="wash" />
    <div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
    <header className="topbar"><span className="wordmark">SKYLINE / HELIUM</span><span className="status"><i /> LIVE FEED</span></header>
    <section className="hero"><div className="clock" aria-label="Current time"><p>{dateText}</p><h1>{timeText}</h1><span>LOCAL TIME</span><form className="search" action="https://duckduckgo.com/" method="get"><input name="q" aria-label="Search DuckDuckGo" placeholder="Search the web..." autoComplete="off"/><button type="submit">SEARCH ↗</button></form><b className="scroll-cue">SCROLL TO EXPLORE ↓</b></div></section>
    <section className="feed-panel">
      <div className="feed-head"><div><p className="eyebrow">THE DAILY SIGNAL</p><h2>Tech, at a glance.</h2></div><span className="story-count">{loading ? 'TUNING IN...' : `${visibleStories.length} STORIES`}</span></div>
      <nav className="filters" aria-label="News filters">{filters.map(item => <button key={item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</nav>
      <div className="story-rail">{visibleStories.map((story, i) => <article className="story" style={{ '--i': i }} key={`${story.link}-${i}`} onClick={() => setActive(story)} tabIndex="0" onKeyDown={e => e.key === 'Enter' && setActive(story)}>
        <div className="story-meta"><span className={`dot ${story.brand}`} /> {story.source}<time>{story.time}</time></div><h3>{story.title}</h3><span className="read">EXPAND <b>↗</b></span>
      </article>)}
      {!visibleStories.length && <div className="empty">No stories found for this signal.</div>}</div>
      <p className="wallpaper-credit">Wallpapers: <a href="https://github.com/SleepyCatHey/CozyPixels/tree/main/Catppuccin/Abstract%20%26%20Artistic" target="_blank" rel="noreferrer">CozyPixels by Sam / SleepyCatHey</a> · MIT License</p>
    </section>
    {active && <div className="modal-backdrop" onClick={() => setActive(null)}><article className="modal" onClick={e => e.stopPropagation()}>
      <button className="close" onClick={() => setActive(null)} aria-label="Close article">×</button><div className="story-meta"><span className={`dot ${active.brand}`} /> {active.source}<time>{active.time}</time></div><h2>{active.title}</h2><p>{active.description || 'Open the original report to read the full story.'}</p><a href={active.link} target="_blank" rel="noreferrer">OPEN ORIGINAL SOURCE <span>↗</span></a>
    </article></div>}
    <button className="signal-button" onClick={() => setAgentOpen(true)} aria-label="Open Signal AI assistant"><span>✦</span> ASK SIGNAL</button>
    {agentOpen && <div className="agent-backdrop" onClick={() => setAgentOpen(false)}><section className="agent" onClick={e => e.stopPropagation()}>
      <header><div><p>AI NEWS COMPANION</p><h2>Signal</h2></div><button onClick={() => setAgentOpen(false)} aria-label="Close Signal">×</button></header>
      <div className="agent-messages">{agentMessages.map((message, i) => <p key={i} className={message.role}>{message.content}</p>)}{agentBusy && <p className="assistant thinking">READING THE SIGNAL...</p>}</div>
      <form onSubmit={askSignal}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask about the feed..." aria-label="Ask Signal" /><button disabled={agentBusy}>{agentBusy ? '...' : '↗'}</button></form>
    </section></div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
