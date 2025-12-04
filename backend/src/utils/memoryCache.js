/**
 * Cache em memória simples para armazenar dados
 */
class MemoryCache {
  constructor() {
    this.cache = {};
  }

  /**
   * Obtém um valor do cache
   * @param {string} key - Chave do cache
   * @returns {any|null} Valor do cache ou null se não existir
   */
  get(key) {
    return this.cache[key] || null;
  }

  /**
   * Define um valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser armazenado
   */
  set(key, value) {
    this.cache[key] = value;
  }

  /**
   * Remove uma chave do cache (invalida)
   * @param {string} key - Chave do cache
   */
  invalidate(key) {
    this.cache[key] = null;
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache = {};
  }
}

// Exporta uma instância singleton
export default new MemoryCache();

