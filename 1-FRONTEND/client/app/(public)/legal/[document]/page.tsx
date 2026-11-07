export default async function Page({ params }: { params: Promise<{ document: string }> }) { const { document } = await params; return <main>Document {document}</main>; }
