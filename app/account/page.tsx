"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { decrypt } from "@/lib/protection";
import { 
  ArrowLeft, 
  BarChart3, 
  Search, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Infinity
} from "lucide-react";
import Link from "next/link";

interface UsageData {
  monthlySearches: number;
  monthlyLimit: number | null;
  remaining: number | null;
  percentageUsed: number;
  isUnlimited: boolean;
  currentMonth: string;
  daysRemaining: number;
  dailyAverage: number;
  projectedUsage: number;
  willExceedLimit: boolean;
}

export default function AccountPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session");
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const sessionData = JSON.parse(decrypt(session));
      if (!sessionData?.username) {
        throw new Error("Invalid session");
      }
      setUsername(sessionData.username);
      loadUsage(session);
    } catch (err) {
      console.error("Error loading account:", err);
      router.push("/login");
    }
  }, [router]);

  const loadUsage = async (session: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-usage?session=${encodeURIComponent(session)}`);
      const data = await response.json();

      if (data.success) {
        setUsage(data.usage);
      } else {
        setError(data.error || "Failed to load usage data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = () => {
    const session = localStorage.getItem("huntmaster_session");
    if (session) {
      loadUsage(session);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">Loading your account information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">My Account</h1>
              <p className="text-gray-400">Welcome back, {username}</p>
            </div>
          </div>
          <Button onClick={refreshUsage} variant="outline">
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {usage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Usage Card */}
            <Card className="bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  API Usage
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {usage.currentMonth}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {usage.isUnlimited ? (
                  <div className="text-center py-4">
                    <Infinity className="w-12 h-12 mx-auto text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-white">Unlimited</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {usage.monthlySearches.toLocaleString()} searches this month
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Used</span>
                        <span className="text-white font-semibold">
                          {usage.monthlySearches.toLocaleString()} / {usage.monthlyLimit?.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={usage.percentageUsed} 
                        className="h-3"
                        style={{
                          backgroundColor: usage.percentageUsed > 90 ? '#ef4444' : usage.percentageUsed > 75 ? '#f59e0b' : '#3b82f6'
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{usage.percentageUsed}% used</span>
                        <span>{usage.remaining?.toLocaleString() || 0} remaining</span>
                      </div>
                    </div>

                    {usage.remaining !== null && usage.remaining <= 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          You've reached your monthly limit. Please upgrade your plan or wait for the next billing cycle.
                        </AlertDescription>
                      </Alert>
                    )}

                    {usage.remaining !== null && usage.remaining > 0 && usage.remaining < (usage.monthlyLimit || 0) * 0.1 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          You're running low on searches. Only {usage.remaining} remaining this month.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Usage Statistics Card */}
            <Card className="bg-gradient-to-br from-purple-950 to-purple-900 border-purple-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Statistics
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Current month overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Search className="w-4 h-4" />
                      <span className="text-xs">Daily Average</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {usage.dailyAverage.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Days Remaining</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {usage.daysRemaining}
                    </p>
                  </div>
                </div>

                {!usage.isUnlimited && (
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Projected Usage</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-white">
                        {usage.projectedUsage.toLocaleString()}
                      </p>
                      {usage.willExceedLimit ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    {usage.willExceedLimit && (
                      <p className="text-xs text-red-400 mt-1">
                        Will exceed limit by {(usage.projectedUsage - (usage.monthlyLimit || 0)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">About API Usage</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-2 text-sm">
                <p>
                  • <strong>Cached searches don't count:</strong> If you search for the same game within 24 hours, it's free!
                </p>
                <p>
                  • <strong>Monthly reset:</strong> Your usage resets automatically on the 1st of each month.
                </p>
                <p>
                  • <strong>Only real API calls count:</strong> Searches that hit the external APIs are counted, not cached results.
                </p>
                {usage.isUnlimited && (
                  <p className="text-green-400 font-semibold">
                    • You have unlimited API access with your current plan.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


