export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <main>Fiche véhicule {slug}</main>; }
