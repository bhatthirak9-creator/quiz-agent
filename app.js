const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    const input = document.getElementById('sourceText');
    if (input) input.value = text;
    lucide.createIcons();
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
};

window.startVoiceInput = () => {
    recognition.start();
};

let currentQuestions = [];
let userAnswers = {};

// Premium Knowledge Grid Logic
document.addEventListener("DOMContentLoaded", () => {
    const sourceCards = document.querySelectorAll(".source-card");
    const realSelect = document.getElementById("topicSelect");
    const extractBtn = document.getElementById('extractBtn');

    if (extractBtn) {
        extractBtn.addEventListener('click', startQuizGeneration);
    }

    sourceCards.forEach(card => {
        card.addEventListener("click", () => {
            const val = card.getAttribute("data-value");
            
            // UI Update: Active state
            sourceCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            // Sync with Logic
            realSelect.value = val;
            window.toggleOtherInput();
            
            // Smooth scroll to input if needed
            if (val === "other") {
                 const wrapper = document.getElementById("customInputWrapper");
                 if(wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    lucide.createIcons();
    startTimer();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const updateStep = (stepNum, status) => {
  const step = document.getElementById(`step-${stepNum}`);
  if (!step) return;
  if (status === "active") {
    step.classList.add("active");
    step.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (status === "completed") {
    step.classList.remove("active");
    step.classList.add("completed");
  }
};

window.toggleOtherInput = () => {
    const select = document.getElementById('topicSelect');
    const customWrapper = document.getElementById('customInputWrapper');
    const sourceText = document.getElementById('sourceText');
    
    if (select.value === 'other') {
        customWrapper.style.display = 'block';
    } else {
        customWrapper.style.display = 'none';
        // Auto-fill predefined text
        const topics = {
            'mars': "Mars colonization represents the next frontier for humanity. SpaceX's Starship is designed to carry over 100 people to the Red Planet, utilizing methane-based fuel produced on Mars via the Sabatier process.",
            'humanoid': "Tesla's Optimus and other humanoid robots are evolving rapidly. These machines use neural networks for task planning and computer vision for environmental awareness.",
            'neuralink': "Brain-Computer Interfaces (BCI) like Neuralink aim to bridge the gap between biological intelligence and AI. By using flexible electrode threads implanted in the motor cortex.",
            'meta_economy': "The metaverse is evolving from a visual concept to a full-blown digital economy. Utilizing blockchain, decentralized finance (DeFi), and NFTs.",
            'biotech': "CRISPR-Cas9 technology has revolutionized genetic engineering. By allowing precise edits to DNA sequences, biotech companies are developing treatments.",
            'agentic_web': "Web 4.0, or the Agentic Web, focuses on autonomous AI agents that perform complex tasks on behalf of users."
        };
        if (topics[select.value] && sourceText) {
            sourceText.value = topics[select.value];
        }
    }
};

window.startQuizGeneration = async () => {
    const sourceText = document.getElementById('sourceText');
    const text = sourceText ? sourceText.value : "";
    
    if (!text || text.length < 50) {
        alert("Please provide more text (at least 50 characters) to generate a quality quiz.");
        return;
    }

    const extractBtn = document.getElementById('extractBtn');
    const pipeline = document.getElementById('pipeline');
    const quizList = document.getElementById('quizList');
    const submitContainer = document.getElementById('submitContainer');
    
    if (extractBtn) extractBtn.disabled = true;
    if (pipeline) pipeline.style.display = 'block';
    if (quizList) quizList.innerHTML = '';
    if (submitContainer) submitContainer.style.display = 'none';

    try {
        // Step 1: Extraction
        updateStep(1, "active");
        await sleep(1200);
        updateStep(1, "completed");
        
        // Step 2: Mapping
        updateStep(2, "active");
        await sleep(1000);
        updateStep(2, "completed");

        const qCountInput = document.getElementById('questionCount');
        const numQuestions = qCountInput ? parseInt(qCountInput.value) : 5;

        // Step 3: Synthesis (AI Generation)
        updateStep(3, "active");
        
        let data;
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, numQuestions })
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            data = await response.json();
        } catch (serverError) {
            console.warn("Backend unavailable, using client-side fallback for demo:", serverError);
            data = {
                concepts: ["Deep Learning Fundamentals", "Neural Network Architecture", "Autonomous Agents"],
                questions: [
                    { id: 1, text: "What distinguishes 'Narrow AI' from 'General AI'?", options: ["Task specificity", "Processing speed", "Memory capacity", "Power consumption"], answerIdx: 0, difficulty: "Easy" },
                    { id: 2, text: "Which algorithm is commonly used for reinforcement learning?", options: ["Q-Learning", "K-Means", "Linear Regression", "Bubble Sort"], answerIdx: 0, difficulty: "Hard" },
                    { id: 3, text: "In neural networks, what is the role of an activation function?", options: ["Define output range", "Store data", "Connect to internet", "Cool the processor"], answerIdx: 0, difficulty: "Medium" },
                    { id: 4, text: "What is 'Overfitting' in machine learning models?", options: ["Learning noise as signal", "Training too slowly", "Not enough data", "Using too much RAM"], answerIdx: 0, difficulty: "Medium" },
                    { id: 5, text: "What does NLP stand for in AI context?", options: ["Natural Language Processing", "Neural Link Protocol", "Network Latency Ping", "New Learning Paradigm"], answerIdx: 0, difficulty: "Easy" }
                ],
                mock: true
            };
            await sleep(1000); // Simulate network delay
        }
        
        currentQuestions = data.questions || [];
        if (currentQuestions.length === 0 && !data.mock) { // Only throw error if not using mock data and no questions
            throw new Error("AI failed to generate questions. Please try again.");
        }
        
        updateStep(3, "completed");

        // Show Results Section
        const resultsSection = document.getElementById('results');
        if (resultsSection) resultsSection.style.display = 'block';

        // Render Findings/Concepts
        const conceptsTree = document.getElementById('conceptsTree');
        if (conceptsTree && data.concepts) {
            conceptsTree.innerHTML = data.concepts.map(concept => `
                <div class="tree-node">
                    <div class="node-title">${concept}</div>
                    <div class="node-subs">
                        <div class="sub-item">Extracted from source text</div>
                    </div>
                </div>
            `).join('');
        }

        // Step 4: Difficulty Ranking
        updateStep(4, "active");
        await sleep(1200);
        updateStep(4, "completed");

        // Step 5: Logic Validation
        updateStep(5, "active");
        await sleep(800);
        renderQuiz();
        updateStep(5, "completed");

        if (submitContainer) submitContainer.style.display = 'block';
        
        // Auto-scroll to results for better UX
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        lucide.createIcons();
        
    } catch (err) {
        console.error("Critical Failure:", err);
        alert("Unexpected System Error: " + err.message);
    } finally {
        if (extractBtn) extractBtn.disabled = false;
    }
};

const renderQuiz = () => {
    const quizList = document.getElementById('quizList');
    if (!quizList) return;
    
    quizList.innerHTML = currentQuestions.map((q, idx) => `
        <div class="quiz-card" id="q-${q.id}">
            <div class="question-header">
                <span class="q-num">Variant ${idx + 1}</span>
                <span class="badge ${q.difficulty === 'Hard' ? 'badge-high' : q.difficulty === 'Medium' ? 'badge-medium' : 'badge-low'}">${q.difficulty}</span>
            </div>
            <p class="question-text">${q.text || q.question}</p>
            <div class="options-grid" id="options-${q.id}">
                ${q.options.map((opt, i) => `
                    <div class="option" onclick="selectOption('${q.id}', ${i})">
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        ${opt}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
};

window.selectOption = (qId, idx) => {
    userAnswers[qId] = idx;
    const options = document.querySelectorAll(`#options-${qId} .option`);
    options.forEach((opt, i) => {
        opt.classList.toggle('selected', i === idx);
    });
};

window.submitQuiz = () => {
    const submitContainer = document.getElementById('submitContainer');
    if (!submitContainer) return;
    
    let score = 0;
    currentQuestions.forEach(q => {
        const userAns = userAnswers[q.id];
        const options = document.querySelectorAll(`#options-${q.id} .option`);
        
        options.forEach((opt, i) => {
            opt.classList.remove('selected');
            if (i === q.answerIdx) opt.classList.add('correct');
            if (userAns === i && i !== q.answerIdx) opt.classList.add('incorrect');
        });
        
        if (userAns === q.answerIdx) score++;
    });

    if (timerInterval) clearInterval(timerInterval);
    
    submitContainer.innerHTML = `
        <div class="glass-card" style="width: 100%; text-align: center; border-color: var(--primary);">
            <div style="margin-bottom: 1.5rem;">
                <i data-lucide="award" style="width: 60px; height: 60px; color: var(--success); margin-bottom: 1rem;"></i>
                <h2 style="font-size: 2.2rem; font-weight: 800; color: #fff;">Evaluation Complete</h2>
                <p style="color: var(--text-muted); font-size: 1.1rem;">Your proficiency score has been calculated.</p>
            </div>
            
            <div style="font-size: 3.5rem; font-weight: 800; margin: 2rem 0; color: #fff;">
                ${score} <span style="font-size: 1.5rem; color: var(--text-muted);">/ ${currentQuestions.length}</span>
            </div>

            <div style="display: flex; gap: 1.5rem; justify-content: center;">
                <button class="btn-secondary" onclick="location.reload()">
                    <i data-lucide="refresh-cw"></i> New Assessment
                </button>
                <button class="btn-chrome" onclick="downloadCertificate()">
                    <i data-lucide="shield-check"></i> Credential Issuance
                </button>
            </div>
        </div>
    `;
    
    const containerPos = submitContainer.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: containerPos - 100, behavior: 'smooth' });
    
    if (score === currentQuestions.length) {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 }, colors: ['#818cf8', '#c084fc', '#fb7185'] });
        }
    }
    lucide.createIcons();
};

window.downloadCertificate = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    const loadImage = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    };

    try {
        const [logoImg, sigImg] = await Promise.all([
            loadImage('logo_proper.png?t=' + Date.now()),
            loadImage('sig_clean.png?t=' + Date.now())
        ]);

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setDrawColor(10, 20, 50);
        doc.setLineWidth(3);
        doc.rect(5, 5, 287, 200);
        
        if (logoImg) doc.addImage(logoImg, 'PNG', 126, 20, 45, 45);
        
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(1);
        doc.rect(8, 8, 281, 194);
        
        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.setTextColor(197, 160, 89);
        doc.text("TRIPLE EDGE AI ACADEMY", 148, 72, null, null, "center");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(42);
        doc.setTextColor(10, 20, 50);
        doc.text("Certificate of Achievement", 148, 92, null, null, "center");
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text("This official document confirms that", 148, 108, null, null, "center");
        
        const userName = document.getElementById('username-display')?.innerText || "User";
        doc.setFont("times", "bolditalic");
        doc.setFontSize(48);
        doc.setTextColor(0, 0, 0);
        doc.text(userName, 148, 130, null, null, "center");
        doc.line(70, 134, 226, 134);
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text("has successfully mastered the AI Generative Synthesis examination.", 148, 146, null, null, "center");
        
        const sigY = 182;
        if (sigImg) doc.addImage(sigImg, 'PNG', 70, sigY - 28, 50, 25);
        doc.line(65, sigY, 125, sigY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("AUTHORIZED SIGNATURE", 95, sigY + 6, null, null, "center");
        
        const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'});
        doc.line(172, sigY, 232, sigY);
        doc.text(date, 202, sigY - 5, null, null, "center");
        doc.text("DATE OF ISSUANCE", 202, sigY + 6, null, null, "center");
        
        doc.save(`${userName}_TripleEdge_Certificate.pdf`);
    } catch (err) {
        console.error(err);
        alert("Certificate Error");
    }
};

let timerInterval;
const startTimer = () => {
    let seconds = 0;
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        timerEl.innerText = timeStr;
    }, 1000);
};
