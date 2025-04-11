import Link from "next/link";
export function Navbar(){
    return (
        <nav className="py-5 flex item-center justify-between">
            <div className="flex items-center gap-6">
                <Link href="/Blog" className="text-blue-500 hover:text-gray-900">
                    <h1 className="text-2xl font-bold">Blog</h1>
                </Link>
            <Link href="/">
                    <h1>
                        <span className="text-2xl font-bold text-blue-500">Siddharth</span>
                    </h1>
                </Link>
                <Link href="/Dashboard" className="text-2xl font-bold text-blue-500 hover:text-gray-900">
                    Dashboard
                </Link>
            </div>
            <div className="flex text-white items-center gap-4">
                <button />Sign Up
            </div>
        </nav>
    )
}