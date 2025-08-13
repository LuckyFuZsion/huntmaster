export default function NotFound() {
  return Response.json(
    { success: false, error: "Endpoint not found" },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}
