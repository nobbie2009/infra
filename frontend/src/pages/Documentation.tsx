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
        <div className="space-y-6 p-6 bg-terminal-bg min-h-screen">
            <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">DOCUMENTATION</h1>

            <div className="card-terminal overflow-hidden">
                <div className="border-b border-terminal-border flex divide-x divide-terminal-border">
                    <button
                        onClick={() => setActiveTab('deployment')}
                        className={`flex-1 py-3 px-2 text-center font-mono text-sm uppercase tracking-wider ${activeTab === 'deployment'
                                ? 'border-b-2 border-terminal-primary text-terminal-primary'
                                : 'text-terminal-secondary hover:text-terminal-primary'
                            }`}
                    >
                        [ DEPLOY ]
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-3 px-2 text-center font-mono text-sm uppercase tracking-wider ${activeTab === 'api'
                                ? 'border-b-2 border-terminal-primary text-terminal-primary'
                                : 'text-terminal-secondary hover:text-terminal-primary'
                            }`}
                    >
                        [ API ]
                    </button>
                </div>

                <div className="p-6 font-mono text-terminal-secondary text-sm overflow-auto max-h-[60vh]">
                    <div className="prose prose-invert max-w-none [&_h1]:text-terminal-primary [&_h2]:text-terminal-accent [&_h3]:text-terminal-secondary [&_code]:bg-terminal-surface [&_code]:text-terminal-primary [&_pre]:bg-terminal-surface [&_pre]:border-terminal-border [&_li]:text-terminal-secondary [&_a]:text-terminal-accent [&_a]:hover:text-terminal-primary">
                        <ReactMarkdown>
                            {activeTab === 'deployment' ? DEPLOYMENT_DOCS : API_DOCS}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Documentation;
