/**
 * Vela Audit Trail
 * Captura eventos críticos para diagnóstico no estágio Alpha.
 */

export interface AuditEvent {
  timestamp: string;
  step: string;
  status: 'success' | 'error' | 'info';
  metadata?: any;
}

export const auditTrail = {
  log(step: string, status: 'success' | 'error' | 'info' = 'info', metadata?: any) {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      step,
      status,
      metadata
    };

    console.info(`[ALPHA-AUDIT] ${step} - ${status}`, metadata);

    // Persiste os últimos 100 eventos no localStorage
    try {
      const historyRaw = localStorage.getItem('vela_audit_trail') || '[]';
      const history = JSON.parse(historyRaw);
      history.unshift(event);
      localStorage.setItem('vela_audit_trail', JSON.stringify(history.slice(0, 100)));
    } catch (e) {
      console.error('Falha ao gravar trilha de auditoria:', e);
    }
  },

  getHistory(): AuditEvent[] {
    try {
      return JSON.parse(localStorage.getItem('vela_audit_trail') || '[]');
    } catch (e) {
      return [];
    }
  },

  clear() {
    localStorage.removeItem('vela_audit_trail');
  }
};
