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
    
    // Formater les grands nombres
    const n1 = typeof result.n1 === 'string' && result.n1.length > 15 
        ? BigInt(result.n1).toString()
        : result.n1;
    const n2 = typeof result.n2 === 'string' && result.n2.length > 15
        ? BigInt(result.n2).toString()
        : result.n2;
    const resultValue = typeof result.result === 'string' && result.result.length > 15
        ? BigInt(result.result).toString()
        : result.result;

    return `${n1} ${operationSymbol} ${n2} = ${resultValue}`;
}

function addResult(result) {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;

    // N'ajouter à l'historique que les calculs automatiques
    if (!result.isAutomatic) return;

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    if (result.type === 'all') {
        resultItem.innerHTML = `<strong>Opération ALL:</strong><br>` +
            result.results.map(r => formatOperation(r)).join('<br>');
    } else {
        resultItem.textContent = formatOperation(result);
    }
    
    resultsList.insertBefore(resultItem, resultsList.firstChild);
}

function updateCurrentResult(result) {
    const currentResult = document.getElementById('currentResult');
    if (!currentResult) return;

    // N'afficher dans currentResult que les calculs manuels
    if (result.isAutomatic) return;

    if (result.type === 'all') {
        currentResult.innerHTML = '<strong>Résultats de l\'opération ALL:</strong><br>' +
            result.results.map(r => formatOperation(r)).join('<br>');
    } else {
        currentResult.textContent = formatOperation(result);
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
        currentResult.innerHTML = '<em>En attente du résultat...</em>';
    }

    fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n1, n2, op }),
        signal: AbortSignal.timeout(30000)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("Calcul envoyé avec succès!");
        } else {
            showToast(data.message || "Erreur inconnue", 'error');
            if (currentResult) {
                currentResult.innerHTML = '<strong>Erreur:</strong> ' + (data.message || "Erreur inconnue");
            }
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showToast(error.message || "Erreur lors de l'envoi du calcul", 'error');
        if (currentResult) {
            currentResult.innerHTML = '<strong>Erreur:</strong> ' + (error.message || "Erreur lors de l'envoi du calcul");
        }
    })
    .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (loading) loading.style.display = 'none';
    });
}

// Vérifier les résultats automatiques
function checkAutoResult() {
    fetch('/last-auto-result')
        .then(response => response.json())
        .then(data => {
            if (data) {
                addResult(data);
            }
        })
        .catch(error => console.error('Erreur:', error));
}

// Vérifier les résultats manuels
function checkUserResult() {
    fetch('/last-user-result')
        .then(response => response.json())
        .then(data => {
            if (data) {
                updateCurrentResult(data);
            }
        })
        .catch(error => console.error('Erreur:', error));
}

// Vérifier les résultats plus fréquemment
setInterval(checkAutoResult, 1000);
setInterval(checkUserResult, 500);

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calcForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}); 