import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BonusHuntPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bonus Hunt Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to the Bonus Hunt Tracker!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
