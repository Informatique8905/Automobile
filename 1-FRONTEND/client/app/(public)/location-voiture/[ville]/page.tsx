export default async function Page({ params }: { params: Promise<{ ville: string }> }) { const { ville } = await params; return <main>Location de voiture à {ville}</main>; }
