'use client'

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react'

export default function Page() {
    const [data, setData] = useState(null)
    const [isLoading, setLoading] = useState(true)

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/ReimundR/tapas-tracker/refs/heads/main/LICENSE')
        .then(response => {
            return response.text()
        })
        .then((data) => {
            setData(data)
            setLoading(false)
        })
    }, [])

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <Link href={`..`}>
                    <button className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
                        &times;
                    </button>
                </Link>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 dark:text-gray-100 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                        <Suspense fallback={<div>Loading...</div>}>
                        {data}
                        </Suspense>
                    </div>
                </div>
          </div>
        </div>
    )
}