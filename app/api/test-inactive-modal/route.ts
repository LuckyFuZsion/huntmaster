import { NextResponse } from "next/server"

/**
 * Test endpoint to see what the inactive user modal message displays
 * Visit: /api/test-inactive-modal
 */
export async function GET() {
  const modalContent = {
    title: "Account Access Required",
    description: "Your account has been created, but access needs to be approved by an administrator.",
    message: "_to request access to your account, please send an email to:",
    email: "steve@luckyfuzsion.com",
    emailLink: "mailto:steve@luckyfuzsion.com?subject=Account Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to my Huntmaster account.%0D%0A%0D%0AThank you.",
    explanation: "Access may be restricted to ensure the security and proper management of the platform. Once your access is approved, you'll be able to log in and use all features.",
    buttons: {
      close: "Close",
      sendEmail: "Send Email"
    },
    fullHTML: `
      <div style="max-width: 500px; margin: 50px auto; padding: 20px; background: linear-gradient(to bottom right, #1f2937, #1e3a8a); border: 1px solid #374151; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <span style="font-size: 24px;">⚠️</span>
          <h2 style="font-size: 20px; font-weight: 600; margin: 0; color: white;">Account Access Required</h2>
        </div>
        <p style="color: #d1d5db; padding-top: 8px; margin-bottom: 16px;">
          Your account has been created, but access needs to be approved by an administrator.
        </p>
        <div style="margin: 16px 0;">
          <p style="color: #d1d5db; margin-bottom: 8px;">
            To request access to your account, please send an email to:
          </p>
          <div style="background: rgba(31, 41, 55, 0.5); padding: 12px; border-radius: 4px; border: 1px solid #374151;">
            <p style="color: #60a5fa; font-family: monospace; font-size: 14px; margin: 0;">
              steve@luckyfuzsion.com
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">
            Access may be restricted to ensure the security and proper management of the platform. 
            Once your access is approved, you'll be able to log in and use all features.
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #374151; margin-top: 16px;">
          <button style="padding: 8px 16px; background: transparent; border: 1px solid #374151; border-radius: 4px; color: white; cursor: pointer;">
            Close
          </button>
          <button style="padding: 8px 16px; background: #2563eb; border: none; border-radius: 4px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            📧 Send Email
          </button>
        </div>
      </div>
    `
  }

  return NextResponse.json({
    success: true,
    modalContent,
    note: "This is what users see when they try to access their account but it's inactive"
  }, {
    headers: {
      "Content-Type": "application/json",
    }
  })
}

