export async function GET(req:Request) {
    const U= new URL(req.url)
    const params= new URLSearchParams(U.searchParams)
    if (req.method !== 'GET') {
        return Response.json({ message: "Method Not Allowed" }, { status: 405 });
    }
    try {
      const result = await fetch(`http://localhost:3333/clinux/arquivo?cd_documento=${params.get('cd_documento')}`)
      return (result)
}catch (error) {
        console.error('Error fetching user:', error);
        return Response.json({ message: "Internal Server Error" }, { status: 500 });
    }}