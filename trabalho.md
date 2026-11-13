# Aula 10 — Autenticação JWT + ViaCEP

> **Fase 3 — Node.js + Banco**

---

## Objetivos

Proteger rotas de criação/deleção com JWT e criar endpoint que consulta endereço pelo CEP via ViaCEP.

---

## Pré-requisitos

- Aula 09 concluída (CRUD completo)

---

## Passo a passo (60 min)

### 1. Instalar dependências (5 min)

```bash
npm install jsonwebtoken bcryptjs
```

Crie `.env`:

```
JWT_SECRET=devjobs_segredo_aula_2026
PORT=3001
```

Instale dotenv: `npm install dotenv` e no topo do `server.js`: `require('dotenv').config();`

### 2. Rotas de auth (20 min)

Crie `src/routes/auth.routes.js`:

```javascript
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const router = Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const empresa = db.prepare('SELECT * FROM empresas WHERE email = ?').get(email);

  if (!empresa || !bcrypt.compareSync(senha, empresa.senha_hash)) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: empresa.id, nome: empresa.nome, email: empresa.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, empresa: { id: empresa.id, nome: empresa.nome, email: empresa.email } });
});

module.exports = router;
```

Registre: `app.use('/api/auth', authRoutes);`

### 3. Middleware de autenticação (15 min)

Crie `src/middleware/auth.middleware.js`:

```javascript
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = header.split(' ')[1];

  try {
    req.empresa = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = authMiddleware;
```

Proteja POST e DELETE em `vagas.routes.js`:

```javascript
const auth = require('../middleware/auth.middleware');

router.post('/', auth, (req, res) => { /* usa req.empresa.id */ });
router.delete('/:id', auth, (req, res) => { /* ... */ });
```

No POST, use `req.empresa.id` como `empresa_id` em vez de receber no body.

### 4. Rota ViaCEP (15 min)

Crie `src/routes/cep.routes.js`:

```javascript
const { Router } = require('express');
const router = Router();

router.get('/:cep', async (req, res) => {
  const cep = req.params.cep.replace(/\D/g, '');

  if (cep.length !== 8) {
    return res.status(400).json({ erro: 'CEP deve ter 8 dígitos' });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return res.status(404).json({ erro: 'CEP não encontrado' });
    }

    res.json({
      cep: data.cep,
      cidade: data.localidade,
      estado: data.uf,
      bairro: data.bairro,
      logradouro: data.logradouro
    });
  } catch {
    res.status(502).json({ erro: 'Falha ao consultar ViaCEP' });
  }
});

module.exports = router;
```

Registre: `app.use('/api/cep', cepRoutes);`

Teste: `GET /api/cep/01310100`

### 5. Fluxo completo de teste (5 min)

1. POST `/api/auth/login` → copie o token
2. POST `/api/vagas` com header `Authorization: Bearer TOKEN`
3. GET `/api/cep/01310100` → São Paulo, SP

---

## Entregável da aula

- [ ] Login retornando JWT
- [ ] POST/DELETE protegidos por middleware
- [ ] GET /api/cep/:cep funcionando
- [ ] `.env` no `.gitignore`

---

## Como verificar se está funcionando

**Passo 1 — Login**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{ "email": "contato@technova.com", "senha": "123456" }
```
**Esperado:** status **200** + `{ "token": "eyJ...", "empresa": { ... } }`  
Copie o `token`.

**Passo 2 — Rota protegida sem token**
```
POST http://localhost:3001/api/vagas
{ "titulo": "Teste", "tipo": "remoto" }
```
**Esperado:** status **401** — "Token não fornecido".

**Passo 3 — Rota protegida com token**
```
POST http://localhost:3001/api/vagas
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json

{ "titulo": "Vaga Autenticada", "tipo": "remoto", "tecnologias": "Node" }
```
**Esperado:** status **201** + vaga criada.

**Passo 4 — ViaCEP**
```
GET http://localhost:3001/api/cep/01310100
```
**Esperado:** `{ "cidade": "São Paulo", "estado": "SP", ... }`

**Passo 5 — CEP inválido**
```
GET http://localhost:3001/api/cep/00000000
```
**Esperado:** status **404**.

**Se algo falhar:** 401 com token → `Bearer ` faltando no header; ViaCEP falha → Node < 18 sem fetch ou CEP mal formatado.

---

## Próxima aula

Fase 4! Setup React + componente JobCard.
