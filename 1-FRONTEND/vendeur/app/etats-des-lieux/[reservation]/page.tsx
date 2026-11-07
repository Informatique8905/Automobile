export default async function Page({ params }: { params: Promise<{ reservation: string }> }) { const { reservation } = await params; return <main>État des lieux {reservation}</main>; }
