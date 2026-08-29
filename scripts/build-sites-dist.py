from base64 import b64encode
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SERVER = DIST / "server"

FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/tracking.js": ("tracking.js", "text/javascript; charset=utf-8"),
    "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json; charset=utf-8"),
    "/service-worker.js": ("service-worker.js", "text/javascript; charset=utf-8"),
    "/assets/icon.svg": ("assets/icon.svg", "image/svg+xml"),
    "/assets/icon-192.png": ("assets/icon-192.png", "image/png"),
    "/assets/icon-512.png": ("assets/icon-512.png", "image/png"),
    "/assets/icon-maskable-512.png": ("assets/icon-maskable-512.png", "image/png"),
}


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    SERVER.mkdir(parents=True)

    payload = {}
    for route, (relative_path, content_type) in FILES.items():
        data = (ROOT / relative_path).read_bytes()
        payload[route] = {
            "contentType": content_type,
            "base64": b64encode(data).decode("ascii"),
        }

    api_code = (ROOT / "worker-api.js").read_text(encoding="utf-8")

    worker = f"""{api_code}

const files = {json.dumps(payload, ensure_ascii=False)};

function decodeBase64(value) {{
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {{
    bytes[index] = binary.charCodeAt(index);
  }}
  return bytes;
}}

export default {{
  async fetch(request, env) {{
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {{
      return handleApi(request, env);
    }}
    const path = url.pathname.endsWith("/") && url.pathname !== "/" ? url.pathname.slice(0, -1) : url.pathname;
    const file = files[path] || files["/"];
    return new Response(decodeBase64(file.base64), {{
      headers: {{
        "content-type": file.contentType,
        "cache-control": path === "/service-worker.js" ? "no-cache" : "public, max-age=300",
      }},
    }});
  }},
}};
"""
    (SERVER / "index.js").write_text(worker, encoding="utf-8")
    (DIST / "package.json").write_text(
        json.dumps(
            {
                "name": "metabolic-health-report",
                "version": "5.0.0",
                "private": True,
                "type": "module",
                "main": "server/index.js",
            },
            ensure_ascii=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
