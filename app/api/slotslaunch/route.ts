export async function GET(req: Request) {
  const base = process.env.SLOTSLAUNCH_API_BASE_URL || process.env.SLOT_STREAMERS_API_BASE_URL
  const key = process.env.SLOTSLAUNCH_API_KEY || process.env.SLOT_STREAMERS_API_KEY

  if (!base || !key) {
    return new Response(
      JSON.stringify({ success: false, error: "SLOTSLAUNCH env not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = new URL("/api/commercial/slotslaunch", base)
    url.searchParams.set("search", searchParams.get("search") || "")
    url.searchParams.set("limit", searchParams.get("limit") || "20")
    const page = searchParams.get("page")
    if (page) url.searchParams.set("page", page)
    const exhaustive = searchParams.get("exhaustive") === "1" || searchParams.get("exhaustive") === "true"

    const res = await fetch(url.toString(), { headers: { "x-api-key": key } })

    if (!exhaustive) {
      const text = await res.text()
      return new Response(text, { status: res.status, headers: { "content-type": "application/json" } })
    }

    if (!res.ok) {
      const err = await res.text()
      return new Response(err, { status: res.status, headers: { "content-type": "application/json" } })
    }

    const first = await res.json()
    const totalPages = Number(first?.total_pages || 1)
    const currentPage = Number(first?.page || page || 1)
    const games = Array.isArray(first?.games) ? [...first.games] : []

    if (totalPages > currentPage) {
      const pagesToFetch = [] as number[]
      for (let p = currentPage + 1; p <= totalPages; p++) pagesToFetch.push(p)

      const pageUrls = pagesToFetch.map((p) => {
        const u = new URL(url)
        u.searchParams.set("page", String(p))
        return u.toString()
      })

      const results = await Promise.all(
        pageUrls.map((u) => fetch(u, { headers: { "x-api-key": key } }))
      )
      for (const r of results) {
        if (!r.ok) continue
        const j = await r.json().catch(() => null)
        if (j && Array.isArray(j.games)) games.push(...j.games)
      }
    }

    const combined = {
      success: true,
      page: 1,
      limit: Number(searchParams.get("limit") || 20),
      total: Number(first?.total || games.length),
      total_pages: 1,
      games,
    }
    return new Response(JSON.stringify(combined), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Upstream request failed" }),
      { status: 502, headers: { "content-type": "application/json" } },
    )
  }
}

export const dynamic = "force-dynamic"

