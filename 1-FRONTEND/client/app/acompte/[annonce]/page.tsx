export default async function Page({ params }: { params: Promise<{ annonce: string }> }) { const { annonce } = await params; return <main>Acompte {annonce}</main>; }
