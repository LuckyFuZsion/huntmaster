import { NextResponse } from "next/server"

/**
 * Test endpoint to preview the inactive user modal message
 * This returns the exact content that would be shown to inactive users
 */
export async function GET() {
  const modalContent = {
    title: "Account Access Required",
    description: "Your account has been created, but access needs to be approved by an administrator.",
    message: "To request access to your account, please send an email to:",
    email: "steve@luckyfuzsion.com",
    emailSubject: "Account Access Request",
    emailBody: "Hello,\n\nI would like to request access to my Huntmaster account.\n\nThank you.",
    explanation: "Access may be restricted to ensure the security and proper management of the platform. Once your access is approved, you'll be able to log in and use all features.",
    buttons: {
      close: "Close",
      sendEmail: "Send Email"
    },
    fullEmailUrl: "mailto:steve@luckyfuzsion.com?subject=Account%20Access%20Request&body=Hello%2C%0D%0A%0D%0AI%20would%20like%20to%20request%20access%20to%20my%20Huntmaster%20account.%0D%0A%0D%0AThank%20you.",
    htmlPreview: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: white; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">⚠️</span>
          Account Access Required
        </h2>
        <p style="color: #d1d5db; margin-top: 8px;">
          Your account has been created, but access needs to be approved by an administrator.
        </p>
        <div style="margin-top: 16px;">
          <p style="color: #d1d5db;">
            To request access to your account, please send an email to:
          </p>
          <div style="background: rgba(31, 41, 55, 0.5); padding: 12px; border-radius: 4px; border: 1px solid rgba塌(55, 65, 81, 0.5); margin-top: 8px;">
            <p style="color: #60a5fa; font-family: monospace; font-size: 14px; margin: 0;">
              steve@luckyfuzsion.com
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">
            Access may be crewsricted to ensure the security and proper management of the platform. 
            Once your access is approved, you'll be able to log in and use all features.
          </p>
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(55, 65, 81, 0.5); display: flex; gap: 12px; justify-content: flex-end;">
          <button style="padding: 8px 16px; border: 1px solid rgba(55, 65, 81, 0.5); background: transparent; color: white; border-radius: 4px; cursor: pointer;">
            Close
          </button>
          <button style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            📧 Send Email
          </button>
        </div>
      </div>
    `
  }

  return NextResponse.json({
    success: true,
    modal: modalContent,
    note: "This is the exact message shown to inactive users who sign in with Discord or try to log in with an inactive account."
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

