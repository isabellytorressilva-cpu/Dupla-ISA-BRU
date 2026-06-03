const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro ao conectar ao banco:', err.message);
    else console.log('Conectado ao banco de dados SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS leitores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS livros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        autor TEXT,
        quantidade INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS emprestimos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        leitor_id INTEGER,
        livro_id INTEGER,
        data_emprestimo TEXT NOT NULL,
        data_devolucao_prevista TEXT NOT NULL,
        status TEXT DEFAULT 'Ativo',
        FOREIGN KEY (leitor_id) REFERENCES leitores(id),
        FOREIGN KEY (livro_id) REFERENCES livros(id)
    )`);
});

app.get('/api/leitores', (req, res) => {
    db.all("SELECT * FROM leitores", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/leitores', (req, res) => {
    const { nome, telefone, email } = req.body;
    db.run(`INSERT INTO leitores (nome, telefone, email) VALUES (?, ?, ?)`, [nome, telefone, email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.get('/api/livros', (req, res) => {
    db.all("SELECT * FROM livros", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/livros', (req, res) => {
    const { titulo, autor, quantidade } = req.body;
    db.run(`INSERT INTO livros (titulo, autor, quantidade) VALUES (?, ?, ?)`, [titulo, autor, quantidade], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.post('/api/emprestimos', (req, res) => {
    const { leitor_id, livro_id, data_devolucao_prevista } = req.body;
    const data_emprestimo = new Date().toISOString().split('T')[0];

    db.get("SELECT quantidade FROM livros WHERE id = ?", [livro_id], (err, livro) => {
        if (!livro || livro.quantidade <= 0) {
            return res.status(400).json({ error: "Livro indisponível no estoque." });
        }

        db.run(`INSERT INTO emprestimos (leitor_id, livro_id, data_emprestimo, data_devolucao_prevista) VALUES (?, ?, ?, ?)`,
        [leitor_id, livro_id, data_emprestimo, data_devolucao_prevista], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run("UPDATE livros SET quantidade = quantidade - 1 WHERE id = ?", [livro_id]);
            res.json({ id: this.lastID });
        });
    });
});

app.get('/api/emprestimos', (req, res) => {
    const query = `
        SELECT emprestimos.*, leitores.nome as leitor_name, livros.titulo as livro_titulo 
        FROM emprestimos 
        JOIN leitores ON emprestimos.leitor_id = leitores.id
        JOIN livros ON emprestimos.livro_id = livros.id
        WHERE emprestimos.status = 'Ativo'
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/emprestimos/:id/devolver', (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT livro_id FROM emprestimos WHERE id = ?", [id], (err, emp) => {
        if (!emp) return res.status(404).json({ error: "Empréstimo não encontrado." });

        db.run("UPDATE emprestimos SET status = 'Devolvido' WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run("UPDATE livros SET quantidade = quantidade + 1 WHERE id = ?", [emp.livro_id]);
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));