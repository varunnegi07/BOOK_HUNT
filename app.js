// ── AI Setup ──
// Get your key from: https://console.groq.com/ or https://platform.openai.com/
const AI_CONFIG = {
  apiKey: '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', // ⚠️ PLUG YOUR KEY HERE
  endpoint: 'https://api.groq.com/openai/v1/chat/completions', // Defaulting to Groq (very fast)
  model: 'llama-3.3-70b-versatile' 
};

// ── Supabase Setup ──
const SUPABASE_URL = 'https://riqvibxadmadkbfqqcmy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uQ2YIP9uuzvEgkgyaUzMeg_FiQ_FN1n';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ──
let nextId = 5000;
let apiBooks = {}; // category -> books[]
let state = {
  user: JSON.parse(localStorage.getItem('bh_user')) || null,
  bookmarks: JSON.parse(localStorage.getItem('bh_bookmarks')) || [],
  progress: JSON.parse(localStorage.getItem('bh_progress')) || {},
  stats: JSON.parse(localStorage.getItem('bh_stats')) || {queries:0,summaries:0,streak:1},
  activities: JSON.parse(localStorage.getItem('bh_activities')) || [],
  chatHistory: {},
  activeCat: null,
  activeSub: null,
  activeBook: null,
  currentPage: 'home'
};

function save(k,v){
  localStorage.setItem(k,JSON.stringify(v));
  if(state.user) syncToSupabase();
}

async function syncToSupabase() {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;
  
  const { error } = await _supabase.from('profiles').upsert({
    id: user.id,
    bookmarks: state.bookmarks,
    progress: state.progress,
    stats: state.stats,
    activities: state.activities,
    updated_at: new Date()
  });
  if (error) console.error('Supabase Sync Error:', error.message);
}

async function fetchFromSupabase() {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data) {
    state.bookmarks = data.bookmarks || [];
    state.progress = data.progress || {};
    state.stats = data.stats || {queries:0,summaries:0,streak:1};
    state.activities = data.activities || [];
    // Update localStorage
    localStorage.setItem('bh_bookmarks', JSON.stringify(state.bookmarks));
    localStorage.setItem('bh_progress', JSON.stringify(state.progress));
    localStorage.setItem('bh_stats', JSON.stringify(state.stats));
    localStorage.setItem('bh_activities', JSON.stringify(state.activities));
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  const { data: { user } } = await _supabase.auth.getUser();
  if (user) {
    state.user = { name: user.user_metadata.full_name || user.email.split('@')[0], email: user.email };
    await fetchFromSupabase(); // Load data from DB
    updateUIForLoggedIn();
    navigateTo('dashboard');
  } else {
    state.user = null;
    navigateTo('auth');
  }
});

// Auth listener
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    state.user = { name: session.user.user_metadata.full_name || session.user.email.split('@')[0], email: session.user.email };
    await fetchFromSupabase(); // Sync data immediately on login
    updateUIForLoggedIn();
    navigateTo('dashboard');
  } else if (event === 'SIGNED_OUT') {
    state.user = null;
    navigateTo('auth');
    document.getElementById('btnLogin').style.display='';
    document.getElementById('btnSignup').style.display='';
    document.getElementById('userAvatar').style.display='none';
    document.getElementById('navLinks').style.display='none';
  }
});

// ── Navigation ──
function navigateTo(page) {
  // Guard: if not logged in, only allow 'auth' page
  if(!state.user && page !== 'auth'){
    navigateTo('auth');
    return;
  }
  
  // Hide navbar/footer in Studio or Reader for a clean experience
  const isImmersive = page==='studio'||page==='reader';
  document.getElementById('navbar').style.display = isImmersive ? 'none' : 'flex';

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById('page-'+page);
  if(el){el.classList.add('active');state.currentPage=page;}
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
  window.scrollTo(0,0);
  if(page==='library') renderLibrary();
  if(page==='dashboard') renderDashboard();
  closeUserMenu();
}

// ── Auth ──
let isSignup=false;
function toggleAuthMode(){
  isSignup=!isSignup;
  document.getElementById('loginForm').style.display=isSignup?'none':'flex';
  document.getElementById('signupForm').style.display=isSignup?'flex':'none';
  document.getElementById('authTitle').textContent=isSignup?'Create your account':'Welcome back';
  document.getElementById('authSubtitle').textContent=isSignup?'Join thousands of students learning with AI':'Log in to continue your learning journey';
}
function showSignup(){isSignup=false;navigateTo('auth');toggleAuthMode();}
function selectUserType(type,btn){
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('schoolFields').style.display=type==='school'?'block':'none';
  document.getElementById('collegeFields').style.display=type==='college'?'block':'none';
}
async function handleLogin(e){
  e.preventDefault();
  const email=document.getElementById('loginEmail').value;
  const password=document.getElementById('loginPassword').value;
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if(error) { showToast(error.message, 'error'); return; }
  showToast('✅ Welcome back!');
}
async function handleSignup(e){
  e.preventDefault();
  const email=document.getElementById('signupEmail').value;
  const password=document.getElementById('signupPassword').value;
  const name=document.getElementById('signupName').value;
  const age=document.getElementById('signupAge').value;
  const type=document.querySelector('.type-btn.active').textContent.includes('School')?'school':'college';
  
  const { data, error } = await _supabase.auth.signUp({
    email, password,
    options: { data: { full_name: name, age, student_type: type } }
  });
  if(error) { showToast(error.message, 'error'); return; }
  showToast('🎉 Account created! Check your email.');
}
async function handleGoogleLogin(){
  document.getElementById('oauthLoader').style.display='flex';
  const { error } = await _supabase.auth.signInWithOAuth({ 
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if(error) {
    document.getElementById('oauthLoader').style.display='none';
    showToast(error.message, 'error');
  }
}
async function logout(){
  const { error } = await _supabase.auth.signOut();
  if(error) showToast(error.message, 'error');
  else showToast('👋 Logged out');
}
function updateUIForLoggedIn(){
  document.getElementById('btnLogin').style.display='none';
  document.getElementById('btnSignup').style.display='none';
  document.getElementById('navLinks').style.display='flex';
  const a=document.getElementById('userAvatar');a.style.display='flex';
  document.getElementById('avatarLetter').textContent=state.user.name[0].toUpperCase();
  document.getElementById('dropdownName').textContent=state.user.name;
  document.getElementById('dropdownEmail').textContent=state.user.email;
}
function toggleUserMenu(){document.getElementById('userDropdown').classList.toggle('show');}
function closeUserMenu(){document.getElementById('userDropdown').classList.remove('show');}
document.addEventListener('click',e=>{if(!e.target.closest('.user-avatar')&&!e.target.closest('.user-dropdown'))closeUserMenu();});
function toggleMobileMenu(){document.getElementById('mobileMenu').classList.toggle('show');document.getElementById('hamburger').classList.toggle('active');}

// ── Dashboard ──
function renderDashboard(){
  if(!state.user)return;
  const h=new Date().getHours();
  const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('dashGreeting').textContent=`${g}, ${state.user.name}! 👋`;
  document.getElementById('statBooks').textContent=state.bookmarks.length;
  document.getElementById('statQueries').textContent=state.stats.queries;
  document.getElementById('statSummaries').textContent=state.stats.summaries;
  document.getElementById('statStreak').textContent=state.stats.streak;
  // Bookmarked books
  const bk=document.getElementById('dashBookmarks');
  if(state.bookmarks.length>0){
    bk.innerHTML=state.bookmarks.map(b=>{
      const book=findBookById(b);
      return book?bookCardSmall(book):'';
    }).join('');
  } else {
    bk.innerHTML='<div class="empty-state"><div class="empty-icon">📚</div><h3>No bookmarks yet</h3><p>Browse the library and bookmark books you like!</p><button class="btn-primary" onclick="navigateTo(\'library\')">Browse Library</button></div>';
  }
  // Progress
  const pr=document.getElementById('dashProgress');
  const progEntries=Object.entries(state.progress).filter(([,v])=>v.opened);
  if(progEntries.length>0){
    pr.innerHTML=progEntries.slice(0,5).map(([id,p])=>{
      const book=findBookById(id);
      if(!book)return'';
      const pct=p.chaptersRead?Math.round((p.chaptersRead.length/(book.chapters?.length||1))*100):0;
      return `<div class="progress-item"><div class="progress-item-info"><span class="progress-item-emoji">${book.emoji||'📚'}</span><div><strong>${book.title}</strong><p class="text-muted">${pct}% completed</p></div></div><div class="progress-bar-wrapper"><div class="progress-bar" style="--progress:${pct}%"></div></div></div>`;
    }).join('');
  } else {
    pr.innerHTML='<div class="empty-state"><div class="empty-icon">📊</div><h3>No progress yet</h3><p>Start reading to track your progress</p></div>';
  }
  // Activity
  const al=document.getElementById('activityList');
  if(state.activities.length>0){
    al.innerHTML=state.activities.slice(0,5).map(a=>`<div class="activity-item"><span class="activity-icon">${a.icon}</span><span class="activity-text">${a.text}</span><span class="activity-time">${a.time}</span></div>`).join('');
  }
}

// ── Find book by ID ──
function findBookById(id){
  // Check NCERT
  for(const key in NCERT){
    const found=NCERT[key].find(b=>b.id===id);
    if(found)return found;
  }
  // Check API books
  for(const key in apiBooks){
    const found=apiBooks[key].find(b=>b.id===id);
    if(found)return found;
  }
  return null;
}

// ── Library ──
function renderLibrary(){
  const cats=document.getElementById('libCategories');
  const content=document.getElementById('libContent');
  // Render category tabs
  cats.innerHTML=CATEGORIES.map(c=>
    `<button class="cat-tab ${state.activeCat===c.id?'active':''}" onclick="selectCategory('${c.id}')">${c.icon} ${c.name}</button>`
  ).join('');
  if(!state.activeCat){
    content.innerHTML=renderCategoryCards();
    return;
  }
  const cat=CATEGORIES.find(c=>c.id===state.activeCat);
  if(!state.activeSub){
    content.innerHTML=`<button class="btn-ghost back-btn" onclick="state.activeCat=null;state.activeSub=null;renderLibrary()">← All Categories</button>
    <h2 class="lib-section-title">${cat.icon} ${cat.name}</h2>
    <div class="sub-grid">${cat.subs.map(s=>`<button class="sub-card" onclick="selectSub('${s.id}')"><span class="sub-name">${s.name}</span><span class="sub-arrow">→</span></button>`).join('')}</div>`;
    return;
  }
  // Show books for subcategory
  const sub=cat.subs.find(s=>s.id===state.activeSub);
  content.innerHTML=`<button class="btn-ghost back-btn" onclick="state.activeSub=null;renderLibrary()">← ${cat.name}</button>
  <h2 class="lib-section-title">${sub.name}</h2>
  <div class="lib-search-row"><div class="search-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="text" id="libSearch" placeholder="Search books..." oninput="onLibSearch()"></div></div>
  <div class="books-grid" id="booksGrid"></div>`;
  loadBooksForSub(state.activeSub);
}

function renderCategoryCards(){
  return `<h2 class="lib-section-title">📚 Browse by Category</h2>
  <div class="cat-cards">${CATEGORIES.map(c=>
    `<div class="cat-card" onclick="selectCategory('${c.id}')">
      <div class="cat-card-icon">${c.icon}</div>
      <h3>${c.name}</h3>
      <p class="text-muted">${c.subs.length} subcategories</p>
    </div>`
  ).join('')}</div>`;
}

function selectCategory(id){state.activeCat=id;state.activeSub=null;renderLibrary();}
function selectSub(id){state.activeSub=id;renderLibrary();}

async function loadBooksForSub(subId){
  const grid=document.getElementById('booksGrid');
  if(!grid)return;
  // NCERT books
  if(NCERT[subId]){
    grid.innerHTML=NCERT[subId].map(b=>bookCardHTML(b)).join('');
    return;
  }
  // ICSE: use Open Library
  if(ICSE_QUERIES[subId]){
    grid.innerHTML='<div class="loading-state"><div class="searching-spinner large"></div><p>Fetching books from Open Library...</p></div>';
    if(!apiBooks[subId]){
      apiBooks[subId]=await fetchOLBooks(ICSE_QUERIES[subId]);
    }
    grid.innerHTML=apiBooks[subId].map(b=>bookCardHTML(b)).join('');
    if(apiBooks[subId].length===0) grid.innerHTML='<div class="empty-state"><div class="empty-icon">📖</div><h3>No books found</h3><p>Try searching for specific books</p></div>';
    return;
  }
  // College/Exams: use Open Library with multiple queries
  if(OL_QUERIES[subId]){
    grid.innerHTML='<div class="loading-state"><div class="searching-spinner large"></div><p>Fetching books from Open Library...</p></div>';
    if(!apiBooks[subId]){
      const queries=OL_QUERIES[subId];
      const q=queries[Math.floor(Math.random()*queries.length)];
      apiBooks[subId]=await fetchOLBooks(q);
      // Fetch from 2 more queries
      for(let i=0;i<2&&i<queries.length;i++){
        if(queries[i]!==q){
          const more=await fetchOLBooks(queries[i]);
          apiBooks[subId].push(...more.filter(b=>!apiBooks[subId].some(e=>e.title===b.title)));
        }
      }
    }
    grid.innerHTML=apiBooks[subId].map(b=>bookCardHTML(b)).join('');
    if(apiBooks[subId].length===0) grid.innerHTML='<div class="empty-state"><div class="empty-icon">📖</div><h3>No books found</h3><p>Try searching for specific books</p></div>';
    return;
  }
}

async function fetchOLBooks(query){
  try{
    const r=await fetch(`${OL_SEARCH}?q=${encodeURIComponent(query)}&fields=key,title,author_name,subject,first_publish_year,number_of_pages_median,cover_i,isbn&limit=12`);
    const d=await r.json();
    if(d.docs)return d.docs.filter(x=>x.title&&x.cover_i).map(doc=>convertOL(doc));
  }catch(e){console.error(e);}
  return [];
}

function convertOL(doc){
  const id='ol'+nextId++;
  const subjs=(doc.subject||[]).map(s=>s.toLowerCase());
  let subj='General';
  if(subjs.some(s=>s.includes('computer')||s.includes('programming')))subj='Computer Science';
  else if(subjs.some(s=>s.includes('physics')))subj='Physics';
  else if(subjs.some(s=>s.includes('math')))subj='Mathematics';
  else if(subjs.some(s=>s.includes('chemistry')))subj='Chemistry';
  else if(subjs.some(s=>s.includes('biology')||s.includes('medical')))subj='Biology';
  else if(subjs.some(s=>s.includes('business')||s.includes('economics')))subj='Commerce';
  else if(subjs.some(s=>s.includes('history')||s.includes('literature')))subj='Arts';
  const author=doc.author_name?doc.author_name.join(', '):'Unknown';
  return {
    id,title:doc.title,author,subject:subj,
    level:doc.first_publish_year?`Published ${doc.first_publish_year}`:'Academic',
    pages:doc.number_of_pages_median?`${doc.number_of_pages_median} pages`:'N/A',
    emoji:SUBJ_EMOJI[subj]||'📚',gradient:GRADIENTS[nextId%GRADIENTS.length],
    isbn:doc.isbn?doc.isbn[0]:null,cover_i:doc.cover_i,
    fromAPI:true,olKey:doc.key,
    chapters:(doc.subject||[]).slice(0,8),
    description:`${doc.title} by ${author}. ${subj} book available on Open Library.`,
    summaryContent:`"${doc.title}" by ${author} is a ${subj.toLowerCase()} book.`,
    keyTopics:(doc.subject||[]).slice(0,5)
  };
}

// ── Library Search ──
let searchTimer;
function onLibSearch(){
  clearTimeout(searchTimer);
  searchTimer=setTimeout(async()=>{
    const q=(document.getElementById('libSearch')?.value||'').trim();
    const grid=document.getElementById('booksGrid');
    if(!grid)return;
    if(q.length<2){loadBooksForSub(state.activeSub);return;}
    // Filter local
    let books=[];
    if(NCERT[state.activeSub])books=NCERT[state.activeSub].filter(b=>b.title.toLowerCase().includes(q.toLowerCase()));
    if(apiBooks[state.activeSub])books.push(...apiBooks[state.activeSub].filter(b=>b.title.toLowerCase().includes(q.toLowerCase())));
    // Also search Open Library
    if(books.length<3 && q.length>=3){
      grid.innerHTML=books.map(b=>bookCardHTML(b)).join('')+'<div class="loading-state small"><div class="searching-spinner"></div><p>Searching Open Library...</p></div>';
      const more=await fetchOLBooks(q);
      if(!apiBooks[state.activeSub])apiBooks[state.activeSub]=[];
      more.forEach(b=>{if(!apiBooks[state.activeSub].some(e=>e.title===b.title)){apiBooks[state.activeSub].push(b);books.push(b);}});
    }
    grid.innerHTML=books.map(b=>bookCardHTML(b)).join('');
    if(books.length===0)grid.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><h3>No results</h3><p>Try different keywords</p></div>';
  },500);
}

// ── Book Card HTML ──
function bookCardHTML(book){
  const cv=coverUrl(book,'M');
  const bm=state.bookmarks.includes(book.id);
  const inner=cv
    ?`<img src="${cv}" alt="${book.title}" class="book-cover-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"><div class="book-cover-face" style="display:none"><span class="book-cover-emoji">${book.emoji||'📚'}</span><div class="book-cover-title">${book.title}</div></div>`
    :`<div class="book-cover-face"><span class="book-cover-emoji">${book.emoji||'📚'}</span><div class="book-cover-title">${book.title}</div><div class="book-cover-author">${(book.author||'').split(',')[0]}</div></div>`;
  return `<div class="book-card" onclick="openBookModal('${book.id}')">
    <div class="book-cover" style="background:${book.gradient||GRADIENTS[0]}">${inner}</div>
    <div class="book-card-info"><h4>${book.title}</h4><p>${(book.author||'').split(',')[0]}${bm?' • ⭐':''}</p></div>
  </div>`;
}

function bookCardSmall(book){
  const cv=coverUrl(book,'S');
  return `<div class="book-card-sm" onclick="openBookModal('${book.id}')">
    <div class="book-cover-sm" style="background:${book.gradient||GRADIENTS[0]}">${cv?`<img src="${cv}" alt="" class="book-cover-img" onerror="this.style.display='none'" loading="lazy">`:''}<span style="font-size:24px">${book.emoji||'📚'}</span></div>
    <span class="book-sm-title">${book.title}</span>
  </div>`;
}

// ── Book Modal (Tabbed) ──
let modalBook=null;
function openBookModal(id){
  const book=findBookById(id);
  if(!book)return;
  modalBook=book;
  // Track open
  if(!state.progress[id])state.progress[id]={opened:true,chaptersRead:[]};
  else state.progress[id].opened=true;
  save('bh_progress',state.progress);
  // Build modal
  const cv=coverUrl(book,'L');
  const bm=state.bookmarks.includes(id);
  const modal=document.getElementById('bookModal');
  document.getElementById('modalBody').innerHTML=`
    <div class="modal-top-bar">
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-hero">
      <div class="modal-cover" style="background:${book.gradient||GRADIENTS[0]}">
        ${cv?`<img src="${cv}" alt="${book.title}" class="modal-cover-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="book-cover-face" style="display:none;width:100%;height:100%"><span class="book-cover-emoji" style="font-size:48px">${book.emoji||'📚'}</span><div class="book-cover-title" style="font-size:16px">${book.title}</div></div>`:`<div class="book-cover-face" style="width:100%;height:100%"><span class="book-cover-emoji" style="font-size:48px">${book.emoji||'📚'}</span><div class="book-cover-title" style="font-size:16px">${book.title}</div></div>`}
      </div>
      <div class="modal-hero-info">
        <h2>${book.title}</h2>
        <p class="text-muted">${book.author}</p>
        <div class="modal-tags">
          <span class="modal-tag">${book.subject||''}</span>
          <span class="modal-tag">${book.level||''}</span>
          ${book.pages?`<span class="modal-tag">${book.pages}</span>`:''}
        </div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="readBook()">📖 Read Book</button>
          <button class="btn-outline" onclick="enterStudioChat()">🤖 AI Chat Studio</button>
          <button class="btn-outline" onclick="toggleBookmark('${id}')">${bm?'⭐ Bookmarked':'☆ Bookmark'}</button>
          ${book.code?`<button class="btn-outline" onclick="downloadBook()">⬇ Download</button>`:''}
        </div>
      </div>
    </div>
    <div class="modal-tabs">
      <button class="mtab active" onclick="switchModalTab('info',this)">📋 Info</button>
      <button class="mtab" onclick="switchModalTab('summary',this)">📝 Summary</button>
      <button class="mtab" onclick="switchModalTab('quiz',this)">🏆 Quiz</button>
      <button class="mtab" onclick="switchModalTab('flash',this)">🎴 Flashcards</button>
    </div>
    <div class="modal-tab-content" id="modalTabContent">
      ${renderInfoTab(book)}
    </div>`;
  modal.classList.add('show');
}

function closeModal(){document.getElementById('bookModal').classList.remove('show');}
function closeModalBg(e){if(e.target.id==='bookModal')closeModal();}

function switchModalTab(tab,btn){
  document.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const tc=document.getElementById('modalTabContent');
  if(tab==='info')tc.innerHTML=renderInfoTab(modalBook);
  else if(tab==='summary')tc.innerHTML=renderSummaryTab(modalBook);
  else if(tab==='chat')tc.innerHTML=renderChatTab(modalBook);
  else if(tab==='quiz')tc.innerHTML=renderQuizTab(modalBook);
  else if(tab==='flash')tc.innerHTML=renderFlashcardsTab(modalBook);
}

function renderInfoTab(book){
  const prog=state.progress[book.id];
  const chaptersRead=prog?prog.chaptersRead||[]:[];
  return `<div class="tab-section"><h3>About this Book</h3><p>${book.description||book.summaryContent||'No description available.'}</p></div>
  <div class="tab-section"><h3>📑 Chapters</h3>
  <div class="chapter-list">${(book.chapters||[]).map((c,i)=>{
    const read=chaptersRead.includes(i);
    return `<div class="chapter-row ${read?'read':''}">
      <button class="ch-check" onclick="event.stopPropagation();toggleChapter('${book.id}',${i},this)">${read?'✅':'⬜'}</button>
      <span class="ch-name">${i+1}. ${c}</span>
      ${book.code?`<button class="ch-read-btn" onclick="event.stopPropagation();readChapter(${i+1})">Read →</button>`:''}
    </div>`;
  }).join('')}</div></div>`;
}

function renderSummaryTab(book){
  state.stats.summaries++;save('bh_stats',state.stats);
  addActivity('📝',`Viewed summary of "${book.title}"`);
  const topics=book.keyTopics||book.chapters||[];
  return `<div class="tab-section"><h3>📝 AI Summary</h3><p>${book.summaryContent||book.description||'Summary not available.'}</p></div>
  <div class="tab-section"><h3>🔑 Key Topics</h3><ul>${topics.slice(0,8).map(t=>`<li><strong>${t}</strong></li>`).join('')}</ul></div>
  <div class="tab-section"><h3>📋 Study Tips</h3><ul><li>Read each chapter thoroughly before moving to exercises</li><li>Make short notes of key formulas and concepts</li><li>Practice previous year questions for better preparation</li><li>Use the AI chat for instant doubt resolution</li></ul></div>`;
}

// ── Chat Studio ──
function enterStudioChat(){
  if(!modalBook) return;
  closeModal();
  navigateTo('studio');
  
  const book = modalBook;
  document.getElementById('studioTitle').textContent = book.title;
  document.getElementById('studioAuthor').textContent = book.author;
  const cv=coverUrl(book,'L');
  document.getElementById('studioCover').innerHTML = cv ? `<img src="${cv}">` : `<div style="background:${book.gradient};width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;">${book.emoji||'📚'}</div>`;
  
  const studioMsgs = document.getElementById('studioMsgs');
  const history = state.chatHistory[book.id] || [];
  studioMsgs.innerHTML = history.length===0 
    ? `<div class="chat-welcome-mini" style="margin-top:100px;"><div class="feature-icon-wrap" style="margin:0 auto 20px; width:60px; height:60px;"><span style="font-size:28px">🤖</span></div><h2>Welcome to Focus Studio</h2><p>I am your AI tutor for <strong>${book.title}</strong>. Ask me anything about the concepts, formulas, or chapters.</p></div>`
    : history.map(m=>modalMsgHTML(m.role,m.content)).join('');
  
  studioMsgs.scrollTop = studioMsgs.scrollHeight;
}

function closeStudio(){ navigateTo('dashboard'); }

async function sendStudioMsg(text){
  const input=document.getElementById('studioInput');
  const msg=text||(input?input.value.trim():'');
  if(!msg||!modalBook)return;
  if(input)input.value='';
  
  const msgs=document.getElementById('studioMsgs');
  const welcome=msgs.querySelector('.chat-welcome-mini');
  if(welcome)welcome.remove();

  if(!state.chatHistory[modalBook.id])state.chatHistory[modalBook.id]=[];
  state.chatHistory[modalBook.id].push({role:'user',content:msg});
  state.stats.queries++;save('bh_stats',state.stats);

  msgs.innerHTML+=modalMsgHTML('user',msg);
  msgs.innerHTML+=`<div class="message ai" id="studioTyping"><div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
  msgs.scrollTop=msgs.scrollHeight;

  try {
    const resp = await callAIAPI(msg, modalBook);
    state.chatHistory[modalBook.id].push({role:'assistant',content:resp});
    const t=document.getElementById('studioTyping');if(t)t.remove();
    msgs.innerHTML+=modalMsgHTML('assistant',resp);
    msgs.scrollTop=msgs.scrollHeight;
  } catch (err) {
    const t=document.getElementById('studioTyping');if(t)t.remove();
    msgs.innerHTML+=modalMsgHTML('assistant', `⚠️ Error: ${err.message}`);
  }
}


// ── Quiz & Flashcard Shared Logic ──
let activeQuiz = null;
let activeFlashcards = null;
let currentFlashIdx = 0;

function renderQuizTab(book){
  return `<div class="quiz-container" id="quizContainer">
    <div class="tool-setup-card">
      <div class="feature-icon-wrap" style="margin:0 auto 16px; width:50px; height:50px;"><span style="font-size:24px">🏆</span></div>
      <h3>AI Quiz Generator</h3>
      <p>Test your knowledge on <strong>${book.title}</strong></p>
      
      <div class="config-grid">
        <div class="config-item">
          <label>Scope</label>
          <select id="quizScope">
            <option value="whole book">Whole Book</option>
            ${(book.chapters||[]).map((c,i)=>`<option value="Chapter ${i+1}: ${c}">Chapter ${i+1}</option>`).join('')}
          </select>
        </div>
        <div class="config-item">
          <label>Questions</label>
          <input type="number" id="quizCount" value="5" min="3" max="15">
        </div>
        <div class="config-item">
          <label>Difficulty</label>
          <select id="quizDiff">
            <option value="Easy">Easy</option>
            <option value="Medium" selected>Medium</option>
            <option value="Hard">Hard (JEE/NEET Level)</option>
          </select>
        </div>
        <div class="config-item">
          <label>Time Limit</label>
          <select id="quizTime">
            <option value="5">5 Min</option>
            <option value="10" selected>10 Min</option>
            <option value="20">20 Min</option>
          </select>
        </div>
      </div>
      
      <button class="btn-primary w-full" onclick="startAIQuiz()">Generate Quiz</button>
    </div>
  </div>`;
}

function renderFlashcardsTab(book){
  return `<div class="flashcards-container" id="flashContainer">
    <div class="tool-setup-card">
      <div class="feature-icon-wrap" style="margin:0 auto 16px; width:50px; height:50px;"><span style="font-size:24px">🎴</span></div>
      <h3>AI Flashcard Factory</h3>
      <p>Memorize key terms from <strong>${book.title}</strong></p>
      
      <div class="config-grid">
        <div class="config-item">
          <label>Topic / Chapter</label>
          <input type="text" id="flashTopic" placeholder="e.g. Important formulas" value="Key concepts">
        </div>
        <div class="config-item">
          <label>Card Count</label>
          <input type="number" id="flashCount" value="8" min="5" max="20">
        </div>
      </div>
      
      <button class="btn-primary w-full" onclick="startAIFlashcards()">Create Flashcards</button>
    </div>
  </div>`;
}

async function startAIQuiz(){
  const scope = document.getElementById('quizScope').value;
  const count = document.getElementById('quizCount').value;
  const diff = document.getElementById('quizDiff').value;
  const time = document.getElementById('quizTime').value;
  
  const container = document.getElementById('quizContainer');
  container.innerHTML = `<div class="loading-state"><div class="searching-spinner large"></div><p>AI is generating custom questions for you...</p></div>`;
  
  try {
    const prompt = `Generate a Multiple Choice Quiz (MCQ) for the book "${modalBook.title}". 
    Scope: ${scope}. Number of questions: ${count}. Difficulty: ${diff}.
    Format: Return ONLY a valid JSON object with a "questions" key that is an array. Each object in that array must have: 
    "question" (string), "options" (array of 4 strings), and "correctIndex" (integer 0-3).`;
    
    const resp = await callAIAPI(prompt, modalBook, true);
    const questions = JSON.parse(resp).questions;
    
    activeQuiz = {
      questions,
      currentIndex: 0,
      score: 0,
      timeLeft: parseInt(time) * 60,
      timer: null
    };
    
    renderCurrentQuestion();
    startQuizTimer();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Generation Failed</h3><p>${err.message}</p></div>`;
  }
}

function startQuizTimer(){
  activeQuiz.timer = setInterval(() => {
    activeQuiz.timeLeft--;
    const el = document.getElementById('quizTimer');
    if(el) {
      const m = Math.floor(activeQuiz.timeLeft / 60);
      const s = activeQuiz.timeLeft % 60;
      el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }
    if(activeQuiz.timeLeft <= 0) finishQuiz();
  }, 1000);
}

function renderCurrentQuestion(){
  const q = activeQuiz.questions[activeQuiz.currentIndex];
  const container = document.getElementById('quizContainer');
  container.innerHTML = `
    <div class="quiz-active">
      <div class="quiz-header">
        <div class="quiz-progress">Q${activeQuiz.currentIndex + 1}/${activeQuiz.questions.length}</div>
        <div class="quiz-timer" id="quizTimer">--:--</div>
      </div>
      <div class="question-card">
        <div class="question-text">${q.question}</div>
        <div class="options-grid">
          ${q.options.map((opt, i) => `<button class="option-btn" onclick="selectQuizOption(${i})"><span class="opt-label">${String.fromCharCode(65+i)}</span> ${opt}</button>`).join('')}
        </div>
      </div>
    </div>`;
}

function selectQuizOption(idx){
  const q = activeQuiz.questions[activeQuiz.currentIndex];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((b, i) => {
    b.onclick = null;
    if(i === q.correctIndex) b.classList.add('correct');
    else if(i === idx) b.classList.add('wrong');
  });
  if(idx === q.correctIndex) activeQuiz.score++;
  setTimeout(() => {
    activeQuiz.currentIndex++;
    if(activeQuiz.currentIndex < activeQuiz.questions.length) renderCurrentQuestion();
    else finishQuiz();
  }, 1500);
}

function finishQuiz(){
  clearInterval(activeQuiz.timer);
  const container = document.getElementById('quizContainer');
  container.innerHTML = `
    <div class="quiz-results">
      <div class="result-score">${activeQuiz.score}/${activeQuiz.questions.length}</div>
      <p class="result-text">${activeQuiz.score === activeQuiz.questions.length ? 'Perfect!' : 'Great effort!'}</p>
      <button class="btn-primary" onclick="switchModalTab('quiz', document.querySelector('.mtab.active'))">Restart</button>
    </div>`;
  addActivity('🏆', `Quiz Score: ${activeQuiz.score}/${activeQuiz.questions.length}`);
}

async function startAIFlashcards(){
  const topic = document.getElementById('flashTopic').value;
  const count = document.getElementById('flashCount').value;
  const container = document.getElementById('flashContainer');
  container.innerHTML = `<div class="loading-state"><div class="searching-spinner large"></div><p>AI is crafting your flashcards...</p></div>`;
  try {
    const prompt = `Generate educational flashcards for "${modalBook.title}". Topic: ${topic}. Count: ${count}. 
    Format: Return ONLY a valid JSON object with a "cards" key that is an array. Each object in the array must have "front" and "back" strings.`;
    const resp = await callAIAPI(prompt, modalBook, true);
    activeFlashcards = JSON.parse(resp).cards;
    currentFlashIdx = 0;
    renderFlashcard();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

function renderFlashcard(){
  const card = activeFlashcards[currentFlashIdx];
  const container = document.getElementById('flashContainer');
  container.innerHTML = `
    <div class="flashcards-view">
      <div class="flashcard" onclick="this.classList.toggle('flipped')">
        <div class="card-face card-front"><div class="card-label">Front</div>${card.front}</div>
        <div class="card-face card-back"><div class="card-label">Back</div>${card.back}</div>
      </div>
      <div class="card-nav">
        <button class="nav-btn" onclick="prevCard()" ${currentFlashIdx===0?'disabled':''}>←</button>
        <button class="nav-btn" onclick="nextCard()" ${currentFlashIdx===activeFlashcards.length-1?'disabled':''}>→</button>
      </div>
    </div>`;
}

function nextCard(){ currentFlashIdx++; renderFlashcard(); }
function prevCard(){ currentFlashIdx--; renderFlashcard(); }

function modalMsgHTML(role,content){
  const av=role==='user'?(state.user?state.user.name[0].toUpperCase():'U'):'🤖';
  const displayRole = role === 'assistant' ? 'ai' : role;
  // Render markdown if it's the AI/Assistant responding
  const renderedContent = role === 'assistant' ? marked.parse(content) : content;
  return `<div class="message ${displayRole}"><div class="msg-avatar">${av}</div><div class="msg-bubble">${renderedContent}</div></div>`;
}

async function modalSend(text){
  const input=document.getElementById('modalChatInput');
  const msg=text||(input?input.value.trim():'');
  if(!msg||!modalBook)return;
  if(input)input.value='';
  
  if(!state.chatHistory[modalBook.id])state.chatHistory[modalBook.id]=[];
  state.chatHistory[modalBook.id].push({role:'user',content:msg});
  state.stats.queries++;save('bh_stats',state.stats);
  addActivity('💬',`Asked: "${msg.substring(0,35)}..."`);
  
  const msgs=document.getElementById('modalChatMsgs');
  const welcome=msgs.querySelector('.chat-welcome-mini');
  if(welcome)welcome.remove();
  
  msgs.innerHTML+=modalMsgHTML('user',msg);
  msgs.innerHTML+=`<div class="message ai" id="typingMsg"><div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
  msgs.scrollTop=msgs.scrollHeight;

  try {
    const resp = await callAIAPI(msg, modalBook);
    state.chatHistory[modalBook.id].push({role:'assistant',content:resp});
    const t=document.getElementById('typingMsg');if(t)t.remove();
    msgs.innerHTML+=modalMsgHTML('assistant',resp);
    msgs.scrollTop=msgs.scrollHeight;
  } catch (err) {
    const t=document.getElementById('typingMsg');if(t)t.remove();
    msgs.innerHTML+=modalMsgHTML('assistant', `⚠️ AI Error: ${err.message}. Please ensure you are running the site via a local server (Live Server).`);
    console.error("AI Error:", err);
  }
}

async function callAIAPI(q, book, jsonMode = false){
  if(AI_CONFIG.apiKey === 'YOUR_API_KEY_HERE') throw new Error("API Key missing");

  const history = state.chatHistory[book.id] || [];
  const systemPrompt = jsonMode 
    ? `You are an educational data generator. Always return strictly valid JSON ONLY. No prose, no markdown code blocks.`
    : `You are the BookHunt AI Tutor. You are helping a student with the book: "${book.title}" by ${book.author}. 
  The book subject is ${book.subject}. 
  
  CRITICAL FORMATTING RULES:
  1. Use multiple SEPARATE PARAGRAPHS to explain things clearly. Never send one big wall of text.
  2. Use headings (###) for sections.
  3. Use bullet points or numbered lists for key items.
  4. Use bold for emphasis but don't overdo it.
  5. Your responses will be rendered with Markdown, so use it to make the output look premium and readable.`;

  const response = await fetch(AI_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(!jsonMode ? history.slice(-6) : []), // No history in JSON mode
        { role: 'user', content: q }
      ],
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `API error: ${response.status}`);
  }
  return data.choices[0].message.content;
}

// ── Bookmarks ──
function toggleBookmark(id){
  const idx=state.bookmarks.indexOf(id);
  if(idx>=0){state.bookmarks.splice(idx,1);showToast('☆ Bookmark removed');}
  else{state.bookmarks.push(id);showToast('⭐ Book bookmarked!');addActivity('⭐',`Bookmarked "${findBookById(id)?.title}"`);}
  save('bh_bookmarks',state.bookmarks);
  if(modalBook)openBookModal(modalBook.id); // refresh modal
}

// ── Progress ──
function toggleChapter(bookId,chIdx,btn){
  if(!state.progress[bookId])state.progress[bookId]={opened:true,chaptersRead:[]};
  const cr=state.progress[bookId].chaptersRead;
  const idx=cr.indexOf(chIdx);
  if(idx>=0)cr.splice(idx,1); else cr.push(chIdx);
  save('bh_progress',state.progress);
  btn.textContent=idx>=0?'⬜':'✅';
  btn.closest('.chapter-row').classList.toggle('read',idx<0);
}

// ── PDF Reader ──
function readBook(){
  if(!modalBook)return;
  if(modalBook.code){
    const url=ncertPdf(modalBook.code,1);
    openReader(url,`${modalBook.title} - Chapter 1`);
  } else if(modalBook.olKey){
    window.open(`https://openlibrary.org${modalBook.olKey}`,'_blank');
  } else {
    showToast('📖 No readable version available','error');
  }
}

function readChapter(chNum){
  if(!modalBook||!modalBook.code)return;
  const url=ncertPdf(modalBook.code,chNum);
  openReader(url,`${modalBook.title} - Chapter ${chNum}`);
}

function openReader(url,title){
  closeModal();
  navigateTo('reader');
  document.getElementById('readerTitle').textContent=title||'Book Reader';
  document.getElementById('readerFrame').src=url;
  document.getElementById('readerDownload').onclick=()=>window.open(url,'_blank');
}

function closeReader(){
  document.getElementById('readerFrame').src='';
  navigateTo('library');
}

function downloadBook(){
  if(!modalBook)return;
  if(modalBook.code){
    window.open(ncertPage(modalBook.code,modalBook.ch||10),'_blank');
  } else if(modalBook.isbn){
    window.open(`https://openlibrary.org/isbn/${modalBook.isbn}`,'_blank');
  }
  showToast('⬇ Opening download page...');
}

// ── Helpers ──
function addActivity(icon,text){
  state.activities.unshift({icon,text,time:'just now'});
  if(state.activities.length>20)state.activities.pop();
  save('bh_activities',state.activities);
}
function showToast(msg,type='success'){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(20px)';setTimeout(()=>t.remove(),300);},3000);
}
