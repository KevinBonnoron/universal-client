import type { Feature, HttpDelegate, WebSocketDelegate } from '../../../types';
import { isHttpDelegate, isWebSocketDelegate, wrapHttpDelegate, wrapWebSocketDelegate } from '../../../utils';

type Environments = Record<string, string>;

interface EnvironmentsConfig<Input, Environment extends Environments = Environments> {
  name: keyof Input;
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
  const environmentKeys = Object.keys(config.environments);
  const defaultKey = config.default || environmentKeys[0];
  let currentEnv = defaultKey;

  function getCurrentEnvironment(): keyof Environment {
    return currentEnv;
  }

  function setEnvironment(env: string): void {
    if (!config.environments[env]) {
      const fallback = config.fallback || defaultKey;
      console.warn(`[ENVIRONMENTS] Environment "${env}" not found, falling back to "${String(fallback)}"`);
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
      return url;
    }

    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const fullURL = `${cleanBaseURL}${cleanPath}`;
    console.info(`[ENVIRONMENTS] Building URL: ${cleanBaseURL} + ${cleanPath} = ${fullURL}`);
    return fullURL;
  };

  return wrapHttpDelegate(delegate, {
    before: (context) => {
      return { url: buildFullURL(context.url) };
    },
  });
}

function wrapWebSocketDelegateWithEnvironments<Environment extends Environments>(delegate: WebSocketDelegate, envManager: EnvironmentManager<Environment>): WebSocketDelegate {
  return wrapWebSocketDelegate(delegate, {
    beforeConnect: () => {
      console.info(`[ENVIRONMENTS] WebSocket connecting to: ${envManager.getBaseURL()}`);
    },
  });
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

export function withEnvironments<Input, Environment extends Environments>(config: EnvironmentsConfig<Input, Environment>): Feature<Input, Input & { environments: EnvironmentManager<Environment> }> {
  return (input: Input) => {
    const { name } = config;
    const environments = createEnvironmentManager(config);

    return {
      ...input,
      [name]: wrapDelegateWithEnvironments(input[name], environments),
      environments,
    };
  };
}
