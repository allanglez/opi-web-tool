/**
 * Read an environment variable at runtime.
 *
 * In local dev, Vite injects VITE_* vars via import.meta.env.
 * In production (K8s/Docker), env-config.js writes them to window.__ENV__
 * at container startup so they're available without rebuilding the image.
 */
export function getEnv(name: string): string | undefined {
  // Runtime injection (K8s / Docker entrypoint)
  const runtimeEnv = (window as any).__ENV__;
  if (runtimeEnv && runtimeEnv[name]) {
    return runtimeEnv[name] as string;
  }

  // Build-time injection (Vite local dev)
  return import.meta.env[name] as string | undefined;
}
