"use client"

import { InactiveUserModal } from "@/components/inactive-user-modal"
import { useState } from "react"

export default function TestInactiveModalPage() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800/50 p-6 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-4">Inactive User Modal Preview</h1>
        <p className="text-gray-400 mb-6">
          This is what users see when they try to access their account but it's inactive. 
          The modal will automatically appear for new Discord users who haven't been activated yet.
        </p>
        
        <div className="bg-gray-900/50 p-4 rounded border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Modal Content:</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-white">Title:</strong> Account Access Required</p>
            <p><strong className="text-white">Description:</strong> Your account has been created, but access needs to be approved by an administrator.</p>
            <p><strong className="text-white">Email:</strong> steve@luckyfuzsion.com</p>
            <p><strong className="text-white">Email Link:</strong> Pre-filled mailto link with subject "Account Access Request"</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Show Modal
        </button>

        <InactiveUserModal 
          open={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      </div>
    </div>
  )
}

