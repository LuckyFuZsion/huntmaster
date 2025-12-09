"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail, AlertCircle } from "lucide-react"

interface InactiveUserModalProps {
  open: boolean
  onClose: () => void
}

export function InactiveUserModal({ open, onClose }: InactiveUserModalProps) {
  const handleEmailClick = () => {
    window.location.href = "mailto:steve@luckyfuzsion.com?subject=Account Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to my Huntmaster account.%0D%0A%0D%0APlease specify which casino I'll be using:%0D%0A%0D%0AThank you."
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-blue-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <DialogTitle className="text-xl text-white">Account Access Required</DialogTitle>
          </div>
          <DialogDescription className="text-gray-300 pt-2">
            Your account has been created, but access needs to be approved by an administrator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-gray-300">
            To request access to your account, please send an email to:
          </p>
          <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
            <p className="text-blue-400 font-mono text-sm">steve@luckyfuzsion.com</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3 mt-3">
            <p className="text-yellow-200 text-sm font-medium mb-1">📝 Important:</p>
            <p className="text-yellow-100 text-sm">
              Please specify which casino you'll be using in your email request. This helps us set up your account properly.
            </p>
          </div>
          <p className="text-gray-400 text-sm">
            Access may be restricted to ensure the security and proper management of the platform. 
            Once your access is approved, you'll be able to log in and use all features.
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleEmailClick} className="bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

