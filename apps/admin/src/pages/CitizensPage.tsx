/**
 * Citizens List Page
 */

import React, { useEffect, useState, useCallback } from 'react';
import { listCitizens, deleteCitizen, CitizenListItem } from '../api';

export const CitizensPage: React.FC = () => {
    const [citizens, setCitizens] = useState<CitizenListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const loadCitizens = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listCitizens(page, 10, search || undefined);
            setCitizens(data.citizens);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            setError('Failed to load citizens');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        loadCitizens();
    }, [loadCitizens]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadCitizens();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteCitizen(id);
            loadCitizens();
        } catch (err) {
            console.error('Failed to delete citizen:', err);
            alert('Failed to delete citizen');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Citizens</h1>
                <p className="text-sm text-gray-500">{total} total records</p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or citizenship number..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Search
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Citizenship No.</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">District</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Voter</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Registered</th>
                            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : citizens.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No citizens found
                                </td>
                            </tr>
                        ) : (
                            citizens.map((citizen) => (
                                <tr key={citizen.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-900">{citizen.fullName}</p>
                                        <p className="text-xs text-gray-500 font-mono">{citizen.id.slice(0, 8)}...</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{citizen.citizenshipNumber}</td>
                                    <td className="px-6 py-4 text-gray-600">{citizen.district}</td>
                                    <td className="px-6 py-4">
                                        {citizen.isVoterEligible ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Eligible
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                Not Eligible
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(citizen.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(citizen.id, citizen.fullName)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CitizensPage;
