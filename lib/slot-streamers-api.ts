export interface SlotStreamersSearchParams {
  search?: string;
  developer?: string;
  limit?: number;
  include_ratings?: boolean;
}

export interface SlotStreamersGameReview {
  id: number;
  slug: string;
  title: string;
  developer: string;
  thumbnail_url?: string;
  banner_url?: string;
}

export interface SlotStreamersSearchResponse {
  success: boolean;
  data: SlotStreamersGameReview[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getBaseUrl = (): string => {
  const url = process.env.SLOT_STREAMERS_API_URL || "https://www.slot-streamers.com/api/commercial";
  return url.replace(/\/$/, "");
};

const getApiKey = (): string => {
  const key = process.env.SLOT_STREAMERS_API_KEY;
  if (!key) throw new Error("SLOT_STREAMERS_API_KEY is not set");
  return key;
};

export async function searchGameReviews(params: SlotStreamersSearchParams): Promise<SlotStreamersSearchResponse> {
  const base = getBaseUrl();
  const apiKey = getApiKey();
  const url = new URL(base + "/game-reviews");
  if (params.search) url.searchParams.set("search", params.search);
  if (params.developer) url.searchParams.set("developer", params.developer);
  if (params.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params.include_ratings != null) url.searchParams.set("include_ratings", String(params.include_ratings));

  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": apiKey,
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Unexpected response type: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data as SlotStreamersSearchResponse;
}









