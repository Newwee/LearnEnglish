/* ================================================
   ENG ACADEMY v2 — Full Application Logic
   5 ทักษะ · 25 บทเรียน · 125 ข้อสอบ
   ================================================ */

// ─── STATE ────────────────────────────────────────
const S = {
  activeQuizCat: null, quizQuestions: [],
  qIdx: 0, userAns: [], timerInterval: null,
  quizStart: null, answered: false
};
const STORAGE_KEY = 'engacademy_v3';
const REWARD_KEY = 'engacademy_rewards_v1';

// ─── STORAGE ──────────────────────────────────────
function getProgress(){
  const base = {grammar:[],vocabulary:[],reading:[],writing:[],speaking:[]};
  try{ return { ...base, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
  catch{ return base; }
}
function getRewardState(){
  try{ return { coins:0, streak:0, lastQuizDate:null, earnedToday:0, badges:[], ...(JSON.parse(localStorage.getItem(REWARD_KEY)) || {}) }; }
  catch{ return { coins:0, streak:0, lastQuizDate:null, earnedToday:0, badges:[] }; }
}
function saveRewardState(r){
  localStorage.setItem(REWARD_KEY, JSON.stringify(r));
  updateHeaderRewards();
}
function getDateKey(offsetDays = 0){
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function calculateReward(score,total,secs,streak){
  const pct = Math.round(score / total * 100);
  const avgSec = secs / total;
  const details = [
    { label:'ลงสนามทำครบชุด', coins:10 },
    { label:`ตอบถูก ${score} ข้อ`, coins:score * 6 }
  ];
  if(pct === 100) details.push({ label:'Perfect Run', coins:45 });
  else if(pct >= 90) details.push({ label:'Accuracy 90%+', coins:35 });
  else if(pct >= 80) details.push({ label:'Accuracy 80%+', coins:25 });
  else if(pct >= 70) details.push({ label:'Accuracy 70%+', coins:15 });

  if(avgSec <= 10) details.push({ label:'Speed Bonus ต่ำกว่า 10 วิ/ข้อ', coins:30 });
  else if(avgSec <= 15) details.push({ label:'Speed Bonus ต่ำกว่า 15 วิ/ข้อ', coins:20 });
  else if(avgSec <= 22) details.push({ label:'Speed Bonus ต่ำกว่า 22 วิ/ข้อ', coins:12 });

  details.push({ label:`Daily Streak x${streak}`, coins:Math.min(30, Math.max(1, streak) * 5) });
  return { total:details.reduce((sum,d)=>sum+d.coins,0), details };
}
function awardQuizCoins(score,total,secs){
  const today = getDateKey();
  const yesterday = getDateKey(-1);
  const rewards = getRewardState();
  let nextStreak = rewards.streak || 0;
  if(rewards.lastQuizDate === today) nextStreak = Math.max(1, nextStreak);
  else if(rewards.lastQuizDate === yesterday) nextStreak += 1;
  else nextStreak = 1;

  const earned = calculateReward(score,total,secs,nextStreak);
  const alreadyPlayedToday = rewards.lastQuizDate === today;
  rewards.coins += earned.total;
  rewards.streak = nextStreak;
  rewards.lastQuizDate = today;
  rewards.earnedToday = alreadyPlayedToday ? (rewards.earnedToday || 0) + earned.total : earned.total;
  saveRewardState(rewards);
  return { ...earned, streak:nextStreak, balance:rewards.coins };
}
function getRewardRank(coins){
  if(coins >= 2500) return 'C2 Coin Master';
  if(coins >= 1500) return 'C1 Strategy Pro';
  if(coins >= 900) return 'B2 Momentum Builder';
  if(coins >= 450) return 'B1 Skill Grinder';
  if(coins >= 150) return 'A2 Active Learner';
  return 'Rookie Learner';
}
function updateHeaderRewards(){
  const el = document.getElementById('header-coins');
  if(el) el.textContent = `🪙 ${getRewardState().coins}`;
}
function saveRecord(cat,score,total,secs,reward=null){
  const p=getProgress();
  if(!p[cat]) p[cat]=[];
  p[cat].push({ score, total, pct:Math.round(score/total*100),
    time:secs, coins:reward?.total || 0,
    date:new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) });
  if(p[cat].length>30) p[cat]=p[cat].slice(-30);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(p));
  updateHeaderLevel();
}
function clearHistory(){
  if(!confirm('ล้างข้อมูล Progress ทั้งหมด?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REWARD_KEY);
  renderDashboard(); updateHeaderLevel(); updateHeaderRewards();
}

// ─── CEFR ESTIMATE ────────────────────────────────
function estimateCEFR(){
  const p=getProgress();
  const all=Object.values(p).flat().map(r=>r.pct);
  if(!all.length) return '--';
  const avg=all.reduce((a,b)=>a+b,0)/all.length;
  if(avg>=92) return 'C2'; if(avg>=80) return 'C1';
  if(avg>=68) return 'B2'; if(avg>=54) return 'B1';
  if(avg>=38) return 'A2'; return 'A1';
}
function updateHeaderLevel(){
  const lv=estimateCEFR();
  document.getElementById('header-level').textContent='CEFR: '+lv;
  updateHeaderRewards();
}

// ─── TAB SWITCHING ────────────────────────────────
function switchTab(id, el){
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(el) el.classList.add('active');
  if(id==='dashboard') renderDashboard();
}

// ══════════════════════════════════════════════════
//   LESSON CONTENT DATA
// ══════════════════════════════════════════════════

const LESSON_CATS = [
  {
    id:'grammar', title:'Grammar', thaiTitle:'ไวยากรณ์', icon:'⚡',
    color:'#38bdf8', levelRange:'A1 → C2',
    desc:'Tenses ทั้ง 12 · Conditionals · Passive Voice · Relative Clauses · Advanced Structures',
    units:[
      { id:'g1', title:'Present Tenses', sub:'Present Simple & Present Continuous', level:'A1–A2',
        content:`<div class="lc">
<h2>⚡ Present Tenses</h2>
<div class="lc-section">
<h3>🔵 Present Simple — ความจริง / กิจวัตร</h3>
<p>ใช้กับข้อเท็จจริงสากล กิจวัตรประจำวัน หรือสิ่งที่เกิดซ้ำๆ</p>
<div class="rule-box"><b>📌 กฎเหล็ก:</b> ประธานเอกพจน์ (He / She / It / ชื่อคน 1 คน) ต้องเติม <code>-s</code> หรือ <code>-es</code> ต่อท้ายกริยา<br>
<i>She work<b>s</b> at a hospital. / He watch<b>es</b> TV every night.</i></div>
<h4>คำบอกเวลาคู่หู:</h4>
<div class="chips"><span class="chip">always</span><span class="chip">usually</span><span class="chip">often</span><span class="chip">sometimes</span><span class="chip">rarely</span><span class="chip">never</span><span class="chip">every day/week</span></div>
</div>
<div class="lc-section">
<h3>🟡 Present Continuous — กำลังทำอยู่ตอนนี้</h3>
<div class="rule-box"><b>📌 โครงสร้าง:</b> Subject + <code>am / is / are</code> + V-ing<br>
<i>I <b>am studying</b> right now. / They <b>are playing</b> football.</i></div>
<h4>⚠️ Stative Verbs — ห้ามใช้ Continuous!</h4>
<p>กริยาแสดงสภาวะ ไม่ใช่การกระทำ จึงใช้ -ing ไม่ได้</p>
<div class="chips warning"><span class="chip red">know</span><span class="chip red">believe</span><span class="chip red">want</span><span class="chip red">need</span><span class="chip red">like/love/hate</span><span class="chip red">understand</span><span class="chip red">seem</span><span class="chip red">own/belong</span></div>
<div class="warn-box">❌ <i>I am knowing the answer.</i> → ✅ <i>I <b>know</b> the answer.</i></div>
</div>
<div class="lc-section">
<h3>🆚 เปรียบเทียบการใช้</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>Present Simple ✓</b><p>She <b>works</b> at a hospital. (งานประจำ)</p><p>Water <b>boils</b> at 100°C. (ความจริง)</p><p>The sun <b>rises</b> in the east.</p></div>
<div class="compare-box purple"><b>Present Continuous ✓</b><p>She <b>is working</b> late today. (วันนี้พิเศษ)</p><p>We <b>are leaving</b> tomorrow. (แผนอนาคตใกล้)</p><p>The economy <b>is improving</b>. (ค่อยๆ เปลี่ยน)</p></div>
</div>
</div></div>`
      },
      { id:'g2', title:'Past Tenses', sub:'Past Simple · Past Continuous · Past Perfect', level:'A2–B1',
        content:`<div class="lc"><h2>⏪ Past Tenses</h2>
<div class="lc-section"><h3>🔵 Past Simple — เหตุการณ์สำเร็จในอดีต</h3>
<div class="rule-box"><b>Regular:</b> V+ed — <i>worked, played, watched</i><br><b>Irregular:</b> ต้องจำ — <i>go→went, see→saw, buy→bought, write→wrote, have→had</i></div>
<div class="chips"><span class="chip">yesterday</span><span class="chip">last night/week/year</span><span class="chip">in 2020</span><span class="chip">ago</span><span class="chip">when I was young</span></div></div>
<div class="lc-section"><h3>🟡 Past Continuous — กำลังทำอยู่ในอดีต</h3>
<div class="rule-box"><b>โครงสร้าง:</b> Subject + <code>was/were</code> + V-ing<br>
<i>She <b>was sleeping</b> when I called. / They <b>were watching</b> TV at 9pm.</i></div>
<h4>Pattern คู่ขาสำคัญ: Past Continuous + when + Past Simple</h4>
<p>ใช้เล่า 2 เหตุการณ์: เหตุการณ์ยาว (กำลังทำ) + เหตุการณ์สั้นเข้ามาแทรก</p>
<div class="rule-box"><i>I <b>was taking</b> a shower <b>when</b> the phone <b>rang</b>.</i><br><i>They <b>were having</b> dinner <b>when</b> the lights <b>went</b> out.</i></div></div>
<div class="lc-section"><h3>🟣 Past Perfect — เกิดก่อนอีกเหตุการณ์หนึ่งในอดีต</h3>
<div class="rule-box"><b>โครงสร้าง:</b> Subject + <code>had</code> + V3<br>
<i>By the time I arrived, she <b>had already left</b>.<br>He was upset because he <b>had failed</b> the exam.</i></div>
<div class="tip-box">💡 <b>จำง่าย:</b> Past Perfect = สิ่งที่เกิดขึ้น "ก่อน" อีกเหตุการณ์ในอดีต ใช้คู่กับ <i>before / by the time / already / when / after</i></div></div></div>`
      },
      { id:'g3', title:'Perfect Tenses', sub:'Present Perfect & PP Continuous', level:'B1–B2',
        content:`<div class="lc"><h2>✅ Present Perfect Tenses</h2>
<div class="lc-section"><h3>🔵 Present Perfect — ประสบการณ์ / สิ่งที่เพิ่งทำ / ผลกระทบปัจจุบัน</h3>
<div class="rule-box"><b>โครงสร้าง:</b> Subject + <code>have/has</code> + V3<br>
<i>I <b>have visited</b> Paris twice. / She <b>has just finished</b> her report.</i></div>
<h4>คำบอกเวลาที่ใช้คู่กัน:</h4>
<div class="chips"><span class="chip">already</span><span class="chip">yet</span><span class="chip">just</span><span class="chip">ever</span><span class="chip">never</span><span class="chip">since + จุดเวลา</span><span class="chip">for + ช่วงเวลา</span><span class="chip">recently</span></div>
<h4>since vs for</h4>
<div class="compare-grid">
<div class="compare-box sky"><b>since = ตั้งแต่จุดเวลา</b><p>I've lived here <b>since 2018</b>.</p><p>She's been sick <b>since Monday</b>.</p></div>
<div class="compare-box purple"><b>for = ช่วงระยะเวลา</b><p>I've lived here <b>for 6 years</b>.</p><p>He's known her <b>for a long time</b>.</p></div>
</div></div>
<div class="lc-section"><h3>🆚 Present Perfect vs Past Simple</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>Present Perfect ✓</b><p><i>I <b>have seen</b> that film.</i> (ประสบการณ์ ไม่ระบุเวลา)</p><p><i>She <b>has lost</b> her key.</i> (ผลกระทบยังอยู่ตอนนี้)</p></div>
<div class="compare-box purple"><b>Past Simple ✓</b><p><i>I <b>saw</b> that film <b>last week</b>.</i> (ระบุเวลาชัดเจน)</p><p><i>She <b>lost</b> her key <b>yesterday</b>.</i> (เหตุการณ์สิ้นสุดแล้ว)</p></div>
</div></div>
<div class="lc-section"><h3>🟡 Present Perfect Continuous — ทำมาต่อเนื่องถึงปัจจุบัน</h3>
<div class="rule-box"><b>โครงสร้าง:</b> Subject + <code>have/has been</code> + V-ing<br>
<i>I <b>have been studying</b> for 3 hours. / She <b>has been waiting</b> since 8am.</i></div>
<p>เน้นว่า "กำลังทำมาต่อเนื่อง" ยังไม่หยุด ต่างจาก PP ที่เน้นว่า "ทำเสร็จแล้ว"</p></div></div>`
      },
      { id:'g4', title:'Conditionals', sub:'If-Clauses Type 0, 1, 2, 3 & Mixed', level:'B1–C1',
        content:`<div class="lc"><h2>🔀 Conditionals (If-Clauses)</h2>
<div class="lc-section"><h3>Type 0 — ความจริงสากล</h3>
<div class="rule-box"><b>If + Present Simple, Present Simple</b><br><i>If you heat water to 100°C, it <b>boils</b>.</i> / <i>If I eat too much, I <b>feel</b> sick.</i></div></div>
<div class="lc-section"><h3>Type 1 — เงื่อนไขที่เป็นไปได้จริง (อนาคต)</h3>
<div class="rule-box"><b>If + Present Simple, will + V1</b><br><i>If it <b>rains</b> tomorrow, I <b>will stay</b> home.</i></div>
<div class="tip-box">💡 ห้ามใช้ will ในประโยค if-clause: ❌ <i>If it will rain...</i></div></div>
<div class="lc-section"><h3>Type 2 — สมมติในปัจจุบัน/อนาคต (ไม่จริง / โอกาสน้อยมาก)</h3>
<div class="rule-box"><b>If + Past Simple, would + V1</b><br><i>If I <b>were</b> rich, I <b>would buy</b> a mansion.</i></div>
<div class="tip-box">💡 Subject ทุกตัวใช้ <b>were</b> ไม่ใช่ was ในภาษาทางการ (If I <b>were</b> you...)</div></div>
<div class="lc-section"><h3>Type 3 — สมมติในอดีต (ไม่เกิดขึ้นจริงแล้ว)</h3>
<div class="rule-box"><b>If + Past Perfect (had + V3), would have + V3</b><br><i>If she <b>had studied</b> harder, she <b>would have passed</b>.<br>If I <b>had known</b>, I <b>would have told</b> you.</i></div></div>
<div class="lc-section"><h3>Mixed Conditional — ผสมอดีต+ปัจจุบัน</h3>
<div class="rule-box"><b>If + Past Perfect (อดีต), would + V1 (ผลตอนนี้)</b><br>
<i>If she <b>had taken</b> the job, she <b>would be</b> in London now.</i></div>
<div class="chips"><span class="chip">Type 0: Universal truth</span><span class="chip">Type 1: Real future</span><span class="chip">Type 2: Unreal present</span><span class="chip">Type 3: Unreal past</span></div></div></div>`
      },
      { id:'g5', title:'Passive Voice & Modals', sub:'Active → Passive · Modal Verbs', level:'B2–C1',
        content:`<div class="lc"><h2>🔄 Passive Voice & Modal Verbs</h2>
<div class="lc-section"><h3>🔵 Passive Voice — เน้นที่กรรม ไม่ใช่ประธาน</h3>
<div class="rule-box"><b>โครงสร้าง:</b> Subject + <code>be (conjugated)</code> + V3 (+ by + agent)<br>
<i>Active: Shakespeare <b>wrote</b> Hamlet. → Passive: Hamlet <b>was written</b> by Shakespeare.</i></div>
<h4>ตัวอย่างทุก Tense:</h4>
<ul><li><b>Present Simple:</b> English <b>is spoken</b> worldwide.</li>
<li><b>Past Simple:</b> The window <b>was broken</b> last night.</li>
<li><b>Present Perfect:</b> The report <b>has been submitted</b>.</li>
<li><b>Future:</b> The road <b>will be repaired</b> next week.</li>
<li><b>Modal:</b> The rules <b>must be followed</b>.</li></ul></div>
<div class="lc-section"><h3>🟡 Modal Verbs — ความหมายและการใช้</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">can / could</div><div class="meaning">ความสามารถ / ขอร้องสุภาพ</div><div class="ex">She can speak 3 languages.</div></div>
<div class="vocab-item"><div class="word">must / have to</div><div class="meaning">ความจำเป็น / หน้าที่</div><div class="ex">You must wear a seatbelt.</div></div>
<div class="vocab-item"><div class="word">should / ought to</div><div class="meaning">คำแนะนำ</div><div class="ex">You should see a doctor.</div></div>
<div class="vocab-item"><div class="word">may / might</div><div class="meaning">ความเป็นไปได้ (ไม่แน่)</div><div class="ex">It might rain tomorrow.</div></div>
<div class="vocab-item"><div class="word">would</div><div class="meaning">สุภาพ / สมมติ</div><div class="ex">Would you like some tea?</div></div>
<div class="vocab-item"><div class="word">need not / don't have to</div><div class="meaning">ไม่จำเป็นต้องทำ</div><div class="ex">You needn't come early.</div></div>
</div>
<div class="tip-box">💡 <b>must not ≠ don't have to</b> — must not = ห้ามทำเด็ดขาด | don't have to = ไม่จำเป็นต้องทำ</div></div></div>`
      },
      { id:'g6n', title:'Articles & Determiners', sub:'A / An / The / Zero Article', level:'A2–B2',
        content:`<div class="lc"><h2>🔤 Articles & Determiners</h2>
<div class="lc-section"><h3>🔵 A / An — Indefinite Article (ไม่จำเพาะ)</h3>
<div class="rule-box"><b>ใช้เมื่อ:</b> กล่าวถึงครั้งแรก หรือเป็นหนึ่งในหลายๆ อัน<br>
<b>a</b> + พยัญชนะ: <i>a car, a university (ออกเสียง yu-)</i><br>
<b>an</b> + สระ: <i>an apple, an hour (h เงียบ), an MBA</i></div>
<div class="warn-box">⚠️ ดูเสียงออก ไม่ดูตัวอักษร! — <i>a <b>u</b>niversity</i> (u ออก /j/) แต่ <i>an <b>u</b>nderground</i> (u ออก /ʌ/)</div></div>
<div class="lc-section"><h3>🟡 The — Definite Article (จำเพาะ)</h3>
<div class="rule-box"><b>ใช้เมื่อ:</b> ทั้งคู่รู้ว่าหมายถึงอะไร / กล่าวถึงซ้ำ / มีอยู่อันเดียวในโลก<br>
<i>I saw <b>a</b> dog. <b>The</b> dog was barking loudly.</i><br>
<i><b>The</b> sun rises in the east. / <b>The</b> President gave a speech.</i></div></div>
<div class="lc-section"><h3>🟣 Zero Article — ไม่ใส่ Article</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>ไม่ใส่ Article เมื่อ:</b><p>Plural nouns กล่าวถึงทั่วไป: <i><b>Dogs</b> are loyal.</i></p><p>Abstract nouns: <i><b>Love</b> is blind.</i></p><p>ชื่อประเทศส่วนใหญ่: <i><b>Thailand</b>, <b>Japan</b></i></p></div>
<div class="compare-box purple"><b>ใส่ The เมื่อ:</b><p>ชื่อรัฐ/กลุ่มประเทศ: <i><b>the</b> UK, <b>the</b> USA</i></p><p>แม่น้ำ ทะเล ภูเขาหลายลูก: <i><b>the</b> Nile, <b>the</b> Alps</i></p><p>สิ่งที่มีอยู่อันเดียว: <i><b>the</b> internet</i></p></div>
</div></div></div>`
      },
      { id:'g6b', title:'Gerunds vs Infinitives', sub:'V-ing vs To V — เลือกให้ถูก', level:'B1–B2',
        content:`<div class="lc"><h2>🔀 Gerunds vs Infinitives</h2>
<div class="lc-section"><h3>🔵 กริยาที่ตามด้วย Gerund (V-ing) เท่านั้น</h3>
<div class="chips"><span class="chip">enjoy</span><span class="chip">avoid</span><span class="chip">suggest</span><span class="chip">deny</span><span class="chip">finish</span><span class="chip">consider</span><span class="chip">keep</span><span class="chip">miss</span><span class="chip">risk</span><span class="chip">admit</span><span class="chip">practise</span><span class="chip">give up</span></div>
<div class="rule-box"><i>I enjoy <b>swimming</b>. / She avoided <b>making</b> eye contact. / He denied <b>stealing</b> the money.</i></div></div>
<div class="lc-section"><h3>🟡 กริยาที่ตามด้วย Infinitive (to + V) เท่านั้น</h3>
<div class="chips warning"><span class="chip red">want</span><span class="chip red">need</span><span class="chip red">hope</span><span class="chip red">decide</span><span class="chip red">plan</span><span class="chip red">agree</span><span class="chip red">refuse</span><span class="chip red">promise</span><span class="chip red">expect</span><span class="chip red">afford</span></div>
<div class="rule-box"><i>She decided <b>to leave</b>. / He refused <b>to answer</b>. / They promised <b>to help</b>.</i></div></div>
<div class="lc-section"><h3>🟣 กริยาที่ใช้ได้ทั้งคู่ แต่ความหมายต่าง!</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>remember + V-ing</b><p>จำได้ว่าทำแล้ว (อดีต)<br><i>I remember <b>locking</b> the door.</i></p></div>
<div class="compare-box purple"><b>remember + to V</b><p>จำต้องทำ (อนาคต)<br><i>Remember <b>to lock</b> the door!</i></p></div>
</div>
<div class="compare-grid">
<div class="compare-box sky"><b>stop + V-ing</b><p>เลิกทำสิ่งนั้น<br><i>She stopped <b>smoking</b>.</i></p></div>
<div class="compare-box purple"><b>stop + to V</b><p>หยุดเพื่อจะทำ<br><i>He stopped <b>to smoke</b>. (หยุดแวะสูบ)</i></p></div>
</div></div></div>`
      },
      { id:'g6', title:'Advanced Grammar', sub:'Relative Clauses · Inversion · Reported Speech', level:'C1–C2',
        content:`<div class="lc"><h2>🚀 Advanced Grammar</h2>
<div class="lc-section"><h3>🔵 Relative Clauses</h3>
<h4>Defining (ไม่ใส่คอมมา) — ระบุว่าคนหรือสิ่งใด</h4>
<div class="rule-box"><i>The student <b>who answered</b> first won a prize. (ระบุว่านักเรียนคนไหน)</i></div>
<h4>Non-defining (ใส่คอมมาล้อมรอบ) — ให้ข้อมูลเพิ่มเติม</h4>
<div class="rule-box"><i>My brother, <b>who lives in London</b>, is an architect.</i></div>
<div class="warn-box">⛔ Non-defining clause <b>ห้ามใช้ that</b> — ใช้ <b>who/whom</b> (คน) หรือ <b>which</b> (สิ่งของ) เท่านั้น<br>
❌ <i>My car, <b>that</b> I bought last year, broke down.</i> → ✅ <i>My car, <b>which</b> I bought last year, broke down.</i></div>
<h4>Who vs Whom</h4>
<div class="compare-grid">
<div class="compare-box sky"><b>who = ประธาน (Subject)</b><p><i>The man <b>who called</b> you is here.</i></p><p>(who ทำหน้าที่เป็นประธานของ called)</p></div>
<div class="compare-box purple"><b>whom = กรรม (Object)</b><p><i>The teacher <b>whom</b> we admire has retired.</i></p><p>(whom ถูก we กระทำ = กรรม)</p></div>
</div></div>
<div class="lc-section"><h3>🟡 Inversion — ประโยคเน้นย้ำระดับสูง</h3>
<p>ใช้หลัง Negative Adverbials ที่ขึ้นต้นประโยค — สลับ Subject+Verb</p>
<div class="rule-box">
<i><b>Never before</b> had I seen such a beautiful painting.</i><br>
<i><b>No sooner</b> had she sat down <b>than</b> the phone rang.</i><br>
<i><b>Hardly</b> had they left <b>when</b> it started to rain.</i><br>
<i><b>Not only</b> did he win <b>but</b> he also broke the record.</i></div></div>
<div class="lc-section"><h3>🟣 Reported Speech</h3>
<div class="rule-box"><b>Direct:</b> She said, "I <b>am</b> tired."<br><b>Reported:</b> She said (that) she <b>was</b> tired.</div>
<h4>Backshift ของ Tense:</h4>
<ul><li><b>am/is/are → was/were</b></li><li><b>will → would</b></li><li><b>can → could</b></li><li><b>have/has → had</b></li><li><b>Past Simple → Past Perfect</b></li></ul>
<div class="tip-box">💡 ถ้า reporting verb ใช้ Past Tense ต้อง backshift ทุกครั้ง</div></div></div>`
      }
    ]
  },
  {
    id:'vocabulary', title:'Vocabulary', thaiTitle:'คำศัพท์', icon:'📖',
    color:'#818cf8', levelRange:'A1 → C2',
    desc:'Phrasal Verbs · Idioms · Collocations · Academic Word List · คำศัพท์สูง',
    units:[
      { id:'v1', title:'Everyday Vocabulary', sub:'คำพื้นฐานในชีวิตประจำวัน', level:'A1–A2',
        content:`<div class="lc"><h2>📖 Everyday Vocabulary</h2>
<div class="lc-section"><h3>🔵 คำศัพท์หมวดงาน & อาชีพ</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">colleague</div><div class="meaning">เพื่อนร่วมงาน</div></div>
<div class="vocab-item"><div class="word">deadline</div><div class="meaning">กำหนดส่งงาน</div></div>
<div class="vocab-item"><div class="word">schedule</div><div class="meaning">ตารางเวลา</div></div>
<div class="vocab-item"><div class="word">promote</div><div class="meaning">เลื่อนตำแหน่ง</div></div>
<div class="vocab-item"><div class="word">resign</div><div class="meaning">ลาออก</div></div>
<div class="vocab-item"><div class="word">negotiate</div><div class="meaning">เจรจา</div></div>
</div></div>
<div class="lc-section"><h3>🟡 คำศัพท์หมวดการเดินทาง & ท่องเที่ยว</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">itinerary</div><div class="meaning">แผนการเดินทาง</div></div>
<div class="vocab-item"><div class="word">accommodation</div><div class="meaning">ที่พัก</div></div>
<div class="vocab-item"><div class="word">destination</div><div class="meaning">จุดหมาย</div></div>
<div class="vocab-item"><div class="word">check in/out</div><div class="meaning">เช็คอิน / เช็คเอาต์</div></div>
<div class="vocab-item"><div class="word">customs</div><div class="meaning">ด่านศุลกากร</div></div>
<div class="vocab-item"><div class="word">layover</div><div class="meaning">เที่ยวบินแวะพัก</div></div>
</div></div>
<div class="lc-section"><h3>🟣 Confusing Word Pairs</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>lend vs borrow</b><p><b>lend</b> = ให้ยืม (ฉันให้เธอยืม)</p><p><b>borrow</b> = ยืม (เธอยืมจากฉัน)</p></div>
<div class="compare-box purple"><b>make vs do</b><p><b>make</b> = สร้างสิ่งที่จับต้องได้/ตัดสินใจ</p><p><b>do</b> = ทำกิจกรรม/งาน</p></div>
</div>
<div class="compare-grid">
<div class="compare-box sky"><b>advice vs advise</b><p><b>advice</b> (n) = คำแนะนำ</p><p><b>advise</b> (v) = แนะนำ</p></div>
<div class="compare-box purple"><b>affect vs effect</b><p><b>affect</b> (v) = ส่งผลต่อ</p><p><b>effect</b> (n) = ผลลัพธ์</p></div>
</div></div></div>`
      },
      { id:'v2', title:'Phrasal Verbs', sub:'กริยาวลีที่ใช้บ่อย 50+ คำ', level:'B1–B2',
        content:`<div class="lc"><h2>🔗 Phrasal Verbs</h2>
<div class="lc-section"><h3>🔵 หมวด PUT</h3>
<table class="phrase-table"><tr><th>Phrasal Verb</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr>
<tr><td><b>put off</b></td><td>เลื่อน (เวลา)</td><td>Don't put off studying until tomorrow.</td></tr>
<tr><td><b>put out</b></td><td>ดับ (ไฟ)</td><td>Please put out the candles.</td></tr>
<tr><td><b>put up with</b></td><td>อดทนกับ</td><td>I can't put up with this noise.</td></tr>
<tr><td><b>put forward</b></td><td>เสนอ (ความคิด)</td><td>She put forward a great idea.</td></tr></table></div>
<div class="lc-section"><h3>🟡 หมวด CALL / GIVE / RUN</h3>
<table class="phrase-table"><tr><th>Phrasal Verb</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr>
<tr><td><b>call off</b></td><td>ยกเลิก</td><td>They called off the match due to rain.</td></tr>
<tr><td><b>give up</b></td><td>ยอมแพ้ / เลิก</td><td>Never give up on your dreams.</td></tr>
<tr><td><b>give away</b></td><td>แจก / เปิดเผยความลับ</td><td>She gave away the surprise.</td></tr>
<tr><td><b>run out of</b></td><td>หมด</td><td>We've run out of milk.</td></tr>
<tr><td><b>run into</b></td><td>เจอโดยบังเอิญ</td><td>I ran into my old teacher.</td></tr></table></div>
<div class="lc-section"><h3>🟣 หมวด LOOK / COME / BREAK</h3>
<table class="phrase-table"><tr><th>Phrasal Verb</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr>
<tr><td><b>look into</b></td><td>สืบสวน / ตรวจสอบ</td><td>Police are looking into the case.</td></tr>
<tr><td><b>look after</b></td><td>ดูแล</td><td>Can you look after my dog?</td></tr>
<tr><td><b>come across</b></td><td>พบโดยบังเอิญ / ดูเหมือน</td><td>She comes across as confident.</td></tr>
<tr><td><b>break down</b></td><td>เสีย (รถ) / พังทลาย</td><td>My car broke down on the highway.</td></tr>
<tr><td><b>break through</b></td><td>ฝ่าฝัน / บุกทะลวง</td><td>Scientists made a breakthrough.</td></tr></table></div></div>`
      },
      { id:'v3', title:'Idioms & Expressions', sub:'สำนวนเหมือนเจ้าของภาษา 30+ คำ', level:'B2–C1',
        content:`<div class="lc"><h2>💬 Idioms & Expressions</h2>
<div class="lc-section"><h3>🔵 Idioms หมวดชีวิตและงาน</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">bite the bullet</div><div class="meaning">ทำสิ่งที่ไม่อยากทำ (เพราะจำเป็น)</div><div class="ex">Just bite the bullet and apologise.</div></div>
<div class="vocab-item"><div class="word">hit the ground running</div><div class="meaning">เริ่มต้นได้อย่างรวดเร็ว</div><div class="ex">She hit the ground running at her new job.</div></div>
<div class="vocab-item"><div class="word">under the weather</div><div class="meaning">รู้สึกไม่สบาย</div><div class="ex">I'm feeling under the weather today.</div></div>
<div class="vocab-item"><div class="word">get cracking</div><div class="meaning">รีบลงมือทำ</div><div class="ex">Come on, let's get cracking!</div></div>
<div class="vocab-item"><div class="word">on the fence</div><div class="meaning">ยังลังเล / ไม่ตัดสินใจ</div><div class="ex">She's still on the fence about the offer.</div></div>
<div class="vocab-item"><div class="word">burn bridges</div><div class="meaning">ตัดความสัมพันธ์ถาวร</div><div class="ex">Don't burn bridges when you resign.</div></div>
</div></div>
<div class="lc-section"><h3>🟡 Idioms หมวดการสื่อสาร</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">hit the nail on the head</div><div class="meaning">พูดถูกต้องแม่นยำ</div><div class="ex">You hit the nail on the head.</div></div>
<div class="vocab-item"><div class="word">beat around the bush</div><div class="meaning">พูดอ้อมค้อม</div><div class="ex">Stop beating around the bush!</div></div>
<div class="vocab-item"><div class="word">break the ice</div><div class="meaning">เริ่มสร้างความคุ้นเคย</div><div class="ex">He told a joke to break the ice.</div></div>
<div class="vocab-item"><div class="word">once in a blue moon</div><div class="meaning">นานๆ ครั้ง</div><div class="ex">He visits once in a blue moon.</div></div>
<div class="vocab-item"><div class="word">spill the beans</div><div class="meaning">เปิดเผยความลับ</div><div class="ex">Who spilled the beans?</div></div>
<div class="vocab-item"><div class="word">let the cat out of the bag</div><div class="meaning">เปิดเผยความลับโดยไม่ตั้งใจ</div><div class="ex">Oops, I let the cat out of the bag.</div></div>
</div></div></div>`
      },
      { id:'v4', title:'Collocations', sub:'คู่คำที่ต้องใช้ด้วยกัน', level:'B1–C1',
        content:`<div class="lc"><h2>🔗 Collocations</h2>
<div class="lc-section"><h3>🔵 Make vs Do</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>MAKE (สร้าง/ผลิต/ตัดสินใจ)</b><p>make a <b>decision</b> / <b>mistake</b> / <b>suggestion</b></p><p>make <b>progress</b> / <b>money</b> / <b>friends</b></p><p>make a <b>speech</b> / <b>phone call</b></p></div>
<div class="compare-box purple"><b>DO (ทำกิจกรรม/งาน)</b><p>do <b>homework</b> / <b>research</b> / <b>damage</b></p><p>do your <b>best</b> / <b>worst</b></p><p>do <b>business</b> / <b>exercise</b></p></div>
</div></div>
<div class="lc-section"><h3>🟡 Strong Adjective Collocations</h3>
<table class="phrase-table"><tr><th>ห้ามใช้ very กับ</th><th>ใช้แทน</th></tr>
<tr><td>good</td><td>excellent / outstanding / superb</td></tr>
<tr><td>bad</td><td>terrible / dreadful / awful</td></tr>
<tr><td>big</td><td>enormous / massive / colossal</td></tr>
<tr><td>tired</td><td>exhausted / worn out / shattered</td></tr>
<tr><td>happy</td><td>thrilled / delighted / ecstatic</td></tr>
<tr><td>hungry</td><td>starving / famished</td></tr></table></div>
<div class="lc-section"><h3>🟣 Verb + Noun Collocations</h3>
<div class="chips"><span class="chip">take a break</span><span class="chip">reach a goal</span><span class="chip">meet a deadline</span><span class="chip">pay attention</span><span class="chip">hold a meeting</span><span class="chip">raise awareness</span><span class="chip">face a challenge</span><span class="chip">draw a conclusion</span><span class="chip">bear in mind</span><span class="chip">have a say</span></div></div></div>`
      },
      { id:'v5b', title:'Word Formation', sub:'Prefix · Suffix · Noun/Verb/Adj Forms', level:'B1–C1',
        content:`<div class="lc"><h2>🔨 Word Formation</h2>
<div class="lc-section"><h3>🔵 Prefixes ที่ควรรู้</h3>
<table class="phrase-table"><tr><th>Prefix</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr>
<tr><td><b>un-</b></td><td>ไม่ / ตรงข้าม</td><td>unhappy, unable, undo</td></tr>
<tr><td><b>mis-</b></td><td>ผิด</td><td>misunderstand, mislead</td></tr>
<tr><td><b>over-</b></td><td>มากเกิน</td><td>overwork, overcook</td></tr>
<tr><td><b>under-</b></td><td>น้อยเกิน</td><td>underestimate, underpaid</td></tr>
<tr><td><b>re-</b></td><td>ทำซ้ำ</td><td>reconsider, rebuild</td></tr>
<tr><td><b>pre-</b></td><td>ก่อน</td><td>predict, prepare</td></tr>
<tr><td><b>inter-</b></td><td>ระหว่าง</td><td>international, interact</td></tr></table></div>
<div class="lc-section"><h3>🟡 Suffixes: เปลี่ยน Part of Speech</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>Verb → Noun</b><p>decide → <b>decision</b></p><p>develop → <b>development</b></p><p>achieve → <b>achievement</b></p><p>analyse → <b>analysis</b></p></div>
<div class="compare-box purple"><b>Adj → Noun</b><p>happy → <b>happiness</b></p><p>strong → <b>strength</b></p><p>responsible → <b>responsibility</b></p></div>
</div>
<div class="tip-box">💡 <b>Nominalization</b> = เปลี่ยนกริยาเป็นคำนาม — ทำให้งานเขียนฟอร์มัลขึ้นมาก<br>❌ <i>We need to decide quickly.</i> → ✅ <i>A quick <b>decision</b> is required.</i></div></div></div>`
      },
      { id:'v5', title:'Academic Vocabulary', sub:'AWL · คำวิชาการระดับ IELTS/TOEFL', level:'C1–C2',
        content:`<div class="lc"><h2>🎓 Academic Vocabulary</h2>
<div class="lc-section"><h3>🔵 คำหลัก Academic Word List (AWL)</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">albeit</div><div class="meaning">แม้ว่า (= although, more formal)</div><div class="ex">The results were positive, albeit limited.</div></div>
<div class="vocab-item"><div class="word">consequently</div><div class="meaning">ดังนั้น (cause → effect)</div><div class="ex">He missed class; consequently, he failed.</div></div>
<div class="vocab-item"><div class="word">inevitable</div><div class="meaning">หลีกเลี่ยงไม่ได้</div><div class="ex">Change is inevitable.</div></div>
<div class="vocab-item"><div class="word">scrutinise</div><div class="meaning">ตรวจสอบอย่างละเอียด</div><div class="ex">The data was carefully scrutinised.</div></div>
<div class="vocab-item"><div class="word">proliferate</div><div class="meaning">แพร่กระจายอย่างรวดเร็ว</div><div class="ex">Social media platforms have proliferated.</div></div>
<div class="vocab-item"><div class="word">mitigate</div><div class="meaning">ลดความรุนแรง</div><div class="ex">Measures to mitigate climate change.</div></div>
<div class="vocab-item"><div class="word">paradigm</div><div class="meaning">กรอบแนวคิด/รูปแบบ</div><div class="ex">A paradigm shift in education.</div></div>
<div class="vocab-item"><div class="word">undermine</div><div class="meaning">บ่อนทำลาย</div><div class="ex">Corruption undermines public trust.</div></div>
</div></div>
<div class="lc-section"><h3>🟡 Academic Hedging Language</h3>
<p>ใช้ในงานเขียนวิชาการเพื่อแสดงความไม่แน่นอน (ไม่ยืนยัน 100%)</p>
<div class="chips"><span class="chip">It appears that...</span><span class="chip">This suggests that...</span><span class="chip">It is argued that...</span><span class="chip">tend to</span><span class="chip">may / might / could</span><span class="chip">largely / generally</span><span class="chip">It is widely believed...</span></div></div></div>`
      }
    ]
  },
  {
    id:'reading', title:'Reading', thaiTitle:'การอ่าน', icon:'📄',
    color:'#34d399', levelRange:'A2 → C1',
    desc:'Skimming · Scanning · Main Idea · Inference · IELTS/TOEFL Reading Strategies',
    units:[
      { id:'r1', title:'Skimming & Scanning', sub:'อ่านเร็ว หาข้อมูลเป้าหมาย', level:'A2–B1',
        content:`<div class="lc"><h2>👁️ Skimming & Scanning</h2>
<div class="lc-section"><h3>🔵 Skimming — อ่านผ่านๆ เพื่อจับใจความหลัก</h3>
<div class="rule-box"><b>วิธี Skim:</b> อ่านเฉพาะ ① หัวข้อ ② ประโยคแรกของทุกย่อหน้า ③ ประโยคสุดท้าย ④ คำหนักๆ ที่ตัวหนา/ตัวเอียง</div>
<div class="tip-box">💡 ใช้เมื่อ: ต้องการรู้ว่าบทความเกี่ยวกับอะไร ก่อนอ่านละเอียด หรือตรวจงานเขียนตัวเอง</div></div>
<div class="lc-section"><h3>🟡 Scanning — อ่านเพื่อหาข้อมูลเฉพาะ</h3>
<div class="rule-box"><b>วิธี Scan:</b> ตาวิ่งเร็วๆ ทั่วหน้า มองหา Keywords เช่น ชื่อคน ตัวเลข วันที่ คำพิมพ์ใหญ่ ไม่ต้องอ่านทุกคำ</div>
<div class="tip-box">💡 ใช้เมื่อ: ต้องการหาตัวเลข ชื่อ วันที่ หรือข้อเท็จจริงเฉพาะเจาะจง</div></div>
<div class="lc-section"><h3>🟣 เทคนิคอ่านเร็ว</h3>
<ul><li>อ่านเป็น Chunks (กลุ่มคำ) ไม่ใช่ทีละคำ</li><li>ไม่พึมพำในใจ (Sub-vocalisation)</li><li>ใช้นิ้วหรือดินสอนำตา</li><li>อ่านบ่อยๆ ความเร็วจะเพิ่มเองตามธรรมชาติ</li></ul></div></div>`
      },
      { id:'r2', title:'Main Idea & Details', sub:'ใจความสำคัญ · รายละเอียดสนับสนุน', level:'B1–B2',
        content:`<div class="lc"><h2>💡 Main Idea & Supporting Details</h2>
<div class="lc-section"><h3>🔵 หา Topic Sentence</h3>
<p>ประโยคหลักของย่อหน้ามักอยู่ที่ <b>ประโยคแรก</b> (หรือบางครั้งประโยคสุดท้าย) ของย่อหน้า</p>
<div class="rule-box"><b>โครงสร้างย่อหน้าทั่วไป:</b><br>1. Topic Sentence (ใจความหลัก)<br>2. Supporting Details (รายละเอียดสนับสนุน)<br>3. Example / Evidence (ตัวอย่าง)<br>4. Concluding Sentence (สรุปย่อหน้า)</div></div>
<div class="lc-section"><h3>🟡 ตัวอย่างวิเคราะห์ย่อหน้า</h3>
<div class="rule-box"><i>"<b>Social media has fundamentally changed how people communicate.</b> Users can now share information instantly across the globe. Platforms like Instagram and TikTok allow real-time updates that were impossible two decades ago. This rapid shift has reshaped news distribution, personal relationships, and even political discourse."</i></div>
<p>✅ <b>Topic Sentence:</b> "Social media has fundamentally changed how people communicate."</p>
<p>✅ <b>Supporting Details:</b> instant sharing, real-time platforms, reshaping news & politics</p></div>
<div class="lc-section"><h3>🟣 เทคนิคตอบข้อสอบ Main Idea</h3>
<ul><li>ช้อยส์ที่ถูกต้อง: ครอบคลุมทั้งย่อหน้า ไม่แคบหรือกว้างเกินไป</li><li>ระวัง: ช้อยส์ที่พูดถึง "รายละเอียด" อย่างเดียว → ผิด</li><li>ระวัง: ช้อยส์ที่แสดงความคิดเห็นที่ไม่มีในบทความ → ผิด</li></ul></div></div>`
      },
      { id:'r3', title:'Inference', sub:'ตีความสิ่งที่ไม่ได้บอกตรงๆ', level:'B2–C1',
        content:`<div class="lc"><h2>🧠 Inference & Implied Meaning</h2>
<div class="lc-section"><h3>🔵 Inference คืออะไร?</h3>
<p>การ "อ่านระหว่างบรรทัด" — ผู้เขียนไม่ได้พูดตรงๆ แต่สื่อความหมายโดยนัย เราต้องใช้ข้อมูลในบทความ + ตรรกะ → สรุปเอง</p>
<div class="tip-box">💡 Inference ≠ ความคิดเห็นส่วนตัว ต้องมีหลักฐานจากบทความเสมอ</div></div>
<div class="lc-section"><h3>🟡 ฝึกตีความ</h3>
<div class="rule-box"><i>"Despite investing heavily in training, the company's customer satisfaction scores have remained stubbornly low."</i></div>
<p><b>❓ Inference:</b> การ training ไม่ใช่สาเหตุหลักของคะแนน satisfaction ต่ำ (อาจมีปัญหาอื่น)</p>
<div class="rule-box"><i>"The new policy was introduced quietly, with no press release."</i></div>
<p><b>❓ Inference:</b> ผู้บริหารไม่ต้องการให้สาธารณะสนใจนโยบายนี้มากนัก</p></div>
<div class="lc-section"><h3>🟣 สัญญาณภาษาที่ช่วยตีความ</h3>
<div class="chips"><span class="chip">however / but / yet</span><span class="chip">despite / although</span><span class="chip">ironically / surprisingly</span><span class="chip">only / merely / just</span><span class="chip">even / still</span></div>
<p>คำเหล่านี้มักบอกว่ามีความขัดแย้ง หรือบางอย่างไม่เป็นตามที่คาด</p></div></div>`
      },
      { id:'r4', title:'Vocabulary in Context', sub:'เดาความหมายจากบริบท', level:'B1–C1',
        content:`<div class="lc"><h2>🔍 Vocabulary in Context</h2>
<div class="lc-section"><h3>🔵 4 วิธีเดาความหมายคำศัพท์</h3>
<ul>
<li><b>1. Definition Clue:</b> ผู้เขียนอธิบายความหมายไว้ใกล้ๆ — <i>"The <b>nomadic</b> people, that is, those who move from place to place..."</i></li>
<li><b>2. Synonym/Restatement:</b> มีคำที่มีความหมายใกล้เคียงอยู่ข้างๆ — <i>"He felt <b>elated</b>, overjoyed in fact."</i></li>
<li><b>3. Contrast Clue:</b> คำตรงข้าม ใช้ but/however/unlike — <i>"Unlike her <b>gregarious</b> sister, she was shy."</i></li>
<li><b>4. General Context:</b> ดูภาพรวมของประโยค/ย่อหน้า — <i>"The <b>arid</b> desert received almost no rainfall."</i></li>
</ul></div>
<div class="lc-section"><h3>🟡 ตัวอย่างฝึกทำ</h3>
<div class="rule-box"><i>"The professor's <b>verbose</b> explanation left the students more confused than when they started, overwhelmed by the sheer number of words."</i></div>
<p>✅ <b>verbose</b> = ใช้คำมากเกินไป (จาก context: "number of words", "more confused")</p>
<div class="rule-box"><i>"Her <b>frugal</b> lifestyle meant she rarely spent money on luxuries, always looking for the cheapest option."</i></div>
<p>✅ <b>frugal</b> = ประหยัด (จาก context: "rarely spent money", "cheapest option")</p></div></div>`
      },
      { id:'r5b', title:'Reference & Cohesion', sub:'This / It / Such / Pronoun Reference', level:'B2–C1',
        content:`<div class="lc"><h2>🔗 Reference & Text Cohesion</h2>
<div class="lc-section"><h3>🔵 Reference Words คืออะไร?</h3>
<p>คำที่ "ชี้กลับ" ไปยังคนหรือสิ่งที่กล่าวถึงก่อนหน้านี้ในบทความ เมื่อเจอ reference word → ย้อนกลับหาว่าหมายถึงอะไร</p>
<div class="chips"><span class="chip">it / they / them</span><span class="chip">this / that / these / those</span><span class="chip">such / such a</span><span class="chip">the former / the latter</span><span class="chip">the above / the following</span></div></div>
<div class="lc-section"><h3>🟡 ฝึกวิเคราะห์</h3>
<div class="rule-box"><i>"Scientists have developed a new vaccine. <b>It</b> has shown 94% efficacy in trials."</i></div>
<p>✅ <b>It</b> = the new vaccine</p>
<div class="rule-box"><i>"The company laid off 500 workers and cut executive bonuses. <b>These measures</b> were seen as necessary."</i></div>
<p>✅ <b>These measures</b> = laying off workers + cutting bonuses (รวมทั้ง 2 อย่าง)</p></div>
<div class="lc-section"><h3>🟣 The Former & The Latter</h3>
<div class="rule-box"><i>"Both Tokyo and Paris are beautiful cities. <b>The former</b> is known for technology; <b>the latter</b> for fashion."</i></div>
<p>✅ <b>the former</b> = Tokyo (กล่าวถึงก่อน) | <b>the latter</b> = Paris (กล่าวถึงทีหลัง)</p></div></div>`
      },
      { id:'r5', title:'IELTS/TOEFL Reading', sub:'กลยุทธ์พิชิตข้อสอบจริง', level:'B2–C1',
        content:`<div class="lc"><h2>🎯 IELTS/TOEFL Reading Strategies</h2>
<div class="lc-section"><h3>🔵 True / False / Not Given (IELTS)</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>TRUE</b><p>ข้อมูลในบทความ <b>สอดคล้อง</b> กับคำกล่าว</p></div>
<div class="compare-box purple"><b>FALSE</b><p>ข้อมูลในบทความ <b>ขัดแย้ง</b> กับคำกล่าว</p></div>
</div>
<div class="warn-box">⚠️ <b>NOT GIVEN</b> = บทความ <b>ไม่ได้พูดถึงเลย</b> (ไม่ใช่ "ไม่เห็นด้วย") — ข้อนี้คนทำผิดมากที่สุด!</div></div>
<div class="lc-section"><h3>🟡 Matching Headings</h3>
<ul><li>อ่าน <b>ประโยคแรกและสุดท้าย</b> ของแต่ละย่อหน้าก่อน</li><li>มองหา <b>Topic ใหญ่</b> ของย่อหน้า ไม่ใช่รายละเอียด</li><li>ทำข้อที่ง่ายก่อน แล้วค่อยกลับมาทำยาก</li></ul></div>
<div class="lc-section"><h3>🟣 Time Management สำหรับ IELTS Reading</h3>
<div class="chips gold"><span class="chip gold">Passage 1: 15 นาที</span><span class="chip gold">Passage 2: 20 นาที</span><span class="chip gold">Passage 3: 25 นาที</span></div>
<p>ถ้าข้อไหนยากเกิน 2 นาที → mark ไว้ก่อน ข้ามไปทำต่อ แล้วค่อยกลับมา</p></div></div>`
      }
    ]
  },
  {
    id:'writing', title:'Writing', thaiTitle:'การเขียน', icon:'✍️',
    color:'#fbbf24', levelRange:'A2 → C2',
    desc:'Paragraph Structure · Essay Types · Linkers · Formal Language · Academic Writing',
    units:[
      { id:'w1', title:'Paragraph Structure', sub:'PEEL Method — โครงสร้างย่อหน้าสมบูรณ์', level:'A2–B1',
        content:`<div class="lc"><h2>✍️ Paragraph Structure: PEEL</h2>
<div class="lc-section"><h3>🔵 PEEL Framework</h3>
<div class="rule-box">
<b>P — Point:</b> ประโยคหัวใจหลักของย่อหน้า (Topic Sentence)<br>
<b>E — Evidence:</b> หลักฐาน ตัวอย่าง ข้อมูล สถิติ<br>
<b>E — Explain:</b> อธิบายว่าหลักฐานสนับสนุน Point อย่างไร<br>
<b>L — Link:</b> เชื่อมกลับสู่ thesis หรือนำไปย่อหน้าถัดไป</div></div>
<div class="lc-section"><h3>🟡 ตัวอย่าง PEEL Paragraph</h3>
<div class="rule-box"><b>(P)</b> Regular exercise has a profound impact on mental health. <b>(E)</b> A 2022 study by Harvard Medical School found that 30 minutes of moderate exercise three times a week reduced symptoms of depression by 47%. <b>(E)</b> This suggests that physical activity triggers the release of endorphins and serotonin, neurotransmitters responsible for mood regulation. <b>(L)</b> Therefore, incorporating exercise into daily routines should be considered a first-line strategy for improving mental wellbeing.</div></div>
<div class="lc-section"><h3>🟣 ข้อผิดพลาดที่พบบ่อย</h3>
<ul><li>ย่อหน้าที่มี 2 Main Ideas → แยกเป็น 2 ย่อหน้า</li><li>Evidence โดยไม่ Explain ว่าสำคัญอย่างไร</li><li>ย่อหน้าสั้นเกินไป (น้อยกว่า 4 ประโยค)</li></ul></div></div>`
      },
      { id:'w2', title:'Essay Types', sub:'Opinion · Discussion · Problem-Solution', level:'B1–B2',
        content:`<div class="lc"><h2>📝 Essay Types</h2>
<div class="lc-section"><h3>🔵 Opinion Essay (Agree/Disagree)</h3>
<div class="rule-box"><b>โครงสร้าง:</b><br>
Para 1: Introduction + Thesis (ระบุจุดยืนชัดเจน)<br>
Para 2-3: Body (เหตุผลสนับสนุน + Evidence)<br>
Para 4: Concession (ยอมรับมุมมองตรงข้าม แต่หักล้าง)<br>
Para 5: Conclusion (สรุป + ย้ำจุดยืน)</div>
<div class="tip-box">💡 IELTS: ต้องระบุ "จุดยืน" ในทุกส่วน ไม่ใช่แค่ Introduction</div></div>
<div class="lc-section"><h3>🟡 Discussion Essay (Both Sides)</h3>
<div class="rule-box"><b>โครงสร้าง:</b><br>
Para 1: Introduction (แนะนำประเด็น ไม่ต้องระบุจุดยืน)<br>
Para 2: Arguments FOR (พร้อม evidence)<br>
Para 3: Arguments AGAINST (พร้อม evidence)<br>
Para 4: Conclusion (สรุปและระบุจุดยืนตอนท้าย)</div></div>
<div class="lc-section"><h3>🟣 Problem-Solution Essay</h3>
<div class="rule-box"><b>โครงสร้าง:</b><br>
Para 1: Introduction (ระบุปัญหา)<br>
Para 2: Causes of the problem<br>
Para 3: Effects of the problem<br>
Para 4: Proposed solutions<br>
Para 5: Conclusion</div></div></div>`
      },
      { id:'w3', title:'Linkers & Connectives', sub:'คำเชื่อมระดับสูง', level:'B1–C1',
        content:`<div class="lc"><h2>🔗 Linkers & Connectives</h2>
<div class="lc-section"><h3>🔵 การเพิ่มเติม (Addition)</h3>
<div class="chips"><span class="chip">Furthermore</span><span class="chip">Moreover</span><span class="chip">In addition</span><span class="chip">Additionally</span><span class="chip">Not only ... but also</span><span class="chip">Besides</span></div></div>
<div class="lc-section"><h3>🟡 การแสดงความขัดแย้ง (Contrast)</h3>
<div class="chips"><span class="chip">However</span><span class="chip">Nevertheless</span><span class="chip">Nonetheless</span><span class="chip">On the other hand</span><span class="chip">Despite / In spite of</span><span class="chip">Although / Even though</span><span class="chip">Whereas / While</span></div></div>
<div class="lc-section"><h3>🟣 Cause & Effect / Result</h3>
<div class="chips gold"><span class="chip gold">Therefore</span><span class="chip gold">Consequently</span><span class="chip gold">As a result</span><span class="chip gold">Thus</span><span class="chip gold">Hence</span><span class="chip gold">Due to / Owing to</span><span class="chip gold">This leads to</span></div></div>
<div class="lc-section"><h3>🟢 Conclusion / Summary</h3>
<div class="chips green"><span class="chip green">In conclusion</span><span class="chip green">To summarise</span><span class="chip green">Overall</span><span class="chip green">In short</span><span class="chip green">Ultimately</span><span class="chip green">To sum up</span></div>
<div class="warn-box">⚠️ ห้ามใช้ "In conclusion, I think that..." ใน Academic Writing — ตัด "I think" ออก</div></div></div>`
      },
      { id:'w4', title:'Formal vs Informal', sub:'เขียนให้ถูกกาลเทศะ', level:'B2–C1',
        content:`<div class="lc"><h2>🎩 Formal vs Informal Language</h2>
<div class="lc-section"><h3>🔵 คำศัพท์: Informal → Formal</h3>
<table class="phrase-table"><tr><th>Informal</th><th>Formal</th></tr>
<tr><td>get</td><td>obtain / acquire / receive</td></tr>
<tr><td>find out</td><td>discover / ascertain</td></tr>
<tr><td>need</td><td>require / necessitate</td></tr>
<tr><td>show</td><td>demonstrate / illustrate</td></tr>
<tr><td>think about</td><td>consider / contemplate</td></tr>
<tr><td>use</td><td>utilise / employ</td></tr>
<tr><td>but</td><td>however / nevertheless</td></tr>
<tr><td>also</td><td>furthermore / moreover</td></tr></table></div>
<div class="lc-section"><h3>🟡 กฎ Academic Writing</h3>
<ul>
<li>❌ ห้ามใช้ contractions: <b>don't → do not</b>, <b>it's → it is</b></li>
<li>❌ ห้ามใช้ I/We (ยกเว้นบางบริบท)</li>
<li>❌ ห้ามใช้ colloquial expressions: "a lot of → a significant number of"</li>
<li>✅ ใช้ Passive Voice เพื่อความเป็นทางการ</li>
<li>✅ ใช้ Nominalization: <b>decide → decision</b>, <b>develop → development</b></li>
</ul></div></div>`
      },
      { id:'w5', title:'Academic Writing Tips', sub:'IELTS Task 2 · Band 7+ Strategies', level:'C1–C2',
        content:`<div class="lc"><h2>🏆 Academic Writing Tips</h2>
<div class="lc-section"><h3>🔵 Thesis Statement ที่แข็งแกร่ง</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>❌ Weak Thesis</b><p>"Social media is a topic with many aspects to consider."</p></div>
<div class="compare-box purple"><b>✅ Strong Thesis</b><p>"While social media facilitates global connectivity, its adverse effects on adolescent mental health and democratic processes far outweigh its benefits."</p></div>
</div></div>
<div class="lc-section"><h3>🟡 Avoiding Repetition — Lexical Variety</h3>
<p>ห้ามใช้คำเดิมซ้ำๆ ใช้ Synonyms, Pronouns, และ Referencing</p>
<div class="rule-box"><b>Social media → </b>these platforms / such networks / this phenomenon / it<br>
<b>increase → </b>rise / surge / escalate / grow / climb<br>
<b>important → </b>crucial / vital / significant / paramount / essential</div></div>
<div class="lc-section"><h3>🟣 IELTS Band 7+ Checklist</h3>
<ul>
<li>✅ ตอบคำถามครบทุกส่วน (Task Response)</li>
<li>✅ โครงสร้างชัดเจน มี intro-body-conclusion</li>
<li>✅ ใช้ Complex Sentences หลากหลาย</li>
<li>✅ Vocabulary หลากหลาย ไม่ซ้ำ</li>
<li>✅ ตรวจ Grammar errors ก่อนส่ง</li>
</ul></div></div>`
      }
    ]
  },
  {
    id:'speaking', title:'Speaking Tips', thaiTitle:'การพูด', icon:'🗣️',
    color:'#f87171', levelRange:'A1 → C1',
    desc:'Conversation · Fluency Phrases · Discussion Language · Pronunciation · IELTS Speaking',
    units:[
      { id:'s1', title:'Basic Conversation', sub:'ประโยคพื้นฐานสำหรับการสนทนา', level:'A1–A2',
        content:`<div class="lc"><h2>💬 Basic Conversation Phrases</h2>
<div class="lc-section"><h3>🔵 Greeting & Small Talk</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">How are you doing?</div><div class="meaning">สบายดีไหม? (ลำลอง)</div></div>
<div class="vocab-item"><div class="word">Long time no see!</div><div class="meaning">ไม่ได้เจอกันนานมากแล้ว!</div></div>
<div class="vocab-item"><div class="word">What have you been up to?</div><div class="meaning">เป็นยังไงบ้างช่วงนี้?</div></div>
<div class="vocab-item"><div class="word">I've been really busy lately.</div><div class="meaning">ช่วงนี้ยุ่งมาก</div></div>
</div></div>
<div class="lc-section"><h3>🟡 Asking for Help & Clarification</h3>
<div class="chips"><span class="chip">Could you say that again?</span><span class="chip">I'm sorry, I didn't catch that.</span><span class="chip">What do you mean by...?</span><span class="chip">Could you speak more slowly?</span><span class="chip">How do you spell that?</span></div></div>
<div class="lc-section"><h3>🟣 Agreeing & Disagreeing (Basic)</h3>
<div class="compare-grid">
<div class="compare-box sky"><b>Agreeing</b><p>Exactly! / Absolutely! / I totally agree. / That's a good point.</p></div>
<div class="compare-box purple"><b>Disagreeing (politely)</b><p>I'm not sure about that. / I see your point, but... / Actually, I think...</p></div>
</div></div></div>`
      },
      { id:'s2', title:'Fluency & Filler Phrases', sub:'พูดคล่องทันที ไม่สะดุด', level:'B1–B2',
        content:`<div class="lc"><h2>🌊 Fluency & Filler Phrases</h2>
<div class="lc-section"><h3>🔵 Buying Time Phrases</h3>
<p>ใช้เมื่อต้องการเวลาคิด — ทำให้พูดดูเป็นธรรมชาติ ไม่ใช่หยุดเงียบ</p>
<div class="chips"><span class="chip">That's a great question...</span><span class="chip">Let me think about that for a moment...</span><span class="chip">Well, to be honest...</span><span class="chip">It depends on...</span><span class="chip">That's an interesting point.</span><span class="chip">As far as I know...</span></div></div>
<div class="lc-section"><h3>🟡 Linking Ideas While Speaking</h3>
<div class="chips"><span class="chip">On top of that,</span><span class="chip">What's more,</span><span class="chip">Having said that,</span><span class="chip">As a result,</span><span class="chip">In other words,</span><span class="chip">To put it simply,</span></div></div>
<div class="lc-section"><h3>🟣 Paraphrasing When You Don't Know a Word</h3>
<div class="rule-box">
<b>เทคนิค 4 แบบ:</b><br>
1. <b>Describe function:</b> "It's a thing you use to..." / "It's a place where..."<br>
2. <b>Synonym:</b> "It's similar to..." / "It's like..."<br>
3. <b>Example:</b> "For example, things like..."<br>
4. <b>Opposite:</b> "It's the opposite of..."</div>
<div class="tip-box">💡 IELTS Examiners ชอบผู้ที่ paraphrase ได้ — แสดงถึง vocabulary range ที่กว้าง!</div></div></div>`
      },
      { id:'s3', title:'Discussion & Debate', sub:'ภาษาแสดงความเห็นและโต้แย้ง', level:'B2–C1',
        content:`<div class="lc"><h2>🗣️ Discussion & Debate Language</h2>
<div class="lc-section"><h3>🔵 Giving Opinions</h3>
<div class="chips"><span class="chip">From my perspective,</span><span class="chip">In my view,</span><span class="chip">It seems to me that</span><span class="chip">As I see it,</span><span class="chip">I would argue that</span><span class="chip">Personally, I believe</span></div></div>
<div class="lc-section"><h3>🟡 Agreeing & Disagreeing (Advanced)</h3>
<table class="phrase-table"><tr><th>Agreeing</th><th>Partially Agreeing</th><th>Disagreeing</th></tr>
<tr><td>I couldn't agree more.</td><td>You have a point, but...</td><td>I beg to differ.</td></tr>
<tr><td>That's exactly what I think.</td><td>That's partly true, however...</td><td>I'm afraid I disagree.</td></tr>
<tr><td>I share your view.</td><td>While I see your point...</td><td>I take a different view.</td></tr></table></div>
<div class="lc-section"><h3>🟣 Interrupting & Taking the Floor</h3>
<div class="chips purple"><span class="chip purple">If I could just add...</span><span class="chip purple">Sorry to interrupt, but...</span><span class="chip purple">Can I just say something here?</span><span class="chip purple">Going back to what you said...</span></div></div></div>`
      },
      { id:'s4', title:'Pronunciation Guide', sub:'เสียงที่คนไทยมักออกผิด', level:'A2–B2',
        content:`<div class="lc"><h2>🎵 Pronunciation Guide</h2>
<div class="lc-section"><h3>🔵 เสียงที่คนไทยมักออกผิด</h3>
<table class="phrase-table"><tr><th>เสียง</th><th>ปัญหา</th><th>วิธีออก</th><th>ตัวอย่าง</th></tr>
<tr><td><b>th</b></td><td>ออกเป็น /t/ หรือ /d/</td><td>วางลิ้นระหว่างฟัน เป่าลมออก</td><td>think, this, three</td></tr>
<tr><td><b>v</b></td><td>ออกเป็น /w/</td><td>ฟันบนกัดริมฝีปากล่าง</td><td>very, value, vote</td></tr>
<tr><td><b>r</b></td><td>ออกม้วนลิ้นแบบไทย</td><td>ม้วนลิ้นเบาๆ ไม่สั่น</td><td>right, road, red</td></tr>
<tr><td><b>final -ed</b></td><td>ออกเสียง /ed/ ทุกตัว</td><td>/t/ หลังเสียงโทน, /d/ หลังเสียงก้อง</td><td>walked /t/, played /d/, wanted /id/</td></tr></table></div>
<div class="lc-section"><h3>🟡 Word Stress</h3>
<div class="rule-box">
<b>คำ 2 พยางค์: Noun vs Verb</b><br>
NOUN → เน้นพยางค์แรก: <b>PER</b>-mit, <b>RE</b>-cord, <b>PRE</b>-sent<br>
VERB → เน้นพยางค์หลัง: per-<b>MIT</b>, re-<b>CORD</b>, pre-<b>SENT</b></div></div>
<div class="lc-section"><h3>🟣 Sentence Stress</h3>
<p>ใน Spoken English เน้นเฉพาะ Content Words (Nouns, Verbs, Adjectives, Adverbs) — ไม่เน้น Function Words (a, the, is, in, and...)</p>
<div class="rule-box"><i>"I <b>WANT</b> to <b>BUY</b> a <b>NEW</b> <b>CAR</b> <b>TOMORROW</b>."</i></div></div></div>`
      },
      { id:'s5', title:'IELTS Speaking Strategies', sub:'Band 7+ Tips · Part 1, 2, 3', level:'B2–C1',
        content:`<div class="lc"><h2>🏆 IELTS Speaking Strategies</h2>
<div class="lc-section"><h3>🔵 Part 1: Short Answers (4-5 minutes)</h3>
<div class="rule-box"><b>Strategy:</b> ตอบตรง + ขยาย 1-2 ประโยค + ตัวอย่างส่วนตัว<br>
<b>Q:</b> "Do you enjoy cooking?"<br>
<b>Band 5:</b> "Yes, I like cooking."<br>
<b>Band 7+:</b> "Absolutely, I find cooking quite therapeutic. I especially enjoy experimenting with Thai-fusion dishes on weekends, which allows me to be creative while also learning about different culinary traditions."</div></div>
<div class="lc-section"><h3>🟡 Part 2: Long Turn (1-2 minutes)</h3>
<ul>
<li>ใช้ 1 นาทีวางแผน — จด keywords ไม่ต้องเป็นประโยค</li>
<li>ใช้ Structure: <b>When, Where, Who, What happened, How you felt</b></li>
<li>พูดให้ครบ 2 นาที — อย่าหยุดก่อน</li>
<li>ใช้ "...which reminded me of..." หรือ "...what was particularly interesting was..." เพื่อขยายเวลา</li>
</ul></div>
<div class="lc-section"><h3>🟣 Part 3: Discussion (4-5 minutes)</h3>
<div class="rule-box"><b>Formula: Answer + Reason + Example + Contrast</b><br>
<i>"I would say that technology has fundamentally changed education. <b>This is because</b> students now have access to virtually unlimited resources online. <b>For instance</b>, platforms like Khan Academy provide free world-class education. <b>However</b>, this also means that traditional social skills developed in classrooms may be diminishing."</i></div></div></div>`
      }
    ]
  }
];

const EXTRA_LESSONS = {
  grammar: [
    { id:'g7', title:'Sentence Patterns & Clause Control', sub:'SVO · Clauses · Complex Sentences', level:'A2–B2',
      content:`<div class="lc"><h2>🧩 Sentence Patterns & Clause Control</h2>
<div class="lc-section"><h3>🔵 โครงประโยคหลักที่ต้องจับให้ได้</h3>
<p>ถ้าจับโครงประโยคได้ การอ่านและการเขียนจะง่ายขึ้นมาก เพราะเราจะรู้ว่าใครทำอะไร และส่วนไหนเป็นแค่ส่วนขยาย</p>
<table class="phrase-table"><tr><th>Pattern</th><th>ตัวอย่าง</th><th>ใช้เมื่อไหร่</th></tr>
<tr><td>S + V</td><td>Prices rose.</td><td>ประโยคสั้น เหตุการณ์เกิดขึ้น</td></tr>
<tr><td>S + V + O</td><td>The policy affected students.</td><td>มีผู้ถูกกระทำหรือสิ่งที่ได้รับผล</td></tr>
<tr><td>S + V + C</td><td>The results are encouraging.</td><td>บอกสภาพ/ลักษณะของประธาน</td></tr></table></div>
<div class="lc-section"><h3>🟡 Main Clause vs Subordinate Clause</h3>
<div class="rule-box"><b>Main clause</b> อยู่เดี่ยวได้: <i>Students need feedback.</i><br>
<b>Subordinate clause</b> อยู่เดี่ยวไม่ได้: <i>because feedback helps them improve</i><br>
รวมกัน: <i>Students need feedback <b>because feedback helps them improve</b>.</i></div></div>
<div class="lc-section"><h3>🟣 สูตรอัปเกรดประโยค</h3>
<ul>
<li>เริ่มจากประโยคสั้น: <b>Online learning is convenient.</b></li>
<li>เพิ่มเหตุผล: <b>Online learning is convenient because students can study anywhere.</b></li>
<li>เพิ่ม concession: <b>Although online learning is convenient, it requires strong self-discipline.</b></li>
<li>เพิ่ม relative clause: <b>Students who lack self-discipline may struggle with online courses.</b></li>
</ul></div></div>` },
    { id:'g8', title:'Common Grammar Traps for Thai Learners', sub:'จุดพลาดบ่อยของคนไทย', level:'A1–B2',
      content:`<div class="lc"><h2>🎯 Common Grammar Traps for Thai Learners</h2>
<div class="lc-section"><h3>🔵 Subject-Verb Agreement</h3>
<div class="compare-grid">
<div class="compare-box purple"><b>❌ ผิด</b><p>She go to school every day.</p><p>The results is clear.</p></div>
<div class="compare-box sky"><b>✅ ถูก</b><p>She <b>goes</b> to school every day.</p><p>The results <b>are</b> clear.</p></div>
</div>
<p>ภาษาไทยไม่มีการผันกริยาตามประธาน จึงต้องเช็กประธานทุกครั้งก่อนเลือก verb</p></div>
<div class="lc-section"><h3>🟡 Countable vs Uncountable</h3>
<table class="phrase-table"><tr><th>Uncountable</th><th>อย่าใช้</th><th>ใช้แบบนี้</th></tr>
<tr><td>advice</td><td>advices</td><td>a piece of advice</td></tr>
<tr><td>information</td><td>informations</td><td>some information</td></tr>
<tr><td>equipment</td><td>equipments</td><td>a piece of equipment</td></tr></table></div>
<div class="lc-section"><h3>🟣 Preposition ที่ชอบพลาด</h3>
<div class="chips"><span class="chip">good at</span><span class="chip">interested in</span><span class="chip">depend on</span><span class="chip">similar to</span><span class="chip">different from</span><span class="chip">responsible for</span></div>
<div class="tip-box">ฝึกจำเป็น chunk ทั้งก้อน อย่าจำแยกเป็นคำเดี่ยว เช่น <b>interested in something</b></div></div></div>` }
  ],
  vocabulary: [
    { id:'v6', title:'Topic Vocabulary Packs', sub:'Work · Study · Technology · Society', level:'A2–C1',
      content:`<div class="lc"><h2>📦 Topic Vocabulary Packs</h2>
<div class="lc-section"><h3>🔵 Work & Career</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">career progression</div><div class="meaning">ความก้าวหน้าในอาชีพ</div><div class="ex">Career progression is a major reason people change jobs.</div></div>
<div class="vocab-item"><div class="word">work-life balance</div><div class="meaning">สมดุลชีวิตและงาน</div><div class="ex">Remote work can improve work-life balance.</div></div>
<div class="vocab-item"><div class="word">job security</div><div class="meaning">ความมั่นคงในงาน</div><div class="ex">Many graduates value job security over a high salary.</div></div>
</div></div>
<div class="lc-section"><h3>🟡 Technology & Society</h3>
<div class="vocab-grid">
<div class="vocab-item"><div class="word">digital literacy</div><div class="meaning">ความสามารถใช้เทคโนโลยีอย่างเข้าใจ</div><div class="ex">Digital literacy is essential in modern education.</div></div>
<div class="vocab-item"><div class="word">data privacy</div><div class="meaning">ความเป็นส่วนตัวของข้อมูล</div><div class="ex">Users are increasingly concerned about data privacy.</div></div>
<div class="vocab-item"><div class="word">automation</div><div class="meaning">ระบบอัตโนมัติ</div><div class="ex">Automation may replace some repetitive jobs.</div></div>
</div></div>
<div class="lc-section"><h3>🟣 ใช้คำเป็นระดับ</h3>
<table class="phrase-table"><tr><th>Basic</th><th>Better</th><th>Academic</th></tr>
<tr><td>good</td><td>useful</td><td>beneficial</td></tr>
<tr><td>bad</td><td>harmful</td><td>detrimental</td></tr>
<tr><td>big problem</td><td>serious issue</td><td>pressing concern</td></tr></table></div></div>` },
    { id:'v7', title:'Vocabulary Memory System', sub:'จำศัพท์ด้วย chunks และ spaced review', level:'A1–B2',
      content:`<div class="lc"><h2>🧠 Vocabulary Memory System</h2>
<div class="lc-section"><h3>🔵 อย่าจำคำเดี่ยว ให้จำเป็น Chunk</h3>
<div class="compare-grid">
<div class="compare-box purple"><b>จำแบบเหนื่อย</b><p>impact = ผลกระทบ</p></div>
<div class="compare-box sky"><b>จำแบบเอาไปใช้ได้</b><p><b>have an impact on</b> education</p><p><b>make a significant impact</b></p></div>
</div></div>
<div class="lc-section"><h3>🟡 4 รอบทบทวนที่เวิร์ก</h3>
<ul>
<li>รอบที่ 1: หลังเรียนทันที เขียนตัวอย่าง 1 ประโยค</li>
<li>รอบที่ 2: วันถัดไป ปิดความหมายแล้วทาย</li>
<li>รอบที่ 3: หลัง 3 วัน ใช้คำในหัวข้อใหม่</li>
<li>รอบที่ 4: หลัง 1 สัปดาห์ เอาไปพูดหรือเขียนจริง</li>
</ul></div>
<div class="lc-section"><h3>🟣 Template สมุดศัพท์</h3>
<table class="phrase-table"><tr><th>Word</th><th>Chunk</th><th>My sentence</th></tr>
<tr><td>mitigate</td><td>mitigate the problem</td><td>Better planning can mitigate traffic problems.</td></tr>
<tr><td>crucial</td><td>crucial for success</td><td>Feedback is crucial for language improvement.</td></tr></table></div></div>` }
  ],
  reading: [
    { id:'r6', title:'Question Type Strategies', sub:'True/False/Not Given · Matching · Summary', level:'B1–C1',
      content:`<div class="lc"><h2>🧭 Reading Question Type Strategies</h2>
<div class="lc-section"><h3>🔵 True / False / Not Given</h3>
<ul>
<li><b>True:</b> ข้อความในโจทย์ตรงกับ passage</li>
<li><b>False:</b> passage บอกตรงข้ามกับโจทย์</li>
<li><b>Not Given:</b> passage ไม่ได้ให้ข้อมูลพอจะตัดสิน</li>
</ul>
<div class="tip-box">ถ้าใช้ความรู้ส่วนตัวตอบ แปลว่ากำลังเสี่ยงผิด ให้กลับไปหา evidence ใน passage เท่านั้น</div></div>
<div class="lc-section"><h3>🟡 Matching Headings</h3>
<p>อ่าน first sentence + last sentence ของย่อหน้าก่อน แล้วค่อยดู examples ตรงกลาง เพราะหัวข้อหลักมักอยู่ต้นหรือท้าย</p>
<div class="rule-box"><b>อย่าเลือก heading จากคำที่ซ้ำกันอย่างเดียว</b> ต้องเลือกจากใจความรวมของย่อหน้า</div></div>
<div class="lc-section"><h3>🟣 Summary Completion</h3>
<ul>
<li>ดู part of speech ที่ช่องว่างต้องการ: noun, verb, adjective</li>
<li>จับ synonym: harmful = detrimental, rise = increase</li>
<li>เช็ก grammar หลังเติมคำว่าประโยคยังถูกไหม</li>
</ul></div></div>` },
    { id:'r7', title:'Critical Reading', sub:'Argument · Evidence · Bias', level:'B2–C2',
      content:`<div class="lc"><h2>🔎 Critical Reading</h2>
<div class="lc-section"><h3>🔵 แยก Claim, Evidence, Reasoning</h3>
<table class="phrase-table"><tr><th>ส่วนของบทความ</th><th>หน้าที่</th><th>คำถามที่ควรถาม</th></tr>
<tr><td>Claim</td><td>สิ่งที่ผู้เขียนต้องการให้เชื่อ</td><td>เขากำลังยืนยันอะไร?</td></tr>
<tr><td>Evidence</td><td>ข้อมูลที่นำมาสนับสนุน</td><td>มีหลักฐานจริงไหม?</td></tr>
<tr><td>Reasoning</td><td>การเชื่อมหลักฐานกับข้อสรุป</td><td>ตรรกะสมเหตุสมผลไหม?</td></tr></table></div>
<div class="lc-section"><h3>🟡 สัญญาณของ Bias</h3>
<div class="chips gold"><span class="chip gold">loaded words</span><span class="chip gold">one-sided evidence</span><span class="chip gold">missing counterargument</span><span class="chip gold">overgeneralisation</span></div>
<p>คำอย่าง <b>obviously, completely, disastrous, flawless</b> อาจบอกว่า tone ของผู้เขียนเอนเอียง</p></div>
<div class="lc-section"><h3>🟣 อ่านแบบสอบจริง</h3>
<ul>
<li>ขีดคำที่บอกท่าทีผู้เขียน: <b>however, despite, arguably, critics claim</b></li>
<li>ถามตัวเองว่า author เห็นด้วยหรือแค่รายงานข้อมูล</li>
<li>อย่ารีบสรุปจากประโยคเดียว ให้ดูบริบทก่อนและหลัง</li>
</ul></div></div>` }
  ],
  writing: [
    { id:'w6', title:'Email & Message Writing', sub:'Formal email · Request · Complaint · Follow-up', level:'A2–B2',
      content:`<div class="lc"><h2>📨 Email & Message Writing</h2>
<div class="lc-section"><h3>🔵 โครงอีเมลทางการ</h3>
<div class="rule-box"><b>Subject:</b> Request for Information about the Course<br>
<b>Opening:</b> Dear Admissions Team,<br>
<b>Purpose:</b> I am writing to enquire about...<br>
<b>Details:</b> I would appreciate it if you could provide...<br>
<b>Closing:</b> Thank you for your time. I look forward to hearing from you.</div></div>
<div class="lc-section"><h3>🟡 Phrase Bank</h3>
<table class="phrase-table"><tr><th>สถานการณ์</th><th>ประโยคที่ใช้ได้</th></tr>
<tr><td>ขอข้อมูล</td><td>Could you please provide further details about...?</td></tr>
<tr><td>ร้องเรียนสุภาพ</td><td>I would like to raise a concern regarding...</td></tr>
<tr><td>ติดตามเรื่อง</td><td>I am following up on my previous email about...</td></tr></table></div>
<div class="lc-section"><h3>🟣 Formality Upgrade</h3>
<div class="compare-grid">
<div class="compare-box purple"><b>Too casual</b><p>Hi, I wanna know about the test.</p></div>
<div class="compare-box sky"><b>Better</b><p>Dear Sir or Madam, I would like to ask for more information about the test.</p></div>
</div></div></div>` },
    { id:'w7', title:'Data Description Language', sub:'IELTS Task 1 · Graphs · Trends', level:'B1–C1',
      content:`<div class="lc"><h2>📈 Data Description Language</h2>
<div class="lc-section"><h3>🔵 Trend Verbs</h3>
<table class="phrase-table"><tr><th>Trend</th><th>Verb</th><th>Example</th></tr>
<tr><td>เพิ่มขึ้น</td><td>rise / increase / climb / surge</td><td>The figure rose steadily.</td></tr>
<tr><td>ลดลง</td><td>fall / decrease / decline / drop</td><td>Sales declined sharply.</td></tr>
<tr><td>คงที่</td><td>remain stable / level off</td><td>The rate remained stable.</td></tr></table></div>
<div class="lc-section"><h3>🟡 Adverbs & Adjectives</h3>
<div class="chips"><span class="chip">slightly</span><span class="chip">gradually</span><span class="chip">steadily</span><span class="chip">sharply</span><span class="chip">dramatically</span><span class="chip">significantly</span></div>
<div class="rule-box"><i>The number of users <b>increased dramatically</b> from 2018 to 2022.</i><br>
<i>There was a <b>dramatic increase</b> in the number of users.</i></div></div>
<div class="lc-section"><h3>🟣 Overview ที่ดี</h3>
<p>Overview ไม่ต้องใส่ตัวเลขละเอียด แต่ต้องสรุปภาพรวม เช่น อะไรสูงสุด ต่ำสุด หรือแนวโน้มหลักคืออะไร</p>
<div class="tip-box">ตัวอย่าง: <b>Overall, both categories increased over the period, with online sales showing the most dramatic growth.</b></div></div></div>` }
  ],
  speaking: [
    { id:'s6', title:'Storytelling Frameworks', sub:'เล่าเรื่องให้ลื่นและน่าฟัง', level:'A2–B2',
      content:`<div class="lc"><h2>🎙️ Storytelling Frameworks</h2>
<div class="lc-section"><h3>🔵 STAR Framework</h3>
<table class="phrase-table"><tr><th>Step</th><th>ความหมาย</th><th>ตัวอย่างวลี</th></tr>
<tr><td>S</td><td>Situation</td><td>It happened when...</td></tr>
<tr><td>T</td><td>Task</td><td>My goal was to...</td></tr>
<tr><td>A</td><td>Action</td><td>What I did was...</td></tr>
<tr><td>R</td><td>Result</td><td>In the end, I managed to...</td></tr></table></div>
<div class="lc-section"><h3>🟡 เติมอารมณ์ให้คำตอบ</h3>
<div class="chips purple"><span class="chip purple">I was genuinely surprised</span><span class="chip purple">It was a bit challenging</span><span class="chip purple">What made it memorable was...</span><span class="chip purple">Looking back, I feel...</span></div></div>
<div class="lc-section"><h3>🟣 ตัวอย่างสั้น</h3>
<div class="rule-box"><i>It happened during my final year at school. I had to give a presentation in English, which made me extremely nervous. What I did was practise with a timer every night. In the end, I spoke more confidently than I expected, and that experience made me less afraid of public speaking.</i></div></div></div>` },
    { id:'s7', title:'Rhythm & Shadowing Practice', sub:'ฝึกจังหวะ พูดให้เป็นธรรมชาติ', level:'A1–C1',
      content:`<div class="lc"><h2>🎧 Rhythm & Shadowing Practice</h2>
<div class="lc-section"><h3>🔵 Shadowing คืออะไร</h3>
<p>Shadowing คือการฟังประโยคภาษาอังกฤษแล้วพูดตามทันที โดยเลียนแบบจังหวะ น้ำเสียง และการเชื่อมเสียง ไม่ใช่แค่อ่านออกเสียง</p>
<ul>
<li>รอบที่ 1: ฟังอย่างเดียว จับความหมายรวม</li>
<li>รอบที่ 2: พูดตามช้า ๆ ดู transcript ได้</li>
<li>รอบที่ 3: พูดตามพร้อมเสียงจริง</li>
<li>รอบที่ 4: ปิด transcript แล้วพูดเลียนจังหวะ</li>
</ul></div>
<div class="lc-section"><h3>🟡 Connected Speech ที่เจอบ่อย</h3>
<table class="phrase-table"><tr><th>เขียน</th><th>เสียงพูดธรรมชาติ</th><th>หมายเหตุ</th></tr>
<tr><td>want to</td><td>wanna</td><td>ใช้ในบริบทลำลอง</td></tr>
<tr><td>going to</td><td>gonna</td><td>ใช้กับ future plan</td></tr>
<tr><td>next door</td><td>nex door</td><td>เสียง /t/ หายเมื่อพูดเร็ว</td></tr></table></div>
<div class="lc-section"><h3>🟣 Drill 5 นาทีต่อวัน</h3>
<div class="tip-box">เลือกคลิปสั้น 20-30 วินาที ฝึกซ้ำ 5 รอบต่อวัน ดีกว่าเปิดคลิปยาว 1 ชั่วโมงแต่ไม่ได้พูดตามเลย</div></div></div>` }
  ]
};

Object.entries(EXTRA_LESSONS).forEach(([catId, units]) => {
  const cat = LESSON_CATS.find(c => c.id === catId);
  if(cat) cat.units.push(...units);
});

// ══════════════════════════════════════════════════
//   QUIZ QUESTION DATABASE (25 per category)
// ══════════════════════════════════════════════════

const QUIZ_DB = {
  grammar: [
    {q:"She ___ to school every day by bicycle.", opts:["go","goes","going","has gone"], ans:1, level:"A1", exp:"ประธาน She (เอกพจน์) + Present Simple → กริยาต้องเติม -s → <b>goes</b>"},
    {q:"Right now, Tom ___ his homework in his room.", opts:["does","do","is doing","has done"], ans:2, level:"A1", exp:"'Right now' บ่งบอกว่ากำลังทำอยู่ตอนนี้ → Present Continuous: <b>is doing</b>"},
    {q:"I ___ him since we were at university together.", opts:["know","knew","have known","had known"], ans:2, level:"B1", exp:"'since' + ช่วงเวลาต่อเนื่องถึงปัจจุบัน → Present Perfect: <b>have known</b>"},
    {q:"When I arrived at the party, most people ___.", opts:["already left","had already left","have already left","were already leaving"], ans:1, level:"B2", exp:"เหตุการณ์ที่สำเร็จก่อนอีกเหตุการณ์ในอดีต → Past Perfect: <b>had already left</b>"},
    {q:"If I ___ the lottery, I would travel the world.", opts:["win","won","had won","would win"], ans:1, level:"B2", exp:"Type 2 Conditional (สมมติปัจจุบัน/ไม่จริง): If + Past Simple → <b>won</b>"},
    {q:"If she ___ harder, she would have passed the exam.", opts:["studied","had studied","would study","studies"], ans:1, level:"B2", exp:"Type 3 Conditional (สมมติในอดีต): If + Past Perfect → <b>had studied</b>"},
    {q:"The report ___ by the committee last Tuesday.", opts:["was approved","approved","has been approved","is approved"], ans:0, level:"B1", exp:"'last Tuesday' = เหตุการณ์สำเร็จในอดีต + Passive → <b>was approved</b>"},
    {q:"My neighbour, ___ I've known for decades, has moved abroad.", opts:["who","that","which","whose"], ans:0, level:"C1", exp:"Non-defining relative clause (มีคอมมาล้อมรอบ) กับ 'คน' → <b>whom</b> หรือ <b>who</b> เท่านั้น ห้ามใช้ 'that'"},
    {q:"She told me that she ___ tired and wanted to go home.", opts:["is","was","has been","had been"], ans:1, level:"B2", exp:"Reported Speech: backshift จาก is → <b>was</b>"},
    {q:"You ___ bring an umbrella — the forecast says it'll be sunny.", opts:["must","mustn't","needn't","should"], ans:2, level:"B2", exp:"<b>needn't</b> = ไม่จำเป็นต้องทำ (don't need to) ≠ mustn't = ห้ามทำ"},
    {q:"By the time we arrive, the film ___.", opts:["will start","will have started","starts","is starting"], ans:1, level:"C1", exp:"'By the time + future' → Future Perfect: <b>will have started</b>"},
    {q:"I wish I ___ more time to prepare for the presentation.", opts:["have","had","would have","had had"], ans:1, level:"B2", exp:"'I wish' + สมมติปัจจุบัน → Past Simple: <b>had</b>"},
    {q:"___ had she sat down when her boss called her back in.", opts:["No sooner","Hardly ever","Not only","Never before"], ans:0, level:"C1", exp:"<b>No sooner … than</b> = พอ…ก็… — ใช้กับ Inversion (Had she sat down)"},
    {q:"He suggested ___ a different approach to the problem.", opts:["to try","try","trying","that tried"], ans:2, level:"B2", exp:"suggest + verb-ing (gerund): <b>trying</b>"},
    {q:"The new shopping centre ___ next year.", opts:["opens","will be opened","is going to open","both B and C"], ans:3, level:"B1", exp:"ทั้ง <b>will be opened</b> (Passive) และ <b>is going to open</b> (Active plan) ถูกทั้งคู่"},
    {q:"It ___ be her at the door — she said she'd come at 8.", opts:["can","must","should","might"], ans:1, level:"B2", exp:"<b>must</b> = ความน่าจะเป็นสูงมาก (logical deduction) เนื่องจากเราคาดไว้แล้ว"},
    {q:"The company ___ a profit for the first time in three years.", opts:["is making","has made","makes","had made"], ans:1, level:"B1", exp:"'for the first time' + ผลที่เกิดถึงปัจจุบัน → Present Perfect: <b>has made</b>"},
    {q:"She is used to ___ early — she's done it her whole career.", opts:["wake","waking","woke","have woken"], ans:1, level:"B2", exp:"be used to + verb-ing: <b>waking</b>"},
    {q:"___ I known about the meeting, I would have attended.", opts:["Had","If","Should","Would"], ans:0, level:"C1", exp:"Formal Inversion ของ Type 3 Conditional: <b>Had I known</b> = If I had known"},
    {q:"Not only ___ she pass, she got the highest mark.", opts:["she did","did she","had she","she had"], ans:1, level:"C1", exp:"Inversion หลัง 'Not only': Subject-Auxiliary สลับกัน → <b>did she</b>"},
    {q:"I'd rather you ___ call me so late at night.", opts:["don't","didn't","wouldn't","hadn't"], ans:1, level:"C1", exp:"I'd rather + subject + Past Simple (แม้จะพูดถึงปัจจุบัน): <b>didn't</b>"},
    {q:"The package ___ delivered while I was out.", opts:["had","got","was","being"], ans:2, level:"B1", exp:"Passive Voice Past Simple: Subject + <b>was</b> + V3"},
    {q:"He denied ___ the money from the safe.", opts:["to take","take","taking","that he takes"], ans:2, level:"B2", exp:"deny + verb-ing: <b>taking</b>"},
    {q:"The book, ___ was published in 1984, became an instant classic.", opts:["that","who","which","whom"], ans:2, level:"B2", exp:"Non-defining clause กับสิ่งของ → ต้องใช้ <b>which</b> (ห้ามใช้ 'that' หลังคอมมา)"},
    {q:"If water ___ to 0°C, it freezes. This is a scientific fact.", opts:["cools","cooled","would cool","has cooled"], ans:0, level:"B1", exp:"Type 0 Conditional (ความจริงสากล): If + Present Simple, Present Simple → <b>cools</b>"},
    {q:"I need a bigger ___ — this one is too small.", opts:["luggage","luggages","pieces of luggage","a luggage"], ans:0, level:"B1", exp:"<b>luggage</b> เป็น Uncountable Noun — ไม่มีรูปพหูพจน์ และไม่ใช้ a/an ตรงๆ (ถ้าจะนับต้องพูดว่า 'a piece of luggage')"},
    {q:"She asked me ___ I had seen her keys anywhere.", opts:["that","if","whether or not","both B and C"], ans:3, level:"B2", exp:"คำถามอ้อม (Indirect Question) ใช้ <b>if</b> หรือ <b>whether</b> ได้ทั้งคู่ — 'whether or not' ก็ถูก แต่ในตัวเลือกนี้ both B and C = if และ whether or not ถูกทั้งคู่"},
    {q:"She ___ for the company for 12 years before she retired.", opts:["was working","worked","had been working","has worked"], ans:2, level:"B2", exp:"เน้นการกระทำ 'ต่อเนื่อง' ก่อนเหตุการณ์ในอดีต (retired) → <b>Past Perfect Continuous: had been working</b>"},
    {q:"___ you need any assistance, please don't hesitate to call.", opts:["Would","Should","Had","Could"], ans:1, level:"C1", exp:"<b>Should you need</b> = formal inversion ของ Type 1 Conditional 'If you should need...' → ใช้มากในจดหมายและภาษาทางการ"},
    {q:"The students found the exam ___.", opts:["exhausting","exhausted","to exhaust","exhaust"], ans:0, level:"B1", exp:"find + Object + <b>Adjective</b>: 'found the exam exhausting' (สอบนั้นทำให้เหนื่อย) ≠ 'exhausted' (นักเรียนเหนื่อย)"},
    {q:"Neither the manager nor the employees ___ satisfied with the outcome.", opts:["was","were","is","has been"], ans:1, level:"C1", exp:"<b>Neither...nor</b>: กริยาตาม Subject ที่อยู่ใกล้กว่า → 'employees' = plural → <b>were</b>"},
    {q:"I'd sooner you ___ this to anyone else.", opts:["not mention","didn't mention","don't mention","won't mention"], ans:1, level:"C1", exp:"<b>I'd sooner + subject + Past Simple</b> (แม้อ้างถึงปัจจุบัน/อนาคต) = I'd rather + subject + Past Simple: <b>didn't mention</b>"},
    {q:"The more he practiced, ___ he became.", opts:["the better","the best","he got better","better"], ans:0, level:"B2", exp:"<b>The + comparative, the + comparative</b>: 'The more...the better' — โครงสร้างคงที่ แสดงความสัมพันธ์ขนาน"},
    {q:"She's ___ manager who everyone respects.", opts:["a","an","the","—"], ans:0, level:"A2", exp:"<b>a manager</b> — กล่าวถึงตำแหน่งครั้งแรก (ไม่เฉพาะเจาะจง) + 'manager' ขึ้นต้นด้วยพยัญชนะ /m/ → ใช้ <b>a</b>"}
  ],
  vocabulary: [
    {q:"The manager decided to ___ the meeting until next Monday.", opts:["call off","put off","run out","set aside"], ans:1, level:"B1", exp:"<b>put off</b> = เลื่อน (delay) | call off = ยกเลิก | ต่างกัน!"},
    {q:"I can't ___ this terrible noise from next door any longer!", opts:["put up with","put off","come across","look into"], ans:0, level:"B1", exp:"<b>put up with</b> = อดทนกับ (tolerate)"},
    {q:"Scientists have ___ a major breakthrough in cancer research.", opts:["done","made","reached","set"], ans:1, level:"B1", exp:"<b>make a breakthrough</b> — collocation: make + breakthrough"},
    {q:"She seemed tired despite ___ early.", opts:["waking up","going to bed","having slept","all of the above"], ans:3, level:"B2", exp:"ทุกตัวเลือกสื่อ 'นอนเร็ว/ตื่นแต่เช้า' → ถูกทุกตัว — ขึ้นอยู่กับ context"},
    {q:"He finally ___ his plans to study abroad after years of saving.", opts:["carried out","called out","turned down","gave up on"], ans:0, level:"B2", exp:"<b>carry out</b> = ดำเนินการ / ทำให้สำเร็จ"},
    {q:"She's been feeling ___ under the weather lately and missed several days of work.", opts:["exactly","quite","a bit","so"], ans:2, level:"B1", exp:"'under the weather' = ไม่สบาย (unwell) — <b>a bit under the weather</b> คือ natural collocation"},
    {q:"The new CEO really ___ the ground running on her first day.", opts:["hit","ran","fell","made"], ans:0, level:"B2", exp:"<b>hit the ground running</b> = เริ่มต้นได้ทันที อย่างมีประสิทธิภาพ"},
    {q:"I ___ my old school friend at the supermarket yesterday.", opts:["ran into","ran out of","looked into","came up with"], ans:0, level:"B1", exp:"<b>run into someone</b> = พบใครโดยบังเอิญ (bump into)"},
    {q:"After long negotiations, both sides finally ___ a compromise.", opts:["did","made","reached","arrived"], ans:2, level:"B2", exp:"<b>reach a compromise</b> — collocation: reach + compromise/agreement/conclusion"},
    {q:"The politician refused to take a clear stance and remained ___.", opts:["on the fence","in the air","off the record","out of hand"], ans:0, level:"B2", exp:"<b>on the fence</b> = ลังเล / ไม่แสดงจุดยืน"},
    {q:"The word 'enormous' means the same as ___.", opts:["tiny","immense","moderate","average"], ans:1, level:"B1", exp:"<b>enormous = immense</b> = ใหญ่โตมาก (กลุ่ม extreme adjective ไม่ใช้ 'very')"},
    {q:"Which collocation is CORRECT?", opts:["make research","do research","take research","have research"], ans:1, level:"B1", exp:"<b>do research</b> — จำ: do research / do homework / do damage"},
    {q:"The CEO decided to ___ the plan after concerns were raised.", opts:["abandon","abolish","annul","abrogate"], ans:0, level:"C1", exp:"<b>abandon a plan</b> = ละทิ้งแผน | abolish = ยกเลิก (กฎหมาย/ระบบ) | annul = ยกเลิก (การแต่งงาน)"},
    {q:"The policy had an immediate ___ on local businesses.", opts:["affect","effect","impact","both B and C"], ans:3, level:"B1", exp:"<b>effect on</b> (noun) และ <b>impact on</b> (noun) ถูกทั้งคู่ | affect = กริยา"},
    {q:"She ___ the secret without meaning to — it just slipped out.", opts:["spilled the beans","beat around the bush","broke the ice","got cracking"], ans:0, level:"B2", exp:"<b>spill the beans</b> = เปิดเผยความลับโดยไม่ตั้งใจ"},
    {q:"The company used ___ language to hide the fact that jobs were being cut.", opts:["euphemistic","verbose","colloquial","succinct"], ans:0, level:"C1", exp:"<b>euphemistic</b> = การใช้ภาษาอ้อมๆ เพื่อทำให้สิ่งแย่ฟังดูดีขึ้น"},
    {q:"Despite ___ heavily in new technology, the company failed.", opts:["having invested","investing","to invest","to have invested"], ans:1, level:"B2", exp:"'Despite' + gerund (V-ing): <b>investing</b>"},
    {q:"The government ___ its plans to reform the tax system.", opts:["announced","told","said","spoke"], ans:0, level:"B1", exp:"<b>announce plans/decisions</b> — collocation: announce + announcement content"},
    {q:"The report was written in a ___ style, using technical jargon throughout.", opts:["verbose","concise","succinct","colloquial"], ans:0, level:"C1", exp:"<b>verbose</b> = ใช้คำมากเกินความจำเป็น (wordy)"},
    {q:"He gave a very ___ presentation — covered everything in just 5 minutes.", opts:["concise","verbose","elated","prolific"], ans:0, level:"B2", exp:"<b>concise</b> = กระชับ ตรงประเด็น (= succinct)"},
    {q:"The findings ___ that further research is needed in this area.", opts:["suggest","imply","indicate","all of the above"], ans:3, level:"B2", exp:"suggest, imply, indicate ทั้งหมดถูกต้องและมีความหมายคล้ายกันในบริบทนี้"},
    {q:"She decided to ___ her resignation before the deadline.", opts:["give up","hand in","put out","call off"], ans:1, level:"B2", exp:"<b>hand in your resignation</b> = ยื่นใบลาออก"},
    {q:"The word 'mitigate' most closely means ___.", opts:["worsen","reduce","ignore","predict"], ans:1, level:"C1", exp:"<b>mitigate</b> = ลดความรุนแรงของปัญหา (lessen / reduce the severity of)"},
    {q:"She ___ a very professional impression at the interview.", opts:["did","gave","made","had"], ans:2, level:"B2", exp:"<b>make an impression</b> — collocation: make + impression"},
    {q:"The new study ___ the findings of earlier research.", opts:["corroborates","contradicts","contemplates","undermines"], ans:0, level:"C1", exp:"<b>corroborate</b> = ยืนยัน/สนับสนุน (confirm / back up) ข้อมูล"}
  ],
  reading: [
    {q:`<i>Text: "The committee's decision was met with widespread scepticism, with critics arguing that the proposed changes were too little, too late."</i><br><br>What does the phrase "too little, too late" suggest?`, opts:["The changes were too small and too early","The changes were inadequate and overdue","The changes were unexpected","The changes were well-received"], ans:1, level:"B2", exp:"'Too little, too late' = น้อยเกินไปและช้าเกินไป → การเปลี่ยนแปลงนั้น <b>ไม่เพียงพอและล่าช้าเกินไป</b>"},
    {q:`<i>Text: "Despite the company's consistent profitability, its share price has continued to fall."</i><br><br>What can be inferred?`, opts:["Investors are pleased with the company","Investors are worried about something beyond current profits","The company is losing money","Profitability always leads to higher share prices"], ans:1, level:"B2", exp:"ใช้ 'despite' แสดงความขัดแย้ง → หุ้นตก แม้กำไรดี → นักลงทุนกังวลเรื่องอื่น (อนาคต/ปัจจัยภายนอก)"},
    {q:`<i>Text: "The proliferation of misinformation on social media has made it increasingly difficult for citizens to distinguish fact from fiction."</i><br><br>The word 'proliferation' most nearly means:`, opts:["elimination","rapid spread","slow growth","regulation"], ans:1, level:"C1", exp:"<b>proliferation</b> = การแพร่กระจายอย่างรวดเร็ว (rapid increase/spread)"},
    {q:`<i>Text: "The new initiative, whilst well-intentioned, has faced mounting criticism from the very communities it was designed to help."</i><br><br>What does this sentence suggest?`, opts:["The initiative has been completely successful","The initiative is popular with local people","The initiative has unintended negative effects","The initiative was poorly planned from the start"], ans:2, level:"B2", exp:"'whilst well-intentioned' = ตั้งใจดี แต่ 'faced criticism from the communities it aimed to help' → มีผลตรงข้ามกับที่ตั้งใจ → unintended negative effects"},
    {q:`<i>Text: "Researchers have long debated whether intelligence is primarily inherited or shaped by environmental factors. Recent twin studies suggest the answer is not clear-cut."</i><br><br>What is the author's main point?`, opts:["Intelligence is 100% genetic","Intelligence is determined only by environment","The debate between nature and nurture is ongoing and complex","Twin studies have settled the debate"], ans:2, level:"B2", slideUp:true, exp:"'not clear-cut' = ไม่ชัดเจน 'long debated' = ถกเถียงมานาน → ยังไม่มีคำตอบชัดเจน → การโต้เถียงยังดำเนินต่อ"},
    {q:`The question asks you to find what is TRUE/FALSE/NOT GIVEN. <br><i>Text: "The Amazon rainforest absorbs approximately 2 billion tonnes of CO₂ annually."</i><br><i>Statement: "The Amazon rainforest is the world's largest forest."</i>`, opts:["TRUE","FALSE","NOT GIVEN","Cannot be determined"], ans:2, level:"B2", exp:"<b>NOT GIVEN</b> — บทความพูดถึงการดูดซับ CO₂ แต่ไม่ได้ระบุว่า Amazon เป็น 'ป่าที่ใหญ่ที่สุดในโลก' → ข้อมูลนี้ไม่มีในบทความ"},
    {q:`<i>Text: "The city's transport network, once the envy of neighbouring regions, has seen years of underfunding and neglect."</i><br><br>This sentence implies that in the past, the transport network was:`, opts:["poorly regarded","admired by others","worse than today","funded by neighbouring regions"], ans:1, level:"B1", exp:"'once the envy of neighbouring regions' = เคยเป็นที่อิจฉาของภูมิภาคใกล้เคียง → เคยเป็นที่ <b>ชื่นชม/ยอมรับ</b>"},
    {q:`<i>Text: "The author argues that urban sprawl, whilst providing affordable housing, ultimately exacerbates inequality by isolating lower-income communities from employment hubs."</i><br><br>What is the author's view of urban sprawl?`, opts:["Entirely positive","Entirely negative","Has benefits but causes greater harm","Solves the housing crisis"], ans:2, level:"C1", exp:"'whilst providing affordable housing' (ข้อดี) แต่ 'ultimately exacerbates inequality' (ข้อเสียใหญ่กว่า) → <b>มีประโยชน์แต่ก่อโทษมากกว่า</b>"},
    {q:`<i>Text: "The survey revealed that 78% of consumers prefer sustainable packaging, even if it costs slightly more."</i><br><br>What can be inferred from the survey findings?`, opts:["Price is the only factor for consumers.","Most consumers value sustainability over a small price increase.","Sustainable packaging is always cheaper to produce.","Consumers refuse to pay more for packaging."], ans:1, level:"B1", exp:"ผู้บริโภค 78% ยอมเลือกแพ็กเกจจิ้งที่เป็นมิตรต่อสิ่งแวดล้อมแม้ราคาจะแพงขึ้นเล็กน้อย แสดงว่าส่วนใหญ่ยินดีจ่ายเพิ่มเพื่อความยั่งยืน"},
    {q:`<i>Text: "Scientists have long sought a cure for Alzheimer's disease. Recent trials have yielded <b>promising</b> results."</i><br><br>The word 'promising' most closely means:`, opts:["disappointing","uncertain","showing signs of future success","fully proven"], ans:2, level:"B1", exp:"<b>promising</b> = แสดงศักยภาพที่ดีในอนาคต (showing signs of future success) — ไม่ได้ยืนยันว่าสำเร็จแล้ว แต่มีทิศทางที่ดี"},
    {q:`<i>Text: "The new law was passed <b>unanimously</b> by the parliament."</i><br><br>What does 'unanimously' mean?`, opts:["by a small majority","with great opposition","with everyone in agreement","secretly"], ans:2, level:"B2", exp:"<b>unanimously</b> = เป็นเอกฉันท์ — ทุกคนเห็นด้วยโดยไม่มีผู้คัดค้าน (= with everyone in agreement)"},
    {q:`<i>Text: "Despite having one of the lowest carbon footprints in the world, Iceland has faced criticism for its whaling practices."</i><br><br>The word 'despite' tells us:`, opts:["Iceland has a high carbon footprint","Iceland's whaling explains its low carbon footprint","There is a contrast between Iceland's environmental record and its whaling","Iceland is criticised for its carbon footprint"], ans:2, level:"B2", exp:"<b>despite</b> = signal ความขัดแย้ง — Iceland มี carbon footprint ต่ำ (ข้อดี) แต่ถูกวิจารณ์เรื่องการล่าวาฬ (ข้อเสีย) สองสิ่งนี้ขัดแย้งกัน"},
    {q:`<i>Text: "The former approach relied heavily on memorisation, whereas the latter encourages critical thinking."</i><br><br>What does 'the latter' refer to?`, opts:["The first approach (memorisation)","The second approach (critical thinking)","Both approaches","A third approach not mentioned"], ans:1, level:"B2", exp:"<b>the latter</b> = สิ่งที่กล่าวถึงทีหลัง = 'the latter approach' ซึ่งก็คือ approach ที่ 'encourages critical thinking'"},
    {q:`<i>Text: "The organisation's efforts to reduce plastic waste have been <b>lauded</b> by environmental groups worldwide."</i><br><br>The word 'lauded' most nearly means:`, opts:["criticised","ignored","praised","investigated"], ans:2, level:"C1", exp:"<b>laud</b> = ยกย่อง สรรเสริญ (= praise, commend, applaud) — ตรงข้ามกับ criticise/condemn"},
    {q:`<i>Text: "The researcher acknowledged the study's limitations, noting that the sample size was relatively small."</i><br><br>What can be inferred about the researcher?`, opts:["They are trying to hide flaws in the research","They are being intellectually honest about the study's weaknesses","They believe the study is completely invalid","They are asking for more funding"], ans:1, level:"B2", exp:"'acknowledged limitations' = การยอมรับข้อจำกัดของงานวิจัยอย่างตรงไปตรงมา → แสดงถึง <b>intellectual honesty</b> ไม่ใช่การปกปิด"},
    {q:`Read the question type: The following is an IELTS True/False/NG question.<br><i>Text: "Mount Everest, the world's highest peak, was first summited in 1953."</i><br><i>Statement: "Edmund Hillary was the only person to reach the summit in 1953."</i>`, opts:["TRUE","FALSE","NOT GIVEN","Impossible to determine"], ans:2, level:"B2", exp:"<b>NOT GIVEN</b> — บทความระบุเพียง 'first summited in 1953' แต่ไม่ได้ระบุว่ามีกี่คนหรือใครบ้างที่ขึ้นไป ข้อมูลเรื่อง Edmund Hillary ไม่มีในบทความ"},
    {q:`<i>Text: "The company's profits <b>soared</b> in the final quarter, exceeding analysts' expectations by 40%."</i><br><br>What does 'soared' suggest about the profits?`, opts:["They fell sharply","They increased dramatically","They remained stable","They slightly improved"], ans:1, level:"B1", exp:"<b>soar</b> = พุ่งสูงขึ้นอย่างรวดเร็วและมาก (= skyrocket, surge, shoot up) — เป็น extreme verb ไม่ใช่แค่การเพิ่มทั่วไป"},
    {q:`<i>Text: "The author, whilst sympathetic to the protestors' aims, questioned whether their methods were counterproductive."</i><br><br>The author's overall attitude towards the protestors is best described as:`, opts:["Completely supportive","Completely opposed","Supportive of their goals but critical of their approach","Indifferent to their cause"], ans:2, level:"C1", exp:"'sympathetic to their aims' = เห็นด้วยกับเป้าหมาย แต่ 'questioned whether methods were counterproductive' = วิจารณ์วิธีการ → ทัศนคติที่ <b>แยกระหว่าง aims และ methods</b>"},
    {q:`<i>Text: "Global temperatures have risen by approximately 1.1°C since pre-industrial times, with the last decade being the hottest on record."</i><br><br>What does 'on record' mean in this context?`, opts:["According to music recordings","Since humans began keeping systematic measurements","Officially verified by one scientist","In the last 10 years only"], ans:1, level:"B2", exp:"<b>on record</b> = ตั้งแต่มีการบันทึกข้อมูลอย่างเป็นระบบ (since systematic measurements began) — ใช้กับสถิติที่มีข้อมูลยืนยัน เช่น 'hottest on record', 'coldest on record'"},
    {q:`<i>Text: "It is <b>imperative</b> that governments act swiftly on climate change."</i><br><br>The word 'imperative' most closely means:`, opts:["optional","suggested","absolutely necessary","slightly important"], ans:2, level:"C1", exp:"<b>imperative</b> = จำเป็นอย่างเร่งด่วนที่สุด ขาดไม่ได้ (= essential, crucial, vital) — ใช้เน้นความเร่งด่วนและความจำเป็น"},
    {q:`<i>Text: "The initiative, which was hailed as a breakthrough when first announced, has since drawn considerable <b>scepticism</b>."</i><br><br>The passage implies that:`, opts:["The initiative was never popular","Initial enthusiasm has given way to doubt","Everyone still supports the initiative","The initiative was a failure from the start"], ans:1, level:"B2", exp:"'hailed as a breakthrough when first announced' (ตอนแรกรับตอนดีมาก) แต่ 'has since drawn considerable scepticism' (ตอนหลังเริ่มถูกตั้งคำถาม) → ความรู้สึกเปลี่ยนแปลงไปในทิศทางแย่ลง"},
    {q:`Which reading strategy is most useful for answering IELTS 'Matching Headings' questions?`, opts:["Read every word of each paragraph carefully","Skim the first and last sentence of each paragraph to identify its main topic","Read all the headings first, then read the entire passage","Only look for keywords in the middle of paragraphs"], ans:1, level:"B2", exp:"<b>Matching Headings strategy</b>: อ่าน <b>ประโยคแรกและสุดท้าย</b> ของแต่ละย่อหน้า → จับ Main Topic → จับคู่กับ heading — ไม่จำเป็นต้องอ่านทุกคำ"},
    {q:`<i>Text: "Renewable energy sources, such as solar and wind power, are becoming increasingly <b>viable</b> alternatives to fossil fuels."</i><br><br>The word 'viable' most nearly means:`, opts:["expensive","dangerous","possible and practical","theoretical"], ans:2, level:"B2", exp:"<b>viable</b> = ทำได้จริงในทางปฏิบัติ เป็นไปได้และคุ้มค่า (= feasible, practical, workable) — ตรงข้ามกับ 'theoretical' หรือ 'impractical'"},
    {q:`<i>Text: "The government announced sweeping reforms. <b>These measures</b> are expected to take effect next year."</i><br><br>What does 'These measures' refer to?`, opts:["The government itself","The sweeping reforms announced","Next year's plans","The current laws"], ans:1, level:"B1", exp:"<b>These measures</b> = Reference word ชี้กลับไปยัง 'sweeping reforms' ที่กล่าวถึงในประโยคก่อนหน้า — ฝึกติดตาม pronoun/reference word เสมอ"},
    {q:`<i>Text: "The village had remained largely unchanged for centuries. <b>However</b>, the arrival of a new motorway fundamentally altered its character."</i><br><br>The word 'however' signals:`, opts:["An additional point","A reason or cause","A contrast or unexpected change","A conclusion"], ans:2, level:"B1", exp:"<b>However</b> = Contrast signal — บอกว่าสิ่งที่ตามมา 'ขัดแย้ง' กับสิ่งที่กล่าวไว้ก่อนหน้า ประโยคแรกบอกว่าหมู่บ้านไม่เปลี่ยน แต่ประโยคสองบอกว่าเปลี่ยนแล้ว"}
  ],
  writing: [
    {q:"In formal academic writing, which of the following transition words is best used to add a supporting point?", opts:["However","Consequently","Furthermore","On the other hand"], ans:2, level:"B2", exp:"<b>Furthermore</b> ใช้เพิ่มข้อมูลที่เกื้อหนุนพาร์ทเดิม (In addition/Moreover) ส่วน However/On the other hand ใช้แสดงความขัดแย้ง และ Consequently แสดงเหตุผลสัมพัทธ์"},
    {q:"According to the PEEL structure for paragraph writing, what does the first 'E' stand for?", opts:["Evidence","Explain","Example","Evaluation"], ans:0, level:"B1", exp:"โครงสร้าง PEEL Method ประกอบด้วย: P = Point (ประเด็นหลัก), <b>E = Evidence</b> (หลักฐาน/ข้อมูลสถิติ), E = Explain (อธิบายขยายความ), L = Link (เชื่อมโยง)"},
    {q:"Which of the following sentences correctly utilizes a formal tone suitable for an essay?", opts:["The results were completely crazy and out of this world.","We guess that the data looks pretty good.","The evidence suggests a significant correlation between the two variables.","A lot of people got super mad at the new government policy."], ans:2, level:"B2", exp:"งานเขียนวิชาการห้ามใช้ภาษาพูด ตัวเลือกที่ถูกต้องคือ <b>The evidence suggests...</b> ซึ่งมีความเป็นกลางและเป็นทางการที่สุด"},
    {q:"Which coordinator must be paired with 'Not only' to ensure grammatical parallelism?", opts:["but also","and as well","however","therefore"], ans:0, level:"B1", exp:"Correlative Conjunction ที่เป็นคู่ล็อกตายตัวคือ <b>Not only ... but also</b> (ไม่เพียงแต่... แต่ยัง... อีกด้วย)"},
    {q:"In an opinion essay, where should the writer's position be clearly stated?", opts:["Only in the conclusion","Only in the body paragraphs","In the introduction and maintained throughout","It is not necessary to state a position"], ans:2, level:"B2", exp:"IELTS Opinion Essay ต้องระบุจุดยืน (position) ชัดเจนตั้งแต่ <b>Introduction</b> และรักษาจุดยืนนั้นตลอดทั้งเรียงความ"},
    {q:"Which of the following is NOT appropriate in academic writing?", opts:["The data indicates a significant trend.","It is argued that climate change is accelerating.","It's clear that the results don't make sense.","The findings suggest a strong correlation."], ans:2, level:"B1", exp:"<b>ห้ามใช้ contractions</b> (it's, don't) ใน Academic Writing ต้องเขียน 'it is' และ 'do not' เสมอ"},
    {q:"What is the formal equivalent of 'a lot of' in academic writing?", opts:["many / much / a great deal of","so many","a bunch of","loads of"], ans:0, level:"B1", exp:"'a lot of' เป็น informal — ใน Academic Writing ใช้ <b>many</b> (นับได้), <b>much</b> (นับไม่ได้), หรือ <b>a significant number of / a considerable amount of</b>"},
    {q:"In a Discussion Essay, what is the purpose of the conclusion?", opts:["To introduce new arguments","To summarise and give your personal view","To repeat the introduction word for word","To provide more evidence"], ans:1, level:"B2", exp:"Conclusion ของ Discussion Essay ทำหน้าที่ <b>สรุปประเด็นสองฝ่าย</b> และ <b>ระบุจุดยืนของผู้เขียนเป็นครั้งแรก</b> (ต่างจาก Opinion Essay ที่ระบุตั้งแต่ต้น)"},
    {q:"Which linker correctly introduces a concession (ยอมรับมุมมองตรงข้าม)?", opts:["Therefore","Admittedly","Furthermore","Consequently"], ans:1, level:"C1", exp:"<b>Admittedly</b> ใช้แนะนำ concession: ยอมรับข้อโต้แย้งฝ่ายตรงข้ามก่อน แล้วค่อยหักล้าง เช่น 'Admittedly, social media has benefits, but...'"},
    {q:"What is 'nominalization' in academic writing?", opts:["Using pronouns to avoid repetition","Converting verbs/adjectives into nouns","Adding suffixes to make words longer","Using passive voice throughout"], ans:1, level:"C1", exp:"<b>Nominalization</b> = เปลี่ยนกริยา/คำคุณศัพท์เป็นคำนาม เพื่อความเป็นทางการ เช่น 'decide → decision', 'analyse → analysis'"},
    {q:"Which sentence is the most effective topic sentence for a paragraph?", opts:["This paragraph is about pollution.","Pollution is bad.","Urban air pollution poses serious and measurable threats to public health.","Some people think pollution is a problem."], ans:2, level:"B2", exp:"Topic Sentence ที่ดีต้องระบุ <b>ประเด็นชัดเจน + มีความเฉพาะเจาะจง</b> ตัวเลือก C ระบุทั้งประเภท (urban air), ขอบเขต (measurable), และผลกระทบ (public health)"},
    {q:"In Problem-Solution essays, which paragraph typically contains the proposed solutions?", opts:["Paragraph 1","Paragraph 2","Paragraph 3","Paragraph 4"], ans:3, level:"B1", exp:"โครงสร้าง Problem-Solution: P1=Intro, P2=Causes, P3=Effects, <b>P4=Solutions</b>, P5=Conclusion — Solutions อยู่หลัง Analysis ของปัญหา"},
    {q:"Which pair of linkers correctly shows cause and effect?", opts:["However... therefore","Due to... as a result","Although... nevertheless","Furthermore... moreover"], ans:1, level:"B1", exp:"<b>Due to</b> (สาเหตุ) + <b>as a result</b> (ผลลัพธ์) — คู่นี้แสดง cause and effect ได้ถูกต้อง ส่วน however/although แสดงความขัดแย้ง"},
    {q:"A student wrote: 'The government should be doing more about this problem.' What makes this weak in academic writing?", opts:["It is too formal","It uses a modal verb","It is vague — 'this problem' and 'more' are not specific","It is too short"], ans:2, level:"B2", exp:"<b>ความ vague</b> คือปัญหา — 'this problem' ไม่ระบุว่าปัญหาอะไร และ 'more' ไม่ระบุว่าทำอะไรเพิ่มเติม นักเขียนวิชาการต้องระบุให้เฉพาะเจาะจง"},
    {q:"In IELTS Writing Task 2, what is 'Task Response'?", opts:["Using formal language","Answering all parts of the question fully and relevantly","Writing more than 250 words","Having good grammar"], ans:1, level:"B2", exp:"<b>Task Response</b> = ตอบคำถามครบทุกส่วนและตรงประเด็น เป็น 1 ใน 4 criteria ของ IELTS Writing (Task Response, Coherence, Lexical Resource, Grammar)"},
    {q:"Which word correctly replaces 'show' in the formal sentence: 'The graph ___ a steady increase.'", opts:["demonstrates","tells","goes up","makes clear"], ans:0, level:"B1", exp:"<b>demonstrate</b> = แสดงให้เห็น (formal) เหมาะกับ IELTS Task 1 มาก ส่วน 'tells' เป็น informal และ 'goes up' ใช้กับ subject เป็น graph ไม่ได้"},
    {q:"What distinguishes a 'strong' argument from a 'weak' one in essay writing?", opts:["Length of the paragraph","Number of examples used","Clear claim + specific evidence + logical explanation","Variety of vocabulary only"], ans:2, level:"B2", exp:"การโต้แย้งที่แข็งแกร่งต้องมีครบ 3 องค์ประกอบ: <b>Claim</b> (จุดยืน) + <b>Evidence</b> (หลักฐาน) + <b>Explanation</b> (อธิบายความสัมพันธ์)"},
    {q:"A student uses 'important' 6 times in one paragraph. The best way to fix this is:", opts:["Delete all uses of 'important'","Replace some with synonyms: crucial, vital, significant, paramount","Use capital letters: IMPORTANT","Add 'very' before each use"], ans:1, level:"B1", exp:"<b>Lexical Variety</b> คือการใช้คำหลากหลาย ไม่ซ้ำ — synonyms ของ important: crucial, vital, significant, essential, paramount, key"},
    {q:"In academic writing, 'hedging language' is used to:", opts:["Make stronger, more confident claims","Express certainty about all statements","Avoid overstating conclusions or making absolute claims","Make writing more informal"], ans:2, level:"C1", exp:"<b>Hedging</b> = การแสดงความไม่แน่นอน/ระมัดระวัง เช่น 'may, might, suggest, appear to, tend to' — ป้องกันการอ้างสิ่งที่ยืนยันไม่ได้ 100%"},
    {q:"Which of the following is an example of effective hedging language?", opts:["The experiment proves that X causes Y.","X definitely leads to Y in all cases.","The results suggest that X may contribute to Y.","X is always responsible for Y."], ans:2, level:"C1", exp:"<b>The results suggest that X may contribute to Y</b> ใช้ hedges ถึง 2 ตัว: 'suggest' (ไม่ใช่ prove) + 'may' (ไม่ใช่ definitely) — เหมาะสำหรับงานวิจัย"},
    {q:"What is the main purpose of the 'L' (Link) in PEEL paragraph structure?", opts:["To introduce a new topic","To summarise only","To connect back to the thesis or lead into the next paragraph","To add more evidence"], ans:2, level:"B1", exp:"<b>L = Link</b> — ทำหน้าที่ 2 อย่าง: ① เชื่อมประเด็นย่อหน้ากลับสู่ thesis statement หลัก หรือ ② นำไปสู่ประเด็นของย่อหน้าถัดไป"},
    {q:"A student wants to introduce an opposing argument before countering it. Which phrase is best?", opts:["Furthermore,","As a result,","While it is true that..., it can be argued that...","In conclusion,"], ans:2, level:"B2", exp:"<b>'While it is true that... it can be argued that...'</b> เป็น Concession + Counter-argument pattern — เหมาะสำหรับ Discussion/Opinion Essay ที่ต้องแสดงทั้งสองฝ่าย"},
    {q:"Which sentence demonstrates correct use of 'despite'?", opts:["Despite of the rain, we continued.","Despite the rain, we continued.","Despite it rained, we continued.","Despite that it was raining, we continued."], ans:1, level:"B1", exp:"<b>Despite + Noun/Noun Phrase</b>: 'Despite the rain' ✅ — ห้ามใช้ 'despite of' (ผิด) หรือ 'despite + clause' โดยตรง (ต้องใช้ 'despite the fact that + clause')"},
    {q:"For IELTS Writing Task 2, what is the minimum recommended word count?", opts:["150 words","200 words","250 words","300 words"], ans:2, level:"B1", exp:"IELTS Task 2 กำหนดขั้นต่ำ <b>250 คำ</b> (Task 1 กำหนด 150 คำ) — เขียนน้อยกว่ากำหนดจะถูกหักคะแนน Task Response"},
    {q:"Which of the following best describes 'coherence' in writing?", opts:["Using a wide range of vocabulary","All ideas flow logically and are clearly connected","Having no grammar mistakes","Writing in a formal register"], ans:1, level:"B2", exp:"<b>Coherence</b> = ความเชื่อมโยงสัมพันธ์ของเนื้อหา — ความคิดไหลลื่น มีลำดับตรรกะ ผู้อ่านติดตามได้ง่าย (ต่างจาก Cohesion ที่เน้นการใช้คำเชื่อม)"}
  ],
  speaking: [
    {q:"If an examiner asks a difficult question during the IELTS Speaking test, which phrase is best to 'buy time' naturally?", opts:["I don't know the answer.","That's a very interesting question, let me think about that for a moment...","Please repeat the question immediately.","Can I look up the answer on my phone?"], ans:1, level:"B1", exp:"<b>'That's a very interesting question...'</b> เป็น Filler Phrase ที่สุภาพ ช่วยบริหารเวลาคิดไอเดียโดยไม่ปล่อยให้เกิด Dead Air ท่ามกลางการสัมภาษณ์"},
    {q:"Which words should receive the main sentence stress when speaking English to ensure clarity?", opts:["Function words (pronouns, prepositions, articles)","Content words (nouns, main verbs, adjectives)","Auxiliary verbs only","Every single word equally"], ans:1, level:"B2", exp:"ใน Spoken English เราจะเน้นเสียงหนักที่ <b>Content Words</b> (Nouns, Verbs, Adjectives, Adverbs) ซึ่งบรรจุใจความสำคัญของประโยค ส่วนคำเชื่อมทั่วไปจะถูกออกเสียงเบาลง"},
    {q:"What is the best communication strategy when you forget a specific English word mid-sentence?", opts:["Stop talking and stay completely silent.","Paraphrase using descriptions, synonyms, or opposites.","Switch back to your native language immediately.","Invent a completely random fake word."], ans:1, level:"B2", exp:"เมื่อลืมศัพท์เฉพาะทาง กลยุทธ์ที่ดีที่สุดคือการ <b>Paraphrase (การถอดความ)</b> เพื่ออธิบายลักษณะ หน้าที่ หรือใช้คำใกล้เคียงแทนการหยุดเงียบ"},
    {q:"In IELTS Speaking Part 2, you are given 1 minute before speaking. What should you do?", opts:["Write full sentences to read aloud","Jot down key words and brief notes only","Memorise a prepared answer","Ask the examiner for more time"], ans:1, level:"B1", exp:"ใช้ 1 นาทีจด <b>Keywords เท่านั้น</b> ไม่ต้องเขียนประโยค — เพื่อเป็นหัวข้อระหว่างพูด ไม่ใช่อ่านออกเสียง การอ่านทำให้พูดไม่เป็นธรรมชาติและหักคะแนน"},
    {q:"How long should a response in IELTS Speaking Part 2 (long turn) ideally last?", opts:["30 seconds","1 to 2 minutes","3 to 4 minutes","5 minutes"], ans:1, level:"B1", exp:"IELTS Speaking Part 2 ต้องพูดนาน <b>1-2 นาที</b> — ถ้าพูดน้อยกว่า 1 นาที จะถูกหักคะแนน Fluency"},
    {q:"Which of these demonstrates the BEST response style for IELTS Speaking Part 1?", opts:["'Yes.' / 'No.'","'I like it because..., for example... overall I think...'","Memorised paragraphs from a textbook","Always beginning with 'As for me personally...'"], ans:1, level:"B1", exp:"Part 1 ต้องการคำตอบสั้นแต่ขยายความ — <b>ตอบตรง + ให้เหตุผล + ตัวอย่าง</b> ห้ามตอบคำเดียวหรือใช้ประโยคที่ท่องมาจนเกินจริง"},
    {q:"What does 'lexical resource' refer to in IELTS Speaking assessment?", opts:["How loud you speak","The range and accuracy of vocabulary you use","How fast you can speak","Whether you use British or American English"], ans:1, level:"B2", exp:"<b>Lexical Resource</b> = คลัง vocabulary ที่หลากหลายและใช้ได้ถูกต้อง รวมถึง idioms, collocations, advanced vocabulary — เป็น 1 ใน 4 criteria ของ IELTS Speaking"},
    {q:"A student says 'I think... because... for example...' every single answer. The examiner will likely penalise for:", opts:["Being too polite","Repetitive discourse markers / formulaic language","Speaking too clearly","Having a foreign accent"], ans:1, level:"B2", exp:"การใช้ pattern เดิมซ้ำๆ ถือเป็น <b>Formulaic Language</b> — IELTS examiners มองหา spontaneity และ variety ในการใช้ discourse markers"},
    {q:"Which phrase best expresses uncertainty or hedging in spoken English?", opts:["I am definitely certain that...","It seems to me that... / I'm not entirely sure, but...","The fact is...","Obviously..."], ans:1, level:"B2", exp:"<b>Hedging in speaking</b> = แสดงว่าไม่ยืนยัน 100% เช่น 'It seems to me', 'I believe', 'I'm not entirely sure' — ทำให้คำพูดฟังดูเป็นธรรมชาติและฉลาดกว่าการยืนยันทุกอย่าง"},
    {q:"How is the word 'record' pronounced differently as a noun vs a verb?", opts:["Noun: re-CORD / Verb: re-CORD (same)","Noun: RE-cord / Verb: re-CORD","Noun: re-CORD / Verb: RE-cord","They are always pronounced the same"], ans:1, level:"B2", exp:"คำ 2 พยางค์ที่เป็นได้ทั้ง Noun และ Verb: <b>Noun → เน้นพยางค์แรก (RE-cord)</b> | <b>Verb → เน้นพยางค์หลัง (re-CORD)</b> — เช่นเดียวกับ PERmit/perMIT, PREsent/preSENT"},
    {q:"In IELTS Speaking Part 3, what type of questions are asked?", opts:["Personal questions about your daily life","Abstract, discussion-style questions about society and global issues","Questions about a picture or photograph","Grammar correction exercises"], ans:1, level:"B2", exp:"Part 3 เน้น <b>Abstract Discussion</b> — ถามประเด็นระดับสังคม วัฒนธรรม โลก เช่น 'How has technology changed the way people communicate?' ต้องการ opinion + reasoning + examples"},
    {q:"What is the Thai pronunciation error with the English 'th' sound?", opts:["Thai speakers pronounce it as /r/","Thai speakers often substitute it with /t/ or /d/","Thai speakers stress it too heavily","Thai speakers always omit it"], ans:1, level:"A2", exp:"เสียง /θ/ (think) และ /ð/ (this) ไม่มีในภาษาไทย ผู้พูดไทยมักออกเสียงเป็น <b>/t/ (think→tink) หรือ /d/ (this→dis)</b> — วิธีแก้คือวางลิ้นระหว่างฟัน"},
    {q:"In a group discussion, which phrase is most appropriate to politely disagree?", opts:["That's completely wrong!","I see your point, however I would argue that...","You don't know what you're talking about.","Whatever."], ans:1, level:"B1", exp:"<b>'I see your point, however I would argue that...'</b> — แสดงว่าฟังและเข้าใจก่อน แล้วค่อยแสดงมุมมองต่าง ถือว่า polite และ academic มากที่สุด"},
    {q:"What is 'connected speech' in English pronunciation?", opts:["Speaking very slowly and clearly","Natural phenomena like linking, reduction, and elision between words","Using formal vocabulary in conversation","Memorising phrases to connect ideas"], ans:1, level:"B2", exp:"<b>Connected Speech</b> = การออกเสียงในภาษาพูดตามธรรมชาติ ได้แก่ Linking (want_it), Elision (next_door→nex door), Reduction (want to→wanna)"},
    {q:"Which is the BEST way to extend an answer and show higher language ability?", opts:["Repeat the question back to the examiner","Simply answer 'yes' or 'no' and wait","Add a reason, example, and a contrasting point","Speak as fast as possible"], ans:2, level:"B1", exp:"สูตรขยายคำตอบ: <b>Answer + Reason + Example + Contrast</b> — เพิ่ม complexity ของคำตอบและแสดงให้เห็นว่าสามารถใช้ discourse markers และ complex sentences ได้"},
    {q:"When giving an opinion in a formal discussion, which opener is most appropriate?", opts:["I reckon...","In my view, / From my perspective, / It would appear that...","Honestly...","I dunno, maybe..."], ans:1, level:"B2", exp:"<b>'In my view' / 'From my perspective'</b> เป็น formal opinion phrases — เหมาะกับ IELTS Part 3 หรือ academic discussions ส่วน 'I reckon' และ 'I dunno' เป็น informal มาก"},
    {q:"What does 'fluency and coherence' mean in IELTS Speaking?", opts:["Speaking without any accent","Speaking smoothly with logically connected ideas","Only using advanced vocabulary","Having perfect grammar"], ans:1, level:"B2", exp:"<b>Fluency</b> = พูดคล่อง ไม่สะดุด | <b>Coherence</b> = ความคิดเชื่อมโยงสัมพันธ์กัน มีลำดับที่ตรรกะ — เป็น 1 ใน 4 criteria สำคัญ"},
    {q:"A student says 'um...um...um...' frequently. How should they address this?", opts:["It is perfectly fine — all native speakers do this","Replace with natural filler phrases like 'Well...' / 'Let me think...'","Speak faster to avoid pauses","Only answer questions they are confident about"], ans:1, level:"B1", exp:"'Um' ซ้ำๆ ลดคะแนน Fluency — แทนที่ด้วย <b>natural fillers</b> เช่น 'Well...', 'Let me think...', 'That's a good point...', 'It depends...' ซึ่งฟังดูเป็น native มากกว่า"},
    {q:"What is the best structure for IELTS Speaking Part 3 answers?", opts:["One short sentence","Point + Reason + Example + Contrast/Concession","Three questions back to the examiner","Memorised facts and statistics only"], ans:1, level:"B2", exp:"สูตร Part 3: <b>Point (จุดยืน) + Reason (เหตุผล) + Example (ตัวอย่าง) + Contrast (มุมมองตรงข้าม)</b> — แสดงให้เห็นความสามารถในการ discuss ประเด็นซับซ้อน"},
    {q:"Which sounds are most important to stress in the sentence: 'I WANT to BUY a NEW CAR.'?", opts:["Want, to, buy","Want, buy, new, car","To, a, car","I, to, a"], ans:1, level:"B1", exp:"<b>Want, buy, new, car</b> — เหล่านี้คือ Content Words (กริยาหลัก + คำคุณศัพท์ + คำนาม) ที่ต้องเน้นเสียง | 'to' และ 'a' เป็น Function Words ออกเสียงเบา"},
    {q:"During IELTS Speaking, the examiner asks: 'Do you prefer cities or rural areas?' The student says: 'I prefer cities because they offer more opportunities, such as better jobs. However, rural areas provide a peaceful environment.' This answer demonstrates:", opts:["Inadequate vocabulary","Poor grammar structure","Good use of contrast and examples","Too short a response"], ans:2, level:"B2", exp:"คำตอบนี้ใช้ <b>reason (because) + example (such as) + contrast (however)</b> — เป็นรูปแบบที่ดีของ Band 7+ response ที่แสดงความสามารถใช้ discourse markers หลากหลาย"},
    {q:"What should a speaker do if they do not understand a question in IELTS Speaking?", opts:["Guess randomly and hope for the best","Ask the examiner to repeat or clarify the question","Stay silent and wait","Change the topic"], ans:1, level:"A2", exp:"การ <b>ขอให้พูดซ้ำหรืออธิบาย</b> เป็นเรื่องปกติและไม่หักคะแนน — เช่น 'Sorry, could you repeat that?' หรือ 'Could you clarify what you mean by...?' ดีกว่าการตอบผิดประเด็น"},
    {q:"Which feature is most characteristic of a Band 7+ IELTS Speaking response?", opts:["Only simple, short sentences with no errors","Varied sentence structures, good vocabulary, minor errors only","Perfect grammar with zero mistakes","Very fast speech throughout"], ans:1, level:"C1", exp:"Band 7 Descriptor: <b>Varied sentences + good vocabulary range + minor non-systematic errors</b> — ไม่ได้ต้องการ 'perfect' แต่ต้องการ 'natural and sophisticated'"},
    {q:"What is 'intonation' in spoken English?", opts:["The speed of speech","The rise and fall of pitch in your voice while speaking","The volume of speech","The accent of the speaker"], ans:1, level:"B1", exp:"<b>Intonation</b> = การขึ้น-ลง ของระดับเสียงขณะพูด — Rising tone มักบอกว่ายังไม่จบหรือเป็นคำถาม, Falling tone บอกว่าจบความ ช่วยให้ฟังดูเป็นธรรมชาติและเข้าใจง่าย"},
    {q:"When is it appropriate to use 'Well, it depends...' in a speaking response?", opts:["When you want to avoid answering the question","When the answer genuinely varies according to context","Only in very informal conversations","When you do not know the topic at all"], ans:1, level:"B2", exp:"<b>'It depends on...'</b> เหมาะเมื่อคำตอบขึ้นอยู่กับบริบท เช่น 'It depends on the individual', 'It depends on the circumstances' — แสดงว่าคุณคิดอย่างรอบด้าน ไม่ใช่หลีกเลี่ยงการตอบ"}
  ]
};

// ══════════════════════════════════════════════════
//   CORE APP LOGIC & INTERACTIVE INTERFACE (DOM)
// ══════════════════════════════════════════════════

// ─── INITIALIZATION ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderLessonsUI();
  renderQuizHubUI();
  updateHeaderLevel();
  updateHeaderRewards();
});

// ─── RENDERING LOGIC ─────────────────────────────
function renderLessonsUI() {
  const grid = document.getElementById('lesson-category-grid');
  if(!grid) return;
  grid.innerHTML = LESSON_CATS.map(cat => `
    <div class="cat-card" style="--c: ${cat.color}" onclick="openLesson('${cat.id}')">
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-level" style="background: ${cat.color}22; color: ${cat.color}">${cat.levelRange}</span>
      <h3>${cat.title} (${cat.thaiTitle})</h3>
      <p>${cat.desc}</p>
      <div class="cat-meta-line">${cat.units.length} บทเรียน · ฝึกจากพื้นฐานถึงโจทย์จริง</div>
      <button class="card-btn" style="background: ${cat.color}15; color: ${cat.color}">เข้าสู่บทเรียน →</button>
    </div>
  `).join('');
}

function renderQuizHubUI() {
  const grid = document.getElementById('quiz-category-grid');
  if(!grid) return;
  grid.innerHTML = LESSON_CATS.map(cat => `
    <div class="cat-card" style="--c: ${cat.color}" onclick="startQuiz('${cat.id}')">
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-level" style="background: var(--purple-dim); color: var(--purple)">Diagnostic</span>
      <h3>Test: ${cat.title}</h3>
      <p>ทดสอบความแม่นยำจำลองตามโครงสร้างข้อสอบชุดจริง</p>
      <div class="cat-meta-line">ทำคะแนนดีและทำเวลาไวเพื่อรับ Coin Bonus</div>
      <button class="card-btn" style="background: var(--sky-dim); color: var(--sky)">เริ่มทดสอบ ✏️</button>
    </div>
  `).join('');
}

// ─── LESSON OVERLAY HANDLERS ─────────────────────
function openLesson(catId) {
  const cat = LESSON_CATS.find(c => c.id === catId);
  if(!cat) return;
  document.getElementById('overlay-badge').textContent = cat.title;
  document.getElementById('overlay-title').textContent = cat.thaiTitle;
  
  const unitList = document.getElementById('unit-list');
  unitList.innerHTML = cat.units.map(u => `
    <div class="unit-item" onclick="viewUnit('${cat.id}', '${u.id}')">
      <div class="unit-info">
        <h4>${u.title}</h4>
        <p>${u.sub}</p>
      </div>
      <div class="unit-right">
        <span class="unit-level" style="background: rgba(56,189,248,0.1); color: #38bdf8">${u.level}</span>
        <span class="arrow">→</span>
      </div>
    </div>
  `).join('');
  
  unitList.classList.remove('hidden');
  document.getElementById('lesson-viewer').classList.add('hidden');
  document.getElementById('lesson-overlay').classList.remove('hidden');
}

function viewUnit(catId, unitId) {
  const cat = LESSON_CATS.find(c => c.id === catId);
  const unit = cat?.units.find(u => u.id === unitId);
  if(!unit) return;
  
  document.getElementById('lesson-content-area').innerHTML = unit.content;
  document.getElementById('unit-list').classList.add('hidden');
  document.getElementById('lesson-viewer').classList.remove('hidden');
}

function backToUnits() {
  document.getElementById('lesson-viewer').classList.add('hidden');
  document.getElementById('unit-list').classList.remove('hidden');
}

function closeLesson() {
  document.getElementById('lesson-overlay').classList.add('hidden');
}

// ─── QUIZ ENGINE FUNCTIONS ───────────────────────
function startQuiz(catId) {
  const pool = QUIZ_DB[catId] || [];
  if(!pool.length) return;
  
  S.activeQuizCat = catId;
  // สุ่มสลับตำแหน่งคำถามและจำกัดเพดานสูงสุดครั้งละ 10 ข้อตามเทมเพลตหน้า HTML
  S.quizQuestions = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
  S.qIdx = 0;
  S.userAns = [];
  S.answered = false;
  S.quizStart = Date.now();
  
  document.getElementById('quiz-selector-view').classList.add('hidden');
  document.getElementById('quiz-result-view').classList.add('hidden');
  document.getElementById('quiz-active-view').classList.remove('hidden');
  document.getElementById('quiz-cat-label').textContent = LESSON_CATS.find(c => c.id === catId)?.title || "Quiz";
  
  clearInterval(S.timerInterval);
  S.timerInterval = setInterval(() => {
    let secs = Math.floor((Date.now() - S.quizStart) / 1000);
    let m = String(Math.floor(secs / 60)).padStart(2, '0');
    let s = String(secs % 60).padStart(2, '0');
    document.getElementById('quiz-clock').textContent = `${m}:${s}`;
  }, 1000);
  
  showQuestion();
}

function showQuestion() {
  S.answered = false;
  let q = S.quizQuestions[S.qIdx];
  let total = S.quizQuestions.length;
  
  document.getElementById('quiz-prog-text').textContent = `${S.qIdx + 1} / ${total}`;
  document.getElementById('quiz-fill').style.width = `${((S.qIdx) / total) * 100}%`;
  document.getElementById('q-level-tag').textContent = q.level;
  document.getElementById('q-type-tag').textContent = S.activeQuizCat.toUpperCase();
  document.getElementById('q-text').innerHTML = q.q;
  
  document.getElementById('explain-box').classList.add('hidden');
  const nextBtn = document.getElementById('next-q-btn');
  nextBtn.classList.add('disabled');
  nextBtn.disabled = true;
  nextBtn.textContent = (S.qIdx === total - 1) ? "ดูสรุปผลลัพธ์ 🎉" : "ถัดไป →";
  
  document.getElementById('q-options').innerHTML = q.opts.map((opt, i) => `
    <button class="opt-btn" onclick="selectOption(${i})">
      <div class="opt-letter">${String.fromCharCode(65 + i)}</div>
      <div class="opt-text">${opt}</div>
    </button>
  `).join('');
}

function selectOption(idx) {
  if(S.answered) return;
  S.answered = true;
  
  let q = S.quizQuestions[S.qIdx];
  let isCorrect = (idx === q.ans);
  S.userAns.push({ selected: idx, correct: q.ans, isCorrect });
  
  document.querySelectorAll('#q-options .opt-btn').forEach((btn, i) => {
    btn.disabled = true;
    if(i === q.ans) btn.classList.add('correct');
    if(i === idx && !isCorrect) btn.classList.add('wrong');
  });
  
  let expBox = document.getElementById('explain-box');
  expBox.className = "explain-box " + (isCorrect ? "ok" : "err");
  document.getElementById('explain-icon').textContent = isCorrect ? "✅" : "❌";
  document.getElementById('explain-text').innerHTML = q.exp;
  expBox.classList.remove('hidden');
  
  const nextBtn = document.getElementById('next-q-btn');
  nextBtn.classList.remove('disabled');
  nextBtn.disabled = false;
}

function nextQuestion() {
  S.qIdx++;
  if(S.qIdx < S.quizQuestions.length) {
    showQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  clearInterval(S.timerInterval);
  let total = S.quizQuestions.length;
  let score = S.userAns.filter(a => a.isCorrect).length;
  let secs = Math.floor((Date.now() - S.quizStart) / 1000);
  const reward = awardQuizCoins(score, total, secs);
  
  saveRecord(S.activeQuizCat, score, total, secs, reward);
  
  document.getElementById('quiz-active-view').classList.add('hidden');
  document.getElementById('quiz-result-view').classList.remove('hidden');
  document.getElementById('ring-num').textContent = score;
  document.getElementById('ring-den').textContent = `/${total}`;
  
  let pct = Math.round((score / total) * 100);
  document.getElementById('ring-arc').style.strokeDashoffset = 364.4 - (pct / 100) * 364.4;
  
  let roundCefr = "A1";
  if(pct >= 92) roundCefr = "C2";
  else if(pct >= 80) roundCefr = "C1";
  else if(pct >= 68) roundCefr = "B2";
  else if(pct >= 54) roundCefr = "B1";
  else if(pct >= 38) roundCefr = "A2";
  document.getElementById('result-cefr').textContent = `ระดับ: ${roundCefr}`;
  document.getElementById('reward-total').textContent = `+${reward.total}`;
  document.getElementById('reward-summary').textContent = `ยอดสะสม ${reward.balance} coins · streak ${reward.streak} วัน`;
  document.getElementById('reward-breakdown').innerHTML = reward.details.map(d => `
    <div class="reward-line">
      <span>${d.label}</span>
      <strong>+${d.coins}</strong>
    </div>
  `).join('');
  
  document.getElementById('answers-breakdown').innerHTML = S.quizQuestions.map((q, i) => {
    let ans = S.userAns[i];
    return `
      <div class="ans-row ${ans.isCorrect ? 'ok' : 'err'}">
        <span class="ans-icon">${ans.isCorrect ? '✅' : '❌'}</span>
        <div>
          <div class="ans-q">ข้อที่ ${i + 1}: ${q.q}</div>
          <div class="ans-info">คำตอบของคุณ: ${String.fromCharCode(65 + ans.selected)} | เฉลยที่ถูกต้อง: ${String.fromCharCode(65 + ans.correct)}</div>
        </div>
      </div>
    `;
  }).join('');
  
  let advice = "";
  if(pct >= 80) advice = "ยอดเยี่ยมมาก! คุณมีความเข้าใจที่แม่นยำสูงมาก คลังคำศัพท์และไวยากรณ์แข็งแกร่ง แนะนำให้ฝึกอ่านบทความวิชาการระดับ C1-C2 เพิ่มเติมเพื่อรักษาความได้เปรียบนี้ไว้ครับ";
  else if(pct >= 50) advice = "ทำได้ดีในระดับหนึ่งครับ! พื้นฐานของคุณอยู่ในเกณฑ์ดี แต่อาจมีบางจุดที่สับสนในโครงสร้างประโยคซับซ้อนหรือสำนวนเฉพาะทาง ลองกลับไปเปิดอ่านทบทวนคลังบทเรียนบ่อยๆ นะครับ";
  else advice = "พาร์ทนี้อาจเป็นจุดบอดที่ต้องแก้ไขด่วนครับ อย่าเพิ่งท้อใจ! แนะนำให้กลับไปอ่านเนื้อหาบทเรียนย่อยที่ระบบสรุปไว้ให้อย่างละเอียด แล้วค่อยกลับมาลองทำข้อสอบใหม่อีกรอบเพื่อปิดจุดอ่อนครับ";
  document.getElementById('ai-advice-text').textContent = advice;
}

function exitQuiz() {
  clearInterval(S.timerInterval);
  document.getElementById('quiz-active-view').classList.add('hidden');
  document.getElementById('quiz-result-view').classList.add('hidden');
  document.getElementById('quiz-selector-view').classList.remove('hidden');
}

function retryCurrentQuiz() {
  startQuiz(S.activeQuizCat);
}

// ─── DASHBOARD RENDERING ─────────────────────────
function renderDashboard() {
  const p = getProgress();
  const rewards = getRewardState();
  const all = Object.values(p).flat();
  
  document.getElementById('ds-total').textContent = all.length;
  let avg = all.length ? Math.round(all.reduce((a,b) => a + b.pct, 0) / all.length) : 0;
  document.getElementById('ds-avg').textContent = all.length ? `${avg}%` : `--%`;
  document.getElementById('ds-coins').textContent = rewards.coins;
  document.getElementById('ds-streak').textContent = `${rewards.streak || 0}d`;
  document.getElementById('ds-rank').textContent = getRewardRank(rewards.coins);
  document.getElementById('ds-cefr').textContent = estimateCEFR();
  
  let bestSkill = "--";
  let maxPct = -1;
  Object.keys(p).forEach(cat => {
    if(p[cat].length) {
      let catAvg = p[cat].reduce((a,b) => a + b.pct, 0) / p[cat].length;
      if(catAvg > maxPct) {
        maxPct = catAvg;
        bestSkill = LESSON_CATS.find(c => c.id === cat)?.title || cat;
      }
    }
  });
  document.getElementById('ds-best').textContent = bestSkill;
  const nextTarget = rewards.coins < 150 ? 150 : rewards.coins < 450 ? 450 : rewards.coins < 900 ? 900 : rewards.coins < 1500 ? 1500 : rewards.coins < 2500 ? 2500 : 3000;
  const targetPct = Math.min(100, Math.round((rewards.coins / nextTarget) * 100));
  document.getElementById('reward-missions').innerHTML = `
    <div class="mission-card">
      <div class="mission-top"><span>เป้าหมายถัดไป</span><strong>${rewards.coins}/${nextTarget}</strong></div>
      <div class="skill-bar-track"><div class="skill-bar-fill reward-fill" style="width:${targetPct}%"></div></div>
      <p>เก็บ coin เพื่อเลื่อนแรงก์: ${getRewardRank(nextTarget)}</p>
    </div>
    <div class="mission-grid">
      <div class="mission-mini"><b>Accuracy Bonus</b><span>70%+ รับเพิ่ม 15 · 80%+ รับเพิ่ม 25 · 90%+ รับเพิ่ม 35</span></div>
      <div class="mission-mini"><b>Speed Bonus</b><span>เฉลี่ยต่ำกว่า 22 วิ/ข้อ รับเพิ่ม เริ่มที่ 12 coins</span></div>
      <div class="mission-mini"><b>Daily Streak</b><span>ทำอย่างน้อยวันละ 1 ชุดเพื่อคูณ streak bonus ต่อเนื่อง</span></div>
    </div>
  `;
  
  document.getElementById('skill-bars-container').innerHTML = LESSON_CATS.map(cat => {
    let list = p[cat.id] || [];
    let catAvg = list.length ? Math.round(list.reduce((a,b) => a + b.pct, 0) / list.length) : 0;
    return `
      <div class="skill-bar-item">
        <div class="skill-bar-top">
          <span class="skill-bar-name">${cat.icon} ${cat.title}</span>
          <span class="skill-bar-score">${list.length ? catAvg + '%' : 'ไม่มีข้อมูล'}</span>
        </div>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width: ${catAvg}%; background: ${cat.color}"></div>
        </div>
      </div>
    `;
  }).join('');
  
  let historyList = [];
  Object.keys(p).forEach(catId => {
    let cat = LESSON_CATS.find(c => c.id === catId);
    p[catId].forEach(run => {
      historyList.push({ ...run, title: cat ? cat.title : catId, icon: cat ? cat.icon : '✏️' });
    });
  });
  
  const histContainer = document.getElementById('history-container');
  if(!historyList.length) {
    histContainer.innerHTML = `<div class="empty-msg">ยังไม่มีข้อมูล — ไปทำแบบทดสอบก่อนนะครับ! 🚀</div>`;
  } else {
    histContainer.innerHTML = historyList.reverse().slice(0, 10).map(h => `
      <div class="hist-item">
        <div class="hist-cat">
          <span>${h.icon}</span>
          <div>
            <div>${h.title} Diagnostic Test</div>
            <div class="hist-date">วันที่: ${h.date} | เวลา: ${h.time} วินาที | +${h.coins || 0} coins</div>
          </div>
        </div>
        <div class="hist-score" style="color: ${h.pct >= 68 ? 'var(--green)' : h.pct >= 38 ? 'var(--gold)' : 'var(--red)'}">
          ${h.score}/${h.total} (${h.pct}%)
        </div>
      </div>
    `).join('');
  }
}
