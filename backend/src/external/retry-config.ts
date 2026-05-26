/**
 * Configuration de la stratégie de retry intelligente
 * Source: plans/resource-improvement-plan.md
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelay: 1000, // 1 seconde
  maxDelay: 10000,    // 10 secondes
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Classe utilitaire pour gérer les retries avec exponential backoff
 */
export class RetryHandler {
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Applique une attente avec exponential backoff
   * @param attempt Numéro de la tentative (1-indexed)
   * @returns Délai en millisecondes
   */
  private getBackoffDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Exécute une fonction avec retry automatique
   * @param fn Fonction à exécuter
   * @param onRetry Callback appelée lors d'une erreur réessayable
   * @returns Résultat de la fonction
   * @throws Dernière erreur rencontrée
   */
  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Vérifier si l'erreur est réessayable
        if (this.isRetryable(error, attempt)) {
          const delay = this.getBackoffDelay(attempt);
          onRetry?.(attempt, lastError);

          // Attendre avant de réessayer
          await this.sleep(delay);
          continue;
        }

        // Pas de retry possible, lancer l'erreur
        throw lastError;
      }
    }

    // Toutes les tentatives ont échoué
    throw lastError;
  }

  /**
   * Vérifie si une erreur est réessayable
   */
  private isRetryable(error: unknown, attempt: number): boolean {
    // Erreurs axios avec code de statut réessayable
    if (this.isAxiosError(error)) {
      const status = error.response?.status;
      return (
        this.config.retryableStatuses.includes(status || 0) &&
        attempt < this.config.maxRetries
      );
    }

    // Erreurs de timeout
    if (this.isTimeoutError(error)) {
      return attempt < this.config.maxRetries;
    }

    return false;
  }

  /**
   * Vérifie si une erreur est une erreur Axios
   */
  private isAxiosError(error: unknown): error is { response?: { status?: number } } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as any).response?.status === 'number'
    );
  }

  /**
   * Vérifie si une erreur est une erreur de timeout
   */
  private isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('timeout');
  }

  /**
   * Fonction utilitaire pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtient les statistiques de retry
   */
  getStats(): {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  } {
    return {
      maxRetries: this.config.maxRetries,
      initialDelay: this.config.initialDelay,
      maxDelay: this.config.maxDelay,
      backoffMultiplier: this.config.backoffMultiplier,
    };
  }
}