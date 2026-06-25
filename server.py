"""Patrimo — servidor estático + API (Python stdlib) com login por e-mail/senha.

Rotas da API:
  POST /api/register  body { email, password, birthdate } -> { token, email }
  POST /api/login     body { email, password }            -> { token, email }
  GET  /api/data      header Authorization: Bearer <token> -> { updatedAt, data }
  PUT  /api/data      header Authorization: Bearer <token> + body { updatedAt, data }

Senhas: PBKDF2-HMAC-SHA256 com salt aleatório (sem dependências externas).
Tokens: aleatórios (secrets), persistidos em arquivo. Dados são guardados por
usuário (chaveados pelo e-mail). Sincronização: last-write-wins por timestamp.

Para acesso de outro aparelho, rode o servidor e acesse pelo IP da máquina na
mesma rede (ex.: http://192.168.0.10:4322).
"""
import http.server, socketserver, json, os, threading, hashlib, hmac, secrets, re, time
from urllib.parse import urlparse

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
# Hosts (Railway/Render) injetam PORT; localmente usamos PATRIMO_PORT ou 4322.
PORT = int(os.environ.get("PORT") or os.environ.get("PATRIMO_PORT") or "4322")
# Em produção aponte PATRIMO_DATA_DIR para um volume persistente, senão os
# dados são gravados ao lado do código (disco efêmero = perda em redeploy).
DATA_DIR = os.environ.get("PATRIMO_DATA_DIR", DIRECTORY)
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "patrimo-db.json")
USERS_PATH = os.path.join(DATA_DIR, "patrimo-users.json")
TOKENS_PATH = os.path.join(DATA_DIR, "patrimo-tokens.json")
_lock = threading.Lock()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PBKDF2_ITERS = 120000


def _load(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERS)
    return salt, dk.hex()


def verify_password(password, salt, expected_hex):
    _, got = hash_password(password, salt)
    return hmac.compare_digest(got, expected_hex)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def _auth_email(self):
        h = self.headers.get("Authorization") or ""
        if not h.startswith("Bearer "):
            return None
        token = h[7:].strip()
        if not token:
            return None
        with _lock:
            return _load(TOKENS_PATH).get(token)

    # ---------------------------------------------------------------- auth
    def _register(self):
        body = self._read_body()
        if body is None:
            return self._json(400, {"error": "invalid json"})
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        birthdate = (body.get("birthdate") or "").strip()
        if not EMAIL_RE.match(email):
            return self._json(400, {"error": "E-mail inválido"})
        if len(password) < 6:
            return self._json(400, {"error": "A senha deve ter ao menos 6 caracteres"})
        if not birthdate:
            return self._json(400, {"error": "Informe a data de nascimento"})
        with _lock:
            users = _load(USERS_PATH)
            if email in users:
                return self._json(409, {"error": "E-mail já cadastrado"})
            salt, pwhash = hash_password(password)
            users[email] = {"salt": salt, "hash": pwhash, "birthdate": birthdate,
                            "createdAt": int(time.time() * 1000)}
            _save(USERS_PATH, users)
            token = secrets.token_hex(24)
            tokens = _load(TOKENS_PATH)
            tokens[token] = email
            _save(TOKENS_PATH, tokens)
        return self._json(201, {"token": token, "email": email})

    def _login(self):
        body = self._read_body()
        if body is None:
            return self._json(400, {"error": "invalid json"})
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        with _lock:
            users = _load(USERS_PATH)
            u = users.get(email)
            ok = bool(u) and verify_password(password, u["salt"], u["hash"])
            if not ok:
                return self._json(401, {"error": "E-mail ou senha incorretos"})
            token = secrets.token_hex(24)
            tokens = _load(TOKENS_PATH)
            tokens[token] = email
            _save(TOKENS_PATH, tokens)
        return self._json(200, {"token": token, "email": email})

    # ---------------------------------------------------------------- http
    def do_OPTIONS(self):
        self.send_response(204)
        if self.path.startswith("/api/"):
            self._cors()
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/register":
            return self._register()
        if path == "/api/login":
            return self._login()
        self.send_response(404)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/api/data":
            email = self._auth_email()
            if not email:
                return self._json(401, {"error": "Não autenticado"})
            with _lock:
                rec = _load(DB_PATH).get(email)
            if not rec:
                return self._json(200, {"updatedAt": 0, "data": None})
            return self._json(200, rec)
        return super().do_GET()

    def do_PUT(self):
        if urlparse(self.path).path == "/api/data":
            email = self._auth_email()
            if not email:
                return self._json(401, {"error": "Não autenticado"})
            payload = self._read_body()
            if payload is None:
                return self._json(400, {"error": "invalid json"})
            rec = {"updatedAt": int(payload.get("updatedAt") or 0), "data": payload.get("data")}
            with _lock:
                db = _load(DB_PATH)
                db[email] = rec
                _save(DB_PATH, db)
            return self._json(200, {"ok": True, "updatedAt": rec["updatedAt"]})
        self.send_response(405)
        self._cors()
        self.end_headers()

    def log_message(self, *args):
        pass  # silencioso


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Patrimo em http://0.0.0.0:{PORT}  (API: /api/register, /api/login, /api/data)")
    httpd.serve_forever()
