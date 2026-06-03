// Alternador de Abas do Menu
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    if (tabId === 'dashboard') carregarDadosDashboard();
}

// Carregar Leitores, Livros e Empréstimos no Painel
async function carregarDadosDashboard() {
    const hoje = new Date().toISOString().split('T')[0];

    try {
        // 1. Busca e renderiza os seletores do formulário de empréstimo
        const resLeitores = await fetch('/api/leitores');
        const leitores = await resLeitores.json();
        document.getElementById('emp-leitor').innerHTML = '<option value="">Selecione o Leitor</option>' + 
            leitores.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');

        const resLivros = await fetch('/api/livros');
        const livros = await resLivros.json();
        document.getElementById('emp-livro').innerHTML = '<option value="">Selecione o Livro</option>' + 
            livros.map(l => `<option value="${l.id}">${l.titulo} (Qtd: ${l.quantidade})</option>`).join('');

        // 2. Busca e renderiza a tabela de Empréstimos Ativos / Atrasados
        const resEmprestimos = await fetch('/api/emprestimos');
        const emprestimos = await resEmprestimos.json();
        
        const tabela = document.getElementById('lista-emprestimos');
        tabela.innerHTML = emprestimos.length === 0 ? '<tr><td colspan="5" class="p-2 text-center text-gray-500">Nenhum empréstimo pendente.</td></tr>' : '';

        emprestimos.forEach(emp => {
            // RF05: Lógica para checar se está atrasado
            const estaAtrasado = emp.data_devolucao_prevista < hoje;
            const statusBadge = estaAtrasado 
                ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold animate-pulse">ATRASADO</span>' 
                : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">No Prazo</span>';

            tabela.innerHTML += `
                <tr class="border-b text-sm ${estaAtrasado ? 'bg-red-50' : ''}">
                    <td class="p-2 font-medium">${emp.leitor_name}</td>
                    <td class="p-2 text-gray-600">${emp.livro_titulo}</td>
                    <td class="p-2">${emp.data_devolucao_prevista.split('-').reverse().join('/')}</td>
                    <td class="p-2">${statusBadge}</td>
                    <td class="p-2">
                        <button onclick="devolverLivro(${emp.id})" class="text-blue-600 hover:underline font-semibold text-xs cursor-pointer">Dar Baixa</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar dados do painel:", error);
    }
}

// Envios de Formulários para a API (POSTs)
document.getElementById('form-leitor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('lei-nome').value,
        telefone: document.getElementById('lei-telefone').value,
        email: document.getElementById('lei-email').value
    };
    await fetch('/api/leitores', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
    alert('Leitor cadastrado com sucesso!');
    e.target.reset();
});

// Corrigido para 'form-livro' combinando com o HTML
document.getElementById('form-livro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        titulo: document.getElementById('liv-titulo').value,
        autor: document.getElementById('liv-autor').value,
        quantidade: parseInt(document.getElementById('liv-qtd').value)
    };
    await fetch('/api/livros', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
    alert('Livro adicionado ao acervo!');
    e.target.reset();
});

document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        leitor_id: document.getElementById('emp-leitor').value,
        livro_id: document.getElementById('emp-livro').value,
        data_devolucao_prevista: document.getElementById('emp-data').value
    };
    
    const response = await fetch('/api/emprestimos', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
    if (response.ok) {
        alert('Empréstimo registrado!');
        carregarDadosDashboard();
    } else {
        const err = await response.json();
        alert(`Erro: ${err.error}`);
    }
});

// Ação de Devolução (RF04)
async function devolverLivro(id) {
    if (confirm('Confirmar a devolução deste livro?')) {
        await fetch(`/api/emprestimos/${id}/devolver`, { method: 'POST' });
        carregarDadosDashboard();
    }
}

// Inicializa chamando a aba inicial ao carregar o script
carregarDadosDashboard();