import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC92GlUyRJM0nlSEUcR7Jgawp8sD8RrI",
  authDomain: "school-repair-hub.firebaseapp.com",
  projectId: "school-repair-hub",
  storageBucket: "school-repair-hub.appspot.com",
  messagingSenderId: "698384234693",
  appId: "1:698384234693:web:9124ff8a42f46c5f658ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let repairs = [];
let currentFilter = 'all';

// Echtzeit-Lauscher für Firebase Firestore
const q = query(collection(db, "repairs"));
onSnapshot(q, (snapshot) => {
    repairs = [];
    snapshot.forEach((docSnap) => {
        repairs.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderRepairs();
}, (error) => {
    console.error("Fehler beim Laden der Cloud-Daten: ", error);
    const statusEl = document.getElementById('sync-status');
    if (statusEl) statusEl.innerText = "⚠️ Offline / Nur Lokal";
});

window.renderRepairs = function() {
    const listEl = document.getElementById('repair-list');
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    if (!listEl) return;
    
    listEl.innerHTML = '';

    const filtered = repairs.filter(r => {
        const matchesFilter = currentFilter === 'all' || r.status === currentFilter;
        const titleMatch = r.title ? r.title.toLowerCase().includes(searchQuery) : false;
        const ownerMatch = r.owner ? r.owner.toLowerCase().includes(searchQuery) : false;
        const descMatch = r.description ? r.description.toLowerCase().includes(searchQuery) : false;
        return matchesFilter && (titleMatch || ownerMatch || descMatch);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px;">Keine Anfragen gefunden.</p>';
    } else {
        filtered.forEach(repair => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            
            let statusText = repair.status === 'offen' ? 'Offen' : 
                             repair.status === 'in_bearbeitung' ? 'In Arbeit' : 'Erledigt';

            item.innerHTML = `
                <div class="repair-header">
                    <span class="repair-title">${escapeHtml(repair.title)}</span>
                    <span class="badge ${repair.status}">${statusText}</span>
                </div>
                <div class="repair-meta">
                    <span>📂 ${escapeHtml(repair.category)}</span>
                    <span>👤 ${escapeHtml(repair.owner)}</span>
                    ${repair.reward ? <span>🎁 ${escapeHtml(repair.reward)}</span> : ''}
                    <span>📅 ${repair.date || 'Gerade eben'}</span>
                </div>
                <div class="repair-desc">${escapeHtml(repair.description)}</div>
                <div class="repair-actions">
                    ${repair.status !== 'in_bearbeitung' && repair.status !== 'erledigt' ? 
                        <button class="action-btn btn-take" onclick="updateRepairStatus('${repair.id}', 'in_bearbeitung')">▶️ Übernehmen</button> : ''}
                    ${repair.status !== 'erledigt' ? 
                        <button class="action-btn btn-done" onclick="markRepairDone('${repair.id}')">✅ Repariert</button> : ''}
                    <button class="action-btn btn-delete" onclick="removeRepair('${repair.id}')">🗑️ Löschen</button>
                </div>
            `;
            listEl.appendChild(item);
        });
    }

    updateStats();
}

function updateStats() {
    const totalEl = document.getElementById('stat-total');
    const openEl = document.getElementById('stat-open');
    const doneEl = document.getElementById('stat-done');

    if (totalEl) totalEl.innerText = repairs.length;
    if (openEl) openEl.innerText = repairs.filter(r => r.status === 'offen').length;
    if (doneEl) doneEl.innerText = repairs.filter(r => r.status === 'erledigt').length;
}

const repairForm = document.getElementById('repair-form');
if (repairForm) {
    repairForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const titleEl = document.getElementById('title');
        const categoryEl = document.getElementById('category');
        const ownerEl = document.getElementById('owner');
        const rewardEl = document.getElementById('reward');
        const descEl = document.getElementById('description');

        const newRepair = {
            title: titleEl ? titleEl.value : '',
            category: categoryEl ? categoryEl.value : '',
            owner: ownerEl ? ownerEl.value : '',
            reward: rewardEl ? rewardEl.value : '',
            description: descEl ? descEl.value : '',
            status: 'offen',
            date: new Date().toLocaleDateString('de-DE')
        };

        try {
            await addDoc(collection(db, "repairs"), newRepair);
            repairForm.reset();
            if (typeof confetti === 'function') {
                confetti({ particleCount: 40, spread: 40, origin: { y: 0.8 } });
            }
        } catch (e) {
            alert("Fehler beim Speichern in der Cloud: " + e.message);
        }
    });
}

window.updateRepairStatus = async function(id, newStatus) {
    try {
        const docRef = doc(db, "repairs", id);
        await updateDoc(docRef, { status: newStatus });
    } catch (e) {
        console.error("Fehler beim Aktualisieren:", e);
    }
}

window.markRepairDone = async function(id) {
    await updateRepairStatus(id, 'erledigt');
    if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }
}

window.removeRepair = async function(id) {
    if (confirm("Möchtest du diese Anfrage wirklich löschen?")) {
        try {
            await deleteDoc(doc(db, "repairs", id));
        } catch (e) {
            console.error("Fehler beim Löschen:", e);
        }
    }
}

window.setFilter = function(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderRepairs();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}