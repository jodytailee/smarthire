import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // El "From" muchas veces no es una casilla que alguien revise (ej. el
  // remitente que reescribe Gmail al enviar por SMTP). Por defecto, las
  // respuestas se dirigen a la cuenta de Gmail configurada para enviar.
  const replyToAddr = replyTo ?? gmailUser ?? undefined;

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from ?? "SmartHire <noreply@ticoapp.lab>",
          to,
          subject,
          html,
          ...(replyToAddr ? { reply_to: replyToAddr } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      console.log("[email] resend status:", res.status, JSON.stringify(body));
      if (res.ok) return true;
    } catch (e) {
      console.error("[email] resend error:", e);
    }
  }

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: from ?? `SmartHire <${gmailUser}>`,
        to: to.join(", "),
        subject,
        html,
        ...(replyToAddr ? { replyTo: replyToAddr } : {}),
      });
      console.log("[email] gmail sent to:", to.join(", "));
      return true;
    } catch (e) {
      console.error("[email] gmail error:", e);
    }
  }

  console.error("[email] sin proveedor — configurá GMAIL_USER+GMAIL_APP_PASSWORD o RESEND_API_KEY");
  return false;
}
