/**
 * Módulo para gerenciar estatísticas de cache (Hit/Miss)
 */

class CacheStats {
  constructor() {
    this.stats = {
      hits: 0,      // Cache Hit: dados encontrados no cache
      misses: 0,    // Cache Miss: dados não encontrados, buscados do banco
      errors: 0,    // Erros ao acessar o cache
      total: 0      // Total de requisições
    };
  }

  /**
   * Registra um Cache Hit (dados encontrados no cache)
   * @param {string} key - Chave do cache
   */
  recordHit(key) {
    this.stats.hits++;
    this.stats.total++;
    console.log(`[CACHE HIT] Chave: ${key} | Hits: ${this.stats.hits} | Misses: ${this.stats.misses} | Taxa: ${this.getHitRate().toFixed(2)}%`);
  }

  /**
   * Registra um Cache Miss (dados não encontrados, buscados do banco)
   * @param {string} key - Chave do cache
   */
  recordMiss(key) {
    this.stats.misses++;
    this.stats.total++;
    console.log(`[CACHE MISS] Chave: ${key} | Buscando do banco de dados... | Hits: ${this.stats.hits} | Misses: ${this.stats.misses} | Taxa: ${this.getHitRate().toFixed(2)}%`);
  }

  /**
   * Registra um erro ao acessar o cache
   * @param {string} key - Chave do cache
   * @param {Error} error - Erro ocorrido
   */
  recordError(key, error) {
    this.stats.errors++;
    this.stats.total++;
    console.error(`[CACHE ERROR] Chave: ${key} | Erro: ${error.message}`);
  }

  /**
   * Calcula a taxa de cache hit (percentual)
   * @returns {number} Taxa de hit em percentual (0-100)
   */
  getHitRate() {
    if (this.stats.total === 0) return 0;
    return (this.stats.hits / this.stats.total) * 100;
  }

  /**
   * Calcula a taxa de cache miss (percentual)
   * @returns {number} Taxa de miss em percentual (0-100)
   */
  getMissRate() {
    if (this.stats.total === 0) return 0;
    return (this.stats.misses / this.stats.total) * 100;
  }

  /**
   * Retorna as estatísticas atuais
   * @returns {Object} Estatísticas de cache
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
      missRate: this.getMissRate()
    };
  }

  /**
   * Reseta todas as estatísticas
   */
  reset() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      total: 0
    };
    console.log('[CACHE STATS] Estatísticas resetadas');
  }
}

// Exporta uma instância singleton
export default new CacheStats();

