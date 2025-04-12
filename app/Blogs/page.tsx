import Image from "next/image";
import Link from "next/link";
import { prisma } from "../utils/db";

async function getBlogs() {

    const items = await prisma.blogPost.findMany({
        select: {
            title: true,
            content: true,
            id: true,
            authorName: true,
        },
          });

    return items;
}


export default async function Blogs() {
  const Blogs = await getBlogs();
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Latest Posts</h1>

      <div className="space-y-6">
        {Blogs.map((blog) => (
          <div
            key={blog.id}
            className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold mb-2">{blog.title}</h2>
            <p className="text-sm text-gray-500 mb-4">By {blog.authorName}</p>
            <p className="text-base text-gray-700 dark:text-gray-300">{blog.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}