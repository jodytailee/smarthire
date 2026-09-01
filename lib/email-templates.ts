// Envoltorio HTML compartido por los correos del módulo de postulantes —
// evita repetir el mismo header/footer en cada ruta (en EasyGo estaba
// duplicado letra por letra en cada archivo).
export function envolverEmailHTML(args: { empresaNombre: string; contenidoHtml: string; footer?: string }): string {
  const inicial = args.empresaNombre.trim().charAt(0).toUpperCase() || "S";
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:28px;height:28px;border-radius:6px;background:#e11d48;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">${inicial}</div>
          <span style="color:white;font-weight:700;font-size:15px;">${args.empresaNombre} · SmartHire</span>
        </div>
      </div>
      <div style="padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        ${args.contenidoHtml}
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;">
          ${args.footer ?? `${args.empresaNombre} — Este es un correo automático, no respondas a este mensaje.`}
        </p>
      </div>
    </div>`;
}

export function parrafosDesdeTexto(texto: string): string {
  return texto
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.75;">${p}</p>`)
    .join("");
}
