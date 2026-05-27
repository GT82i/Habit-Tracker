import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://teadjcpdyeoryhzhxfpq.supabase.co";
const SUPABASE_KEY = "sb_publishable_WywHWRKIL5kfJ8I05oUpfA_z0Yv02w4";

const DEFAULT_HABITS = [
  { id: "exercise", name: "Exercise", icon: "◉", color: "#E8654A", description: "Move your body",   logFields: ["duration", "intensity", "note"] },
  { id: "sleep",    name: "Sleep 8h", icon: "◐", color: "#7B68EE", description: "Rest & recover",   logFields: ["hours", "quality", "note"] },
  { id: "eat",      name: "Eat Healthy", icon: "◆", color: "#4CAF82", description: "Nourish yourself", logFields: ["meals", "note"] },
  { id: "journal",  name: "Journal",  icon: "◈", color: "#E8A44A", description: "Reflect & grow",   logFields: ["duration", "note"] },
  { id: "meditate", name: "Meditate", icon: "○", color: "#5BC0EB", description: "Find stillness",   logFields: ["duration", "note"] },
  { id: "water",    name: "Hydrate",  icon: "◑", color: "#4A90D9", description: "Drink 8 glasses",  logFields: ["glasses", "note"] },
];

const MOODS  = [
  { value:1, emoji:"😞", label:"Rough", color:"#E85454" },
  { value:2, emoji:"😕", label:"Meh",   color:"#E8A44A" },
  { value:3, emoji:"😐", label:"Okay",  color:"#7A7490" },
  { value:4, emoji:"🙂", label:"Good",  color:"#5BC0EB" },
  { value:5, emoji:"😄", label:"Great", color:"#4CAF82" },
];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ICONS  = ["◉","◐","◆","◈","○","◑","◇","△","□","★","♦","●"];
const COLORS = ["#E8654A","#7B68EE","#4CAF82","#E8A44A","#5BC0EB","#4A90D9","#E8748A","#9B8EA8","#66B2A4","#D4A853"];

async function dbGet(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/habit_data?id=eq.${id}&select=data`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await res.json();
  return rows?.[0]?.data ?? null;
}

async function dbSet(id, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/habit_data?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function isToday(date)  { return dateKey(date) === dateKey(new Date()); }
function isFuture(date) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return d > t;
}
function getWeekDates(offset = 0) {
  const today = new Date(), dow = today.getDay(), start = new Date(today);
  start.setDate(today.getDate() - dow + offset * 7);
  return Array.from({length:7}, (_, i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
}

function LogModal({ habit, dateStr, existing, onSave, onClose }) {
  const [data, setData] = useState(existing || {});
  const FIELD_META = {
    duration:  { label:"Duration",         placeholder:"e.g. 30 min",          type:"text" },
    intensity: { label:"Intensity",        placeholder:"Low / Med / High",      type:"text" },
    hours:     { label:"Hours slept",      placeholder:"e.g. 7.5",              type:"number" },
    quality:   { label:"Sleep quality",    placeholder:"1–10",                  type:"number" },
    meals:     { label:"Meals logged",     placeholder:"e.g. 3 balanced meals", type:"text" },
    glasses:   { label:"Glasses of water", placeholder:"e.g. 8",               type:"number" },
    note:      { label:"Note",             placeholder:"Anything to remember…", type:"textarea" },
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#1A1830",borderRadius:"20px 20px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:520,boxShadow:"0 -20px 60px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:22,color:habit.color}}>{habit.icon}</span>
          <div><div style={{fontSize:16}}>{habit.name}</div><div style={{fontSize:11,color:"#7A7490"}}>{dateStr}</div></div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",color:"#7A7490",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {(habit.logFields||["note"]).map(f => {
          const m = FIELD_META[f] || {label:f,placeholder:"",type:"text"};
          return (
            <div key={f} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{m.label}</div>
              {m.type==="textarea"
                ? <textarea value={data[f]||""} onChange={e=>setData({...data,[f]:e.target.value})} placeholder={m.placeholder} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#E8E4DC",fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"Georgia,serif"}}/>
                : <input value={data[f]||""} onChange={e=>setData({...data,[f]:e.target.value})} placeholder={m.placeholder} type={m.type} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#E8E4DC",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"Georgia,serif"}}/>
              }
            </div>
          );
        })}
        <button onClick={()=>onSave(data)} style={{width:"100%",padding:"13px",marginTop:8,borderRadius:10,background:habit.color,color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontFamily:"Georgia,serif"}}>Save Log</button>
      </div>
    </div>
  );
}

export default function HabitTracker() {
  const [habits,      setHabits]      = useState(DEFAULT_HABITS);
  const [completions, setCompletions] = useState({});
  const [logs,        setLogs]        = useState({});
  const [moods,       setMoods]       = useState({});
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [weekDates,   setWeekDates]   = useState(getWeekDates(0));
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [view,        setView]        = useState("week");
  const [showAdd,     setShowAdd]     = useState(false);
  const [newHabit,    setNewHabit]    = useState({name:"",icon:"◇",color:"#9B8EA8",description:"",logFields:["note"]});
  const [logModal,    setLogModal]    = useState(null);
  const [streaks,     setStreaks]     = useState({});
  const [toast,       setToast]       = useState(null);
  const [error,       setError]       = useState(null);
  const longPress = useRef(null);

  useEffect(() => { setWeekDates(getWeekDates(weekOffset)); }, [weekOffset]);

  useEffect(() => {
    async function load() {
      try {
        const [h, c, l, m] = await Promise.all([
          dbGet("habits"), dbGet("completions"), dbGet("logs"), dbGet("moods")
        ]);
        if (h && Array.isArray(h) && h.length > 0) setHabits(h);
        if (c && typeof c === "object") setCompletions(c);
        if (l && typeof l === "object") setLogs(l);
        if (m && typeof m === "object") setMoods(m);
      } catch(e) {
        setError("Could not connect to Supabase. Check your internet connection.");
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const s = {};
    habits.forEach(h => {
      let streak = 0; const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(today.getDate()-i);
        if (completions[dateKey(d)]?.[h.id]) streak++; else break;
      }
      s[h.id] = streak;
    });
    setStreaks(s);
  }, [completions, habits]);

  const persist = useCallback(async (key, val) => {
    setSaving(true);
    try { await dbSet(key, val); }
    catch(e) { showToast("⚠️ Sync failed"); }
    setSaving(false);
  }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleHabitTap = (habitId, date) => {
    if (isFuture(date)) return;
    const key = dateKey(date);
    const newVal = !completions[key]?.[habitId];
    const updated = {...completions, [key]: {...completions[key], [habitId]: newVal}};
    setCompletions(updated);
    persist("completions", updated);
    if (newVal) showToast("✓ Saved!");
  };

  const handleLongPress = (habit, date) => { if (!isFuture(date)) setLogModal({habit, date}); };

  const saveLog = (habitId, date, data) => {
    const key = dateKey(date);
    const updC = {...completions, [key]: {...completions[key], [habitId]: true}};
    setCompletions(updC); persist("completions", updC);
    const updL = {...logs, [key]: {...logs[key], [habitId]: data}};
    setLogs(updL); persist("logs", updL);
    setLogModal(null); showToast("Details saved!");
  };

  const setMood = (date, val) => {
    const key = dateKey(date);
    const updated = {...moods, [key]: val};
    setMoods(updated); persist("moods", updated);
  };

  const addHabit = () => {
    if (!newHabit.name.trim()) return;
    const h = {id: Date.now().toString(), ...newHabit};
    const updated = [...habits, h];
    setHabits(updated); persist("habits", updated);
    setNewHabit({name:"",icon:"◇",color:"#9B8EA8",description:"",logFields:["note"]});
    setShowAdd(false); showToast("Habit added!");
  };

  const removeHabit = id => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated); persist("habits", updated);
  };

  const getTodayScore = () => {
    const key = dateKey(new Date());
    const done = habits.filter(h => completions[key]?.[h.id]).length;
    return {done, total: habits.length, pct: habits.length ? Math.round(done/habits.length*100) : 0};
  };

  const getWeeklyRate = habitId => {
    const past = getWeekDates(0).filter(d => !isFuture(d));
    const done = past.filter(d => completions[dateKey(d)]?.[habitId]).length;
    return past.length ? Math.round(done/past.length*100) : 0;
  };

  const getMoodHistory = () =>
    Array.from({length:14}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate()-13+i);
      return {date:d, key:dateKey(d), val:moods[dateKey(d)]};
    });

  const score = getTodayScore();
  const todayMood = moods[dateKey(new Date())];

  if (loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0F0E17",color:"#E8E4DC",fontFamily:"Georgia,serif",gap:16,padding:32,textAlign:"center"}}>
      <div style={{fontSize:32}}>📊</div>
      <div style={{fontSize:16}}>Loading your habits…</div>
      <div style={{fontSize:12,color:"#7A7490"}}>Connecting to Supabase</div>
    </div>
  );

  if (error) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0F0E17",color:"#E8E4DC",fontFamily:"Georgia,serif",gap:16,padding:32,textAlign:"center"}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontSize:15,color:"#E8654A"}}>{error}</div>
      <button onClick={()=>window.location.reload()} style={{marginTop:8,padding:"10px 24px",borderRadius:20,background:"#7B68EE",color:"#fff",border:"none",cursor:"pointer",fontFamily:"Georgia,serif"}}>Retry</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0F0E17",color:"#E8E4DC",fontFamily:"Georgia,serif",paddingBottom:60}}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        button:active{opacity:0.75}
      `}</style>

      {toast && <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#2A2840",color:"#E8E4DC",padding:"10px 24px",borderRadius:40,zIndex:999,fontSize:13,border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"fadeIn 0.2s ease",whiteSpace:"nowrap"}}>{toast}</div>}
      {logModal && <LogModal habit={logModal.habit} dateStr={dateKey(logModal.date)} existing={logs[dateKey(logModal.date)]?.[logModal.habit.id]} onSave={d=>saveLog(logModal.habit.id,logModal.date,d)} onClose={()=>setLogModal(null)}/>}

      <div style={{padding:"40px 24px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:11,letterSpacing:"0.2em",color:"#7A7490",textTransform:"uppercase",marginBottom:6}}>
                {DAYS[new Date().getDay()]}, {MONTHS[new Date().getMonth()]} {new Date().getDate()}
              </div>
              <h1 style={{margin:0,fontSize:28,fontWeight:"normal",letterSpacing:"-0.02em"}}>Daily Habits</h1>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:36,lineHeight:1,color:score.pct===100?"#4CAF82":"#E8E4DC"}}>{score.pct}<span style={{fontSize:16,color:"#7A7490"}}>%</span></div>
              <div style={{fontSize:11,color:"#7A7490",marginTop:2}}>{score.done}/{score.total} done</div>
            </div>
          </div>
          <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden",marginTop:14}}>
            <div style={{height:"100%",width:`${score.pct}%`,background:score.pct===100?"#4CAF82":"#7B68EE",borderRadius:2,transition:"width 0.5s ease"}}/>
          </div>
          <div style={{marginTop:18,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>Today's mood</span>
            <div style={{display:"flex",gap:6,marginLeft:4}}>
              {MOODS.map(m => (
                <button key={m.value} onClick={()=>setMood(new Date(),m.value)} title={m.label} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",opacity:todayMood===m.value?1:0.3,transform:todayMood===m.value?"scale(1.25)":"scale(1)",transition:"all 0.15s ease"}}>{m.emoji}</button>
              ))}
            </div>
            {todayMood && <span style={{fontSize:12,color:MOODS.find(m=>m.value===todayMood)?.color}}>{MOODS.find(m=>m.value===todayMood)?.label}</span>}
          </div>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"16px 24px 0",display:"flex",gap:8,alignItems:"center"}}>
        {["week","stats"].map(v => (
          <button key={v} onClick={()=>setView(v)} style={{padding:"6px 18px",borderRadius:40,border:"1px solid rgba(255,255,255,0.1)",background:view===v?"#2A2840":"transparent",color:view===v?"#E8E4DC":"#7A7490",fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer"}}>{v}</button>
        ))}
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:saving?"#E8A44A":"#3A3656"}}>{saving?"⟳ saving…":"● synced"}</span>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"20px 24px 0"}}>
        {view==="week" && <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:"none",border:"none",color:"#7A7490",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>←</button>
            <span style={{fontSize:12,color:"#7A7490",letterSpacing:"0.1em"}}>{weekOffset===0?"THIS WEEK":weekOffset===-1?"LAST WEEK":`${Math.abs(weekOffset)} WEEKS AGO`}</span>
            <button onClick={()=>setWeekOffset(w=>Math.min(0,w+1))} style={{background:"none",border:"none",color:weekOffset>=0?"#3A3656":"#7A7490",fontSize:20,cursor:weekOffset>=0?"default":"pointer",padding:"4px 8px"}}>→</button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr repeat(7, 36px)",gap:4,marginBottom:14,padding:"8px 4px",background:"rgba(255,255,255,0.02)",borderRadius:12}}>
            <div style={{fontSize:10,color:"#7A7490",display:"flex",alignItems:"center",paddingLeft:8,letterSpacing:"0.05em"}}>MOOD</div>
            {weekDates.map(d => {
              const key=dateKey(d), mv=moods[key], future=isFuture(d), mood=MOODS.find(m=>m.value===mv);
              return (
                <div key={key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontSize:9,color:isToday(d)?"#7B68EE":"#4A4560",textTransform:"uppercase"}}>{DAYS[d.getDay()].slice(0,1)}</div>
                  <div style={{position:"relative"}}>
                    <select value={mv||""} onChange={e=>!future&&setMood(d,Number(e.target.value))} disabled={future} style={{opacity:0,position:"absolute",inset:0,width:"100%",height:"100%",cursor:future?"default":"pointer"}}>
                      <option value="">–</option>
                      {MOODS.map(m=><option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                    </select>
                    <div style={{fontSize:16,textAlign:"center",opacity:future?0.15:mv?1:0.25}}>{mood?mood.emoji:"·"}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr repeat(7, 36px)",gap:4,marginBottom:6,paddingLeft:4}}>
            <div/>
            {weekDates.map(d => (
              <div key={d.toString()} style={{textAlign:"center",fontSize:11,color:isToday(d)?"#7B68EE":"#4A4560"}}>{d.getDate()}</div>
            ))}
          </div>

          {habits.map(habit => (
            <div key={habit.id} style={{display:"grid",gridTemplateColumns:"1fr repeat(7, 36px)",gap:4,alignItems:"center",marginBottom:10,padding:"10px 4px 10px 10px",borderRadius:12,background:"rgba(255,255,255,0.02)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <span style={{fontSize:18,color:habit.color,flexShrink:0}}>{habit.icon}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{habit.name}</div>
                  <div style={{fontSize:10,color:"#7A7490"}}>{streaks[habit.id]>0?`${streaks[habit.id]}d 🔥`:"start today"}</div>
                </div>
              </div>
              {weekDates.map(d => {
                const key=dateKey(d), done=completions[key]?.[habit.id], future=isFuture(d), hasLog=logs[key]?.[habit.id];
                return (
                  <div key={key} style={{position:"relative"}}>
                    <button
                      disabled={future}
                      onClick={()=>handleHabitTap(habit.id,d)}
                      onContextMenu={e=>{e.preventDefault();handleLongPress(habit,d);}}
                      onTouchStart={()=>{if(!future)longPress.current=setTimeout(()=>handleLongPress(habit,d),500);}}
                      onTouchEnd={()=>clearTimeout(longPress.current)}
                      style={{width:32,height:32,borderRadius:8,border:done?"none":`1.5px solid ${future?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.12)"}`,background:done?habit.color:future?"rgba(255,255,255,0.01)":"transparent",cursor:future?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",transition:"all 0.15s ease"}}>
                      {done?"✓":""}
                    </button>
                    {done&&hasLog&&<div style={{position:"absolute",top:-3,right:-3,width:7,height:7,borderRadius:"50%",background:"#E8A44A",border:"1.5px solid #0F0E17"}}/>}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{fontSize:11,color:"#3A3656",textAlign:"center",marginTop:4,marginBottom:16}}>Tap to check off · Hold to add details</div>

          {showAdd ? (
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:16,padding:20,marginTop:8,border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{fontSize:12,color:"#7A7490",letterSpacing:"0.1em",marginBottom:16,textTransform:"uppercase"}}>New Habit</div>
              <input value={newHabit.name} onChange={e=>setNewHabit({...newHabit,name:e.target.value})} placeholder="Habit name…" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#E8E4DC",fontSize:14,outline:"none",fontFamily:"Georgia,serif",marginBottom:10}}/>
              <input value={newHabit.description} onChange={e=>setNewHabit({...newHabit,description:e.target.value})} placeholder="Short description (optional)" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#E8E4DC",fontSize:13,outline:"none",fontFamily:"Georgia,serif",marginBottom:14}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {ICONS.map(ic=><button key={ic} onClick={()=>setNewHabit({...newHabit,icon:ic})} style={{width:34,height:34,borderRadius:8,border:newHabit.icon===ic?"2px solid #7B68EE":"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#E8E4DC",cursor:"pointer",fontSize:16}}>{ic}</button>)}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                {COLORS.map(c=><button key={c} onClick={()=>setNewHabit({...newHabit,color:c})} style={{width:28,height:28,borderRadius:"50%",background:c,border:newHabit.color===c?"3px solid #fff":"none",cursor:"pointer"}}/>)}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addHabit} style={{flex:1,padding:"11px",borderRadius:8,background:"#7B68EE",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif"}}>Add Habit</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:"11px 16px",borderRadius:8,background:"transparent",color:"#7A7490",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontSize:13}}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:12,borderRadius:12,background:"transparent",color:"#4A4560",border:"1.5px dashed rgba(255,255,255,0.1)",cursor:"pointer",fontSize:13,letterSpacing:"0.05em",fontFamily:"Georgia,serif"}}>+ Add habit</button>
          )}
        </>}

        {view==="stats" && <>
          <div style={{marginBottom:28,padding:20,borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:12,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Mood — Last 14 Days</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:3,height:60}}>
              {getMoodHistory().map(({date,key,val}) => {
                const mood=MOODS.find(m=>m.value===val), future=isFuture(date);
                return (
                  <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:"100%",height:val?`${val/5*48+8}px`:"4px",background:mood?mood.color:"rgba(255,255,255,0.07)",borderRadius:4,opacity:future?0.2:1,transition:"height 0.4s ease",minHeight:4}}/>
                    <div style={{fontSize:9,color:"#4A4560"}}>{date.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:12,marginTop:14,flexWrap:"wrap"}}>
              {MOODS.map(m=><div key={m.value} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7A7490"}}><div style={{width:8,height:8,borderRadius:2,background:m.color}}/>{m.emoji} {m.label}</div>)}
            </div>
          </div>

          <div style={{fontSize:12,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>This Week</div>
          {habits.map(habit => {
            const rate=getWeeklyRate(habit.id), streak=streaks[habit.id];
            const recentLogs=getWeekDates(0).map(d=>({date:d,log:logs[dateKey(d)]?.[habit.id]})).filter(x=>x.log);
            return (
              <div key={habit.id} style={{marginBottom:16,padding:18,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20,color:habit.color}}>{habit.icon}</span>
                    <div><div style={{fontSize:14}}>{habit.name}</div><div style={{fontSize:11,color:"#7A7490"}}>{habit.description}</div></div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:22,color:habit.color}}>{rate}<span style={{fontSize:12,color:"#7A7490"}}>%</span></div>
                    <div style={{fontSize:10,color:"#4A4560"}}>{streak>0?`${streak}d 🔥`:"no streak"}</div>
                  </div>
                </div>
                <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${rate}%`,background:habit.color,borderRadius:2,transition:"width 0.6s ease"}}/>
                </div>
                <div style={{display:"flex",gap:5,marginTop:12}}>
                  {getWeekDates(0).map(d => {
                    const dk=dateKey(d),done=completions[dk]?.[habit.id],hasLog=logs[dk]?.[habit.id],future=isFuture(d);
                    return (
                      <div key={dk} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{width:"100%",height:5,borderRadius:2,background:done?(hasLog?habit.color+"cc":habit.color):future?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.1)"}}/>
                        <div style={{fontSize:9,color:"#4A4560"}}>{DAYS[d.getDay()].slice(0,1)}</div>
                      </div>
                    );
                  })}
                </div>
                {recentLogs.length>0 && (
                  <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{fontSize:10,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Recent Logs</div>
                    {recentLogs.slice(-2).map(({date,log})=>(
                      <div key={dateKey(date)} style={{marginBottom:8}}>
                        <div style={{fontSize:10,color:"#4A4560",marginBottom:3}}>{DAYS[date.getDay()]} {date.getDate()}</div>
                        {Object.entries(log).filter(([k,v])=>v).map(([k,v])=>(
                          <div key={k} style={{fontSize:12,color:"#9A9AB0"}}><span style={{color:"#7A7490",textTransform:"capitalize"}}>{k}:</span> {v}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{marginTop:8,padding:16,borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:11,color:"#7A7490",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Manage Habits</div>
            {habits.map(habit=>(
              <div key={habit.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:habit.color}}>{habit.icon}</span>
                  <span style={{fontSize:13}}>{habit.name}</span>
                </div>
                <button onClick={()=>removeHabit(habit.id)} style={{background:"none",border:"none",color:"#4A4560",cursor:"pointer",fontSize:18,padding:"2px 6px"}}>×</button>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
