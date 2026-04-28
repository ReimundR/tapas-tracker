/*
 * Copyright (c) 2025-2026 Tapas Tracker
 *
 * This file is part of Tapas Tracker.
 *
 * Tapas Tracker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Tapas Tracker is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Tapas Tracker.  If not, see <https://www.gnu.org/licenses/agpl-3.0.html>.
 */

'use client'

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react'
import License from "../../content/LICENSE.md";

export default function Page() {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <Link href={`..`}>
                    <button className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
                        &times;
                    </button>
                </Link>
                <article className="prose prose-neutral max-w-3xl lg:prose-lg mx-auto p-4 sm:p-6 md:p-8 rounded-xl shadow-lg dark:text-gray-100">
                    <License />
                </article>
          </div>
        </div>
    )
}