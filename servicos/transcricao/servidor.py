#!/usr/bin/env python3
"""Elo Saúde · servidor de transcrição do ditado do profissional.

Roda no nosso servidor, perto do app: o áudio do atendimento não vai para
nenhum serviço de terceiros. Usa faster-whisper (MIT) em CPU.

Contrato usado por app/api/transcrever/route.ts:
  POST /media  Authorization: Bearer <ELO_STT_TOKEN>  {"b64": "<áudio em base64>"}
            -> {"text": "..."}
  GET  /health -> {"status": "ok", "modelo": "...", "carregado": true|false}

Variáveis: ELO_STT_TOKEN (obrigatória, 32+ caracteres), ELO_STT_PORTA (11462),
ELO_STT_MODELO (large-v3-turbo). Escuta só em 127.0.0.1.
Dependências: pip install faster-whisper numpy; ffmpeg no PATH.
"""
import base64
import hmac
import json
import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("ELO_STT_PORTA", "11462"))
MODELO = os.environ.get("ELO_STT_MODELO", "large-v3-turbo")
TOKEN = os.environ.get("ELO_STT_TOKEN", "")
MAX_AUDIO = 15 * 1024 * 1024  # o app já recusa acima disso
# Vocabulário do consultório ajuda o modelo a acertar nomes de remédio e termos clínicos.
CONTEXTO = ("Atendimento médico ditado em português do Brasil. Queixa, hipótese diagnóstica, "
            "conduta, receita, exames. Varfarina, diclofenaco, dipirona, INR, hemograma.")

_modelo = None
_trava = threading.Lock()


def modelo():
    global _modelo
    with _trava:
        if _modelo is None:
            from faster_whisper import WhisperModel
            _modelo = WhisperModel(MODELO, device="cpu", compute_type="int8")
    return _modelo


def para_pcm(audio: bytes):
    """Qualquer formato do navegador (webm/opus, ogg, mp4, wav) -> PCM 16 kHz mono float32."""
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "f32le", "pipe:1"],
                       input=audio, capture_output=True, timeout=180)
    return r.stdout if r.returncode == 0 and len(r.stdout) > 3200 else None


def transcrever(audio: bytes) -> str:
    import numpy as np
    pcm = para_pcm(audio)
    if pcm is None:
        return ""
    trechos, _ = modelo().transcribe(np.frombuffer(pcm, dtype=np.float32), language="pt", vad_filter=True,
                                     beam_size=1, temperature=0.0, condition_on_previous_text=False,
                                     initial_prompt=CONTEXTO)
    # Descarta trecho em que o modelo acha que não houve fala (evita texto inventado no silêncio).
    return " ".join(t.text.strip() for t in trechos if t.no_speech_prob < 0.6 and t.avg_logprob > -1.0).strip()


class Pedido(BaseHTTPRequestHandler):
    def log_message(self, *a):  # não registra conteúdo de pedido (é dado de saúde)
        pass

    def responder(self, codigo, corpo):
        b = json.dumps(corpo, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def autorizado(self):
        h = self.headers.get("Authorization", "")
        return len(TOKEN) >= 32 and h.startswith("Bearer ") and hmac.compare_digest(h[7:].encode(), TOKEN.encode())

    def do_GET(self):
        if self.path == "/health":
            return self.responder(200, {"status": "ok", "modelo": MODELO, "carregado": _modelo is not None})
        self.responder(404, {"erro": "rota"})

    def do_POST(self):
        if self.path != "/media":
            return self.responder(404, {"erro": "rota"})
        if not self.autorizado():
            return self.responder(401, {"erro": "sem autorização"})
        n = int(self.headers.get("Content-Length", "0") or 0)
        if n <= 0 or n > MAX_AUDIO * 4 // 3 + 1024:
            return self.responder(413, {"erro": "tamanho inválido"})
        try:
            audio = base64.b64decode(json.loads(self.rfile.read(n))["b64"].split(",")[-1])
        except Exception:
            return self.responder(400, {"erro": "envie {\"b64\": ...}"})
        try:
            return self.responder(200, {"text": transcrever(audio)})
        except Exception:
            return self.responder(500, {"text": "", "erro": "falha ao transcrever"})


if __name__ == "__main__":
    if len(TOKEN) < 32:
        raise SystemExit("ELO_STT_TOKEN ausente ou curto")
    threading.Thread(target=modelo, daemon=True).start()  # carrega o modelo enquanto já aceita conexões
    print(f"transcrição do Elo em 127.0.0.1:{PORTA} (modelo {MODELO})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORTA), Pedido).serve_forever()
