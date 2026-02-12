import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// We'll hardcode the documentation content for now, or fetch it from an API if we decide to serve MD files via backend
// For Phase 1, serving a static comprehensive guide is good.

const DEPLOYMENT_DOCS = `# InfraManager Deployment (v0.1.0)

## Overview
This application is designed to be deployed using Docker Compose.

## Prerequisites
- Docker & Docker Compose
- Proxmox Cluster (optional, but required for VM management)
- PostgreSQL Database

## Quick Start
1. Clone the repository
2. Cop \`.env.example\` to \`.env\`
3. Run \`./scripts/start.sh\`

## Disaster Recovery
- Regular backups are saved in \`/backups\`
- Use the **Backups** tab to download them.
- To restore: \`cat backup.sql | docker exec -i inframanager-db psql -U inframan inframanager\`
`;

const API_DOCS = `# API Documentation

## Auth
- \`POST /api/auth/login\`
- \`POST /api/auth/register\`

## Infrastructure
- \`GET /api/infrastructure/proxmox/status\`
- \`GET /api/infrastructure/vms\`

## Admin
- \`GET /api/admin/system/stats\`
- \`GET /api/admin/backups\`
`;

const Documentation: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'deployment' | 'api'>('deployment');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">System Documentation</h1>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        <button
                            onClick={() => setActiveTab('deployment')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'deployment'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Deployment & Recovery
                        </button>
                        <button
                            onClick={() => setActiveTab('api')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'api'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            API Reference
                        </button>
                    </nav>
                </div>

                <div className="p-6 prose max-w-none">
                    <ReactMarkdown>
                        {activeTab === 'deployment' ? DEPLOYMENT_DOCS : API_DOCS}
                    </ReactMarkdown>
                </div>
            </div >
        </div >
    );
};

export default Documentation;
