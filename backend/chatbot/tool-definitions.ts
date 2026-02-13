import Anthropic from '@anthropic-ai/sdk';

export const CHATBOT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_vms',
    description:
      'Get a list of all VMs with optional filters (status, name, min CPU)',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['running', 'stopped', 'suspended'],
              description: 'Filter by VM status',
            },
            name: {
              type: 'string',
              description: 'Filter by VM name (partial match)',
            },
            cpu_min: {
              type: 'number',
              description: 'Filter VMs with at least this many CPUs',
            },
          },
        },
      },
    },
  },

  {
    name: 'get_services',
    description:
      'Get all services (optionally filtered by VM). Returns service name, port, protocol, health status',
    input_schema: {
      type: 'object',
      properties: {
        vm_id: {
          type: 'string',
          description: 'Optional: Filter services by specific VM ID',
        },
      },
    },
  },

  {
    name: 'execute_vm_action',
    description:
      'Start, Stop, or Restart a VM. ⚠️ REQUIRES USER CONFIRMATION before execution',
    input_schema: {
      type: 'object',
      properties: {
        vm_id: {
          type: 'string',
          description: 'The VM ID to perform action on',
        },
        action: {
          type: 'string',
          enum: ['start', 'stop', 'restart'],
          description: 'The action to perform',
        },
      },
      required: ['vm_id', 'action'],
    },
  },

  {
    name: 'get_health_status',
    description:
      'Get overall infrastructure health status. Returns status of all VMs, services, and system metrics',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'query_logs',
    description:
      'Search logs for a specific service or VM over a time period',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Service name to search logs for',
        },
        duration: {
          type: 'string',
          enum: ['1h', '24h', '7d'],
          description: 'Time period to search',
        },
        error_only: {
          type: 'boolean',
          description: 'Only show error-level logs',
        },
      },
      required: ['service', 'duration'],
    },
  },

  {
    name: 'get_metrics',
    description:
      'Get performance metrics for a specific VM (CPU, Memory, Disk, Network)',
    input_schema: {
      type: 'object',
      properties: {
        vm_id: {
          type: 'string',
          description: 'The VM ID',
        },
        metric: {
          type: 'string',
          enum: ['cpu', 'memory', 'disk', 'network'],
          description: 'Which metric to retrieve',
        },
        duration: {
          type: 'string',
          enum: ['1h', '24h', '7d'],
          description: 'Time period for metrics',
        },
      },
      required: ['vm_id', 'metric', 'duration'],
    },
  },

  {
    name: 'create_feature',
    description: 'Create a new feature card in the Kanban board',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to create feature in',
        },
        name: {
          type: 'string',
          description: 'Feature name',
        },
        description: {
          type: 'string',
          description: 'Feature description',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Feature priority',
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated effort in hours',
        },
      },
      required: ['project_id', 'name', 'description'],
    },
  },

  {
    name: 'generate_prompt',
    description:
      'Generate a Claude Code prompt for a specific feature with full context',
    input_schema: {
      type: 'object',
      properties: {
        feature_id: {
          type: 'string',
          description: 'Feature ID to generate prompt for',
        },
      },
      required: ['feature_id'],
    },
  },

  {
    name: 'list_projects',
    description: 'Get list of all projects with status and tech stack',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'search_audit_log',
    description:
      'Search audit log for specific actions performed by users',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action type to search for (e.g., "vm_start", "backup")',
        },
        timeframe: {
          type: 'string',
          enum: ['1h', '24h', '7d'],
          description: 'Search within this timeframe',
        },
      },
      required: ['action', 'timeframe'],
    },
  },

  {
    name: 'analyze_anomalies',
    description:
      'Analyze infrastructure for anomalies in metrics, errors, or unusual patterns',
    input_schema: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          enum: ['cpu', 'memory', 'disk', 'network', 'errors', 'all'],
          description: 'Which area to focus anomaly detection on',
        },
      },
    },
  },
];

export function getToolByName(name: string): Anthropic.Tool | undefined {
  return CHATBOT_TOOLS.find((tool) => tool.name === name);
}

export function isDestructiveAction(toolName: string): boolean {
  const destructiveTools = ['execute_vm_action', 'create_feature'];
  return destructiveTools.includes(toolName);
}
