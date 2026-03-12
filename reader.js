// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let pageCount = 0;
let currentBook = null;
let chatHistory = [];
let isLoadingChat = false;

// AI Configuration (from app.js)
const AI_CONFIG = {
  apiKey: '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',
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.3-70b-versatile'
};

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  const category = urlParams.get('cat');

  if (!bookId || !category) {
    alert('No book selected. Redirecting...');
    window.location.href = 'index.html';
    return;
  }

  await loadBook(bookId, category);
  
  // Setup chat input
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isLoadingChat) {
      sendMessage();
    }
  });
});

// ── LOAD BOOK ──
async function loadBook(bookId, category) {
  // Find book in data
  let book = null;

  // Search in NCERT
  if (category.startsWith('cbse') || category.startsWith('icse')) {
    for (let cat in NCERT) {
      const found = NCERT[cat].find(b => b.id === bookId);
      if (found) {
        book = found;
        break;
      }
    }
  }

  // Search in CLASSICS
  if (!book) {
    for (let cat in CLASSICS) {
      const found = CLASSICS[cat].find(b => b.id === bookId);
      if (found) {
        book = found;
        break;
      }
    }
  }

  // Search in SELFHELP
  if (!book) {
    for (let cat in SELFHELP) {
      const found = SELFHELP[cat].find(b => b.id === bookId);
      if (found) {
        book = found;
        break;
      }
    }
  }

  // Search in TECHNICAL
  if (!book) {
    for (let cat in TECHNICAL) {
      const found = TECHNICAL[cat].find(b => b.id === bookId);
      if (found) {
        book = found;
        break;
      }
    }
  }

  if (!book) {
    alert('Book not found!');
    window.location.href = 'index.html';
    return;
  }

  currentBook = book;

  // Update UI
  document.getElementById('bookTitle').textContent = book.title;
  document.getElementById('bookAuthor').textContent = `by ${book.author}`;
  document.getElementById('bookIcon').textContent = book.emoji;
  document.getElementById('pdfTitle').textContent = book.title;

  // Load PDF
  if (book.pdfUrl) {
    loadPDF(book.pdfUrl);
  } else {
    document.getElementById('pdfViewer').innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; color: #808080;">
        <div style="font-size: 48px;">📄</div>
        <p>PDF not available yet for <strong>${book.title}</strong></p>
        <p style="font-size: 12px;">You can still chat with the AI about this book!</p>
      </div>
    `;
  }

  // Initialize chat
  chatHistory = [];
  addMessageToChat('bot', `👋 Hey! I'm your AI tutor for "${book.title}". Ask me anything about the content, or I can help you with summaries, explanations, or questions!`);
}

// ── PDF RENDERING ──
async function loadPDF(url) {
  try {
    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.innerHTML = '<div class="pdf-loading"><div class="loader"></div></div>';

    const pdf = await pdfjsLib.getDocument(url).promise;
    pdfDoc = pdf;
    pageCount = pdf.numPages;
    pageNum = 1;

    document.getElementById('pageCount').textContent = pageCount;
    renderPage(pageNum);
  } catch (error) {
    console.error('PDF Loading Error:', error);
    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; color: #e74c3c;">
        <div style="font-size: 48px;">⚠️</div>
        <p>Could not load PDF</p>
        <p style="font-size: 12px; color: #808080;">${error.message}</p>
      </div>
    `;
  }
}

async function renderPage(num) {
  if (!pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(num);
    const scale = window.innerWidth < 1400 ? 1.3 : 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'pdf-canvas';

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.innerHTML = '';
    pdfViewer.appendChild(canvas);

    document.getElementById('pageNum').textContent = num;
    document.getElementById('prevBtn').disabled = num <= 1;
    document.getElementById('nextBtn').disabled = num >= pageCount;
  } catch (error) {
    console.error('Render error:', error);
  }
}

function nextPage() {
  if (pdfDoc && pageNum < pageCount) {
    pageNum++;
    renderPage(pageNum);
  }
}

function previousPage() {
  if (pdfDoc && pageNum > 1) {
    pageNum--;
    renderPage(pageNum);
  }
}

// ── CHAT FUNCTIONALITY ──
function addMessageToChat(sender, content) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender === 'user' ? 'user' : ''}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = `message-content ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  
  // Simple markdown-like formatting
  if (sender === 'bot') {
    // Handle code blocks
    content = content.replace(/```(.*?)```/g, '<code>$1</code>');
    contentDiv.innerHTML = content;
  } else {
    contentDiv.textContent = content;
  }

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  // Auto-scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.id = 'loading-msg';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content bot-msg';
  contentDiv.innerHTML = `
    <div class="loading-indicator">
      <span>AI is thinking</span>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    </div>
  `;

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingIndicator() {
  const loadingMsg = document.getElementById('loading-msg');
  if (loadingMsg) loadingMsg.remove();
}

async function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();

  if (!message) return;

  // Add user message
  addMessageToChat('user', message);
  chatInput.value = '';
  chatHistory.push({ role: 'user', content: message });

  // Show loading
  addLoadingIndicator();
  isLoadingChat = true;
  document.getElementById('sendBtn').disabled = true;

  try {
    // Create context from current book
    const systemPrompt = `You are an AI tutor for the book "${currentBook.title}" by ${currentBook.author}.
Help the student by:
1. Answering questions about the content
2. Providing summaries and explanations
3. Clarifying concepts
4. Suggesting study tips
5. Creating practice questions

Keep responses concise and student-friendly. If a question is not related to studying, gently redirect to academic topics.
Current page: ${pageNum}/${pageCount}`;

    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const botMessage = data.choices[0].message.content;

    removeLoadingIndicator();
    addMessageToChat('bot', botMessage);
    chatHistory.push({ role: 'assistant', content: botMessage });
  } catch (error) {
    console.error('Chat error:', error);
    removeLoadingIndicator();
    addMessageToChat('bot', `⚠️ Sorry, I couldn't process that. Error: ${error.message}`);
  } finally {
    isLoadingChat = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('chatInput').focus();
  }
}

// ── BOOKMARKS ──
function toggleBookmark() {
  if (!currentBook) return;

  const bookmarks = JSON.parse(localStorage.getItem('bh_bookmarks')) || [];
  const index = bookmarks.findIndex(b => b.id === currentBook.id);

  if (index > -1) {
    bookmarks.splice(index, 1);
    document.getElementById('bookmarkBtn').textContent = '🤍 Save';
  } else {
    bookmarks.push({
      id: currentBook.id,
      title: currentBook.title,
      author: currentBook.author,
      emoji: currentBook.emoji,
      timestamp: new Date().toISOString()
    });
    document.getElementById('bookmarkBtn').textContent = '❤️ Saved';
  }

  localStorage.setItem('bh_bookmarks', JSON.stringify(bookmarks));
}

function goBackToLibrary() {
  window.location.href = 'index.html?page=library';
}
