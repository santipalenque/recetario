import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export function shareRecipeEmail({
  recipientEmail,
  senderEmail,
  recipeName,
  shareUrl,
}: {
  recipientEmail: string;
  senderEmail: string;
  recipeName: string;
  shareUrl: string;
}) {
  return resend.emails.send({
    from: "Recetario <noreply@resend.dev>",
    to: recipientEmail,
    subject: `${senderEmail} te compartió una receta: ${recipeName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">¡Te compartieron una receta!</h2>
        <p style="color: #555; margin-bottom: 24px;">
          <strong>${senderEmail}</strong> quiere compartir contigo la receta
          <strong>${recipeName}</strong>.
        </p>
        <a href="${shareUrl}"
           style="display: inline-block; background: #000; color: #fff;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;
                  font-weight: 600;">
          Ver receta
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          Si no conocés a quien envió esto, podés ignorar este mensaje.
        </p>
      </div>
    `,
  });
}
