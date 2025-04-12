import Image from "next/image";
import Link from "next/link";

async function getBlogs() {

    const items = [
        {
            title: "Pappu Chai Wala Kaise Bane?",
            content: "Ikdum bakchodi krke"
        },
    ];

    return items;
}


export default async function Blogs() {
const Blogs = await getBlogs();
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Latest Posts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Blogs.map((blog) => (
            <h1 className="text-3xl font-bold tracking-tight mb-8" key={blog.title}>{blog.title}</h1>
            
        ))}
      </div>
      <div>{Blogs.map((blog) => (<h1 key={blog.content}>{blog.content}</h1>))}</div>
    </div>
  );
}
