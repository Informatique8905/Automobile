export default async function Page({ params }: { params: Promise<{ ville: string }> }) { const { ville } = await params; return <main>Voitures à vendre à {ville}</main>; }
