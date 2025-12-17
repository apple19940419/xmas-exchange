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
const settingsRef = db.ref('settings');

// Default Settings
let voteLimitPerGift = 1; // Limit per gift per person
let minGiftId = 1;
let maxGiftId = 100;

// DOM Elements
const giftIdInput = document.getElementById('gift-id-input');
const voteBtn = document.getElementById('vote-btn');
const voteResults = document.getElementById('vote-results');
const participantsInput = document.getElementById('participants-input');
const assignBtn = document.getElementById('assign-btn');
const assignmentResults = document.getElementById('assignment-results');
const resultsList = document.getElementById('results-list');
const resetBtn = document.getElementById('reset-btn');

// Sorting Elements
const sortKeySelect = document.getElementById('sort-key');
const sortOrderSelect = document.getElementById('sort-order');

// Admin Elements
const maxVotesInput = document.getElementById('max-votes-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const minIdInput = document.getElementById('min-id-input');
const maxIdInput = document.getElementById('max-id-input');
const saveRangeBtn = document.getElementById('save-range-btn');

// --- Settings Logic ---

// Listen for settings changes
settingsRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    if (data.limit) {
        voteLimitPerGift = parseInt(data.limit);
        maxVotesInput.value = voteLimitPerGift;
    }
    if (data.range) {
        minGiftId = parseInt(data.range.min || 1);
        maxGiftId = parseInt(data.range.max || 100);
        minIdInput.value = minGiftId;
        maxIdInput.value = maxGiftId;
    }
    // Handle Reset Signal
    if (data.info === 'reset') {
        localStorage.removeItem('xmas_voted_gifts');
        // Refresh?
    }
});

saveSettingsBtn.addEventListener('click', () => {
    const val = parseInt(maxVotesInput.value);
    if (val < 1) {
        alert('上限至少為 1');
        return;
    }
    settingsRef.update({
        limit: val
    });
    alert('票數上限已儲存！');
});

saveRangeBtn.addEventListener('click', () => {
    const min = parseInt(minIdInput.value);
    const max = parseInt(maxIdInput.value);

    if (isNaN(min) || isNaN(max) || min > max) {
        alert('無效的範圍！');
        return;
    }

    settingsRef.update({
        range: { min, max }
    });
    alert('編號範圍已儲存！');
});

// --- Voting Logic ---

// Variable to store current votes data for re-sorting
let currentVotesData = {};

// Listen for vote changes
votesRef.on('value', (snapshot) => {
    currentVotesData = snapshot.val() || {};
    renderVotes();
});

// Listen for sort changes
sortKeySelect.addEventListener('change', renderVotes);
sortOrderSelect.addEventListener('change', renderVotes);

function renderVotes() {
    const votesData = currentVotesData;
    voteResults.innerHTML = '';

    // Sort logic
    const sortKey = sortKeySelect.value; // 'id' or 'count'
    const sortOrder = sortOrderSelect.value; // 'asc' or 'desc'

    const sortedGifts = Object.keys(votesData).sort((a, b) => {
        const idA = parseInt(a.replace('gift_', ''));
        const idB = parseInt(b.replace('gift_', ''));
        const countA = votesData[a];
        const countB = votesData[b];

        let comparison = 0;
        if (sortKey === 'id') {
            comparison = idA - idB;
        } else { // count
            comparison = countA - countB;
            // If counts are equal, fallback to ID sorting
            if (comparison === 0) {
                comparison = idA - idB;
            }
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    if (sortedGifts.length === 0) {
        voteResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888;">目前還沒有人投票</div>';
        return;
    }

    // Get local voted gifts (Array of ID strings)
    const votedGifts = JSON.parse(localStorage.getItem('xmas_voted_gifts') || '[]');

    sortedGifts.forEach(key => {
        const count = votesData[key];
        const giftNum = key.replace('gift_', '');
        const idStr = giftNum.toString();

        // Count how many times I voted for this gift
        const myVotesForThis = votedGifts.filter(x => x === idStr).length;
        const isVotedByMe = myVotesForThis > 0;

        const badgeHtml = isVotedByMe ? '<div class="voted-badge">👎</div>' : '';

        const card = document.createElement('div');
        card.className = 'gift-card';
        card.innerHTML = `
            ${badgeHtml}
            <div class="gift-id">#${giftNum}</div>
            <div class="vote-count"><span>${count}</span> 票</div>
        `;
        // Optional: highlight my choices
        if (isVotedByMe) {
            card.style.borderColor = 'var(--primary-red)';
            card.style.backgroundColor = '#fff0f0';
        }

        voteResults.appendChild(card);
    });
}
// Removed updateVoteCountDisplay logic as it is not needed anymore


voteBtn.addEventListener('click', () => {
    const id = parseInt(giftIdInput.value.trim()); // Parse as int for comparison
    if (!id && id !== 0) {
        alert('請輸入禮物編號！');
        return;
    }

    // Check Range
    if (id < minGiftId || id > maxGiftId) {
        alert(`禮物編號必須在 ${minGiftId} ~ ${maxGiftId} 之間！`);
        return;
    }

    // Convert back to string for key usage if needed, but safe to use logic below
    const idStr = id.toString();

    const giftKey = `gift_${id}`;

    // Check Local Limit Per Gift
    const votedGifts = JSON.parse(localStorage.getItem('xmas_voted_gifts') || '[]');
    const myVotesForThis = votedGifts.filter(x => x === idStr).length;

    if (myVotesForThis >= voteLimitPerGift) {
        alert(`你投給這個禮物的票數已經達到上限囉 (${voteLimitPerGift}票)！`);
        return;
    }

    // Transaction to increment
    votesRef.child(giftKey).transaction((currentVotes) => {
        return (currentVotes || 0) + 1;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error('Vote failed abnormally!', error);
            alert('投票失敗');
        } else {
            // Success - Update Local State
            votedGifts.push(idStr); // Push string explicitly
            localStorage.setItem('xmas_voted_gifts', JSON.stringify(votedGifts));

            // FIX: Force re-render immediately so the badge appears
            // The global listener might fire before this callback or roughly same time,
            // but calling it here guarantees we use the UPDATED localStorage.
            renderVotes();

            giftIdInput.value = '';
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
        db.ref('/').set({
            settings: {
                limit: voteLimitPerGift,
                range: { min: minGiftId, max: maxGiftId }, // Keep existing range
                info: 'reset' // Signal to clear client cache
            }
        });
        // Clear self immediately
        localStorage.removeItem('xmas_voted_gifts');
        window.location.reload(); // Reload to clear any stale state visuals
    }
});
