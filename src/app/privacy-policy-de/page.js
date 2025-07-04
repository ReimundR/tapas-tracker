import Link from 'next/link';
import Gdpr from "@/content/privacy-policy-de.mdx";
 
export default function Page() {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto my-auto">
                <Link href={`..`}>
                    <button className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
                        &times;
                    </button>
                </Link>
                <article className="prose prose-neutral max-w-3xl lg:prose-lg mx-auto p-4 sm:p-6 md:p-8 rounded-xl shadow-lg dark:text-gray-100">
                    <Gdpr />
                </article>                        
          </div>
        </div>
    )
}