/**
 * API Keys Management Page
 */

import React, { useEffect, useState } from 'react';
import { listApiKeys, createApiKey, revokeApiKey, ApiKey } from '../api';

export const ApiKeysPage: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);

    useEffect(() => {
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        try {
            const data = await listApiKeys();
            setApiKeys(data);
        } catch (err) {
            setError('Failed to load API keys');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        setIsCreating(true);
        try {
            const result = await createApiKey(newKeyName.trim());
            setNewKey({ name: result.apiKey.name, key: result.rawKey });
            setNewKeyName('');
            setShowCreate(false);
            loadApiKeys();
        } catch (err) {
            console.error('Failed to create API key:', err);
            alert('Failed to create API key');
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke the API key "${name}"? This will immediately disable access for any applications using this key.`)) {
            return;
        }

        try {
            await revokeApiKey(id);
            loadApiKeys();
        } catch (err) {
            console.error('Failed to revoke API key:', err);
            alert('Failed to revoke API key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create New Key
                </button>
            </div>

            {/* New Key Display */}
            {newKey && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-medium text-green-800">API Key Created: {newKey.name}</p>
                            <p className="text-sm text-green-700 mt-1">
                                Copy this key now. You won't be able to see it again!
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono break-all">
                                    {newKey.key}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(newKey.key)}
                                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setNewKey(null)}
                            className="text-green-600 hover:text-green-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Create Form Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create API Key</h2>
                        <form onSubmit={handleCreate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Key Name
                                </label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g., Voting System Production"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    required
                                    disabled={isCreating}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose a descriptive name to identify this API key
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
                    hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? 'Creating...' : 'Create Key'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm text-blue-800 font-medium">API Key Usage</p>
                        <p className="text-sm text-blue-700 mt-1">
                            Third-party applications use API keys to verify citizen identity. Include the key in the <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header.
                        </p>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* API Keys List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Key Prefix</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Created</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Last Used</th>
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
                        ) : apiKeys.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No API keys created yet
                                </td>
                            </tr>
                        ) : (
                            apiKeys.map((key) => (
                                <tr key={key.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{key.name}</td>
                                    <td className="px-6 py-4 font-mono text-gray-600">{key.keyPrefix}...</td>
                                    <td className="px-6 py-4">
                                        {key.isActive ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Revoked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {key.lastUsedAt
                                            ? new Date(key.lastUsedAt).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {key.isActive && (
                                            <button
                                                onClick={() => handleRevoke(key.id, key.name)}
                                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ApiKeysPage;
