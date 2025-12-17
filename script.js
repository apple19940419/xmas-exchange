// Firebase Configuration
// IMPORTANT: Replace this with your own Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDg8i24ejTBsuMFIDKDS5hvcFU5miJ9ONk",
  authDomain: "xmax-49e99.firebaseapp.com",
  projectId: "xmax-49e99",
  storageBucket: "xmax-49e99.firebasestorage.app",
  messagingSenderId: "125712191258",
  appId: "1:125712191258:web:13428dad7082d8bfe826a3",
  measurementId: "G-QRJXP6BTNG"
};

// Initialize Firebase
// Note: We use compat libraries in HTML for simplicity in static hosting
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/**
 * References to Database Paths
 * Structure:
 * /votes
 *    /gift_1: 5
 *    /gift_2: 3
 * /assignments
 *    /timestamp: "ALice -> 1, Bob -> 2" (Just storing string or JSON for display)
 */

const votesRef = db.ref('votes');
const assignmentsRef = db.ref('assignments');

// DOM Elements
const giftIdInput = document.getElementById('gift-id-input');
const voteBtn = document.getElementById('vote-btn');
const voteResults = document.getElementById('vote-results');
const participantsInput = document.getElementById('participants-input');
const assignBtn = document.getElementById('assign-btn');
const assignmentResults = document.getElementById('assignment-results');
const resultsList = document.getElementById('results-list');
const resetBtn = document.getElementById('reset-btn');

// --- Voting Logic ---

// Listen for vote changes
votesRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    renderVotes(data);
});

function renderVotes(votesData) {
    voteResults.innerHTML = '';

    // Convert object to array and sort by ID
    const sortedGifts = Object.keys(votesData).sort((a, b) => {
        // Extract number from "gift_X" if possible, or just string sort
        const numA = parseInt(a.replace('gift_', ''));
        const numB = parseInt(b.replace('gift_', ''));
        return numA - numB;
    });

    if (sortedGifts.length === 0) {
        voteResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888;">目前還沒有人投票</div>';
        return;
    }

    sortedGifts.forEach(key => {
        const count = votesData[key];
        const giftNum = key.replace('gift_', '');

        const card = document.createElement('div');
        card.className = 'gift-card';
        card.innerHTML = `
            <div class="gift-id">#${giftNum}</div>
            <div class="vote-count"><span>${count}</span> 票</div>
        `;
        voteResults.appendChild(card);
    });
}

voteBtn.addEventListener('click', () => {
    const id = giftIdInput.value.trim();
    if (!id) {
        alert('請輸入禮物編號！');
        return;
    }

    const giftKey = `gift_${id}`;

    // Transaction to increment vote safely
    votesRef.child(giftKey).transaction((currentVotes) => {
        return (currentVotes || 0) + 1;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error('Vote failed abnormally!', error);
            alert('投票失敗，請檢查網路連線');
        } else {
            // Animation or feedback could go here
            giftIdInput.value = ''; // Clear input
        }
    });
});

// --- Assignment Logic ---

// Listen for assignment changes (so everyone sees the result when one person clicks assign)
assignmentsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.results) {
        renderAssignments(data.results);
    } else {
        assignmentResults.classList.add('hidden');
    }
});

function renderAssignments(resultsArray) {
    assignmentResults.classList.remove('hidden');
    resultsList.innerHTML = '';
    resultsArray.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.person} ➡️ 收到 ${item.giftId} 號禮物`;
        resultsList.appendChild(li);
    });
}

assignBtn.addEventListener('click', () => {
    const text = participantsInput.value.trim();
    if (!text) {
        alert('請輸入參與者名單！');
        return;
    }

    // Split by newlines or commas
    const info = text.split(/\n|,/g).map(s => s.trim()).filter(s => s);

    if (info.length < 2) {
        alert('至少需要兩位參與者才能進行交換！');
        return;
    }

    // Generate Gift IDs (Assuming 1 to N, or could be custom. User said "Gift usually has ID")
    // Simple logic: If N people, Gifts are 1..N.
    // Enhanced logic: Ask user? For now, I'll assume 1 to N matching people count.

    // Create array of gift IDs 1..N
    let gifts = Array.from({ length: info.length }, (_, i) => i + 1);

    const results = shuffleAndAssign(info, gifts);

    // Save to Firebase
    assignmentsRef.set({
        timestamp: Date.now(),
        results: results
    });
});

function shuffleAndAssign(people, gifts) {
    // Fisher-Yates Shuffle for gifts
    for (let i = gifts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gifts[i], gifts[j]] = [gifts[j], gifts[i]];
    }

    // Constraint: People shouldn't get their own gift? 
    // Usually in this scenario "Gift ID" is random, but if People brought Gift #X, they shouldn't get #X.
    // However, the prompt says "Gifts have IDs", doesn't explicitly say Person A brought Gift A.
    // Often these events are: Pile of gifts 1-N. Draw.
    // So simple shuffle is sufficient.

    return people.map((person, index) => {
        return { person: person, giftId: gifts[index] };
    });
}

// --- Admin Logic ---

resetBtn.addEventListener('click', () => {
    if (confirm('確定要重置所有投票和與分配結果嗎？此動作無法復原！')) {
        db.ref('/').set(null); // Clear root, or clear specific paths
    }
});
