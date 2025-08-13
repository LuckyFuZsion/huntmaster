export default function Error() {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Internal Server Error",
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}

