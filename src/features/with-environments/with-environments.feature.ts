import type { Feature, HttpDelegate, WebSocketDelegate } from '../../types';
import { isHttpDelegate, isWebSocketDelegate } from '../../utils';

type Environments = Record<string, string>;

interface EnvironmentsConfig<Input, Environment extends Environments = Environments> {
  delegateName: keyof Input;
  environments: Environment;
  default?: keyof Environment;
  fallback?: keyof Environment;
}

interface EnvironmentManager<Environment extends Environments> {
  getCurrentEnvironment(): keyof Environment;
  setEnvironment(env: keyof Environment): void;
  getBaseURL(): string;
}

function createEnvironmentManager<Input, Environment extends Environments>(config: EnvironmentsConfig<Input, Environment>): EnvironmentManager<Environment> {
  const environments = { ...config.environments, default: config.environments[Object.keys(config.environments)[0]] };
  let currentEnv = environments.default;

  function getCurrentEnvironment(): string {
    return currentEnv;
  }

  function setEnvironment(env: string): void {
    if (!config.environments[env]) {
      const fallback = config.fallback ? environments.fa : environments.default;
      console.warn(`[ENVIRONMENTS] Environment "${env}" not found, falling back to "${fallback}"`);
      currentEnv = fallback;
    } else {
      currentEnv = env;
      console.info(`[ENVIRONMENTS] Switched to environment: ${env} (${config.environments[env]})`);
    }
  }

  function getBaseURL() {
    return config.environments[currentEnv] || config.environments[Object.keys(config.environments)[0]];
  }

  return {
    getCurrentEnvironment,
    setEnvironment,
    getBaseURL,
  };
}

function wrapHttpDelegateWithEnvironments<Environment extends Environments>(delegate: HttpDelegate, envManager: EnvironmentManager<Environment>): HttpDelegate {
  const buildFullURL = (url: string) => {
    const baseURL = envManager.getBaseURL();
    if (url.startsWith('http')) {
      return url; // URL absolue, on ne change rien
    }

    // S'assurer qu'on ne double pas les slashes
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const fullURL = `${cleanBaseURL}${cleanPath}`;
    console.info(`[ENVIRONMENTS] Building URL: ${cleanBaseURL} + ${cleanPath} = ${fullURL}`);
    return fullURL;
  };

  return {
    ...delegate,
    get: async <T>(url: string) => {
      const fullURL = buildFullURL(url);
      // On utilise fetch directement avec l'URL complète au lieu de passer par le délégué
      return fetch(fullURL).then((response) => response.json()) as Promise<T>;
    },
    post: async <T>(url: string, body: unknown) => {
      const fullURL = buildFullURL(url);
      return fetch(fullURL, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json()) as Promise<T>;
    },
    patch: async <T>(url: string, body: unknown) => {
      const fullURL = buildFullURL(url);
      return fetch(fullURL, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json()) as Promise<T>;
    },
    put: async <T>(url: string, body: unknown) => {
      const fullURL = buildFullURL(url);
      return fetch(fullURL, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json()) as Promise<T>;
    },
    delete: async <T>(url: string) => {
      const fullURL = buildFullURL(url);
      return fetch(fullURL, {
        method: 'DELETE',
      }).then((response) => response.json()) as Promise<T>;
    },
  };
}

function wrapWebSocketDelegateWithEnvironments<Environment extends Environments>(delegate: WebSocketDelegate, envManager: EnvironmentManager<Environment>): WebSocketDelegate {
  return {
    ...delegate,
    connect: () => {
      console.info(`[ENVIRONMENTS] WebSocket connecting to: ${envManager.getBaseURL()}`);
      delegate.connect();
    },
  };
}

function wrapDelegateWithEnvironments<Environment extends Environments>(delegate: unknown, envManager: EnvironmentManager<Environment>): unknown {
  if (isHttpDelegate(delegate)) {
    return wrapHttpDelegateWithEnvironments(delegate, envManager);
  }

  if (isWebSocketDelegate(delegate)) {
    return wrapWebSocketDelegateWithEnvironments(delegate, envManager);
  }

  return delegate;
}

export function withEnvironments<Input, Environment extends Environments>(config: EnvironmentsConfig<Input, Environment>): Feature<Input & { environments: EnvironmentManager<Environment> }, Input> {
  return (input: Input) => {
    const { delegateName } = config;
    const environments = createEnvironmentManager(config);

    return {
      ...input,
      [delegateName]: wrapDelegateWithEnvironments(input[delegateName], environments),
      environments,
    };
  };
}
