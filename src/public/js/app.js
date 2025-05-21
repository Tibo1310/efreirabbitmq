let lastOperation = null;

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.background = type === 'error' ? '#d32f2f' : '#4CAF50';
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

function validateInputs(n1, n2, op) {
    const n1Error = document.getElementById('n1Error');
    const n2Error = document.getElementById('n2Error');
    
    if (n1Error) n1Error.textContent = '';
    if (n2Error) n2Error.textContent = '';

    if (isNaN(n1)) {
        if (n1Error) n1Error.textContent = "Veuillez entrer un nombre valide";
        return false;
    }

    if (isNaN(n2)) {
        if (n2Error) n2Error.textContent = "Veuillez entrer un nombre valide";
        return false;
    }

    if (op === 'div' && n2 === 0) {
        if (n2Error) n2Error.textContent = "La division par zéro n'est pas permise";
        return false;
    }

    return true;
}

function formatOperation(result) {
    const symbols = { 
        'add': '+',
        'sub': '-',
        'mul': '×',
        'div': '÷',
    };
    const operationSymbol = symbols[result.op] || result.op;
    return result.n1 + ' ' + operationSymbol + ' ' + result.n2 + ' = ' + result.result;
}

function addResult(result) {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.textContent = formatOperation(result);
    resultsList.insertBefore(resultItem, resultsList.firstChild);
}

function updateCurrentResult(result) {
    const currentResult = document.getElementById('currentResult');
    if (currentResult && result) {
        // Si c'est une opération "all", on affiche tous les résultats
        if (lastOperation === 'all') {
            const existingResults = currentResult.getAttribute('data-results') || '[]';
            const results = JSON.parse(existingResults);
            results.push(result);
            
            if (results.length === 4) { // Tous les résultats sont arrivés
                currentResult.textContent = results.map(r => formatOperation(r)).join('\n');
                currentResult.setAttribute('data-results', '[]');
                lastOperation = null;
            } else {
                currentResult.setAttribute('data-results', JSON.stringify(results));
                currentResult.textContent = 'Calcul en cours... ' + results.length + '/4 opérations terminées';
            }
        } else {
            currentResult.textContent = formatOperation(result);
        }
    }
}

function handleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const currentResult = document.getElementById('currentResult');

    const n1 = Number(formData.get('n1'));
    const n2 = Number(formData.get('n2'));
    const op = formData.get('op');

    if (!validateInputs(n1, n2, op)) return;

    if (submitBtn) submitBtn.disabled = true;
    if (loading) loading.style.display = 'block';
    if (currentResult) {
        currentResult.textContent = 'Calcul en cours...';
        if (op === 'all') {
            currentResult.setAttribute('data-results', '[]');
        }
    }

    lastOperation = op;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n1, n2, op }),
        signal: controller.signal
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("Calcul envoyé avec succès!");
            form.reset();
        } else {
            showToast(data.message || "Erreur inconnue", 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showToast(error.message || "Erreur lors de l'envoi du calcul", 'error');
    })
    .finally(() => {
        clearTimeout(timeoutId);
        if (submitBtn) submitBtn.disabled = false;
        if (loading) loading.style.display = 'none';
    });
}

function checkResult() {
    fetch('/last-result')
        .then(response => response.json())
        .then(data => {
            if (data) {
                updateCurrentResult(data);
                addResult(data);
            }
        })
        .catch(error => console.error('Erreur:', error));
}

// Vérifier les résultats toutes les 1 secondes
setInterval(checkResult, 1000);

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calcForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}); 